"""
Kokoro TTS Service — Text-to-Speech with distinct voices per debate persona.
Uses kokoro-onnx (~300MB model) for fast, near real-time speech synthesis.

NOTE: All heavy imports are lazy so the server boots even without TTS deps.

Required model files (place in backend/voice-models/ directory):
  - kokoro-v1.0.onnx
  - voices-v1.0.bin
Download from: https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
"""

import hashlib
import io
import logging
import os
from collections import OrderedDict
from typing import Optional

logger = logging.getLogger(__name__)

# ── Voice mapping per agent role ──────────────────────────────────────
# Debater voices are dynamic based on persona gender — see _pick_debater_voice()
ROLE_VOICE_MAP: dict[str, str] = {
    "moderator": "am_adam",          # Authoritative male
    "judge_logic": "af_sarah",       # Clear, precise female
    "judge_evidence": "am_michael",  # Charming, sophisticated male
    "judge_rhetoric": "bf_emma",     # British female
    "gap_reporter": "af_nicole",     # Upbeat, heartfelt female
}

# Gendered voice options for debaters
MALE_VOICES = ["am_adam", "bm_george", "am_michael", "bm_lewis"]
FEMALE_VOICES = ["af_bella", "af_sarah", "af_nicole", "bf_emma"]

DEFAULT_VOICE = "af_bella"

# Common name lists for gender inference
_MALE_NAMES = {
    "james", "jim", "marcus", "robert", "bob", "john", "david", "michael",
    "william", "richard", "thomas", "charles", "daniel", "matthew", "andrew",
    "joseph", "christopher", "george", "edward", "henry", "alexander", "sam",
    "samuel", "benjamin", "patrick", "peter", "paul", "mark", "stephen",
    "adam", "lewis", "oliver", "jack", "harry", "leo", "max", "mr", "dr",
}
_FEMALE_NAMES = {
    "sarah", "elena", "amara", "maria", "regina", "anna", "emily", "emma",
    "sophia", "olivia", "isabella", "charlotte", "mia", "alice", "clara",
    "nicole", "bella", "jessica", "jennifer", "susan", "linda", "patricia",
    "mary", "elizabeth", "margaret", "lisa", "nancy", "karen", "betty",
    "dorothy", "sandra", "ashley", "diana", "rachel", "rebecca", "ms", "mrs",
}


def _infer_gender(persona_name: str) -> str:
    """Infer gender from persona name. Returns 'male', 'female', or 'unknown'."""
    if not persona_name:
        return "unknown"

    # Check first name (handle 'Dr. Sarah Chen' → 'sarah')
    parts = persona_name.lower().replace('"', '').replace("'", "").split()
    for part in parts:
        clean = part.strip(".")
        if clean in _MALE_NAMES:
            return "male"
        if clean in _FEMALE_NAMES:
            return "female"

    return "unknown"


def _pick_debater_voice(persona_name: str, role: str) -> str:
    """Pick a voice for a debater based on their persona's inferred gender."""
    gender = _infer_gender(persona_name)

    if gender == "male":
        # debater_a gets first male voice, debater_b gets second
        return MALE_VOICES[0] if role == "debater_a" else MALE_VOICES[1]
    elif gender == "female":
        # debater_a gets first female voice, debater_b gets second
        return FEMALE_VOICES[0] if role == "debater_a" else FEMALE_VOICES[1]
    else:
        # Fallback: debater_a = female, debater_b = male (variety)
        return FEMALE_VOICES[0] if role == "debater_a" else MALE_VOICES[0]

# Model files — expected in the backend/ root directory
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_PATH = os.path.join(_BACKEND_DIR, "./voice-models/kokoro-v1.0.onnx")
VOICES_PATH = os.path.join(_BACKEND_DIR, "./voice-models/voices-v1.0.bin")

# ── LRU Audio Cache ──────────────────────────────────────────────────
MAX_CACHE_ITEMS = 200  # ~200 sentences worth of audio


class _AudioCache:
    """Simple LRU cache for synthesized audio bytes."""

    def __init__(self, max_size: int = MAX_CACHE_ITEMS):
        self._cache: OrderedDict[str, bytes] = OrderedDict()
        self._max_size = max_size

    @staticmethod
    def _key(text: str, voice: str) -> str:
        return hashlib.md5(f"{voice}:{text}".encode()).hexdigest()

    def get(self, text: str, voice: str) -> Optional[bytes]:
        key = self._key(text, voice)
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        return None

    def put(self, text: str, voice: str, audio: bytes) -> None:
        key = self._key(text, voice)
        self._cache[key] = audio
        self._cache.move_to_end(key)
        while len(self._cache) > self._max_size:
            self._cache.popitem(last=False)


class KokoroTTSService:
    """Singleton service for Kokoro ONNX TTS synthesis."""

    _instance: Optional["KokoroTTSService"] = None
    _initialized: bool = False

    def __new__(cls) -> "KokoroTTSService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._cache = _AudioCache()
        return cls._instance

    def _ensure_initialized(self) -> None:
        """Lazily load the Kokoro ONNX model on first use."""
        if self._initialized:
            return

        try:
            from kokoro_onnx import Kokoro
        except ImportError:
            logger.error(
                "❌ kokoro-onnx not installed. "
                "Run: pip install kokoro-onnx soundfile"
            )
            raise

        # Auto-download model files if missing
        if not os.path.exists(MODEL_PATH) or not os.path.exists(VOICES_PATH):
            self._download_model_files()

        logger.info("🔊 Loading Kokoro ONNX model...")
        self._kokoro = Kokoro(MODEL_PATH, VOICES_PATH)
        self._initialized = True
        logger.info("🔊 Kokoro ONNX model loaded successfully.")

    @staticmethod
    def _download_model_files() -> None:
        """Download Kokoro model and voice files if not already present."""
        import urllib.request

        _MODEL_URL = (
            "https://github.com/thewh1teagle/kokoro-onnx/releases/"
            "download/model-files-v1.0/kokoro-v1.0.onnx"
        )
        _VOICES_URL = (
            "https://github.com/thewh1teagle/kokoro-onnx/releases/"
            "download/model-files-v1.0/voices-v1.0.bin"
        )

        models_dir = os.path.dirname(MODEL_PATH)
        os.makedirs(models_dir, exist_ok=True)

        for url, path, label in [
            (_MODEL_URL, MODEL_PATH, "kokoro-v1.0.onnx (~300 MB)"),
            (_VOICES_URL, VOICES_PATH, "voices-v1.0.bin"),
        ]:
            if os.path.exists(path):
                continue
            logger.info(f"⬇️  Downloading {label} ...")
            try:
                urllib.request.urlretrieve(url, path)
                logger.info(f"✅  Downloaded {label}")
            except Exception as exc:
                # Clean up partial file so the next run retries
                if os.path.exists(path):
                    os.remove(path)
                raise RuntimeError(
                    f"Failed to download {label} from {url}: {exc}"
                ) from exc

    def get_voice_for_role(self, role: str, persona_name: str = "") -> str:
        """Get the voice ID for a given agent role, gender-aware for debaters."""
        if role in ("debater_a", "debater_b"):
            return _pick_debater_voice(persona_name, role)
        return ROLE_VOICE_MAP.get(role, DEFAULT_VOICE)

    def synthesize(self, text: str, role: str = "moderator", persona_name: str = "") -> bytes:
        """
        Synthesize speech for the given text using a role-specific voice.
        Uses LRU cache to avoid re-synthesizing identical text+voice combos.

        Args:
            text: The text to convert to speech.
            role: The agent role (moderator, debater_a, debater_b, etc.)
            persona_name: The persona's display name (used for gender inference).

        Returns:
            WAV audio as bytes.
        """
        import soundfile as sf

        self._ensure_initialized()

        voice = self.get_voice_for_role(role, persona_name)

        # Check cache first
        cached = self._cache.get(text, voice)
        if cached is not None:
            logger.info(f"🔊 Cache HIT for voice='{voice}' ({len(text)} chars)")
            return cached

        logger.info(f"🔊 Synthesizing TTS for role='{role}' voice='{voice}' ({len(text)} chars)")

        samples, sample_rate = self._kokoro.create(
            text, voice=voice, speed=1.0, lang="en-us"
        )

        # Write to WAV in memory
        buffer = io.BytesIO()
        sf.write(buffer, samples, sample_rate, format="WAV")
        buffer.seek(0)
        audio_bytes = buffer.read()

        # Store in cache
        self._cache.put(text, voice, audio_bytes)

        return audio_bytes


# Module-level singleton accessor
def get_tts_service() -> KokoroTTSService:
    """Get the singleton Kokoro TTS service instance."""
    return KokoroTTSService()

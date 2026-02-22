"""
SocraticCanvas Backend — FastAPI Application Entry Point
AI-Powered Generative Debate Environment
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import topics, debates, auth

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler — startup and shutdown logic."""
    settings = get_settings()
    logger.info("🏛️  SocraticCanvas Backend starting...")
    logger.info(f"   Model: {settings.llm_model_name}")
    logger.info(f"   API Key configured: {'✅' if settings.groq_api_key else '❌ Missing!'}")
    yield
    logger.info("🏛️  SocraticCanvas Backend shutting down.")


app = FastAPI(
    title="SocraticCanvas API",
    description="AI-Powered Generative Debate Environment — Multi-agent debate system with judge evaluation and personalized gap reports.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all origins for development
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(topics.router)
app.include_router(debates.router)
app.include_router(auth.router)


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    settings = get_settings()
    return {
        "status": "healthy",
        "service": "SocraticCanvas",
        "model": settings.llm_model_name,
        "api_key_configured": bool(settings.groq_api_key),
    }

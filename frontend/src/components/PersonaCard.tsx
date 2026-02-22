"use client";

import { PersonaDetail } from "@/lib/types";
import {
  HiLightBulb,
  HiShieldCheck,
  HiExclamationTriangle,
  HiChatBubbleLeftRight,
  HiEye,
} from "react-icons/hi2";

interface Props {
  persona: PersonaDetail;
  variant: "a" | "b";
}

export default function PersonaCard({ persona, variant }: Props) {
  const accentColor =
    variant === "a" ? "var(--accent-blue)" : "var(--accent-red)";
  const gradientFrom =
    variant === "a" ? "from-blue-500/20" : "from-red-500/20";

  return (
    <div className="glass-card relative overflow-hidden p-6">
      {/* Top accent */}
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${accentColor}, transparent)`,
        }}
      />

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`h-12 w-12 rounded-full bg-gradient-to-br ${gradientFrom} to-transparent flex items-center justify-center text-xl font-bold`}
            style={{ color: accentColor }}
          >
            {persona.name.charAt(0)}
          </div>
          <div>
            <h3
              className="text-lg font-bold"
              style={{ color: accentColor }}
            >
              {persona.name}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {persona.role} · <span className="font-semibold">{persona.era}</span>
            </p>
          </div>
        </div>
        <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">
          &quot;{persona.core_stance}&quot;
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <Section
          icon={<HiLightBulb className="h-4 w-4 text-[var(--accent-gold)]" />}
          title="Knowledge"
          items={persona.knowledge}
        />
        <Section
          icon={<HiShieldCheck className="h-4 w-4 text-[var(--accent-green)]" />}
          title="Beliefs"
          items={persona.beliefs}
        />
        <Section
          icon={<HiEye className="h-4 w-4 text-[var(--accent-purple)]" />}
          title="Blind Spots"
          items={persona.blind_spots}
        />
        <Section
          icon={<HiExclamationTriangle className="h-4 w-4 text-[var(--accent-red)]" />}
          title="Fallacies"
          items={persona.fallacies}
        />
        <Section
          icon={
            <HiChatBubbleLeftRight className="h-4 w-4 text-[var(--accent-cyan)]" />
          }
          title="Speaking Style"
          items={[persona.speaking_style]}
        />
      </div>

      {/* Favorite Phrases */}
      {persona.favorite_phrases.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Favorite Phrases
          </h4>
          <div className="flex flex-wrap gap-2">
            {persona.favorite_phrases.map((phrase, i) => (
              <span
                key={i}
                className="text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-2.5 py-1 rounded-full border border-white/[0.06]"
              >
                &ldquo;{phrase}&rdquo;
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {title}
        </h4>
      </div>
      <ul className="space-y-1 pl-6">
        {items.map((item, i) => (
          <li
            key={i}
            className="text-sm text-[var(--text-secondary)] list-disc list-outside leading-relaxed"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

import React from "react";

// ── Types ─────────────────────────────────────────────────
export type SysBadgeType =
  | "mirror-chrome" | "liquid-glass" | "crystal" | "frosted" | "smoked"
  | "liquid-mercury" | "etched" | "matte-carbon" | "animated-glow" | "mythic-flow";

export type BadgeIconType = SysBadgeType | "admin" | "developer" | "moderator" | "premium" | "user";

export const SYS_BADGE_TYPES: SysBadgeType[] = [
  "mirror-chrome", "liquid-glass", "crystal", "frosted", "smoked",
  "liquid-mercury", "etched", "matte-carbon", "animated-glow", "mythic-flow",
];

export interface SysBadgeConfig {
  label: string;
  defaultPrimary: string;
  defaultSecondary: string;
  description: string;
  rarity?: string;
}

export const BADGE_CONFIGS: Record<BadgeIconType, SysBadgeConfig> = {
  admin:          { label: "Admin",         defaultPrimary: "#c0392b", defaultSecondary: "#3b0808", description: "Administrador da plataforma" },
  developer:      { label: "Developer",     defaultPrimary: "#00acc1", defaultSecondary: "#003544", description: "Desenvolvedor oficial" },
  moderator:      { label: "Moderator",     defaultPrimary: "#7c3aed", defaultSecondary: "#2d0760", description: "Moderador da comunidade" },
  premium:        { label: "Premium",       defaultPrimary: "#d4a017", defaultSecondary: "#5a3800", description: "Membro premium" },
  user:           { label: "User",          defaultPrimary: "#2980b9", defaultSecondary: "#0d2137", description: "Membro verificado" },
  "mirror-chrome":  { label: "Mirror Chrome",  defaultPrimary: "#e8e8e8", defaultSecondary: "#aaaaaa", description: "Acabamento espelhado",    rarity: "COMMON" },
  "liquid-glass":   { label: "Liquid Glass",   defaultPrimary: "#a0b4cc", defaultSecondary: "#1a2230", description: "Vidro líquido",            rarity: "COMMON" },
  "crystal":        { label: "Crystal",        defaultPrimary: "#c8d8f0", defaultSecondary: "#2a3a55", description: "Cristal transparente",     rarity: "UNCOMMON" },
  "frosted":        { label: "Frosted",        defaultPrimary: "#b0bcd0", defaultSecondary: "#1e2535", description: "Fosco gelado",             rarity: "UNCOMMON" },
  "smoked":         { label: "Smoked",         defaultPrimary: "#888888", defaultSecondary: "#111111", description: "Fumaça escura",            rarity: "RARE" },
  "liquid-mercury": { label: "Liquid Mercury", defaultPrimary: "#c0c8d4", defaultSecondary: "#2a3040", description: "Mercúrio líquido",         rarity: "RARE" },
  "etched":         { label: "Etched",         defaultPrimary: "#909090", defaultSecondary: "#151515", description: "Gravação entalhada",       rarity: "RARE" },
  "matte-carbon":   { label: "Matte Carbon",   defaultPrimary: "#707070", defaultSecondary: "#0a0a0a", description: "Carbono fosco",            rarity: "COMMON" },
  "animated-glow":  { label: "Animated Glow",  defaultPrimary: "#ffffff", defaultSecondary: "#303030", description: "Brilho épico",             rarity: "EPIC" },
  "mythic-flow":    { label: "Mythic Flow",     defaultPrimary: "#ffffff", defaultSecondary: "#404040", description: "Fundador — 1/10",         rarity: "FOUNDER · 1/10" },
};

export function isSysBadge(icon: string): boolean {
  return typeof icon === "string" && icon.startsWith("sys:");
}

export function getSysBadgeType(icon: string): BadgeIconType | null {
  const type = icon.replace("sys:", "") as BadgeIconType;
  return type in BADGE_CONFIGS ? type : null;
}

export function nameColorFromBadges(
  badges?: { icon: string; color?: string }[],
  fallback = "rgba(255,255,255,0.8)"
): string {
  const badge = badges?.find((b) => b.color || (isSysBadge(b.icon) && getSysBadgeType(b.icon) !== "admin"));
  if (!badge) return fallback;
  if (badge.color) return badge.color;

  const type = getSysBadgeType(badge.icon);
  return type ? BADGE_CONFIGS[type].defaultPrimary : fallback;
}

// ── Unique ID per component instance (avoids SVG gradient ID collisions) ──
function useUid() {
  return React.useMemo(() => Math.random().toString(36).slice(2, 9), []);
}

// ── Shared SVG gradient defs ───────────────────────────────
function GradDefs({ id, p, q }: { id: string; p: string; q: string }) {
  return (
    <defs>
      <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
        <stop offset="0%" stopColor={p} />
        <stop offset="100%" stopColor={q} />
      </linearGradient>
      <radialGradient id={`${id}r`} cx="0.3" cy="0.2" r="0.75" gradientUnits="objectBoundingBox">
        <stop offset="0%" stopColor="rgba(255,255,255,0.26)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </radialGradient>
    </defs>
  );
}

// ── Admin: octagon + Ω ────────────────────────────────────
function AdminBadge({ s, p, q }: { s: number; p: string; q: string }) {
  const id = useUid();
  const oct = "M11.5 2.5 L20.5 2.5 L27.5 9.5 L27.5 22.5 L20.5 29.5 L11.5 29.5 L4.5 22.5 L4.5 9.5 Z";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <GradDefs id={id} p={p} q={q} />
      <path d={oct} fill="rgba(0,0,0,0.38)" transform="translate(0.4,0.7)" />
      <path d={oct} fill={`url(#${id}l)`} />
      <path d={oct} fill={`url(#${id}r)`} />
      <path d="M12.3 4 L19.7 4 L26 10.3 L26 21.7 L19.7 28 L12.3 28 L6 21.7 L6 10.3 Z"
        fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" />
      <text x="16" y="22" textAnchor="middle" fontSize="14" fill="rgba(255,255,255,0.95)"
        fontFamily="Georgia, 'Times New Roman', serif" fontWeight="bold">Ω</text>
    </svg>
  );
}

// ── Developer: hexagon + </> ───────────────────────────────
function DeveloperBadge({ s, p, q }: { s: number; p: string; q: string }) {
  const id = useUid();
  const hex = "M16 2 L28.1 9 L28.1 23 L16 30 L3.9 23 L3.9 9 Z";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <GradDefs id={id} p={q} q={p} />
      <path d={hex} fill="rgba(0,0,0,0.38)" transform="translate(0.4,0.7)" />
      <path d={hex} fill={`url(#${id}l)`} />
      <path d={hex} fill={`url(#${id}r)`} />
      <path d="M16 3.7 L25.6 9.3 L25.6 22.7 L16 28.3 L6.4 22.7 L6.4 9.3 Z"
        fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" />
      <text x="16" y="20.5" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.95)"
        fontFamily="'Courier New', Courier, monospace" fontWeight="bold">&lt;/&gt;</text>
    </svg>
  );
}

// ── Moderator: shield + lightning bolt ────────────────────
function ModeratorBadge({ s, p, q }: { s: number; p: string; q: string }) {
  const id = useUid();
  const shld = "M16 2 L28 7 L28 17 C28 23.5 22.5 28.5 16 30.5 C9.5 28.5 4 23.5 4 17 L4 7 Z";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <GradDefs id={id} p={p} q={q} />
      <path d={shld} fill="rgba(0,0,0,0.38)" transform="translate(0.4,0.7)" />
      <path d={shld} fill={`url(#${id}l)`} />
      <path d={shld} fill={`url(#${id}r)`} />
      <path d="M16 3.5 L27 8 L27 17 C27 23 21.8 27.8 16 29.5 C10.2 27.8 5 23 5 17 L5 8 Z"
        fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" />
      <path d="M18.5 9 L11 18 L16.5 18 L13.5 24 L21 15 L15.5 15 Z" fill="rgba(255,255,255,0.92)" />
    </svg>
  );
}

// ── Premium: diamond + 4-point star ───────────────────────
function PremiumBadge({ s, p, q }: { s: number; p: string; q: string }) {
  const id = useUid();
  const dia = "M16 1.5 L30 14.5 L16 31 L2 14.5 Z";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <GradDefs id={id} p={p} q={q} />
      <path d={dia} fill="rgba(0,0,0,0.38)" transform="translate(0.4,0.7)" />
      <path d={dia} fill={`url(#${id}l)`} />
      <path d={dia} fill={`url(#${id}r)`} />
      <path d="M16 3 L28.5 14.5 L16 29.5 L3.5 14.5 Z"
        fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
      <path d="M16 8 L17.2 13.5 L23 14.5 L17.2 15.5 L16 21 L14.8 15.5 L9 14.5 L14.8 13.5 Z"
        fill="rgba(255,255,255,0.95)" />
    </svg>
  );
}

// ── User: circle + person silhouette ──────────────────────
function UserBadge({ s, p, q }: { s: number; p: string; q: string }) {
  const id = useUid();
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <GradDefs id={id} p={p} q={q} />
      <circle cx="16" cy="16" r="14" fill="rgba(0,0,0,0.38)" transform="translate(0.4,0.7)" />
      <circle cx="16" cy="16" r="14" fill={`url(#${id}l)`} />
      <circle cx="16" cy="16" r="14" fill={`url(#${id}r)`} />
      <circle cx="16" cy="16" r="13.2" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
      <circle cx="16" cy="12.5" r="3.5" fill="rgba(255,255,255,0.88)" />
      <path d="M8.5 25 C8.5 20.5 12 17.5 16 17.5 C20 17.5 23.5 20.5 23.5 25"
        fill="rgba(255,255,255,0.88)" />
    </svg>
  );
}

// ── MIRROR CHROME: hex outline only + "OH" ────────────────
function MirrorChromeBadge({ s, p }: { s: number; p: string }) {
  const hex  = "M16 2 L28.1 9 L28.1 23 L16 30 L3.9 23 L3.9 9 Z";
  const hex2 = "M16 5 L25.5 10.5 L25.5 21.5 L16 27 L6.5 21.5 L6.5 10.5 Z";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path d={hex}  fill="none" stroke={p} strokeWidth="1.2" opacity="0.7" />
      <path d={hex2} fill="none" stroke={p} strokeWidth="0.4" opacity="0.3" />
      <text x="16" y="20" textAnchor="middle" fontSize="8.5" fill={p} opacity="0.92"
        fontFamily="'JetBrains Mono','Courier New',monospace" fontWeight="800" letterSpacing="0.5">OH</text>
    </svg>
  );
}

// ── LIQUID GLASS: dark glass hex + "$" ────────────────────
function LiquidGlassBadge({ s, p }: { s: number; p: string }) {
  const id  = Math.random().toString(36).slice(2, 7);
  const hex = "M16 2 L28.1 9 L28.1 23 L16 30 L3.9 23 L3.9 9 Z";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id={`lg${id}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%"   stopColor="rgba(60,75,100,0.9)" />
          <stop offset="100%" stopColor="rgba(12,16,24,0.98)" />
        </linearGradient>
        <linearGradient id={`lgs${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
          <stop offset="40%"  stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path d={hex} fill={`url(#lg${id})`} />
      <path d="M3.9 10 L28.1 10" stroke={`url(#lgs${id})`} strokeWidth="0.8" />
      <path d={hex} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
      <text x="16" y="21" textAnchor="middle" fontSize="14" fill={p} opacity="0.88"
        fontFamily="Georgia,'Times New Roman',serif" fontWeight="bold">$</text>
    </svg>
  );
}

// ── CRYSTAL: gradient hex + diamond ◆ ─────────────────────
function CrystalBadge({ s, p }: { s: number; p: string }) {
  const id  = Math.random().toString(36).slice(2, 7);
  const hex = "M16 2 L28.1 9 L28.1 23 L16 30 L3.9 23 L3.9 9 Z";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id={`cr${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%"   stopColor="rgba(180,200,230,0.75)" />
          <stop offset="50%"  stopColor="rgba(100,130,170,0.55)" />
          <stop offset="100%" stopColor="rgba(40,55,80,0.85)" />
        </linearGradient>
      </defs>
      <path d={hex} fill={`url(#cr${id})`} />
      <path d={hex} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.7" />
      <path d="M16 9 L21 16 L16 23 L11 16 Z" fill={p} opacity="0.85" />
      <path d="M16 11 L19.5 16 L16 21 L12.5 16 Z" fill="rgba(255,255,255,0.25)" />
    </svg>
  );
}

// ── FROSTED: matte dark hex + triangle ▲ ──────────────────
function FrostedBadge({ s, p }: { s: number; p: string }) {
  const id  = Math.random().toString(36).slice(2, 7);
  const hex = "M16 2 L28.1 9 L28.1 23 L16 30 L3.9 23 L3.9 9 Z";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id={`fr${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(55,65,80,0.95)" />
          <stop offset="100%" stopColor="rgba(20,25,35,0.98)" />
        </linearGradient>
      </defs>
      <path d={hex} fill={`url(#fr${id})`} />
      <path d={hex} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
      <path d="M16 10 L23 22 L9 22 Z" fill={p} opacity="0.80" />
      <path d="M16 12.5 L21 21 L11 21 Z" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

// ── SMOKED: near-black hex + 罰 ───────────────────────────
function SmokedBadge({ s, p }: { s: number; p: string }) {
  const hex = "M16 2 L28.1 9 L28.1 23 L16 30 L3.9 23 L3.9 9 Z";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path d={hex} fill="rgba(14,14,16,0.98)" />
      <path d={hex} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
      <text x="16" y="21.5" textAnchor="middle" fontSize="13" fill={p} opacity="0.75"
        fontFamily="'Noto Sans JP','MS Gothic',sans-serif" fontWeight="bold">罰</text>
    </svg>
  );
}

// ── LIQUID MERCURY: metallic gradient hex + 水 ────────────
function LiquidMercuryBadge({ s, p }: { s: number; p: string }) {
  const id  = Math.random().toString(36).slice(2, 7);
  const hex = "M16 2 L28.1 9 L28.1 23 L16 30 L3.9 23 L3.9 9 Z";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <radialGradient id={`hg${id}`} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0%"   stopColor="rgba(180,190,205,0.9)" />
          <stop offset="50%"  stopColor="rgba(100,115,135,0.75)" />
          <stop offset="100%" stopColor="rgba(30,38,50,0.95)" />
        </radialGradient>
      </defs>
      <path d={hex} fill={`url(#hg${id})`} />
      <path d={hex} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
      <text x="16" y="21.5" textAnchor="middle" fontSize="13" fill={p} opacity="0.85"
        fontFamily="'Noto Sans JP','MS Gothic',sans-serif" fontWeight="bold">水</text>
    </svg>
  );
}

// ── ETCHED: dark hex with inner rings + 刻 ────────────────
function EtchedBadge({ s, p }: { s: number; p: string }) {
  const hex  = "M16 2 L28.1 9 L28.1 23 L16 30 L3.9 23 L3.9 9 Z";
  const hex2 = "M16 5 L25.5 10.5 L25.5 21.5 L16 27 L6.5 21.5 L6.5 10.5 Z";
  const hex3 = "M16 7 L23.8 11.5 L23.8 20.5 L16 25 L8.2 20.5 L8.2 11.5 Z";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path d={hex}  fill="rgba(16,17,19,0.98)" />
      <path d={hex}  fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
      <path d={hex2} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
      <path d={hex3} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
      <text x="16" y="21.5" textAnchor="middle" fontSize="13" fill={p} opacity="0.80"
        fontFamily="'Noto Sans JP','MS Gothic',sans-serif" fontWeight="bold">刻</text>
    </svg>
  );
}

// ── MATTE CARBON: carbon dark hex + -01 ───────────────────
function MatteCarbonBadge({ s, p }: { s: number; p: string }) {
  const hex = "M16 2 L28.1 9 L28.1 23 L16 30 L3.9 23 L3.9 9 Z";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path d={hex} fill="rgba(10,10,12,0.98)" />
      <path d={hex} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.6" />
      <text x="16" y="20" textAnchor="middle" fontSize="9" fill={p} opacity="0.70"
        fontFamily="'JetBrains Mono','Courier New',monospace" fontWeight="700" letterSpacing="0.5">-01</text>
    </svg>
  );
}

// ── ANIMATED GLOW: bright border hex + OG ─────────────────
function AnimatedGlowBadge({ s, p }: { s: number; p: string }) {
  const id  = Math.random().toString(36).slice(2, 7);
  const hex  = "M16 2 L28.1 9 L28.1 23 L16 30 L3.9 23 L3.9 9 Z";
  const hex2 = "M16 4 L26.4 10 L26.4 22 L16 28 L5.6 22 L5.6 10 Z";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <radialGradient id={`ag${id}`} cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <path d={hex}  fill="rgba(18,18,22,0.95)" />
      <path d={hex}  fill={`url(#ag${id})`} />
      <path d={hex}  fill="none" stroke={p} strokeWidth="1.1" opacity="0.9" />
      <path d={hex2} fill="none" stroke={p} strokeWidth="0.3" opacity="0.35" />
      <text x="16" y="20.5" textAnchor="middle" fontSize="9.5" fill={p} opacity="0.95"
        fontFamily="'JetBrains Mono','Courier New',monospace" fontWeight="900" letterSpacing="0.5">OG</text>
    </svg>
  );
}

// ── MYTHIC FLOW: white glow hex + OG ──────────────────────
function MythicFlowBadge({ s, p }: { s: number; p: string }) {
  const id  = Math.random().toString(36).slice(2, 7);
  const hex  = "M16 2 L28.1 9 L28.1 23 L16 30 L3.9 23 L3.9 9 Z";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <radialGradient id={`mf${id}`} cx="0.4" cy="0.3" r="0.65">
          <stop offset="0%"   stopColor="rgba(230,235,245,0.95)" />
          <stop offset="60%"  stopColor="rgba(150,165,195,0.7)" />
          <stop offset="100%" stopColor="rgba(40,50,70,0.92)" />
        </radialGradient>
      </defs>
      <path d={hex} fill={`url(#mf${id})`} />
      <path d={hex} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
      <text x="16" y="20.5" textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,0.92)" opacity="1"
        fontFamily="'JetBrains Mono','Courier New',monospace" fontWeight="900" letterSpacing="0.5">OG</text>
    </svg>
  );
}

// ── Main export ───────────────────────────────────────────
interface BadgeIconProps {
  type: BadgeIconType;
  size?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function BadgeIcon({ type, size = 32, primaryColor, secondaryColor }: BadgeIconProps) {
  const cfg = BADGE_CONFIGS[type];
  const p = primaryColor || cfg.defaultPrimary;
  const q = secondaryColor || cfg.defaultSecondary;

  switch (type) {
    case "admin":          return <AdminBadge s={size} p={p} q={q} />;
    case "developer":      return <DeveloperBadge s={size} p={p} q={q} />;
    case "moderator":      return <ModeratorBadge s={size} p={p} q={q} />;
    case "premium":        return <PremiumBadge s={size} p={p} q={q} />;
    case "user":           return <UserBadge s={size} p={p} q={q} />;
    case "mirror-chrome":  return <MirrorChromeBadge s={size} p={p} />;
    case "liquid-glass":   return <LiquidGlassBadge s={size} p={p} />;
    case "crystal":        return <CrystalBadge s={size} p={p} />;
    case "frosted":        return <FrostedBadge s={size} p={p} />;
    case "smoked":         return <SmokedBadge s={size} p={p} />;
    case "liquid-mercury": return <LiquidMercuryBadge s={size} p={p} />;
    case "etched":         return <EtchedBadge s={size} p={p} />;
    case "matte-carbon":   return <MatteCarbonBadge s={size} p={p} />;
    case "animated-glow":  return <AnimatedGlowBadge s={size} p={p} />;
    case "mythic-flow":    return <MythicFlowBadge s={size} p={p} />;
  }
}

// ── Universal badge renderer (sys badge, emoji, or image) ─
interface BadgeDisplayProps {
  badge: { icon: string; image?: string; name: string; color?: string };
  size?: number;
}

export function BadgeDisplay({ badge, size = 28 }: BadgeDisplayProps) {
  if (badge.image) {
    return (
      <img
        src={badge.image}
        alt={badge.name}
        style={{ width: size, height: size, borderRadius: 4, objectFit: "cover", display: "block", flexShrink: 0 }}
      />
    );
  }
  if (isSysBadge(badge.icon)) {
    const type = getSysBadgeType(badge.icon);
    if (type) return (
      <span className="badge-wrap" style={{ width: size, height: size }}>
        <BadgeIcon type={type} size={size} primaryColor={badge.color || undefined} />
      </span>
    );
  }
  return null;
}

import { For, Show, template } from '@airlib/react';
import { PlayerAvatar } from '@/pages/demos/temporal/components/PlayerAvatar.js';
import { type Player, type RoomStats, WORLD_SIZE } from '@/pages/demos/temporal/function.js';

export interface WorldProps {
  me: Player;
  stats: RoomStats;
  players: (Player | null)[];
}

/**
 * Atmospheric SVG virtual world map with detailed handcrafted biomes and reactive avatars.
 */
export const World = template<WorldProps>(
  ({ players, stats, me }) => (
    <svg
      viewBox={`0 0 ${WORLD_SIZE.width} ${WORLD_SIZE.height}`}
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full select-none"
    >
      <defs>
        {/* Subtle Ambient Dot Grid */}
        <pattern id="dot-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="16" cy="16" r="1" fill="#334155" opacity="0.3" />
        </pattern>

        {/* Biome Ambient Radial Gradients */}
        <radialGradient id="lake-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#0369a1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="forest-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#059669" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#047857" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#047857" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="amphi-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#7e22ce" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#7e22ce" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="fire-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
          <stop offset="40%" stopColor="#ea580c" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="plaza-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#0284c7" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
        </radialGradient>

        {/* Lake Gradients */}
        <radialGradient id="lake-depth" cx="45%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0369a1" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#075985" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.95" />
        </radialGradient>

        <linearGradient id="dock-wood" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="50%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        {/* Stage Linear Gradient */}
        <linearGradient id="stage-wood" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4c1d95" />
          <stop offset="100%" stopColor="#2e1065" />
        </linearGradient>
      </defs>

      {/* 1. Base Dark Canvas & Dot Grid */}
      <rect width={WORLD_SIZE.width} height={WORLD_SIZE.height} fill="#090d16" />
      <rect width={WORLD_SIZE.width} height={WORLD_SIZE.height} fill="url(#dot-grid)" />

      {/* 2. Biome Atmospheric Glow Fields */}
      <circle cx="340" cy="270" r="360" fill="url(#lake-glow)" />
      <circle cx="360" cy="940" r="380" fill="url(#forest-glow)" />
      <circle cx="1640" cy="270" r="360" fill="url(#amphi-glow)" />
      <circle cx="1640" cy="940" r="360" fill="url(#fire-glow)" />
      <circle cx={WORLD_SIZE.width / 2} cy={WORLD_SIZE.height / 2} r="400" fill="url(#plaza-glow)" />

      {/* 3. Connecting Biome Pathways */}
      <g stroke="#1e293b" strokeWidth="2.5" strokeDasharray="8 12" opacity="0.7">
        <line x1={WORLD_SIZE.width / 2} y1={WORLD_SIZE.height / 2} x2="340" y2="270" />
        <line x1={WORLD_SIZE.width / 2} y1={WORLD_SIZE.height / 2} x2="360" y2="940" />
        <line x1={WORLD_SIZE.width / 2} y1={WORLD_SIZE.height / 2} x2="1640" y2="270" />
        <line x1={WORLD_SIZE.width / 2} y1={WORLD_SIZE.height / 2} x2="1640" y2="940" />
      </g>

      {/* 4. Serenity Lake (Top-Left) */}
      <g id="serenity-lake">
        {/* Outer Shore / Beach */}
        <path
          d="M 110,230 C 130,100 450,70 560,180 C 650,270 590,410 470,445 C 320,480 140,430 90,320 Z"
          fill="#0c4a6e"
          stroke="#0284c7"
          strokeWidth="2"
          opacity="0.6"
        />
        {/* Deep Water Lagoon */}
        <path
          d="M 140,240 C 160,130 430,110 530,200 C 600,270 550,380 450,410 C 320,440 160,390 120,310 Z"
          fill="url(#lake-depth)"
          stroke="#38bdf8"
          strokeWidth="1.5"
        />
        {/* Water Ripples */}
        <ellipse cx="320" cy="260" rx="140" ry="70" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.35" />
        <ellipse cx="330" cy="270" rx="80" ry="38" fill="none" stroke="#bae6fd" strokeWidth="1" opacity="0.45" />
        <ellipse cx="340" cy="275" rx="30" ry="14" fill="#e0f2fe" opacity="0.25" />

        {/* Wooden Fishing Pier */}
        <rect x="420" y="340" width="90" height="26" rx="4" transform="rotate(-30 420 340)" fill="url(#dock-wood)" stroke="#57300a" strokeWidth="1.5" />
        <line x1="425" y1="335" x2="495" y2="295" stroke="#451a03" strokeWidth="2" />
        <circle cx="500" cy="292" r="5" fill="#fef08a" opacity="0.9" />

        {/* Lilypads with Blossoms */}
        <g transform="translate(220, 220)">
          <circle cx="0" cy="0" r="14" fill="#047857" stroke="#059669" strokeWidth="1.5" />
          <path d="M 0 0 L 12 -4" stroke="#064e3b" strokeWidth="2" />
          <circle cx="-2" cy="-2" r="4" fill="#f472b6" />
        </g>
        <g transform="translate(390, 200)">
          <circle cx="0" cy="0" r="16" fill="#047857" stroke="#059669" strokeWidth="1.5" />
          <circle cx="1" cy="1" r="5" fill="#fb7185" />
        </g>
        <g transform="translate(260, 340)">
          <circle cx="0" cy="0" r="12" fill="#047857" stroke="#059669" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="3" fill="#ffffff" />
        </g>

        {/* Biome Label */}
        <text
          x="330"
          y="130"
          fill="#38bdf8"
          fontSize="13"
          fontWeight="700"
          letterSpacing="2"
          textAnchor="middle"
          className="select-none font-sans uppercase opacity-90"
        >
          Serenity Lake
        </text>
      </g>

      {/* 5. Botanical Forest (Bottom-Left) */}
      <g id="botanical-forest">
        {/* Forest Clearing Moss Floor */}
        <ellipse cx="360" cy="940" rx="260" ry="170" fill="#064e3b" opacity="0.4" />
        <ellipse cx="360" cy="940" rx="180" ry="110" fill="#047857" opacity="0.3" />

        {/* Ancient Stone Ruins Arch */}
        <rect x="300" y="900" width="16" height="55" rx="3" fill="#334155" stroke="#475569" strokeWidth="1.5" />
        <rect x="380" y="900" width="16" height="55" rx="3" fill="#334155" stroke="#475569" strokeWidth="1.5" />
        <rect x="290" y="890" width="116" height="15" rx="4" fill="#475569" stroke="#64748b" strokeWidth="1.5" />
        <circle cx="348" cy="897" r="4" fill="#34d399" opacity="0.9" />

        {/* Tree Canopy Layer 1 (Outer Deep Pines) */}
        <circle cx="160" cy="860" r="52" fill="#064e3b" stroke="#065f46" strokeWidth="2" />
        <circle cx="230" cy="810" r="60" fill="#047857" stroke="#059669" strokeWidth="2" />
        <circle cx="480" cy="840" r="64" fill="#064e3b" stroke="#065f46" strokeWidth="2" />
        <circle cx="540" cy="920" r="54" fill="#047857" stroke="#059669" strokeWidth="2" />
        <circle cx="180" cy="1010" r="56" fill="#065f46" stroke="#047857" strokeWidth="2" />
        <circle cx="490" cy="1020" r="58" fill="#064e3b" stroke="#065f46" strokeWidth="2" />

        {/* Tree Canopy Layer 2 (Inner Lush Oaks) */}
        <circle cx="240" cy="920" r="48" fill="#059669" stroke="#10b981" strokeWidth="2" />
        <circle cx="440" cy="940" r="50" fill="#059669" stroke="#10b981" strokeWidth="2" />
        <circle cx="340" cy="1030" r="52" fill="#047857" stroke="#059669" strokeWidth="2" />

        {/* Bioluminescent Flora & Fireflies */}
        <circle cx="290" cy="980" r="5" fill="#34d399" opacity="0.9" />
        <circle cx="410" cy="990" r="4" fill="#a7f3d0" opacity="0.85" />
        <circle cx="350" cy="850" r="4.5" fill="#6ee7b7" opacity="0.9" />
        <circle cx="220" cy="870" r="3.5" fill="#34d399" opacity="0.8" />
        <circle cx="460" cy="890" r="4" fill="#a7f3d0" opacity="0.8" />

        {/* Biome Label */}
        <text
          x="360"
          y="740"
          fill="#34d399"
          fontSize="13"
          fontWeight="700"
          letterSpacing="2"
          textAnchor="middle"
          className="select-none font-sans uppercase opacity-90"
        >
          Botanical Forest
        </text>
      </g>

      {/* 6. Amphitheater (Top-Right) */}
      <g id="amphitheater">
        {/* Arena Steppes */}
        <path d="M 1440,250 Q 1640,310 1840,250" fill="none" stroke="#581c87" strokeWidth="8" strokeLinecap="round" opacity="0.6" />
        <path d="M 1400,310 Q 1640,380 1880,310" fill="none" stroke="#581c87" strokeWidth="8" strokeLinecap="round" opacity="0.5" />
        <path d="M 1360,370 Q 1640,460 1920,370" fill="none" stroke="#3b0764" strokeWidth="8" strokeLinecap="round" opacity="0.4" />

        {/* Neon Step Accents */}
        <path d="M 1440,250 Q 1640,310 1840,250" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <path d="M 1400,310 Q 1640,380 1880,310" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

        {/* Main Performance Stage */}
        <rect x="1540" y="150" width="200" height="60" rx="10" fill="url(#stage-wood)" stroke="#9333ea" strokeWidth="2" />
        <circle cx="1640" cy="180" r="18" fill="#581c87" stroke="#e879f9" strokeWidth="1.5" />
        <polygon points="1640,168 1650,186 1630,186" fill="#e879f9" opacity="0.9" />

        {/* Stage Footlights */}
        <circle cx="1560" cy="205" r="4" fill="#f0abfc" />
        <circle cx="1600" cy="205" r="4" fill="#f0abfc" />
        <circle cx="1640" cy="205" r="4" fill="#f0abfc" />
        <circle cx="1680" cy="205" r="4" fill="#f0abfc" />
        <circle cx="1720" cy="205" r="4" fill="#f0abfc" />

        {/* Biome Label */}
        <text
          x="1640"
          y="115"
          fill="#c084fc"
          fontSize="13"
          fontWeight="700"
          letterSpacing="2"
          textAnchor="middle"
          className="select-none font-sans uppercase opacity-90"
        >
          Amphitheater
        </text>
      </g>

      {/* 7. Campfire Lounge (Bottom-Right) */}
      <g id="campfire-lounge">
        {/* Warm Ground Ring */}
        <circle cx="1640" cy="940" rx="200" ry="140" fill="#451a03" opacity="0.35" />

        {/* Wooden Bench Logs Surrounding Fire */}
        <rect x="1520" y="924" width="24" height="32" rx="6" fill="#78350f" stroke="#92400e" strokeWidth="2" />
        <circle cx="1532" cy="940" r="6" fill="#92400e" />
        <rect x="1736" y="924" width="24" height="32" rx="6" fill="#78350f" stroke="#92400e" strokeWidth="2" />
        <circle cx="1748" cy="940" r="6" fill="#92400e" />
        <rect x="1624" y="820" width="32" height="24" rx="6" fill="#78350f" stroke="#92400e" strokeWidth="2" />
        <circle cx="1640" cy="832" r="6" fill="#92400e" />
        <rect x="1624" y="1036" width="32" height="24" rx="6" fill="#78350f" stroke="#92400e" strokeWidth="2" />
        <circle cx="1640" cy="1048" r="6" fill="#92400e" />

        {/* Stone Firepit Ring */}
        <circle cx="1640" cy="940" r="46" fill="#1e293b" stroke="#475569" strokeWidth="3" />
        <circle cx="1640" cy="940" r="32" fill="#451a03" stroke="#b45309" strokeWidth="2" />

        {/* Crossed Campfire Logs */}
        <line x1="1622" y1="922" x2="1658" y2="958" stroke="#78350f" strokeWidth="8" strokeLinecap="round" />
        <line x1="1658" y1="922" x2="1622" y2="958" stroke="#78350f" strokeWidth="8" strokeLinecap="round" />

        {/* Blazing Campfire Flame Layers */}
        <circle cx="1640" cy="940" r="20" fill="#ea580c" opacity="0.95" />
        <circle cx="1640" cy="938" r="14" fill="#f97316" />
        <circle cx="1640" cy="936" r="8" fill="#fde047" />
        <circle cx="1640" cy="934" r="4" fill="#ffffff" />

        {/* Floating Embers */}
        <circle cx="1634" cy="916" r="2" fill="#fed7aa" />
        <circle cx="1646" cy="910" r="2.5" fill="#fde047" />
        <circle cx="1640" cy="902" r="1.5" fill="#f97316" />

        {/* Biome Label */}
        <text
          x="1640"
          y="770"
          fill="#fbbf24"
          fontSize="13"
          fontWeight="700"
          letterSpacing="2"
          textAnchor="middle"
          className="select-none font-sans uppercase opacity-90"
        >
          Campfire Lounge
        </text>
      </g>

      {/* 8. Central Spawn Plaza */}
      <g id="central-plaza">
        {/* Outer Courtyard Dial Ring */}
        <circle
          cx={WORLD_SIZE.width / 2}
          cy={WORLD_SIZE.height / 2}
          r="180"
          fill="#0b1329"
          stroke="#0284c7"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          opacity="0.85"
        />

        {/* Inner Sunken Plaza */}
        <circle
          cx={WORLD_SIZE.width / 2}
          cy={WORLD_SIZE.height / 2}
          r="130"
          fill="#082f49"
          stroke="#38bdf8"
          strokeWidth="1.5"
          opacity="0.6"
        />

        {/* Cardinal Compass Runes */}
        <g stroke="#38bdf8" strokeWidth="2" opacity="0.65">
          <line x1={WORLD_SIZE.width / 2} y1={WORLD_SIZE.height / 2 - 170} x2={WORLD_SIZE.width / 2} y2={WORLD_SIZE.height / 2 - 140} />
          <line x1={WORLD_SIZE.width / 2} y1={WORLD_SIZE.height / 2 + 140} x2={WORLD_SIZE.width / 2} y2={WORLD_SIZE.height / 2 + 170} />
          <line x1={WORLD_SIZE.width / 2 - 170} y1={WORLD_SIZE.height / 2} x2={WORLD_SIZE.width / 2 - 140} y2={WORLD_SIZE.height / 2} />
          <line x1={WORLD_SIZE.width / 2 + 140} y1={WORLD_SIZE.height / 2} x2={WORLD_SIZE.width / 2 + 170} y2={WORLD_SIZE.height / 2} />
        </g>

        {/* Central Fountain Basin */}
        <circle
          cx={WORLD_SIZE.width / 2}
          cy={WORLD_SIZE.height / 2}
          r="60"
          fill="#0284c7"
          stroke="#7dd3fc"
          strokeWidth="2"
          opacity="0.8"
        />
        <circle
          cx={WORLD_SIZE.width / 2}
          cy={WORLD_SIZE.height / 2}
          r="36"
          fill="#38bdf8"
          stroke="#e0f2fe"
          strokeWidth="1.5"
          opacity="0.9"
        />
        <circle cx={WORLD_SIZE.width / 2} cy={WORLD_SIZE.height / 2} r="16" fill="#ffffff" />

        {/* Plaza Title */}
        <text
          x={WORLD_SIZE.width / 2}
          y={WORLD_SIZE.height / 2 - 200}
          fill="#7dd3fc"
          fontSize="13"
          fontWeight="700"
          letterSpacing="2"
          textAnchor="middle"
          className="select-none font-sans uppercase opacity-90"
        >
          Spawn Plaza
        </text>
      </g>

      {/* 9. Player Slots Layer */}
      <g id="players-layer">
        <Show when={() => stats.activeCount}>
          <PlayerAvatar player={me} isSelf={true} />
        </Show>
        <For each={() => players}>
          {(player) => (
            <Show when={() => (player?.id !== me.id ? player : null)}>{(p) => <PlayerAvatar player={p} />}</Show>
          )}
        </For>
      </g>
    </svg>
  ),
  'World'
);

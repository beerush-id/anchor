import { Show, template } from '@airlib/react';
import { PLAYER_RADIUS, type Player } from '@/pages/demos/temporal/function.js';

export interface PlayerAvatarProps {
  player: Player;
  isSelf?: boolean;
}

/**
 * Pure SVG player avatar with dynamic nametag and temporal speech bubble.
 */
export const PlayerAvatar = template<PlayerAvatarProps>(
  ({ player, isSelf }) => (
    <g
      style={{
        transform: `translate(${player.x}px, ${player.y}px)`,
        transition: isSelf ? undefined : 'transform 300ms linear',
      }}
    >
      {/* Speech Bubble */}
      <Show when={() => player.message}>
        {(message) => {
          const width = Math.max(80, Math.min(240, message.length * 8.5 + 28));
          const half = width / 2;

          return (
            <g className="animate-in fade-in zoom-in-95 duration-150" transform="translate(0, -36)">
              {/* Bubble Background */}
              <rect
                x={-half}
                y="-34"
                width={width}
                height="32"
                rx="10"
                fill={player.color}
                stroke="#0f172a"
                strokeWidth="1.5"
              />
              {/* Tail Arrow */}
              <polygon points="-6,-2 6,-2 0,4" fill={player.color} stroke="#0f172a" strokeWidth="1.5" />
              <polygon points="-5,-3 5,-3 0,3" fill={player.color} />
              {/* Message Text */}
              <text
                x="0"
                y="-17"
                fill="#ffffff"
                fontSize="13"
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="middle"
                className="select-none font-sans"
              >
                {message}
              </text>
            </g>
          );
        }}
      </Show>

      {/* Self Indicator Ring */}
      <Show when={() => isSelf}>
        <circle
          r={PLAYER_RADIUS + 5}
          fill="none"
          stroke={player.color}
          strokeWidth="1.5"
          strokeDasharray="4 2"
          className="animate-spin opacity-75 origin-center"
          style={{ animationDuration: '6s' }}
        />
      </Show>

      {/* Avatar Body */}
      <circle
        r={PLAYER_RADIUS}
        fill={player.color}
        stroke={isSelf ? '#ffffff' : '#0f172a'}
        strokeWidth={isSelf ? 2.5 : 2}
        className="cursor-pointer"
      />
      <circle r="4" fill="#ffffff" opacity="0.9" />

      {/* Player Nametag */}
      <g transform="translate(0, 24)">
        <rect x="-40" y="-8" width="80" height="16" rx="4" fill={isSelf ? '#0284c7' : '#0f172a'} opacity="0.85" />
        <text
          x="0"
          y="0"
          fill="#ffffff"
          fontSize="10"
          fontWeight={isSelf ? '700' : '500'}
          textAnchor="middle"
          dominantBaseline="middle"
          className="select-none font-sans"
        >
          {player.name}
        </text>
      </g>
    </g>
  ),
  'PlayerAvatar'
);

/* Backlit car for the landing stage.

   Drawn as a silhouette on purpose: the hero lights the car from behind and
   above, so the shape reads off its rim light rather than its surface detail.
   That keeps it convincing as vector art and crisp at any size.

   To swap in a 3D render or a photograph later, replace the <CarSilhouette />
   in Landing.jsx with an <img className="stage-car" /> — the stage sizes and
   lights whatever sits in that slot. */
export default function CarSilhouette({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 640 230"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="car-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12203a" />
          <stop offset="0.55" stopColor="#080f1d" />
          <stop offset="1" stopColor="#03060c" />
        </linearGradient>

        <linearGradient id="car-glass" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#7fbcff" stopOpacity="0.42" />
          <stop offset="1" stopColor="#0b3a70" stopOpacity="0.22" />
        </linearGradient>

        {/* brightest where the key light hits the roof, falling off either end */}
        <linearGradient id="car-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#007ffa" stopOpacity="0" />
          <stop offset="0.28" stopColor="#79c0ff" stopOpacity="0.95" />
          <stop offset="0.62" stopColor="#e8f4ff" />
          <stop offset="1" stopColor="#007ffa" stopOpacity="0.12" />
        </linearGradient>

        <linearGradient id="car-rocker" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#007ffa" stopOpacity="0" />
          <stop offset="0.5" stopColor="#007ffa" stopOpacity="0.6" />
          <stop offset="1" stopColor="#007ffa" stopOpacity="0" />
        </linearGradient>

        <radialGradient id="car-lamp-glow">
          <stop offset="0" stopColor="#cfe6ff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#cfe6ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* contact shadow, drawn first so the car sits in it */}
      <ellipse cx="318" cy="192" rx="288" ry="17" fill="#01030a" opacity="0.6" />

      {/* body */}
      <path
        d="M58 186 L58 152
           C60 139 68 130 82 126
           L134 110
           C156 103 178 96 202 90
           L258 74
           C300 63 352 60 400 65
           L474 74
           C516 80 546 96 562 118
           C571 131 574 149 572 165
           L570 186
           L516 186
           A40 40 0 0 0 436 186
           L208 186
           A40 40 0 0 0 128 186 Z"
        fill="url(#car-body)"
      />

      {/* greenhouse */}
      <path
        d="M218 93
           C240 84 264 78 290 74
           C332 67 378 67 418 72
           L466 79
           C486 83 500 91 509 102
           L226 102 Z"
        fill="url(#car-glass)"
      />

      {/* B-pillar splits the glass into two windows */}
      <path d="M370 68 L380 68 L384 102 L374 102 Z" fill="#060c17" />

      {/* rim light: the roofline catching the lamp */}
      <path
        d="M202 90 L258 74
           C300 63 352 60 400 65
           L474 74
           C516 80 546 96 562 118"
        stroke="url(#car-rim)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* bounce off the lit floor along the sill */}
      <path
        d="M206 181 L438 181"
        stroke="url(#car-rocker)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* wheels */}
      <circle cx="168" cy="178" r="40" fill="#02040a" />
      <circle cx="168" cy="178" r="21" stroke="#4a7cb8" strokeWidth="2.5" opacity="0.6" />
      <circle cx="476" cy="178" r="40" fill="#02040a" />
      <circle cx="476" cy="178" r="21" stroke="#4a7cb8" strokeWidth="2.5" opacity="0.6" />

      {/* lamps */}
      <circle cx="76" cy="141" r="30" fill="url(#car-lamp-glow)" opacity="0.45" />
      <path d="M61 137 L90 131 L92 143 L62 148 Z" fill="#e8f4ff" />
      <path d="M556 127 L571 137 L569 151 L551 142 Z" fill="#007ffa" opacity="0.85" />
    </svg>
  );
}

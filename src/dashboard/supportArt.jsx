/* Support composer icons and the empty-thread illustration.
 *
 * The three icons are the Material Symbols shapes dropped in src/assets as
 * mic.svg / send.svg / attach.svg, inlined here rather than imported as files.
 * An <img src="mic.svg"> cannot be recoloured, so it would stay #1f1f1f on the
 * dark theme and on the ink-filled send button. As JSX with fill="currentColor"
 * each one takes the colour of the button it sits in.
 *
 * They keep the original 0 -960 960 960 viewBox, which is Material's baseline
 * grid — the paths are unmodified, so they can be swapped for other Material
 * icons without rescaling anything.
 */

const base = {
  viewBox: "0 -960 960 960",
  fill: "currentColor",
  "aria-hidden": true,
};

export function MicIcon({ size = 20 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M395-435q-35-35-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35q-50 0-85-35Zm85-205Zm-40 520v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T480-320q83 0 141.5-58.5T680-520h80q0 105-68 184t-172 93v123h-80Zm68.5-371.5Q520-503 520-520v-240q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760v240q0 17 11.5 28.5T480-480q17 0 28.5-11.5Z" />
    </svg>
  );
}

export function SendIcon({ size = 20 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z" />
    </svg>
  );
}

export function AttachIcon({ size = 20 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M720-330q0 104-73 177T470-80q-104 0-177-73t-73-177v-370q0-75 52.5-127.5T400-880q75 0 127.5 52.5T580-700v350q0 46-32 78t-78 32q-46 0-78-32t-32-78v-370h80v370q0 13 8.5 21.5T470-320q13 0 21.5-8.5T500-350v-350q-1-42-29.5-71T400-800q-42 0-71 29t-29 71v370q-1 71 49 120.5T470-160q70 0 119-49.5T640-330v-390h80v390Z" />
    </svg>
  );
}

/* The assistant's mark: a chat bubble with a face in it. Reads as a bot at
   22px on the launcher, which a generic speech bubble does not — the point of
   the button is that this is the machine, and Support is the person. */
export function BotIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v2.5" />
      <circle cx="12" cy="2.4" r="1.1" fill="currentColor" stroke="none" />
      <rect x="3.5" y="5.5" width="17" height="13" rx="4.5" />
      <path d="M9 18.5L7.5 22l4.5-3.5" />
      <circle cx="9" cy="11.4" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11.4" r="1.35" fill="currentColor" stroke="none" />
      <path d="M9.6 14.8a4 4 0 0 0 4.8 0" />
    </svg>
  );
}

/* The support.png illustration, redrawn as vector.
 *
 * The original was a 294 KB bitmap of a headset agent at a laptop, ringed by a
 * chat bubble, envelopes and a phone. Redrawn rather than traced: a trace of a
 * raster keeps its anti-aliased edges as thousands of points and its colours as
 * literals, so it would neither scale cleanly nor follow the theme. This is a
 * few hundred bytes, sharp at any size, and drawn in currentColor plus two
 * opacities so it sits correctly on light and dark.
 */
export function SupportIllustration({ size = 168 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Ardena support"
    >
      {/* the soft disc the original sets its subject against */}
      <circle cx="100" cy="92" r="58" fill="currentColor" opacity="0.07" stroke="none" />

      {/* headset: band over the head, cup at the ear, boom mic to the mouth */}
      <path d="M70 82a30 30 0 0 1 60 0" />
      <rect x="62" y="80" width="12" height="22" rx="6" fill="currentColor" opacity="0.18" />
      <rect x="126" y="80" width="12" height="22" rx="6" fill="currentColor" opacity="0.18" />
      <path d="M126 100v6a10 10 0 0 1-10 10h-8" />
      <circle cx="105" cy="116" r="4" fill="currentColor" stroke="none" />

      {/* head and shoulders */}
      <path d="M78 88v14a22 22 0 0 0 44 0V88" />
      <path d="M78 88a22 22 0 0 1 44 0" fill="currentColor" opacity="0.18" stroke="none" />
      <circle cx="90" cy="97" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="110" cy="97" r="2.6" fill="currentColor" stroke="none" />
      <path d="M94 107a9 9 0 0 0 12 0" />
      <path d="M64 156a36 36 0 0 1 72 0" fill="currentColor" opacity="0.12" stroke="none" />
      <path d="M64 156a36 36 0 0 1 72 0" />

      {/* laptop */}
      <path d="M52 158h96l10 14H42z" fill="currentColor" opacity="0.12" stroke="none" />
      <path d="M52 158h96l10 14H42z" />
      <path d="M30 172h140" />

      {/* chat bubble, top left */}
      <path d="M20 44h36a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H36l-10 9v-9h-6a6 6 0 0 1-6-6V50a6 6 0 0 1 6-6Z" />
      <circle cx="29" cy="59" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="38" cy="59" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="47" cy="59" r="2.4" fill="currentColor" stroke="none" />

      {/* envelope, top right */}
      <rect x="140" y="40" width="44" height="30" rx="5" />
      <path d="M140 47l22 15 22-15" />

      {/* handset, right */}
      <path d="M150 108c0 18 12 30 30 30a5 5 0 0 0 5-5v-8a4 4 0 0 0-3-4l-8-2a4 4 0 0 0-4 1l-3 3a24 24 0 0 1-9-9l3-3a4 4 0 0 0 1-4l-2-8a4 4 0 0 0-4-3h-8a5 5 0 0 0-5 5Z" />
    </svg>
  );
}

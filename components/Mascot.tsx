/** "Sparky" — original star mascot, drawn as inline SVG. */
export default function Mascot({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Sparky the star mascot"
      className="shrink-0"
    >
      <polygon
        points="32,4 40,24 62,25 45,39 51,60 32,48 13,60 19,39 2,25 24,24"
        fill="#FFC83D"
        stroke="#3B2A1A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="26" cy="31" r="2.8" fill="#3B2A1A" />
      <circle cx="38" cy="31" r="2.8" fill="#3B2A1A" />
      <path
        d="M27 39 Q32 44 37 39"
        fill="none"
        stroke="#3B2A1A"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

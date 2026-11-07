// Brújula's mark: a compass with a tilted needle. Uses currentColor, so it takes the text color where it is placed.
export default function BrujulaLogo({ className }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="20.5" stroke="currentColor" strokeWidth="3" />
      <g transform="rotate(35 24 24)">
        <path d="M24 8.5 30 24H18L24 8.5Z" fill="currentColor" />
        <path d="M24 39.5 18 24h12l-6 15.5Z" fill="currentColor" opacity="0.4" />
      </g>
      <circle cx="24" cy="24" r="2.5" fill="currentColor" />
    </svg>
  );
}

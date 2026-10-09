export function Crown({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M4 11l6 5 6-9 6 9 6-5-3 14H7z"
        fill="#ffd23f"
        stroke="#c98a00"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="7" y="24" width="18" height="4" rx="1.5" fill="#ffb800" />
      <circle cx="16" cy="6" r="2" fill="#ffd23f" />
      <circle cx="4" cy="10" r="2" fill="#ffd23f" />
      <circle cx="28" cy="10" r="2" fill="#ffd23f" />
    </svg>
  );
}

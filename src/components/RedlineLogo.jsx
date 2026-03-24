export default function RedlineLogo({ className = '' }) {
  return (
    <svg className={`h-10 ${className}`} viewBox="0 0 280 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Redline Gear Cleaning">
      {/* Helmet/flame mark */}
      <g transform="translate(0, 5)">
        {/* Stylized fire helmet shape */}
        <path d="M25 4 C15 4, 6 12, 6 22 C6 32, 12 40, 20 44 L25 48 L30 44 C38 40, 44 32, 44 22 C44 12, 35 4, 25 4Z" fill="#c41e24" />
        <path d="M25 8 C18 8, 10 14, 10 22 C10 30, 15 36, 22 40 L25 42 L28 40 C35 36, 40 30, 40 22 C40 14, 32 8, 25 8Z" fill="#1a2a4a" />
        {/* Flame inside */}
        <path d="M25 16 C22 20, 18 24, 20 30 C21 33, 23 35, 25 36 C27 35, 29 33, 30 30 C32 24, 28 20, 25 16Z" fill="#c41e24" opacity="0.9" />
        <path d="M25 22 C23.5 25, 22 27, 23 30 C23.5 31.5, 24.5 32.5, 25 33 C25.5 32.5, 26.5 31.5, 27 30 C28 27, 26.5 25, 25 22Z" fill="#f59e0b" opacity="0.8" />
      </g>
      {/* REDLINE text */}
      <text x="55" y="32" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="26" fill="#c41e24" letterSpacing="1">REDLINE</text>
      {/* Accent lines under text */}
      <line x1="55" y1="38" x2="185" y2="38" stroke="#1a2a4a" strokeWidth="2.5" />
      <line x1="55" y1="42" x2="170" y2="42" stroke="#c41e24" strokeWidth="1.5" />
      <line x1="55" y1="45" x2="150" y2="45" stroke="#f59e0b" strokeWidth="1" />
      {/* Subtitle */}
      <text x="55" y="56" fontFamily="Inter, sans-serif" fontWeight="500" fontSize="8" fill="#6b7280" letterSpacing="2.5">GEAR CLEANING</text>
    </svg>
  );
}

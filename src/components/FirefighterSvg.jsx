export default function FirefighterSvg({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 300 520" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Firefighter in turnout gear">
      {/* Helmet */}
      <g>
        {/* Helmet brim */}
        <ellipse cx="150" cy="52" rx="52" ry="10" fill="#2d2d2d"/>
        {/* Helmet dome */}
        <path d="M100 52 C100 25, 120 8, 150 8 C180 8, 200 25, 200 52 L200 55 L100 55 Z" fill="#1a1a1a"/>
        {/* Helmet front shield */}
        <rect x="128" y="30" width="44" height="20" rx="3" fill="#c41e24"/>
        <text x="150" y="44" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold" fontFamily="Inter, sans-serif">FD</text>
        {/* Helmet ear flaps */}
        <path d="M102 52 L98 70 L110 68 L108 52Z" fill="#2d2d2d"/>
        <path d="M198 52 L202 70 L190 68 L192 52Z" fill="#2d2d2d"/>
      </g>
      
      {/* Face/SCBA mask area */}
      <g>
        <ellipse cx="150" cy="82" rx="28" ry="22" fill="#e8d4b8"/>
        {/* SCBA mask */}
        <path d="M130 75 C130 68, 140 64, 150 64 C160 64, 170 68, 170 75 L170 90 C170 97, 160 102, 150 102 C140 102, 130 97, 130 90Z" fill="#3a3a3a" opacity="0.7"/>
        <ellipse cx="150" cy="82" rx="15" ry="12" fill="#5a7a9a" opacity="0.5"/>
      </g>

      {/* Neck/Hood */}
      <rect x="132" y="100" width="36" height="15" rx="4" fill="#1a1a1a"/>

      {/* Jacket - Turnout coat */}
      <g>
        {/* Main jacket body */}
        <path d="M95 115 L90 290 L210 290 L205 115 C205 115, 180 110, 150 110 C120 110, 95 115, 95 115Z" fill="#c8b44a"/>
        {/* Jacket darker panel */}
        <path d="M100 115 L96 285 L145 285 L145 115 C145 115, 120 112, 100 115Z" fill="#b8a43a"/>
        <path d="M155 115 L155 285 L204 285 L200 115 C200 115, 180 112, 155 115Z" fill="#b8a43a"/>
        
        {/* Center zipper/flap */}
        <rect x="145" y="115" width="10" height="175" fill="#a8942a"/>
        <line x1="150" y1="120" x2="150" y2="285" stroke="#8a7a1a" strokeWidth="1" strokeDasharray="4 3"/>
        
        {/* Collar */}
        <path d="M100 115 C100 115, 120 108, 150 108 C180 108, 200 115, 200 115 L200 125 C200 125, 180 118, 150 118 C120 118, 100 125, 100 125Z" fill="#b8a43a"/>

        {/* Reflective stripes - 3 horizontal bands */}
        <rect x="90" y="180" width="120" height="6" rx="1" fill="#e8e8d0" opacity="0.9"/>
        <rect x="90" y="190" width="120" height="3" rx="1" fill="#f0a020" opacity="0.8"/>
        <rect x="90" y="197" width="120" height="6" rx="1" fill="#e8e8d0" opacity="0.9"/>
        
        <rect x="90" y="245" width="120" height="6" rx="1" fill="#e8e8d0" opacity="0.9"/>
        <rect x="90" y="255" width="120" height="3" rx="1" fill="#f0a020" opacity="0.8"/>
        <rect x="90" y="262" width="120" height="6" rx="1" fill="#e8e8d0" opacity="0.9"/>

        {/* Pockets */}
        <rect x="105" y="215" width="35" height="25" rx="2" fill="#a89430" stroke="#9a8420" strokeWidth="1"/>
        <rect x="160" y="215" width="35" height="25" rx="2" fill="#a89430" stroke="#9a8420" strokeWidth="1"/>
        <line x1="105" y1="220" x2="140" y2="220" stroke="#9a8420" strokeWidth="0.5"/>
        <line x1="160" y1="220" x2="195" y2="220" stroke="#9a8420" strokeWidth="0.5"/>
      </g>

      {/* Arms / Sleeves */}
      <g>
        {/* Left arm */}
        <path d="M95 120 L60 170 L55 240 L75 245 L80 180 L95 145Z" fill="#c8b44a"/>
        {/* Left arm reflective */}
        <rect x="55" y="195" width="22" height="5" rx="1" fill="#e8e8d0" opacity="0.9" transform="rotate(-5, 66, 197)"/>
        <rect x="55" y="204" width="22" height="3" rx="1" fill="#f0a020" opacity="0.8" transform="rotate(-5, 66, 205)"/>
        <rect x="55" y="210" width="22" height="5" rx="1" fill="#e8e8d0" opacity="0.9" transform="rotate(-5, 66, 212)"/>
        
        {/* Right arm */}
        <path d="M205 120 L240 170 L245 240 L225 245 L220 180 L205 145Z" fill="#c8b44a"/>
        {/* Right arm reflective */}
        <rect x="223" y="195" width="22" height="5" rx="1" fill="#e8e8d0" opacity="0.9" transform="rotate(5, 234, 197)"/>
        <rect x="223" y="204" width="22" height="3" rx="1" fill="#f0a020" opacity="0.8" transform="rotate(5, 234, 205)"/>
        <rect x="223" y="210" width="22" height="5" rx="1" fill="#e8e8d0" opacity="0.9" transform="rotate(5, 234, 212)"/>
      </g>

      {/* Gloves */}
      <g>
        <ellipse cx="62" cy="252" rx="14" ry="10" fill="#1a1a1a"/>
        <ellipse cx="238" cy="252" rx="14" ry="10" fill="#1a1a1a"/>
        {/* Glove cuffs */}
        <rect x="50" y="238" width="24" height="10" rx="3" fill="#2a2a2a"/>
        <rect x="226" y="238" width="24" height="10" rx="3" fill="#2a2a2a"/>
      </g>

      {/* Pants */}
      <g>
        {/* Left leg */}
        <path d="M96 285 L92 440 L135 440 L140 285Z" fill="#c8b44a"/>
        {/* Right leg */}
        <path d="M160 285 L165 440 L208 440 L204 285Z" fill="#c8b44a"/>
        
        {/* Pants reflective stripes */}
        <rect x="92" y="360" width="43" height="5" rx="1" fill="#e8e8d0" opacity="0.9"/>
        <rect x="92" y="369" width="43" height="3" rx="1" fill="#f0a020" opacity="0.8"/>
        <rect x="92" y="376" width="43" height="5" rx="1" fill="#e8e8d0" opacity="0.9"/>
        
        <rect x="165" y="360" width="43" height="5" rx="1" fill="#e8e8d0" opacity="0.9"/>
        <rect x="165" y="369" width="43" height="3" rx="1" fill="#f0a020" opacity="0.8"/>
        <rect x="165" y="376" width="43" height="5" rx="1" fill="#e8e8d0" opacity="0.9"/>

        {/* Pants darker inseam */}
        <path d="M140 285 L143 440 L160 440 L157 285Z" fill="#b8a43a" opacity="0.5"/>
      </g>

      {/* Boots */}
      <g>
        {/* Left boot */}
        <path d="M88 435 L88 475 C88 480, 90 485, 95 485 L140 485 C145 485, 147 480, 147 475 L147 435Z" fill="#1a1a1a"/>
        <rect x="88" y="435" width="59" height="8" rx="2" fill="#2d2d2d"/>
        {/* Boot sole */}
        <rect x="85" y="483" width="65" height="6" rx="2" fill="#0a0a0a"/>
        {/* Boot reflective trim */}
        <rect x="88" y="455" width="59" height="3" rx="1" fill="#e8e8d0" opacity="0.6"/>
        
        {/* Right boot */}
        <path d="M153 435 L153 475 C153 480, 155 485, 160 485 L205 485 C210 485, 212 480, 212 475 L212 435Z" fill="#1a1a1a"/>
        <rect x="153" y="435" width="59" height="8" rx="2" fill="#2d2d2d"/>
        <rect x="150" y="483" width="65" height="6" rx="2" fill="#0a0a0a"/>
        <rect x="153" y="455" width="59" height="3" rx="1" fill="#e8e8d0" opacity="0.6"/>
      </g>

      {/* SCBA tank on back (visible edges) */}
      <g opacity="0.3">
        <rect x="125" y="130" width="50" height="80" rx="10" fill="#333" />
      </g>
    </svg>
  );
}

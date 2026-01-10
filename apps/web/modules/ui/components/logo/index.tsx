export const Logo = (props: any) => {
  return (
    <svg viewBox="0 0 697 150" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="hivecfm-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="hexagon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>

      {/* Honeycomb/Hexagon Icon */}
      <g transform="translate(20, 30)">
        {/* Main hexagon */}
        <path d="M45 10 L75 25 L75 65 L45 80 L15 65 L15 25 Z" fill="url(#hexagon-gradient)" />
        {/* Inner hexagon pattern */}
        <path d="M45 22 L63 32 L63 52 L45 62 L27 52 L27 32 Z" fill="white" fillOpacity="0.3" />
        {/* Center dot */}
        <circle cx="45" cy="45" r="8" fill="white" fillOpacity="0.9" />
      </g>

      {/* Divider line */}
      <line x1="115" y1="33" x2="115" y2="120" stroke="#CBD5E1" strokeWidth="1.5" />

      {/* HiveCFM Text */}
      <text
        x="135"
        y="90"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="56"
        fontWeight="700"
        fill="url(#hivecfm-gradient)">
        HiveCFM
      </text>
    </svg>
  );
};

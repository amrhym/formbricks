interface FormbricksLogoProps {
  className?: string;
}

// HiveCFM: Renamed but kept export name for backward compatibility
export const FormbricksLogo = ({ className }: FormbricksLogoProps) => {
  return (
    <svg
      width="220"
      height="220"
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}>
      <defs>
        <linearGradient id="hivecfm-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      {/* HiveCFM Hexagon Icon */}
      <g transform="translate(35, 30)">
        {/* Outer hexagon */}
        <path d="M75 15 L135 50 L135 120 L75 155 L15 120 L15 50 Z" fill="url(#hivecfm-icon-gradient)" />
        {/* Inner hexagon pattern */}
        <path d="M75 35 L115 60 L115 105 L75 130 L35 105 L35 60 Z" fill="white" fillOpacity="0.25" />
        {/* Center honeycomb cells */}
        <circle cx="75" cy="85" r="18" fill="white" fillOpacity="0.9" />
        <circle cx="55" cy="70" r="8" fill="white" fillOpacity="0.4" />
        <circle cx="95" cy="70" r="8" fill="white" fillOpacity="0.4" />
        <circle cx="55" cy="100" r="8" fill="white" fillOpacity="0.4" />
        <circle cx="95" cy="100" r="8" fill="white" fillOpacity="0.4" />
      </g>
    </svg>
  );
};

// Alias for new naming convention
export const HiveCFMLogo = FormbricksLogo;

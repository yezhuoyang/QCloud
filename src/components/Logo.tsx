interface LogoProps {
  size?: 'small' | 'medium' | 'large'
}

function Logo({ size = 'medium' }: LogoProps) {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-16 h-16',
    large: 'w-32 h-32'
  }

  return (
    <div className={`${sizeClasses[size]} relative`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#logoGradient)"
          strokeWidth="2"
        />
        <circle cx="50" cy="50" r="8" fill="#6366f1" />
        <ellipse
          cx="50"
          cy="50"
          rx="30"
          ry="15"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="1.5"
          transform="rotate(45 50 50)"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="30"
          ry="15"
          fill="none"
          stroke="#6366f1"
          strokeWidth="1.5"
          transform="rotate(-45 50 50)"
        />
      </svg>
    </div>
  )
}

export default Logo

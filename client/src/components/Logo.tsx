// Baawa logo variants as inline SVG React components.
// Inline SVG ensures Manrope (loaded via Google Fonts) renders correctly.

interface LogoProps {
  height?: number
}

// Full wordmark for light backgrounds (dark text)
export function LogoLight({ height = 36 }: LogoProps) {
  const w = height * (260 / 80)
  return (
    <svg width={w} height={height} viewBox="0 0 260 80" xmlns="http://www.w3.org/2000/svg">
      <text x="10" y="55" fontFamily="'Manrope', sans-serif">
        <tspan fill="#0A0A0A" fontSize="48" fontWeight="700">baa</tspan>
        <tspan fill="#0A0A0A" fontSize="48" fontWeight="300">wa</tspan>
        <tspan fill="#FF6B35" fontSize="48" fontWeight="300">{'>'}</tspan>
      </text>
    </svg>
  )
}

// Full wordmark for dark backgrounds (white text)
export function LogoDark({ height = 36 }: LogoProps) {
  const w = height * (260 / 80)
  return (
    <svg width={w} height={height} viewBox="0 0 260 80" xmlns="http://www.w3.org/2000/svg">
      <text x="10" y="55" fontFamily="'Manrope', sans-serif">
        <tspan fill="#FFFFFF" fontSize="48" fontWeight="700">baa</tspan>
        <tspan fill="#FFFFFF" fontSize="48" fontWeight="300">wa</tspan>
        <tspan fill="#FF6B35" fontSize="48" fontWeight="300">{'>'}</tspan>
      </text>
    </svg>
  )
}

// Compact icon (bw>) for dark backgrounds — sidebar, mobile header
export function LogoIcon({ height = 36 }: LogoProps) {
  const w = height * (100 / 80)
  return (
    <svg width={w} height={height} viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">
      <text x="12" y="55" fontFamily="'Manrope', sans-serif">
        <tspan fill="#FFFFFF" fontSize="36" fontWeight="700">b</tspan>
        <tspan fill="#FFFFFF" fontSize="36" fontWeight="300">w</tspan>
        <tspan fill="#FF6B35" fontSize="36" fontWeight="300">{'>'}</tspan>
      </text>
    </svg>
  )
}

// Square symbol — use as standalone mark
export function LogoSymbol({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="80" rx="8" fill="#FF6B35" />
      <text x="22" y="58" fill="#0A0A0A" fontFamily="'Manrope', sans-serif" fontSize="48" fontWeight="300">{'>'}</text>
    </svg>
  )
}

import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const BASE_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Online session — matches the thin line-icon style used in the bottom nav. */
export function MonitorIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <rect x="3" y="4.5" width="18" height="12" rx="2.2" />
      <path d="M8.3 20h7.4M12 16.5V20" />
    </svg>
  )
}

/** In-person session — matches the thin line-icon style used in the bottom nav. */
export function HomeIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  )
}

/** Coin/currency mark for the quick "mark as paid" action. */
export function CoinIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.8v8.4M9.6 9.4c0-1 1-1.7 2.4-1.7s2.4.6 2.4 1.5c0 2-4.8 1-4.8 3 0 .9 1 1.6 2.4 1.6s2.4-.7 2.4-1.7" />
    </svg>
  )
}

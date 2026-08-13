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

/** Couple client avatar — matches the thin line-icon style used in the bottom nav. */
export function CoupleIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <circle cx="8.5" cy="8.7" r="3" />
      <circle cx="15.5" cy="8.7" r="3" />
      <path d="M3.3 19c.5-3.2 2.5-4.9 5.2-4.9s4.7 1.7 5.2 4.9" />
      <path d="M10.3 19c.5-3.2 2.5-4.9 5.2-4.9s4.7 1.7 5.2 4.9" />
    </svg>
  )
}

/** Euro mark for the quick "mark as paid" action. */
export function CoinIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M15 8.2c-3.5-1.7-7 .6-7 3.8s3.5 5.5 7 3.8" />
      <path d="M6.6 10.6h6.1M6.6 13.2h5.3" />
    </svg>
  )
}

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

/** Call action — matches the thin line-icon style used elsewhere. */
export function PhoneIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M5.5 4.5h3l1.4 4-2 1.7a12 12 0 0 0 5.9 5.9l1.7-2 4 1.4v3a1.6 1.6 0 0 1-1.7 1.6C10.8 19.8 4.2 13.2 3.9 6.2A1.6 1.6 0 0 1 5.5 4.5Z" />
    </svg>
  )
}

/** WhatsApp/chat action — matches the thin line-icon style used elsewhere. */
export function ChatIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M12 4a8 8 0 0 0-6.9 12l-1.1 4 4.1-1.1A8 8 0 1 0 12 4Z" />
      <path d="M8.7 9.8c.2 2.5 2 4.3 4.5 4.5" />
    </svg>
  )
}

/** Edit action — matches the thin line-icon style used elsewhere. */
export function EditIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M15.2 4.6 19.4 8.8 8.6 19.6H4.4v-4.2Z" />
      <path d="M13.4 6.4l3.9 3.9" />
    </svg>
  )
}

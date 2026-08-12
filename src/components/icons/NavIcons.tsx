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

export function SunIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.2 12H1.8M22.2 12h-2.4M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" />
    </svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <rect x="3.5" y="5" width="17" height="16" rx="3.5" />
      <path d="M8 3v4M16 3v4M3.5 10.5h17" />
      <circle cx="8.2" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.2" cy="17.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PeopleIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <circle cx="9" cy="8.3" r="3" />
      <path d="M3.5 20c.6-3.5 2.9-5.3 5.5-5.3s4.9 1.8 5.5 5.3" />
      <circle cx="17" cy="7.8" r="2.3" opacity="0.6" />
      <path d="M15.3 14.6c2.2.2 3.7 1.9 4.2 4.7" opacity="0.6" />
    </svg>
  )
}

export function SlidersIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M4 6h9M17 6h3" />
      <path d="M4 12h3M11 12h9" />
      <path d="M4 18h9M17 18h3" />
      <circle cx="14" cy="6" r="2.1" />
      <circle cx="7" cy="12" r="2.1" />
      <circle cx="14" cy="18" r="2.1" />
    </svg>
  )
}

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

/** Close ("✕") — sheets/modals and small dismiss/delete buttons. */
export function CloseIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

/** Previous ("‹") — month/week/day paging and back links. */
export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M14.5 5l-7 7 7 7" />
    </svg>
  )
}

/** Next ("›") — month/week/day paging. */
export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M9.5 5l7 7-7 7" />
    </svg>
  )
}

/** Forward/disclosure ("→") — links that lead deeper into a flow. */
export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  )
}

/** Warning triangle — inline caution notices. */
export function WarningIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M12 3.5 21 19.5H3L12 3.5Z" />
      <path d="M12 9.5v5" />
      <circle cx="12" cy="17.1" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Archive box — archiving a patient. */
export function ArchiveIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <rect x="3.5" y="4.5" width="17" height="4.5" rx="1.3" />
      <path d="M4.5 9v9a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V9" />
      <path d="M10 13.2h4" />
    </svg>
  )
}

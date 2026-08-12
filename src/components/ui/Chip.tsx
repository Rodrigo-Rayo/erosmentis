import type { ButtonHTMLAttributes } from 'react'
import styles from './Chip.module.css'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  tone?: 'neutral' | 'accent' | 'positive' | 'pending' | 'negative'
}

export function Chip({ selected = false, tone = 'neutral', className, ...rest }: ChipProps) {
  const classes = [
    styles.chip,
    selected ? styles.selected : '',
    styles[tone],
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <button type="button" className={classes} aria-pressed={selected} {...rest} />
}

import type { Client, ServiceType, Session } from '@/domain/types'

function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function buildEventBlock(
  session: Session,
  client: Client | undefined,
  serviceType: ServiceType | undefined,
): string {
  const start = new Date(session.startAt)
  const end = new Date(session.startAt + session.durationMin * 60_000)
  const summary = escapeIcsText(`Sesión con ${client?.displayName ?? 'paciente'} — Erosmentis`)
  const description = escapeIcsText(serviceType?.name ?? '')

  return [
    'BEGIN:VEVENT',
    `UID:${session.id}@erosmentis`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Sesión mañana',
    'TRIGGER:-P1D',
    'END:VALARM',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Sesión en 1 hora',
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
  ].join('\r\n')
}

function wrapCalendar(eventBlocks: string[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Erosmentis//Sesiones//ES',
    'CALSCALE:GREGORIAN',
    ...eventBlocks,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function buildSessionReminderIcs(
  session: Session,
  client: Client | undefined,
  serviceType: ServiceType | undefined,
): string {
  return wrapCalendar([buildEventBlock(session, client, serviceType)])
}

export function buildSessionsReminderIcs(
  sessions: Session[],
  client: Client | undefined,
  serviceType: ServiceType | undefined,
): string {
  return wrapCalendar(sessions.map((session) => buildEventBlock(session, client, serviceType)))
}

function triggerIcsDownload(ics: string, filenameHint: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filenameHint}.ics`
  link.click()
  URL.revokeObjectURL(url)
}

function slug(name: string | undefined, fallback: string): string {
  return name ? name.replace(/\s+/g, '-').toLowerCase() : fallback
}

export function downloadSessionReminder(
  session: Session,
  client: Client | undefined,
  serviceType: ServiceType | undefined,
): void {
  const ics = buildSessionReminderIcs(session, client, serviceType)
  triggerIcsDownload(ics, `sesion-${slug(client?.displayName, 'recordatorio')}`)
}

export function downloadSessionsReminder(
  sessions: Session[],
  client: Client | undefined,
  serviceType: ServiceType | undefined,
): void {
  if (sessions.length === 0) return
  const ics = buildSessionsReminderIcs(sessions, client, serviceType)
  triggerIcsDownload(ics, `sesiones-${slug(client?.displayName, 'recordatorio')}`)
}

import Dexie, { type EntityTable } from 'dexie'
import type {
  AppSettings,
  Client,
  Package,
  Payment,
  ServiceType,
  Session,
} from '@/domain/types'

export class PsicoAgendaDB extends Dexie {
  clients!: EntityTable<Client, 'id'>
  serviceTypes!: EntityTable<ServiceType, 'id'>
  sessions!: EntityTable<Session, 'id'>
  packages!: EntityTable<Package, 'id'>
  payments!: EntityTable<Payment, 'id'>
  settings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super('psicoagenda')

    this.version(1).stores({
      clients: 'id, searchName, status, updatedAt',
      serviceTypes: 'id, sortOrder, isArchived',
      sessions:
        'id, startAt, clientId, packageId, paymentStatus, attendance, seriesId, [clientId+startAt], [paymentStatus+startAt], [attendance+startAt]',
      packages: 'id, clientId, status, [clientId+status]',
      payments: 'id, paidAt, clientId, sessionId, packageId, [clientId+paidAt]',
      settings: 'id',
    })

    // Only 'updating' is hooked, not 'creating': every create* repository function already
    // stamps updatedAt explicitly, and bulkAdd/put during backup restore must preserve the
    // original historical updatedAt rather than having it overwritten to "now".
    this.clients.hook('updating', (mods) => ({ ...mods, updatedAt: Date.now() }))
    this.serviceTypes.hook('updating', (mods) => ({ ...mods, updatedAt: Date.now() }))
    this.sessions.hook('updating', (mods) => ({ ...mods, updatedAt: Date.now() }))
    this.packages.hook('updating', (mods) => ({ ...mods, updatedAt: Date.now() }))
    this.payments.hook('updating', (mods) => ({ ...mods, updatedAt: Date.now() }))
  }
}

export const db = new PsicoAgendaDB()

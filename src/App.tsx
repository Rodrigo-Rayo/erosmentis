import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation, type Location } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { SelectedDayProvider } from '@/app/SelectedDayContext'
import { AppShell } from '@/app/layout/AppShell'
import { DayScreen } from '@/features/day/DayScreen'
import { BackupReminder } from '@/features/settings/backup/BackupReminder'
import { UpdatePrompt } from '@/pwa/UpdatePrompt'
import { useTheme } from '@/hooks/useTheme'

// DayScreen ("/") stays a static import — it's the default route, so it should be in the
// initial bundle. Everything else lazy-loads on first visit instead of paying for Settings,
// the backup/crypto/zod stack, and every sheet screen on first paint of the default route.
const MonthScreen = lazy(() =>
  import('@/features/month/MonthScreen').then((m) => ({ default: m.MonthScreen })),
)
const ClientListScreen = lazy(() =>
  import('@/features/clients/ClientListScreen').then((m) => ({ default: m.ClientListScreen })),
)
const ClientDetailScreen = lazy(() =>
  import('@/features/clients/ClientDetailScreen').then((m) => ({ default: m.ClientDetailScreen })),
)
const SettingsScreen = lazy(() =>
  import('@/features/settings/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
)
const BackupScreen = lazy(() =>
  import('@/features/settings/backup/BackupScreen').then((m) => ({ default: m.BackupScreen })),
)
const ServiceTypesScreen = lazy(() =>
  import('@/features/settings/serviceTypes/ServiceTypesScreen').then((m) => ({
    default: m.ServiceTypesScreen,
  })),
)
const WorkingHoursScreen = lazy(() =>
  import('@/features/settings/workingHours/WorkingHoursScreen').then((m) => ({
    default: m.WorkingHoursScreen,
  })),
)
const NewSessionSheet = lazy(() =>
  import('@/features/sessions/NewSessionSheet').then((m) => ({ default: m.NewSessionSheet })),
)
const SessionDetailSheet = lazy(() =>
  import('@/features/sessions/SessionDetailSheet').then((m) => ({ default: m.SessionDetailSheet })),
)
const NewClientSheet = lazy(() =>
  import('@/features/clients/NewClientSheet').then((m) => ({ default: m.NewClientSheet })),
)
const EditClientSheet = lazy(() =>
  import('@/features/clients/EditClientSheet').then((m) => ({ default: m.EditClientSheet })),
)
const NewPackageSheet = lazy(() =>
  import('@/features/packages/NewPackageSheet').then((m) => ({ default: m.NewPackageSheet })),
)

interface SheetNavigationState {
  backgroundLocation?: Location
  presetClientId?: string
  presetStartAt?: number
}

export function App() {
  useTheme()
  const location = useLocation()
  const navState = location.state as SheetNavigationState | null
  const backgroundLocation = navState?.backgroundLocation

  return (
    <SelectedDayProvider>
      <ToastProvider>
        <UpdatePrompt />
        <BackupReminder />
        <Suspense fallback={null}>
          <Routes location={backgroundLocation ?? location}>
            <Route
              path="/"
              element={
                <AppShell>
                  <DayScreen />
                </AppShell>
              }
            />
            <Route
              path="/mes"
              element={
                <AppShell>
                  <MonthScreen />
                </AppShell>
              }
            />
            <Route
              path="/clientes"
              element={
                <AppShell>
                  <ClientListScreen />
                </AppShell>
              }
            />
            <Route
              path="/clientes/:id"
              element={
                <AppShell>
                  <ClientDetailScreen />
                </AppShell>
              }
            />
            <Route
              path="/ajustes"
              element={
                <AppShell>
                  <SettingsScreen />
                </AppShell>
              }
            />
            <Route
              path="/ajustes/backup"
              element={
                <AppShell>
                  <BackupScreen />
                </AppShell>
              }
            />
            <Route
              path="/ajustes/tipos-de-sesion"
              element={
                <AppShell>
                  <ServiceTypesScreen />
                </AppShell>
              }
            />
            <Route
              path="/ajustes/horario"
              element={
                <AppShell>
                  <WorkingHoursScreen />
                </AppShell>
              }
            />
            {!backgroundLocation && (
              <>
                <Route
                  path="/sesion/nueva"
                  element={
                    <AppShell>
                      <NewSessionSheet presetStartAt={navState?.presetStartAt} />
                    </AppShell>
                  }
                />
                <Route
                  path="/sesion/:id"
                  element={
                    <AppShell>
                      <SessionDetailSheet />
                    </AppShell>
                  }
                />
                <Route
                  path="/clientes/nuevo"
                  element={
                    <AppShell>
                      <NewClientSheet />
                    </AppShell>
                  }
                />
                <Route
                  path="/clientes/:id/editar"
                  element={
                    <AppShell>
                      <EditClientSheet />
                    </AppShell>
                  }
                />
                <Route
                  path="/clientes/:clientId/bono/nuevo"
                  element={
                    <AppShell>
                      <NewPackageSheet />
                    </AppShell>
                  }
                />
              </>
            )}
          </Routes>
        </Suspense>

        {backgroundLocation && (
          <Suspense fallback={null}>
            <Routes>
              <Route
                path="/sesion/nueva"
                element={
                  <NewSessionSheet
                    presetClientId={navState?.presetClientId}
                    presetStartAt={navState?.presetStartAt}
                  />
                }
              />
              <Route path="/sesion/:id" element={<SessionDetailSheet />} />
              <Route path="/clientes/nuevo" element={<NewClientSheet />} />
              <Route path="/clientes/:id/editar" element={<EditClientSheet />} />
              <Route path="/clientes/:clientId/bono/nuevo" element={<NewPackageSheet />} />
            </Routes>
          </Suspense>
        )}
      </ToastProvider>
    </SelectedDayProvider>
  )
}

import { Routes, Route, useLocation, type Location } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AppShell } from '@/app/layout/AppShell'
import { DayScreen } from '@/features/day/DayScreen'
import { MonthScreen } from '@/features/month/MonthScreen'
import { ClientListScreen } from '@/features/clients/ClientListScreen'
import { ClientDetailScreen } from '@/features/clients/ClientDetailScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { BackupScreen } from '@/features/settings/backup/BackupScreen'
import { NewSessionSheet } from '@/features/sessions/NewSessionSheet'
import { SessionDetailSheet } from '@/features/sessions/SessionDetailSheet'
import { NewClientSheet } from '@/features/clients/NewClientSheet'
import { EditClientSheet } from '@/features/clients/EditClientSheet'
import { NewPackageSheet } from '@/features/packages/NewPackageSheet'
import { UpdatePrompt } from '@/pwa/UpdatePrompt'
import { useTheme } from '@/hooks/useTheme'

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
    <ToastProvider>
      <UpdatePrompt />
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

      {backgroundLocation && (
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
      )}
    </ToastProvider>
  )
}

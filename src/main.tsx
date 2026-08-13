import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { seedIfNeeded } from '@/db/seed'
import { getErrorMessage } from '@/domain/errors'
import { App } from './App'
import { ErrorBoundary } from './app/ErrorBoundary'
import { ErrorScreen } from './app/ErrorScreen'
import '@/styles/global.css'

export const APP_ERROR_EVENT = 'app:error'

window.addEventListener('unhandledrejection', (event) => {
  // Log the message only, not the raw reason — a Dexie BulkError (e.g. from a failed backup
  // import) carries the failing records in `.failures`, which can include patient names,
  // phone numbers, and session notes that shouldn't land verbatim in the browser console.
  const message = getErrorMessage(event.reason)
  console.error('Unhandled promise rejection:', message)
  window.dispatchEvent(new CustomEvent(APP_ERROR_EVENT, { detail: message }))
})

const root = createRoot(document.getElementById('root')!)

seedIfNeeded()
  .then(() => {
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </StrictMode>,
    )
  })
  .catch((error: unknown) => {
    console.error('Failed to open the local database:', getErrorMessage(error))
    root.render(
      <StrictMode>
        <ErrorScreen
          title="No se pudo abrir la base de datos"
          description="Cierra la app del todo (no solo minimizarla) y vuelve a abrirla. Si sigue sin funcionar, puede que el móvil se haya quedado sin espacio."
        />
      </StrictMode>,
    )
  })

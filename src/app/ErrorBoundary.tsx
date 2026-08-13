import { Component, type ReactNode } from 'react'
import { getErrorMessage } from '@/domain/errors'
import { ErrorScreen } from './ErrorScreen'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    // Message only — see main.tsx's unhandledrejection handler for why the raw error object
    // (which can carry patient data via Dexie's BulkError.failures) never goes to console.
    console.error('Unhandled render error:', getErrorMessage(error))
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          title="Algo ha ido mal"
          description="La app ha encontrado un error inesperado. Tus datos siguen guardados en el móvil — recarga para continuar."
        />
      )
    }
    return this.props.children
  }
}

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 300, gap: 12, color: '#6b7280',
        }}>
          <AlertTriangle size={32} color="#dc2626" />
          <p style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>
            Ocurrió un error inesperado
          </p>
          <p style={{ fontSize: 13, maxWidth: 400, textAlign: 'center' }}>
            {this.state.error.message}
          </p>
          <button
            className="btn-secondary"
            onClick={() => this.setState({ error: null })}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

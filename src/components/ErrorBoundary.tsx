import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in StudyLab:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#FAFAF8] dark:bg-[#18181A] p-6 text-[#242426] dark:text-[#ECEAE5]">
          <div className="w-full max-w-lg rounded-xl border border-[#E2E0D8] dark:border-[#2F2F33] bg-white dark:bg-[#202023] p-6 shadow-lg flex flex-col gap-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <AlertTriangle size={28} strokeWidth={1.75} />
            </div>

            <h1 className="font-serif text-xl font-bold">
              Algo interrumpió la carga de StudyLab
            </h1>

            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              La aplicación encontró un detalle al inicializar. Podés recargar la ventana o regresar al panel principal.
            </p>

            {this.state.error && (
              <div className="mt-2 text-left rounded-md bg-neutral-100 dark:bg-[#18181A] p-3 text-xs font-mono text-red-600 dark:text-red-400 overflow-x-auto max-h-36">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-2 rounded-md bg-[#3B5169] text-white px-4 py-2 text-xs font-medium hover:bg-[#2B3D50] transition-colors cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Recargar Aplicación</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center gap-2 rounded-md border border-[#E2E0D8] dark:border-[#2F2F33] px-4 py-2 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <Home size={14} />
                <span>Ir al Inicio</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function RouteErrorBoundary() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[360px] my-auto">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 mb-3">
        <AlertTriangle size={24} strokeWidth={1.75} />
      </div>
      <h2 className="font-serif text-lg font-semibold text-text-primary mb-1">
        No se pudo cargar este módulo
      </h2>
      <p className="text-xs text-text-muted max-w-md mb-4">
        Ocurrió un detalle al inicializar los datos de esta vista. Podés reintentar la carga o volver al inicio.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-border-subtle bg-bg-elevated text-xs font-sans text-text-primary hover:border-accent-primary transition-colors cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Reintentar</span>
        </button>
        <button
          type="button"
          onClick={() => { window.location.href = "/"; }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-accent-primary text-white text-xs font-sans hover:bg-accent-hover transition-colors cursor-pointer"
        >
          <Home size={13} />
          <span>Ir al Inicio</span>
        </button>
      </div>
    </div>
  );
}

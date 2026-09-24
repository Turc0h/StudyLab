import { Suspense, lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Shell } from "./components/layout/Shell";
import { RouteErrorBoundary } from "./components/ErrorBoundary";

// DashboardPage se mantiene precargada para render inmediato del inicio
import { DashboardPage } from "./pages/DashboardPage";

// Módulos secundarios con carga diferida (lazy code splitting) para optimizar cold start
const MethodsPage = lazy(() => import("./pages/MethodsPage").then((m) => ({ default: m.MethodsPage })));
const PdfPage = lazy(() => import("./pages/PdfPage").then((m) => ({ default: m.PdfPage })));
const OcrPage = lazy(() => import("./pages/OcrPage").then((m) => ({ default: m.OcrPage })));
const BookScannerPage = lazy(() => import("./pages/BookScannerPage").then((m) => ({ default: m.BookScannerPage })));
const AmbientPage = lazy(() => import("./pages/AmbientPage").then((m) => ({ default: m.AmbientPage })));
const AcademicWorkspace = lazy(() => import("./pages/AcademicWorkspace"));
const KnowledgeGraph = lazy(() => import("./pages/KnowledgeGraph").then((m) => ({ default: m.KnowledgeGraph })));
const Files = lazy(() => import("./pages/Files"));
const Session = lazy(() => import("./pages/Session").then((m) => ({ default: m.Session })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const QaHubPage = lazy(() => import("./pages/QaHubPage").then((m) => ({ default: m.QaHubPage })));
const StyleKit = lazy(() => import("./pages/style-kit/StyleKit").then((m) => ({ default: m.StyleKit })));
const CalendarPage = lazy(() => import("./pages/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const ContextEngineDashboard = lazy(() =>
  import("./features/context-engine/ContextEngineDashboard").then((m) => ({ default: m.ContextEngineDashboard }))
);
const FloatingIslandWidget = lazy(() =>
  import("./pages/FloatingIslandWidget").then((m) => ({ default: m.FloatingIslandWidget }))
);

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center font-sans text-sm text-text-muted">
      Cargando módulo académico...
    </div>
  );
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: withSuspense(<DashboardPage />) },
      { path: "methods", element: withSuspense(<MethodsPage />) },
      { path: "pdf", element: withSuspense(<PdfPage />) },
      { path: "ocr", element: withSuspense(<OcrPage />) },
      { path: "books", element: withSuspense(<BookScannerPage />) },
      { path: "ambient", element: withSuspense(<AmbientPage />) },
      { path: "academic", element: withSuspense(<AcademicWorkspace />) },
      { path: "workspace", element: withSuspense(<AcademicWorkspace />) },
      { path: "graph", element: withSuspense(<KnowledgeGraph />) },
      { path: "files", element: withSuspense(<Files />) },
      { path: "session", element: withSuspense(<Session />) },
      { path: "settings", element: withSuspense(<Settings />) },
      { path: "context", element: withSuspense(<ContextEngineDashboard />) },
      { path: "calendar", element: withSuspense(<CalendarPage />) },
      { path: "organization", element: withSuspense(<CalendarPage />) },
      { path: "qa", element: withSuspense(<QaHubPage />) },
      { path: "verificacion", element: withSuspense(<QaHubPage />) },
    ],
  },
  { path: "/kit", element: withSuspense(<StyleKit />) },
  { path: "/island-widget", element: withSuspense(<FloatingIslandWidget />) },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;

import { Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Shell } from "./components/layout/Shell";
import { RouteErrorBoundary } from "./components/ErrorBoundary";

import { DashboardPage } from "./pages/DashboardPage";
import { MethodsPage } from "./pages/MethodsPage";
import { PdfPage } from "./pages/PdfPage";
import { OcrPage } from "./pages/OcrPage";
import { AmbientPage } from "./pages/AmbientPage";
import Files from "./pages/Files";
import { Session } from "./pages/Session";
import { Settings } from "./pages/Settings";
import { Workspace } from "./pages/Workspace";
import { KnowledgeGraph } from "./pages/KnowledgeGraph";
import AcademicWorkspace from "./pages/AcademicWorkspace";
import { BookScannerPage } from "./pages/BookScannerPage";
import { QaHubPage } from "./pages/QaHubPage";
import { StyleKit } from "./pages/style-kit/StyleKit";

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
      { path: "workspace", element: withSuspense(<Workspace />) },
      { path: "graph", element: withSuspense(<KnowledgeGraph />) },
      { path: "files", element: withSuspense(<Files />) },
      { path: "session", element: withSuspense(<Session />) },
      { path: "settings", element: withSuspense(<Settings />) },
      { path: "qa", element: withSuspense(<QaHubPage />) },
      { path: "verificacion", element: withSuspense(<QaHubPage />) },
    ],
  },
  { path: "/kit", element: withSuspense(<StyleKit />) },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;

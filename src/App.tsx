import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Shell } from "./components/layout/Shell";

const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const MethodsPage = lazy(() => import("./pages/MethodsPage").then((m) => ({ default: m.MethodsPage })));
const PdfPage = lazy(() => import("./pages/PdfPage").then((m) => ({ default: m.PdfPage })));
const OcrPage = lazy(() => import("./pages/OcrPage").then((m) => ({ default: m.OcrPage })));
const AmbientPage = lazy(() => import("./pages/AmbientPage").then((m) => ({ default: m.AmbientPage })));

// Optional legacy/companion views
const Files = lazy(() => import("./pages/Files").then((m) => ({ default: m.Files })));
const Session = lazy(() => import("./pages/Session").then((m) => ({ default: m.Session })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const Workspace = lazy(() => import("./pages/Workspace").then((m) => ({ default: m.Workspace })));
const KnowledgeGraph = lazy(() =>
  import("./pages/KnowledgeGraph").then((m) => ({ default: m.KnowledgeGraph })),
);
const AcademicWorkspace = lazy(() =>
  import("./pages/AcademicWorkspace").then((m) => ({ default: m.AcademicWorkspace })),
);
const StyleKit = lazy(() =>
  import("./pages/style-kit/StyleKit").then((m) => ({ default: m.StyleKit })),
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
    children: [
      { index: true, element: withSuspense(<DashboardPage />) },
      { path: "methods", element: withSuspense(<MethodsPage />) },
      { path: "pdf", element: withSuspense(<PdfPage />) },
      { path: "ocr", element: withSuspense(<OcrPage />) },
      { path: "ambient", element: withSuspense(<AmbientPage />) },
      { path: "academic", element: withSuspense(<AcademicWorkspace />) },
      { path: "workspace", element: withSuspense(<Workspace />) },
      { path: "graph", element: withSuspense(<KnowledgeGraph />) },
      { path: "files", element: withSuspense(<Files />) },
      { path: "session", element: withSuspense(<Session />) },
      { path: "settings", element: withSuspense(<Settings />) },
    ],
  },
  { path: "/kit", element: withSuspense(<StyleKit />) },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;

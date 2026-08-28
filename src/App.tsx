import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "./layouts/AppShell";

const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Files = lazy(() => import("./pages/Files").then((m) => ({ default: m.Files })));
const Methods = lazy(() => import("./pages/Methods").then((m) => ({ default: m.Methods })));
const Session = lazy(() => import("./pages/Session").then((m) => ({ default: m.Session })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const StyleKit = lazy(() =>
  import("./pages/style-kit/StyleKit").then((m) => ({ default: m.StyleKit })),
);

function PageFallback() {
  return <div className="p-10 text-sm text-text-tertiary">Cargando…</div>;
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: withSuspense(<Dashboard />) },
      { path: "files", element: withSuspense(<Files />) },
      { path: "methods", element: withSuspense(<Methods />) },
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

import { Outlet } from "react-router-dom";
import { AmbientBackground } from "../components/AmbientBackground";
import { MobileNav } from "../components/nav/MobileNav";
import { Sidebar } from "../components/nav/Sidebar";
import { AmbientPlayer } from "../features/ambient-sound/AmbientPlayer";
import { useSyncTheme } from "../hooks/useSyncTheme";

export function AppShell() {
  useSyncTheme();

  return (
    <>
      <AmbientBackground />
      <div className="relative z-10 flex h-screen overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-10 pb-24 md:px-10 md:py-12 md:pb-12">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <AmbientPlayer />
    </>
  );
}

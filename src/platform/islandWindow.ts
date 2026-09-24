/**
 * StudyLab Platform Window Manager
 * Handles launching, focusing, hiding and synchronizing the Floating Island as a dedicated
 * Desktop Overlay Window (always-on-top, borderless, transparent) and managing the
 * Base Application visibility (minimize to Windows System Tray / Iconos Ocultos).
 */

import { isDesktop } from "./platform";

let webIslandWindowRef: Window | null = null;

export async function openFloatingIslandWindow(): Promise<void> {
  if (isDesktop()) {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const existing = await WebviewWindow.getByLabel("island");
      if (existing) {
        await existing.show();
        await existing.setFocus();
        await existing.setAlwaysOnTop(true);
        return;
      }

      // Si no existe, crear la ventana flotante siempre visible
      const newWin = new WebviewWindow("island", {
        url: "/island-widget",
        title: "StudyLab Island",
        width: 390,
        height: 180,
        transparent: true,
        decorations: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
      });

      await newWin.once("tauri://created", () => {
        void newWin.show();
        void newWin.setFocus();
        void newWin.setAlwaysOnTop(true);
      });
      return;
    } catch (err) {
      console.warn("[IslandWindow] Error al invocar WebviewWindow de Tauri:", err);
    }
  }

  // Fallback para Web / Navegador: Ventana Pop-out flotante compacta
  try {
    const width = 390;
    const height = 180;
    const left = Math.max(0, Math.round(window.screen.availWidth / 2 - width / 2));
    const top = 20;

    if (webIslandWindowRef && !webIslandWindowRef.closed) {
      webIslandWindowRef.focus();
      return;
    }

    webIslandWindowRef = window.open(
      "/island-widget",
      "StudyLabIsland",
      `width=${width},height=${height},top=${top},left=${left},resizable=no,scrollbars=no,status=no,location=no,toolbar=no,menubar=no`
    );
  } catch (err) {
    console.error("[IslandWindow] Fallo al abrir ventana pop-out web:", err);
  }
}

export async function closeFloatingIslandWindow(): Promise<void> {
  if (isDesktop()) {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const existing = await WebviewWindow.getByLabel("island");
      if (existing) {
        await existing.hide();
      }
      return;
    } catch {
      // Ignorar si no está corriendo en Tauri
    }
  }

  if (webIslandWindowRef && !webIslandWindowRef.closed) {
    webIslandWindowRef.close();
    webIslandWindowRef = null;
  }
}

export async function toggleFloatingIslandWindow(): Promise<void> {
  if (isDesktop()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("toggle_island_window");
      return;
    } catch {
      // Fallback si invoke falla
    }
  }

  if (webIslandWindowRef && !webIslandWindowRef.closed) {
    webIslandWindowRef.close();
    webIslandWindowRef = null;
  } else {
    await openFloatingIslandWindow();
  }
}

export async function hideMainWindow(): Promise<void> {
  if (isDesktop()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("hide_main_window");
      return;
    } catch (err) {
      console.warn("[IslandWindow] Error al invocar hide_main_window:", err);
    }
  }
}

export async function showMainWindow(): Promise<void> {
  if (isDesktop()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("show_main_window");
      return;
    } catch (err) {
      console.warn("[IslandWindow] Error al invocar show_main_window:", err);
    }
  }
}

export interface IslandPlacement {
  dock: string;
  openDirection: "up" | "down";
  x: number;
  y: number;
}

export async function startIslandDrag(): Promise<IslandPlacement | null> {
  if (isDesktop()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<IslandPlacement>("start_island_drag");
    } catch (err) {
      console.warn("[IslandWindow] Error al iniciar arrastre nativo:", err);
    }
  }
  return null;
}

export async function snapIslandTo(anchor: string): Promise<IslandPlacement | null> {
  if (isDesktop()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<IslandPlacement>("snap_island_to", { anchor });
    } catch (err) {
      console.warn("[IslandWindow] Error al acoplar isla a posición:", err);
    }
  }
  return null;
}

export async function getIslandDockPosition(): Promise<IslandPlacement | null> {
  if (isDesktop()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<IslandPlacement>("get_island_dock_position");
    } catch (err) {
      console.warn("[IslandWindow] Error al obtener posición de acople:", err);
    }
  }
  return null;
}

export async function setIslandState(state: "pill" | "alert" | "expanded", direction: "up" | "down"): Promise<void> {
  if (isDesktop()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("set_island_state", { state, direction });
    } catch (err) {
      console.warn("[IslandWindow] Error al sincronizar estado de la isla flotante:", err);
    }
  }
}




/**
 * StudyLab Platform Abstraction Layer
 * Detects whether the app is running in Tauri Desktop or Web Browser.
 */

import { isTauri } from "@tauri-apps/api/core";

export type PlatformType = "desktop" | "web";

/**
 * Returns true if running inside Tauri Desktop environment.
 * Safe to call in browser, test runner, or Node.js.
 */
export function isDesktop(): boolean {
  try {
    if (typeof window === "undefined") return false;
    // Check Tauri internals or official helper
    if ("__TAURI_INTERNALS__" in window || "__TAURI__" in window) {
      return true;
    }
    return isTauri();
  } catch {
    return false;
  }
}

/**
 * Returns true if running in a standard web browser.
 */
export function isWeb(): boolean {
  return !isDesktop();
}

/**
 * Returns the current platform identifier.
 */
export function getPlatformName(): PlatformType {
  return isDesktop() ? "desktop" : "web";
}

/**
 * StudyLab Unified Notification Dispatcher
 * Bridges internal UI notifications with desktop native notifications via Web Notification API / Tauri.
 */

import { useNotificationStore, type NotificationLevel } from "../stores/useNotificationStore";

export interface SendNotificationOptions {
  title: string;
  message: string;
  level?: NotificationLevel;
  category?: "academic" | "system" | "study" | "general";
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  /** Si es true, intenta enviar notificación nativa al OS además de la interna */
  nativeDesktop?: boolean;
}

/**
 * Despacha una notificación interna y, cuando corresponde según el nivel o flag,
 * emite una notificación al sistema operativo (Windows / Desktop / Web Notification).
 */
export async function sendNotification(options: SendNotificationOptions): Promise<string> {
  const store = useNotificationStore.getState();
  const level = options.level ?? "info";

  // 1. Registrar siempre en la bandeja interna de la aplicación
  const notifId = store.addNotification({
    title: options.title,
    message: options.message,
    level,
    category: options.category,
    actionUrl: options.actionUrl,
    metadata: options.metadata,
  });

  // 2. Evaluar si corresponde notificación al sistema operativo
  const isEligibleForDesktop =
    options.nativeDesktop || level === "urgent" || level === "important";

  if (isEligibleForDesktop && store.preferences.desktopNotificationsEnabled) {
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(options.title, {
            body: options.message,
            icon: "/favicon.ico",
          });
        } else if (Notification.permission !== "denied") {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            new Notification(options.title, {
              body: options.message,
              icon: "/favicon.ico",
            });
          }
        }
      }
    } catch {
      // Ignorar de forma segura si la plataforma bloquea notificaciones nativas
    }
  }

  return notifId;
}

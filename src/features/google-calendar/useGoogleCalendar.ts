import { useEffect, useState } from "react";
import { BACKEND_URL } from "../../config/env";

interface CalendarStatus {
  configured: boolean;
  connected: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string | null;
}

/** Best-effort: si el backend de la Fase 9 no está corriendo, falla en silencio. */
export function useGoogleCalendarStatus() {
  const [status, setStatus] = useState<CalendarStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${BACKEND_URL}/api/calendar/status`)
      .then((r) => r.json())
      .then((data: CalendarStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

export function useGoogleCalendarEvents(enabled: boolean) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch(`${BACKEND_URL}/api/calendar/events`)
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data: { events?: GoogleCalendarEvent[] }) => {
        if (!cancelled) setEvents(data.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return events;
}

import { Router } from "express";
import { google } from "googleapis";
import { createOAuthClient, hasStoredToken, isGoogleConfigured } from "../googleClient.js";

export const calendarRouter = Router();

calendarRouter.get("/status", (_req, res) => {
  res.json({ configured: isGoogleConfigured(), connected: hasStoredToken() });
});

calendarRouter.get("/events", async (_req, res) => {
  if (!hasStoredToken()) {
    res.status(401).json({ error: "No hay una cuenta de Google conectada todavía." });
    return;
  }

  try {
    const auth = createOAuthClient();
    const calendar = google.calendar({ version: "v3", auth });
    const { data } = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = (data.items ?? []).map((e) => ({
      id: e.id,
      title: e.summary ?? "(sin título)",
      start: e.start?.dateTime ?? e.start?.date ?? null,
    }));

    res.json({ events });
  } catch (err) {
    console.error("Google Calendar events error:", err);
    res.status(500).json({ error: "No se pudo leer el calendario." });
  }
});

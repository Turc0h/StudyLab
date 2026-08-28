import "dotenv/config";
import cors from "cors";
import express from "express";
import { isGoogleConfigured } from "./googleClient.js";
import { authRouter } from "./routes/auth.js";
import { calendarRouter } from "./routes/calendar.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, googleConfigured: isGoogleConfigured() });
});

app.use("/auth/google", authRouter);
app.use("/api/calendar", calendarRouter);

app.listen(PORT, () => {
  console.log(`StudyLab backend escuchando en http://localhost:${PORT}`);
  if (!isGoogleConfigured()) {
    console.log("Google Calendar no está configurado — completá server/.env (ver .env.example).");
  }
});

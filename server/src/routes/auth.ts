import { Router } from "express";
import { createOAuthClient, saveToken } from "../googleClient.js";

export const authRouter = Router();

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

/** Arranca el consentimiento de Google — se accede con un redirect de página completa, no fetch. */
authRouter.get("/", (_req, res) => {
  try {
    const client = createOAuthClient();
    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });
    res.redirect(url);
  } catch (err) {
    res.status(500).send((err as Error).message);
  }
});

authRouter.get("/callback", async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
  const code = typeof req.query.code === "string" ? req.query.code : undefined;

  if (!code) {
    res.redirect(`${frontendUrl}/settings?calendar=error`);
    return;
  }

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    saveToken(tokens);
    res.redirect(`${frontendUrl}/settings?calendar=connected`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    res.redirect(`${frontendUrl}/settings?calendar=error`);
  }
});

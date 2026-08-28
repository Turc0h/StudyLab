import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

const TOKEN_PATH = path.resolve(process.cwd(), ".token.json");

/**
 * Cliente OAuth2 de Google. Requiere GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET /
 * GOOGLE_REDIRECT_URI en el entorno (ver .env.example) — StudyLab no trae credenciales propias,
 * cada instalación usa las suyas.
 */
export function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Faltan credenciales de Google. Completá GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI en server/.env (ver server/.env.example).",
    );
  }

  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  if (fs.existsSync(TOKEN_PATH)) {
    client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8")));
  }

  return client;
}

/** Guarda el token en disco — alcanza para un solo usuario local, no hay multi-cuenta. */
export function saveToken(tokens: unknown) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

export function hasStoredToken() {
  return fs.existsSync(TOKEN_PATH);
}

export function isGoogleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI,
  );
}

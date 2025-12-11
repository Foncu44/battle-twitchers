import type { Express, Request, Response } from "express";
import fetch from "node-fetch";

// Lightweight Twitch OAuth flow placeholder. In production store secrets securely.
const CLIENT_ID = process.env.TWITCH_CLIENT_ID || "TWITCH_CLIENT_ID";
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || "TWITCH_CLIENT_SECRET";
const REDIRECT_URI = process.env.TWITCH_REDIRECT_URI || "http://localhost:5173/auth/callback";

export function configureTwitchOAuth(app: Express) {
  app.get("/auth/twitch", (_req: Request, res: Response) => {
    const url = new URL("https://id.twitch.tv/oauth2/authorize");
    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "user:read:email channel:read:redemptions");
    res.redirect(url.toString());
  });

  app.get("/auth/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send("missing code");
    try {
      const token = await exchangeCodeForToken(code);
      res.json(token);
    } catch (err) {
      console.error("[twitch] token exchange failed", err);
      res.status(500).send("oauth failed");
    }
  });
}

async function exchangeCodeForToken(code: string) {
  const resp = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!resp.ok) {
    throw new Error(`twitch token error ${resp.status}`);
  }
  return (await resp.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string[];
    token_type: string;
  };
}


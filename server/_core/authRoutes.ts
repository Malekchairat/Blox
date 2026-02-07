import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { hashPassword, verifyPassword, createSessionToken } from "./auth";

export function registerAuthRoutes(app: Express) {
  /** POST /api/auth/register */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { name, email, password, role } = req.body;

      if (!email || !password || !name) {
        res.status(400).json({ error: "Nom, email et mot de passe sont requis" });
        return;
      }

      // Validate role
      const validRoles = ["donor", "association"];
      const userRole = validRoles.includes(role) ? role : "donor";

      if (typeof password !== "string" || password.length < 6) {
        res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
        return;
      }

      // Check if email already exists
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        res.status(409).json({ error: "Cet email est déjà utilisé" });
        return;
      }

      const passwordHash = await hashPassword(password);
      const openId = nanoid(21); // Generate a unique ID for the user

      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod: "email",
        passwordHash,
        role: userRole,
        lastSignedIn: new Date(),
      });

      const user = await db.getUserByEmail(email);
      if (!user) {
        res.status(500).json({ error: "Erreur lors de la création du compte" });
        return;
      }

      const sessionToken = await createSessionToken({
        userId: user.id,
        openId: user.openId,
        name: user.name || "",
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[Auth] Register failed:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  });

  /** POST /api/auth/login */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email et mot de passe sont requis" });
        return;
      }

      const user = await db.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Email ou mot de passe incorrect" });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Email ou mot de passe incorrect" });
        return;
      }

      // Update last signed in
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: new Date(),
      });

      const sessionToken = await createSessionToken({
        userId: user.id,
        openId: user.openId,
        name: user.name || "",
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  });
}

import type { Request, Response } from "express";
import { z } from "zod";
import { ApiHandlerError, withErrorHandler } from "./_lib/errors.js";

/**
 * Push Subscription Endpoint
 * Handles Web Push API subscription registration and VAPID key distribution.
 *
 * NOTE ON CLOSED-BROWSER WEB PUSH (Section G):
 * When browser tabs are closed, browser execution and client-side JavaScript polling stops entirely.
 * To deliver notifications to a closed browser via the Service Worker (public/sw.js):
 * 1. The client registers public/sw.js and gets a PushSubscription from registration.pushManager.subscribe()
 * 2. The client sends the PushSubscription (endpoint + keys p256dh/auth) to this endpoint or Supabase public.push_subscriptions.
 * 3. A server-side scheduler (e.g. Supabase Edge Function with pg_cron or server background runner)
 *    periodically evaluates environmental triggers via api/alerts.ts.
 * 4. When an alert triggers, the server uses a standard Web Push library (e.g. `web-push` npm package)
 *    to sign a push payload using the server's VAPID Private Key and dispatches it to the subscription endpoint.
 * 5. The browser's native OS push daemon wakes up public/sw.js to show the alert notification even when VayuVerse tabs are closed.
 */

const pushSubscriptionSchema = z.object({
  userId: z.string().min(1),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

export const pushHandler = withErrorHandler(async (req: Request, res: Response) => {
  if (req.method === "GET") {
    // Return VAPID Public Key so frontend can generate PushSubscription
    const publicKey =
      process.env.VAPID_PUBLIC_KEY ||
      // Fallback RFC-compliant demo key for testing/dev environments
      "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuNu3NevSTT_Pruc2VjiTrpTAC";

    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json({
      configured: Boolean(process.env.VAPID_PUBLIC_KEY),
      publicKey,
    });
    return;
  }

  if (req.method === "POST") {
    const parsed = pushSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiHandlerError(400, "Invalid push subscription payload", parsed.error.flatten());
    }

    const { userId, subscription } = parsed.data;

    // Log registration (in production, write to Supabase `public.push_subscriptions`)
    console.log(`[WebPush] Registered push subscription for user ${userId}:`, subscription.endpoint);

    res.status(201).json({
      success: true,
      message: "Push subscription registered successfully.",
    });
    return;
  }

  throw new ApiHandlerError(405, "Method not allowed. Use GET or POST.");
});

export default async function handler(req: Request, res: Response) {
  return pushHandler(req, res);
}

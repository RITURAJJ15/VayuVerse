import { supabase } from "./supabase";

export interface BrowserNotificationOptions {
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

/**
 * Requests browser notification permission explicitly upon user action.
 * Never called automatically on page load.
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn("[BrowserNotifications] Permission request error:", err);
    return "denied";
  }
}

/**
 * Sends an in-session notification if permission is granted and not muted.
 */
export function sendInSessionNotification(
  title: string,
  options: BrowserNotificationOptions
): boolean {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const notif = new Notification(title, {
      body: options.body,
      icon: options.icon || "/images/botanical-hero-clean.jpg",
      tag: options.tag,
      data: options.data,
      silent: true, // Never play alarming sounds
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return true;
  } catch (err) {
    console.warn("[BrowserNotifications] Notification dispatch failed:", err);
    return false;
  }
}

/**
 * Registers service worker for background Push API if supported.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (err) {
    console.warn("[BrowserNotifications] Service worker registration error:", err);
    return null;
  }
}

/**
 * Subscribes to Web Push using standards-based PushManager and persists subscription to Supabase.
 */
export async function subscribeToWebPush(
  userId: string,
  vapidPublicKey?: string
): Promise<{ success: boolean; message: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return {
      success: false,
      message: "Web Push is not supported on this browser platform.",
    };
  }

  if (Notification.permission !== "granted") {
    return {
      success: false,
      message: "Browser notification permission must be granted first.",
    };
  }

  if (!vapidPublicKey) {
    return {
      success: false,
      message:
        "VAPID public key not configured in environment. In-app and in-session notifications remain fully operational.",
    };
  }

  try {
    const swReg = await registerServiceWorker();
    if (!swReg) {
      return { success: false, message: "Service worker registration failed." };
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
    const subscription = await swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey.buffer as ArrayBuffer,
    });

    // Save to Supabase push_subscriptions table
    const subJson = subscription.toJSON();
    await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        subscription_data: subJson,
      },
      { onConflict: "endpoint" }
    );

    return { success: true, message: "Web Push subscription activated." };
  } catch (err) {
    console.warn("[BrowserNotifications] Push subscription error:", err);
    return { success: false, message: (err as Error).message };
  }
}

// Base64 to Uint8Array converter for VAPID applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


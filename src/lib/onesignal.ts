import OneSignal from "react-onesignal";

const ONESIGNAL_APP_ID = "4f9c108a-f328-4f80-b3e0-65ea97f0ea52";
const DEFAULT_WAIT_TIMEOUT_MS = 10_000;
const DEFAULT_POLL_INTERVAL_MS = 1_000;

let initialized = false;

export type OneSignalDebugSnapshot = {
  permission: NotificationPermission | "unsupported";
  userId: string | null;
  subscriptionId: string | null;
};

function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.permission;
}

export function getOneSignalDebugSnapshot(): OneSignalDebugSnapshot {
  const user = OneSignal.User as typeof OneSignal.User & { Id?: string };

  return {
    permission: getNotificationPermission(),
    userId: user.onesignalId ?? user.Id ?? null,
    subscriptionId: user.PushSubscription.id ?? null,
  };
}

export async function waitForOneSignalSubscriptionId(
  timeoutMs = DEFAULT_WAIT_TIMEOUT_MS,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
  onPoll?: (snapshot: OneSignalDebugSnapshot, attempt: number) => void,
) {
  const maxAttempts = Math.max(1, Math.ceil(timeoutMs / intervalMs));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const snapshot = getOneSignalDebugSnapshot();
    onPoll?.(snapshot, attempt);

    if (snapshot.subscriptionId) {
      return snapshot.subscriptionId;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return null;
}

export async function initOneSignal() {
  if (initialized) return;

  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });
    initialized = true;
    console.info("[OneSignal] Initialized successfully", getOneSignalDebugSnapshot());
  } catch (err) {
    console.warn("[OneSignal] Init failed:", err);
  }
}

export { OneSignal };

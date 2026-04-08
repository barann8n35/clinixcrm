import OneSignal from "react-onesignal";

const ONESIGNAL_APP_ID = "4f9c108a-f328-4f80-b3e0-65ea97f0ea52";

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

/**
 * Returns a promise that resolves with the Subscription ID once it becomes
 * available via the PushSubscription 'change' event listener.
 * Falls back to polling if the event never fires.
 */
export function waitForOneSignalSubscriptionId(
  timeoutMs = 15_000,
  _intervalMs = 1_000,
  onPoll?: (snapshot: OneSignalDebugSnapshot, attempt: number) => void,
): Promise<string | null> {
  return new Promise((resolve) => {
    // Check if already available
    const immediate = OneSignal.User.PushSubscription.id;
    if (immediate) {
      onPoll?.(getOneSignalDebugSnapshot(), 0);
      resolve(immediate);
      return;
    }

    let resolved = false;
    let pollAttempt = 0;

    const cleanup = () => {
      resolved = true;
      try {
        OneSignal.User.PushSubscription.removeEventListener("change", onChange);
      } catch {
        // ignore
      }
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (pollTimer) clearInterval(pollTimer);
    };

    // Primary: event listener
    const onChange = (event: any) => {
      if (resolved) return;
      const subId = event?.current?.id ?? OneSignal.User.PushSubscription.id;
      onPoll?.(getOneSignalDebugSnapshot(), pollAttempt);
      if (subId) {
        cleanup();
        resolve(subId);
      }
    };

    try {
      OneSignal.User.PushSubscription.addEventListener("change", onChange);
    } catch (err) {
      console.warn("[OneSignal] Failed to add change listener:", err);
    }

    // Secondary: polling fallback
    const pollTimer = setInterval(() => {
      if (resolved) return;
      pollAttempt++;
      const snapshot = getOneSignalDebugSnapshot();
      onPoll?.(snapshot, pollAttempt);
      if (snapshot.subscriptionId) {
        cleanup();
        resolve(snapshot.subscriptionId);
      }
    }, _intervalMs);

    // Timeout
    const timeoutTimer = setTimeout(() => {
      if (resolved) return;
      cleanup();
      resolve(null);
    }, timeoutMs);
  });
}

export async function initOneSignal() {
  if (initialized) return;

  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: "/OneSignalSDKWorker.js",
    });
    initialized = true;
    console.info("[OneSignal] Initialized successfully", getOneSignalDebugSnapshot());
  } catch (err) {
    console.warn("[OneSignal] Init failed:", err);
    initialized = false;
  }
}

export { OneSignal };

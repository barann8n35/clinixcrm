import OneSignal from "react-onesignal";

const ONESIGNAL_APP_ID = "4f9c108a-f328-4f80-b3e0-65ea97f0ea52";

let initialized = false;

export async function initOneSignal() {
  if (initialized) return;

  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });
    initialized = true;
    console.info("[OneSignal] Initialized successfully");
  } catch (err) {
    console.warn("[OneSignal] Init failed:", err);
  }
}

export { OneSignal };

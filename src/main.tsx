import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Service worker hygiene:
// - In preview/iframe: unregister ALL SWs (OneSignal won't work there anyway)
// - On the published host: unregister any STALE SW (e.g. the old "/sw.js" we removed)
//   so duplicated/cached push events don't fire.
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => {
      const scriptURL = (r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "");
      const isOneSignal = scriptURL.includes("OneSignalSDKWorker");
      if (isInIframe || isPreviewHost) {
        // Nuke everything in preview
        r.unregister();
      } else if (!isOneSignal) {
        // Production: only kill non-OneSignal SWs (the old sw.js)
        r.unregister();
      }
    });
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);

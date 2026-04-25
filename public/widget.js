/* Clinix Web Widget — embeddable launcher
   Usage:
   <script src="https://clinixcrm.lovable.app/widget.js" async></script>
*/
(function () {
  if (window.__clinixWidgetLoaded) return;
  window.__clinixWidgetLoaded = true;

  var BASE = (function () {
    try {
      var s = document.currentScript || document.querySelector('script[src*="widget.js"]');
      if (s && s.src) return new URL(s.src).origin;
    } catch (e) {}
    return "https://clinixcrm.lovable.app";
  })();

  var btn = document.createElement("button");
  btn.setAttribute("aria-label", "Sohbeti aç");
  btn.style.cssText = [
    "position:fixed", "right:20px", "bottom:20px", "width:60px", "height:60px",
    "border-radius:50%", "background:#0F172A", "color:#fff", "border:none",
    "cursor:pointer", "box-shadow:0 10px 30px -10px rgba(15,23,42,.4)",
    "z-index:2147483646", "display:flex", "align-items:center", "justify-content:center",
    "transition:transform .2s ease"
  ].join(";");
  btn.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  btn.onmouseenter = function(){ btn.style.transform = "scale(1.05)"; };
  btn.onmouseleave = function(){ btn.style.transform = "scale(1)"; };

  var iframe = document.createElement("iframe");
  iframe.title = "Clinix Sohbet";
  iframe.src = BASE + "/widget";
  iframe.allow = "clipboard-write";
  iframe.style.cssText = [
    "position:fixed", "right:20px", "bottom:90px",
    "width:380px", "height:600px", "max-width:calc(100vw - 40px)",
    "max-height:calc(100vh - 110px)",
    "border:none", "border-radius:20px",
    "box-shadow:0 20px 50px -10px rgba(15,23,42,.3)",
    "z-index:2147483645", "background:#fff",
    "display:none"
  ].join(";");

  var open = false;
  function toggle() {
    open = !open;
    iframe.style.display = open ? "block" : "none";
  }
  btn.addEventListener("click", toggle);

  function mount() {
    document.body.appendChild(iframe);
    document.body.appendChild(btn);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();

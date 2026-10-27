/* Visitor counter: cookie-free, loads after the game shows. Owner opt-out: add #dont-count-me to the address. */
(function () {
  try {
    if (location.hash === "#dont-count-me") { localStorage.setItem("blockFathomTracking", "true"); }
    else if (location.hash === "#count-me") { localStorage.removeItem("blockFathomTracking"); }
  } catch (e) {}
  function go() { try { var s = document.createElement("script"); s.src = "https://cdn.usefathom.com/script.js"; s.setAttribute("data-site", "IPCAXMZK"); s.defer = true; document.head.appendChild(s); } catch (e) {} }
  function idle() { "requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 2000 }) : setTimeout(go, 1); }
  document.readyState === "complete" ? idle() : window.addEventListener("load", idle);
})();

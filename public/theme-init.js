// Runs before first paint (an external file because the CSP forbids inline
// scripts), so a dark-mode user never sees a white flash.
(function () {
  try {
    var t = localStorage.getItem("mr.theme");
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", t);
    var l = localStorage.getItem("mr.lang");
    document.documentElement.lang = l === "bn" ? "bn" : "en";
  } catch (e) {}
})();

// Countdown (ends 30 Nov 2026, South Africa time)
(function () {
  var end = new Date("2026-11-30T23:59:59+02:00").getTime();
  var pad = function (n) { return n < 10 ? "0" + n : String(n); };
  var timer;
  function tick() {
    var distance = end - Date.now();
    if (distance < 0) {
      clearInterval(timer);
      document.body.classList.add("expired");
      return;
    }
    document.getElementById("cd-d").textContent = pad(Math.floor(distance / 86400000));
    document.getElementById("cd-h").textContent = pad(Math.floor((distance % 86400000) / 3600000));
    document.getElementById("cd-m").textContent = pad(Math.floor((distance % 3600000) / 60000));
    document.getElementById("cd-s").textContent = pad(Math.floor((distance % 60000) / 1000));
  }
  tick();
  timer = setInterval(tick, 1000);
})();

// Pre-select the service when a CTA is clicked
document.addEventListener("click", function (e) {
  var el = e.target.closest("[data-service]");
  if (!el) return;
  var select = document.getElementById("service");
  if (select) select.value = el.getAttribute("data-service");
});

// Pre-select the service from the section hash, and show the thank-you message
document.addEventListener("DOMContentLoaded", function () {
  var map = { "#fix1": "PC Upgrade (SSD/RAM)", "#fresh": "New Hardware", "#wifi": "Wi-Fi Fix" };
  var select = document.getElementById("service");
  if (select && map[window.location.hash]) select.value = map[window.location.hash];

  var params = new URLSearchParams(window.location.search);
  if (params.has("submitted")) {
    var form = document.getElementById("lead-form");
    if (form) {
      form.innerHTML =
        '<div class="success">' +
        '<div class="big">🎉</div>' +
        '<h3>Thank you!</h3>' +
        '<p>We’ve received your request and will get back to you shortly with your Black Friday quote.</p>' +
        '<a href="https://wa.me/27726650565" class="btn btn-wa" target="_blank" rel="noopener noreferrer" data-track="whatsapp">Chat on WhatsApp</a>' +
        '</div>';
      var card = document.getElementById("top-form");
      if (card) card.scrollIntoView();
    }
    if (typeof gtag === "function") gtag("event", "generate_lead", { event_category: "black_friday" });
  }
});

// Optional conversion tracking (only fires if Google Analytics gtag is installed)
document.addEventListener("click", function (e) {
  var el = e.target.closest("[data-track]");
  if (el && typeof gtag === "function") {
    gtag("event", "contact_click", { method: el.getAttribute("data-track") });
  }
});

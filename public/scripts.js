// Countdown (ends 30 Nov 2026, South Africa time)
// We use Date.UTC to avoid any timezone parsing issues.
// 2026-11-30T23:59:59+02:00 is equivalent to 2026-11-30T21:59:59 UTC
(function () {
  var end = Date.UTC(2026, 10, 30, 21, 59, 59); // Month is 0-indexed (10 = November)
  var pad = function (n) { return n < 10 ? "0" + n : String(n); };
  var timer;
  
  function tick() {
    var distance = end - Date.now();
    
    if (distance < 0) {
      clearInterval(timer);
      document.body.classList.add("expired");
      return;
    }
    
    // Only update the DOM if the elements exist
    var dEl = document.getElementById("cd-d");
    if (dEl) {
      dEl.textContent = pad(Math.floor(distance / 86400000));
      document.getElementById("cd-h").textContent = pad(Math.floor((distance % 86400000) / 3600000));
      document.getElementById("cd-m").textContent = pad(Math.floor((distance % 3600000) / 60000));
      document.getElementById("cd-s").textContent = pad(Math.floor((distance % 60000) / 1000));
    }
  }
  
  // Run immediately, then every second
  tick();
  timer = setInterval(tick, 1000);
})();

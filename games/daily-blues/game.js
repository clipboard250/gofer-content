(function () {
  "use strict";
  var BANK = window.CARDS || [];
  var DAYS = window.DAYS || {};
  var PER_DAY = 5;
  var LAUNCH = "2026-10-26";
  var TITLES = [
    { min: 0, name: "Juke Joint Rookie" },
    { min: 15, name: "Road House Regular" },
    { min: 40, name: "Crossroads Legend" }
  ];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  var main = document.getElementById("play");
  var eyebrowEl = document.getElementById("eyebrow");
  var dateEl = document.getElementById("date");
  var barEl = document.getElementById("bar");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function keyOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function fromKey(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function longDate(k) { var d = fromKey(k); return MONTHS[d.getMonth()] + " " + d.getDate(); }
  function shortDate(k) { var d = fromKey(k); return MONTHS[d.getMonth()].slice(0, 3) + " " + d.getDate(); }

  var now = new Date();
  /* Preview-only override, e.g. window.BD_DAY = "11-04". Unset on the live site. */
  if (window.BD_DAY) now = new Date(now.getFullYear(), parseInt(window.BD_DAY.slice(0, 2), 10) - 1, parseInt(window.BD_DAY.slice(3), 10));
  var TODAY = keyOf(now);

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function cardsFor(k) {
    var mmdd = k.slice(5);
    if (DAYS[mmdd] && DAYS[mmdd].length) return DAYS[mmdd].slice(0, PER_DAY);
    var d = fromKey(k);
    var a = BANK.slice(), r = rng(Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000) * 7919);
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a.slice(0, PER_DAY).sort(function (x, y) { return parseInt(x.d, 10) - parseInt(y.d, 10); });
  }

  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* games[dateKey] = { answers: [true,false,...], daily: true if played on its own day } */
  var games = load("bd-games", {});
  var playKey = TODAY;
  function game(k) { if (!games[k]) games[k] = { answers: [], daily: k === TODAY }; return games[k]; }
  function isDaily() { return playKey === TODAY; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clear() { while (main.firstChild) main.removeChild(main.firstChild); }

  function drawHead() {
    eyebrowEl.textContent = isDaily() ? "On this day in blues" : "Archive, on this day in blues";
    dateEl.textContent = longDate(playKey);
  }
  function drawBar(current) {
    var g = game(playKey);
    while (barEl.firstChild) barEl.removeChild(barEl.firstChild);
    for (var i = 0; i < PER_DAY; i++) {
      var s = el("span");
      if (i < g.answers.length) s.className = "done";
      if (i === current) s.className = "now";
      barEl.appendChild(s);
    }
  }

  function start(k) {
    playKey = k;
    drawHead();
    var g = game(k);
    if (g.answers.length >= PER_DAY) showResults(); else showCard();
  }

  function showCard() {
    var deck = cardsFor(playKey);
    var g = game(playKey);
    var pos = g.answers.length;
    if (pos >= PER_DAY) return showResults();
    var c = deck[pos];
    clear();
    drawHead();
    drawBar(pos);

    var stage = el("div", "stage");
    var card = el("article", "card");
    card.setAttribute("aria-label", "Card " + (pos + 1) + " of " + PER_DAY + ". " + (c.yr || c.d) + ". True or false?");
    card.appendChild(el("p", "chip", c.yr || c.d));
    var claim = el("p", "claim", c.claim);
    claim.id = "claim";
    card.appendChild(claim);
    stage.appendChild(card);
    main.appendChild(stage);

    var choices = el("div", "choices");
    var no = el("button", "btn", "FALSE");
    no.type = "button";
    var yes = el("button", "btn lime", "TRUE");
    yes.type = "button";
    choices.appendChild(no);
    choices.appendChild(yes);
    main.appendChild(choices);
    main.appendChild(el("p", "hint", "Swipe the card or tap a button"));

    var done = false;
    function answer(saidTrue) {
      if (done) return;
      done = true;
      var right = saidTrue === c.truth;
      g.answers.push(right);
      save("bd-games", games);
      if (reduceMotion) return showVerdict(c, right, saidTrue);
      card.classList.remove("back");
      card.classList.add("fly");
      card.style.transform = "translateX(" + (saidTrue ? 140 : -140) + "%) rotate(" + (saidTrue ? 24 : -24) + "deg)";
      card.style.opacity = "0";
      setTimeout(function () { showVerdict(c, right, saidTrue); }, 280);
    }
    no.addEventListener("click", function () { answer(false); });
    yes.addEventListener("click", function () { answer(true); });

    var startX = 0, dx = 0, dragging = false;
    card.addEventListener("pointerdown", function (e) {
      if (done) return;
      dragging = true; startX = e.clientX; dx = 0;
      card.classList.remove("back");
      card.classList.add("dragging");
      try { card.setPointerCapture(e.pointerId); } catch (err) {}
    });
    card.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      dx = e.clientX - startX;
      card.style.transform = "translateX(" + dx + "px) rotate(" + (-2 + dx / 18) + "deg)";
      no.style.borderColor = dx < -40 ? "#F2F2F2" : "";
      yes.style.boxShadow = dx > 40 ? "0 0 0 3px #F2F2F2" : "";
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      card.classList.remove("dragging");
      no.style.borderColor = ""; yes.style.boxShadow = "";
      if (Math.abs(dx) > 90) return answer(dx > 0);
      card.classList.add("back");
      card.style.transform = "";
    }
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
  }

  function showVerdict(c, right, said) {
    clear();
    var g = game(playKey);
    var box = el("section", "verdict");
    var h = el("h2", right ? "right" : "", right ? "RIGHT" : "WRONG");
    h.tabIndex = -1;
    box.appendChild(h);
    box.appendChild(el("p", "was", "You said " + (said ? "true" : "false") + ". It's " + (c.truth ? "true." : "false.")));
    var again = el("div", "again");
    again.appendChild(el("p", "again-label", "The card said"));
    again.appendChild(el("p", "again-text", c.claim));
    box.appendChild(again);
    box.appendChild(el("p", "why", c.why));
    var more = el("details");
    more.appendChild(el("summary", null, "Learn more"));
    var ul = el("ul");
    c.src.forEach(function (s) {
      var li = el("li");
      var a = el("a", null, s[0]);
      a.href = s[1];
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      li.appendChild(a);
      ul.appendChild(li);
    });
    more.appendChild(ul);
    box.appendChild(more);
    var flag = el("button", "linkish", "Did we get something wrong, or did a card confuse you? Send us a note.");
    flag.type = "button";
    flag.setAttribute("aria-haspopup", "dialog");
    flag.addEventListener("click", function () { openNote(c); });
    box.appendChild(flag);
    main.appendChild(box);
    var last = g.answers.length >= PER_DAY;
    var next = el("button", "btn lime", last ? "SEE MY SCORE" : "NEXT");
    next.type = "button";
    next.addEventListener("click", function () {
      if (last) showResults(); else showCard();
      main.focus();
    });
    main.appendChild(next);
    drawBar(-1);
    h.focus();
  }

  /* Stats come from daily games only. */
  function dailyKeys() { return Object.keys(games).filter(function (k) { return games[k].daily && games[k].answers.length >= PER_DAY; }).sort(); }
  function lifetimeRight() { return dailyKeys().reduce(function (n, k) { return n + games[k].answers.filter(Boolean).length; }, 0); }
  function streaks() {
    var keys = dailyKeys(), best = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      var d = fromKey(k);
      if (prev && (d - prev) / 86400000 === 1) run++; else run = 1;
      if (run > best) best = run;
      prev = d;
    });
    var current = 0;
    if (keys.length) {
      var lastDay = fromKey(keys[keys.length - 1]);
      var gap = (fromKey(TODAY) - lastDay) / 86400000;
      if (gap <= 1) current = run;
    }
    return { current: current, best: best };
  }
  function titleFor(n) { var t = TITLES[0]; TITLES.forEach(function (x) { if (n >= x.min) t = x; }); return t; }
  function nextTitle(n) { for (var i = 0; i < TITLES.length; i++) if (TITLES[i].min > n) return TITLES[i]; return null; }

  function showResults() {
    var g = game(playKey);
    var score = g.answers.filter(Boolean).length;
    var life = lifetimeRight();
    clear();
    drawHead();
    drawBar(-1);

    var box = el("section", "results");
    var s = el("h2", "score", score + "/" + PER_DAY);
    s.tabIndex = -1;
    s.setAttribute("aria-label", score + " out of " + PER_DAY + " right");
    box.appendChild(s);
    var sq = el("div", "squares");
    sq.setAttribute("role", "img");
    sq.setAttribute("aria-label", g.answers.map(function (a) { return a ? "right" : "wrong"; }).join(", "));
    g.answers.forEach(function (a) { sq.appendChild(el("span", a ? "" : "miss")); });
    box.appendChild(sq);
    if (isDaily()) {
      box.appendChild(el("p", "title", titleFor(life).name));
      var nt = nextTitle(life);
      if (nt) { var left = nt.min - life; box.appendChild(el("p", "sub", left + " more right answer" + (left === 1 ? "" : "s") + " to " + nt.name)); }
    } else {
      box.appendChild(el("p", "sub", "Archive game. Your stats stay the same."));
    }
    main.appendChild(box);

    var foot = el("div", "foot");
    var note = el("p", "note", isDaily() ? "New cards at midnight" : "");
    note.setAttribute("aria-live", "polite");
    if (isDaily()) {
      var share = el("button", "btn lime", "SHARE MY SCORE");
      share.type = "button";
      share.addEventListener("click", function () {
        var text = "Daily Blues, " + shortDate(playKey) + "\n" + score + "/" + PER_DAY + " " +
          g.answers.map(function (a) { return a ? "🟩" : "⬛"; }).join("") +
          "\n" + titleFor(life).name + "\n" + location.origin + location.pathname;
        if (navigator.share) {
          navigator.share({ text: text }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(function () { note.textContent = "Copied. Paste it anywhere."; },
            function () { note.textContent = text; });
        } else {
          note.textContent = text;
        }
      });
      foot.appendChild(share);
    } else {
      var back = el("button", "btn lime", "BACK TO TODAY");
      back.type = "button";
      back.addEventListener("click", function () { start(TODAY); main.focus(); });
      foot.appendChild(back);
    }
    var arch = el("button", "btn", "PLAY THE ARCHIVE");
    arch.type = "button";
    arch.addEventListener("click", function () { openArchive(); });
    foot.appendChild(arch);
    foot.appendChild(note);
    main.appendChild(foot);
    s.focus();
  }

  /* Dialogs */
  function openDialog(id) {
    var d = document.getElementById(id);
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
  }
  Array.prototype.forEach.call(document.querySelectorAll("dialog"), function (d) {
    d.querySelector(".close").addEventListener("click", function () { d.close ? d.close() : d.removeAttribute("open"); });
    d.addEventListener("click", function (e) { if (e.target === d && d.close) d.close(); });
  });
  document.getElementById("open-help").addEventListener("click", function () { openDialog("help"); });
  document.getElementById("open-stats").addEventListener("click", function () { drawStats(); openDialog("stats"); });
  document.getElementById("open-archive").addEventListener("click", function () { openArchive(); });

  /* Send us a note: goes to Formspree with the card attached. */
  var noteCard = null;
  var noteForm = document.getElementById("note-form");
  var noteMsg = document.getElementById("note-status");
  function openNote(c) {
    noteCard = c;
    noteForm.hidden = false;
    noteMsg.textContent = "";
    document.getElementById("note-card").textContent = c.claim;
    openDialog("note");
    document.getElementById("note-text").focus();
  }
  document.getElementById("note-text").addEventListener("input", function () { if (noteMsg.textContent === "Write a quick note first.") noteMsg.textContent = ""; });
  noteForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = document.getElementById("note-text");
    if (!text.value.trim()) { noteMsg.textContent = "Write a quick note first."; text.focus(); return; }
    var data = new FormData(noteForm);
    data.append("play_date", playKey);
    if (noteCard) {
      data.append("card_decade", noteCard.d);
      data.append("card_year", noteCard.yr || "");
      data.append("card_said", noteCard.claim);
      data.append("card_answer", noteCard.truth ? "true" : "false");
    }
    data.append("_subject", "Daily Blues note");
    var btn = document.getElementById("note-send");
    btn.disabled = true;
    noteMsg.textContent = "Sending...";
    fetch("https://formspree.io/f/xqppqgoe", { method: "POST", body: data, headers: { Accept: "application/json" } })
      .then(function (r) {
        if (!r.ok) throw new Error("bad");
        noteForm.reset();
        noteForm.hidden = true;
        noteMsg.textContent = "Got it. Thanks for the note. We read every one.";
        noteMsg.focus();
      })
      .catch(function () { noteMsg.textContent = "That didn't send. Check your connection and try again."; })
      .then(function () { btn.disabled = false; });
  });

  function drawStats() {
    var keys = dailyKeys(), st = streaks(), life = lifetimeRight();
    var avg = keys.length ? (life / keys.length).toFixed(1) : "0";
    var grid = document.getElementById("stats-grid");
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    [[keys.length, "Played"], [avg, "Average right"], [st.current, "Current streak"], [st.best, "Best streak"]].forEach(function (p) {
      var cell = el("div");
      cell.appendChild(el("b", null, String(p[0])));
      cell.appendChild(el("span", null, p[1]));
      grid.appendChild(cell);
    });
    var nt = nextTitle(life);
    document.getElementById("stats-rank").textContent = "Your title: " + titleFor(life).name + "." + (nt ? " " + (nt.min - life) + " more right answers to " + nt.name + "." : "");
  }

  function openArchive() {
    var wrap = document.getElementById("months");
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    var first = fromKey(LAUNCH), last = fromKey(TODAY);
    var m = new Date(last.getFullYear(), last.getMonth(), 1);
    while (m >= new Date(first.getFullYear(), first.getMonth(), 1)) {
      var sec = el("section", "month");
      sec.appendChild(el("h3", null, MONTHS[m.getMonth()] + " " + m.getFullYear()));
      var cal = el("div", "cal");
      ["S", "M", "T", "W", "T", "F", "S"].forEach(function (x) { var s = el("span", "dow", x); s.setAttribute("aria-hidden", "true"); cal.appendChild(s); });
      var startDow = m.getDay(), daysIn = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      for (var b = 0; b < startDow; b++) cal.appendChild(el("span"));
      for (var day = 1; day <= daysIn; day++) {
        var k = m.getFullYear() + "-" + pad(m.getMonth() + 1) + "-" + pad(day);
        var cell;
        if (k >= LAUNCH && k <= TODAY) {
          cell = el("button", "day", String(day));
          cell.type = "button";
          var played = games[k] && games[k].answers.length >= PER_DAY;
          if (played) cell.classList.add("played");
          if (k === TODAY) cell.classList.add("today");
          cell.setAttribute("aria-label", longDate(k) + (k === TODAY ? ", today" : "") + (played ? ", played" : ", not played"));
          (function (key) {
            cell.addEventListener("click", function () { document.getElementById("archive").close(); start(key); main.focus(); });
          })(k);
        } else {
          cell = el("span", "day", String(day));
          cell.setAttribute("aria-hidden", "true");
        }
        cal.appendChild(cell);
      }
      sec.appendChild(cal);
      wrap.appendChild(sec);
      m = new Date(m.getFullYear(), m.getMonth() - 1, 1);
    }
    openDialog("archive");
  }

  if (!BANK.length && !Object.keys(DAYS).length) { main.appendChild(el("p", null, "Cards didn't load. Refresh to try again.")); return; }
  start(TODAY);
})();

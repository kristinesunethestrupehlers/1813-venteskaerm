// 1813 WAITING SCREEN, step 4
//   "call" screen  ->  CPR (type or skip)  ->  triage in akut.dk's structure (age group -> theme -> sub-theme -> the page's questions)  ->  "you are in the queue"
//   ->  waiting screen with advice cards, walking figure, voice and music  ->  "you are next"
//
// New in step 4 (group feedback 9 Nov 2026):
//   - language switch DA / EN (akut.dk only exists in Danish, so the English texts are OUR translation)
//   - layout respects the phone's safe areas (notch and home bar), so the sun/moon button can be reached
//   - voice: unlocked on the first tap and started with a small delay (iPhone Safari needs both)
//   - longer triage: the same questions for everyone first, then branch-specific ones
//
// Demo controls:  sun/moon button top right = day/night      DA/EN button top left = language
//                 tap during the wait = the queue moves one place
// Keyboard:       space = queue moves   n = day/night   l = language   m = music (piano / mindfulness / off)   r = restart

let state = "start";           // "start", "cpr", "triage", "red", "queued", "waiting"
let night = false;
let lang = "da";               // "da" or "en"
let cpr = "";                  // digits typed on the CPR screen (never stored, it is a prototype)

// ---------- UI TEXT IN BOTH LANGUAGES ----------
const UI = {
  da: {
    subtitle: "Akuttelefonen", intro: "Akuttelefonen, når din egen læge har lukket.", call: "Ring op",
    prototype: "Prototype · ikke Region Hovedstadens app", cprTitle: "INDTAST CPR-NUMMER", cprHint: "Ringer du om en anden, eller kender du ikke nummeret?",
    cprSkip: "Kender det ikke", next: "Videre", question: "SPØRGSMÅL", red: "Læg på, og ring 112 nu", redAgain: "Tryk for at starte forfra",
    queued: "DU ER I KØEN", number: "Nr.", whileWaiting: "Mens du venter, får du råd om", worse: "Bliver det værre: læg på og ring 112",
    youAre: "Du er nr.", minutes: "minutter endnu", approx: "Ca.", youAreNext: "Du er den næste", nurseSoon: "Sygeplejersken tager telefonen om lidt",
    translated: "oversat af os",
    sayCpr: "Tast CPR-nummer, eller tryk 'kender det ikke'.", sayRed: "Læg på, og ring 1 1 2 nu.",
    sayQueued: (n, topic) => "Du er i køen som nummer " + n + ". Mens du venter, får du råd om " + topic + ". Bliver det værre, så læg på og ring 1 1 2.",
    sayNumber: n => "Du er nu nummer " + n + ".", sayNext: "Du er den næste."
  },
  en: {
    subtitle: "Medical helpline", intro: "The medical helpline, when your own doctor is closed.", call: "Call",
    prototype: "Prototype · not the Capital Region's app", cprTitle: "ENTER CPR NUMBER", cprHint: "Calling about someone else, or don't know the number?",
    cprSkip: "Don't know it", next: "Continue", question: "QUESTION", red: "Hang up and call 112 now", redAgain: "Tap to start over",
    queued: "YOU ARE IN THE QUEUE", number: "No.", whileWaiting: "While you wait, you will get advice on", worse: "If it gets worse: hang up and call 112",
    youAre: "You are no.", minutes: "minutes to go", approx: "About", youAreNext: "You are next", nurseSoon: "The nurse will answer shortly",
    translated: "our translation",
    sayCpr: "Enter your CPR number, or tap 'don't know it'.", sayRed: "Hang up, and call 1 1 2 now.",
    sayQueued: (n, topic) => "You are number " + n + " in the queue. While you wait, you will get advice on " + topic + ". If it gets worse, hang up and call 1 1 2.",
    sayNumber: n => "You are now number " + n + ".", sayNext: "You are next."
  }
};
function t(key) { return UI[lang][key]; }

// ---------- TRIAGE ----------
// The questions and the advice live in content.js (akut.dk's structure: age group -> theme -> sub-theme -> page).
// The triage is built step by step from the answers so far:
//   who (only if the CPR number was skipped) -> theme -> sub-theme -> how long -> worse in the last hour
//   -> the page's own questions (from akut.dk's "ring 112 hvis" and "ring læge hvis") -> chronic illness
const COMMON_STEPS = {
  who:      { key: "who", da: "Hvor gammel er den, det drejer sig om?", en: "How old is the person?",
              buttons: [["Under 4 måneder", "Under 4 months", "infant"], ["4 måneder til 12 år", "4 months to 12 years", "child"], ["13 år og op", "13 and over", "adult"]] },
  theme:    { key: "theme", da: "Hvad drejer det sig om?", en: "What is it about?" },
  sub:      { key: "sub", da: "Hvad passer bedst?", en: "What fits best?" },
  duration: { key: "duration", da: "Hvor længe har det stået på?", en: "How long has it been going on?",
              buttons: [["Under et døgn", "Less than a day", "day"], ["1 til 3 dage", "1 to 3 days", "days"], ["Mere end 3 dage", "More than 3 days", "long"]] },
  worse:    { key: "worse", da: "Er det blevet værre den sidste time?", en: "Has it got worse in the last hour?", buttons: YES_NO },
  chronic:  { key: "chronic", da: "Er der kronisk sygdom eller fast medicin?", en: "Any chronic illness or regular medication?", buttons: YES_NO }
};

// the theme and sub-theme the person has chosen, and the akut.dk page that belongs to them
function chosenTheme() { return (answers.who && answers.theme != null) ? THEMES[answers.who][int(answers.theme)] : null; }
function chosenSub()   { let th = chosenTheme(); return (th && answers.sub != null) ? th.sub[int(answers.sub)] : null; }
function pageKey()     { let sub = chosenSub(); return (sub && sub[2]) ? sub[2] : "general"; }

// the step to show right now, built from the answers; null when the triage is complete
function currentStep() {
  if (!answers.who) return COMMON_STEPS.who;
  if (answers.theme == null) {
    let st = Object.assign({}, COMMON_STEPS.theme);
    st.buttons = THEMES[answers.who].map((th, i) => [th.da, th.en, String(i)]);
    return st;
  }
  if (answers.sub == null) {
    let st = Object.assign({}, COMMON_STEPS.sub);
    st.buttons = chosenTheme().sub.map((sb, i) => [sb[0], sb[1], String(i)]);
    return st;
  }
  if (!answers.duration) return COMMON_STEPS.duration;
  if (!answers.worse) return COMMON_STEPS.worse;
  let page = PAGES[pageKey()];
  for (let i = 0; i < page.questions.length; i++) {
    if (answers["q" + i] === undefined) {
      let q = page.questions[i];
      return { key: "q" + i, da: q.da, en: q.en, buttons: q.buttons || YES_NO, redIf: q.redIf };
    }
  }
  if (!answers.chronic) return COMMON_STEPS.chronic;
  return null;
}

// ---------- QUEUE ----------
let queue = 7;
const QUEUE_START = 7;
const MINUTES_PER_PLACE = 2;

// ---------- CARDS ----------
const CARD_TIME = 40000;       // a card stays for 40 seconds
const FADE = 2500;             // and fades in and out over 2.5 seconds
let cardStart = 0;
let cardIndex = 0;
let cardSpoken = -1;           // which card the voice has read

// ---------- TRIAGE STATE ----------
let answers = {};
let asked = 0;                 // how many questions this person has answered (the counter on screen)
let profile = "general";       // the akut.dk page whose cards are shown while waiting

// ---------- FIGURE ----------
let figureX = 0, figureTarget = 0, stride = 0;

// ---------- SKY ----------
let clouds = [];
const SKY_DAY = [
  [ [255, 196, 140], [255, 160, 130], [250, 120, 120], [255, 215, 120] ],
  [ [150, 200, 240], [255, 190, 150], [255, 140, 110], [255, 230, 150] ] ];
const SKY_NIGHT = [
  [ [ 60,  40, 110], [150,  70, 120], [230, 100,  90], [255, 170,  80] ],
  [ [ 35,  30,  80], [110,  60, 110], [200,  90,  90], [240, 150,  90] ] ];
let ink, inkSoft, lineColor, amber, cardFill, cardEdge;

// ---------- SAFE AREA (notch at the top, home bar at the bottom) ----------
let insetTop = 0, insetBottom = 0;

// ---------- SOUND ----------
// Music: two files from Pixabay (Pixabay Content License, free to use, credited in the paper):
//   "Golden Sunset Piano Music" by clavier-music (pixabay.com, id 200136)
//   "Radiant Mindfulness" by BreakzStudios (pixabay.com, id 165866)
const MUSIC = { piano: "lyd/golden-sunset-piano.mp3", mindfulness: "lyd/radiant-mindfulness.mp3" };
let musicChoice = "piano";     // "piano", "mindfulness" or "off"
let musicFiles = {};
let soundStarted = false;
const MUSIC_LEVEL = 0.45;
let duck = 1;                  // 1 = full music, 0.25 = ducked while the voice speaks
let speaking = false;
let voices = [];
let lastSpeechError = "";       // shown on screen with ?debug=1
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const PARAMS = new URLSearchParams(window.location.search);   // ?music=off  ?debug=1  ?voice=off
let voiceOn = PARAMS.get("voice") != "off";

// ---------- BUTTONS ----------
let buttons = [];              // the buttons on screen right now: {x, y, w, h, value}
let lastTap = 0;


function preload() {
  musicFiles.piano = loadSound(MUSIC.piano);
  musicFiles.mindfulness = loadSound(MUSIC.mindfulness);
}


function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  textFont("Helvetica");

  readInsets();
  if (PARAMS.get("music")) musicChoice = PARAMS.get("music");   // "piano", "mindfulness" or "off"
  night = isNight();           // follows the sun over Copenhagen, not the clock
  setColors();

  for (let i = 0; i < 5; i++) {
    clouds.push({ x: random(width), y: random(height * 0.08, height * 0.75),
                  w: random(120, 260), h: random(40, 80), speed: random(0.05, 0.15), phase: random(100) });
  }

  if (window.speechSynthesis) {
    voices = speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => { voices = speechSynthesis.getVoices(); };
  }
}

// the two invisible probes in index.html are as tall as the safe areas; we read their height here
function readInsets() {
  let top = document.getElementById("inset-top"), bottom = document.getElementById("inset-bottom");
  insetTop = top ? top.offsetHeight : 0;
  insetBottom = bottom ? bottom.offsetHeight : 0;
}


function draw() {
  let breath = (sin(frameCount * 0.013) + 1) / 2;   // 0..1, a calm adult breath, about 8 seconds
  buttons = [];

  drawSky(breath);
  drawClouds();

  if (state == "start")        drawStart();
  else if (state == "cpr")     drawCpr();
  else if (state == "triage")  drawTriage();
  else if (state == "red")     drawRed();
  else if (state == "queued")  drawQueued();
  else if (state == "waiting") { drawCard(breath); drawFigure(); drawBottom(); }

  if (state != "red") drawSunMoon();                // demo button, all screens except the red one
  if (state == "start") drawLanguage();              // demo button, start screen only

  updateMusic();

  if (PARAMS.get("debug")) {            // small status line for testing on the phone
    noStroke(); fill(ink); textSize(10); textStyle(NORMAL);
    let v = voices.filter(x => x.lang && x.lang.toLowerCase().startsWith("da")).length;
    text("ios " + IS_IOS + " · voices " + voices.length + " (da " + v + ") · speaking " + speaking + " · err " + lastSpeechError + " · music " + musicChoice, width / 2, height - insetBottom - 8);
  }
}


// ========== SCREENS ==========

function drawStart() {
  noStroke();
  fill(ink); textStyle(BOLD); textSize(44);
  text("1813", width / 2, height * 0.30);
  textStyle(NORMAL); textSize(16); fill(inkSoft);
  text(t("subtitle"), width / 2, height * 0.30 + 36);

  textSize(15); textLeading(22);
  text(t("intro"), width * 0.15, height * 0.42, width * 0.7, height * 0.12);

  button(width / 2, height * 0.62, width * 0.7, 60, t("call"), "call");

  textSize(12); fill(inkSoft);
  text(t("prototype"), width / 2, height - insetBottom - 30);
}

function drawCpr() {
  let top = insetTop + 40;
  noStroke();
  fill(inkSoft); textSize(13); textStyle(NORMAL);
  text(t("cprTitle"), width / 2, top + 20);

  let shown = cpr.slice(0, 6) + (cpr.length > 6 ? "-" + cpr.slice(6) : "");
  fill(red(cardFill), green(cardFill), blue(cardFill), alpha(cardFill));
  rect(width * 0.12, top + 44, width * 0.76, 56, 16);
  fill(ink); textSize(24); textStyle(BOLD);
  text(shown.length ? shown : "______-____", width / 2, top + 72);

  // keypad: 1 to 9, then delete, 0, continue
  let keys = ["1","2","3","4","5","6","7","8","9","del","0","ok"];
  let kw = width * 0.26, kh = 54, gapX = width * 0.04, gapY = 10;
  let x0 = width / 2 - kw - gapX, y0 = top + 124;
  for (let i = 0; i < keys.length; i++) {
    let k = keys[i];
    let cx = x0 + (i % 3) * (kw + gapX), cy = y0 + floor(i / 3) * (kh + gapY) + kh / 2;
    let label = (k == "del") ? "⌫" : (k == "ok") ? t("next") : k;
    let value = (k == "ok") ? "cpr-next" : "cpr-" + k;
    button(cx, cy, kw, kh, label, value);   // prototype: Continue works whatever has been typed
  }

  let hintY = y0 + 4 * (kh + gapY) + 24;
  fill(inkSoft); textSize(13); textStyle(NORMAL);
  text(t("cprHint"), width * 0.1, hintY, width * 0.8, 40);
  button(width / 2, hintY + 64, width * 0.7, 50, t("cprSkip"), "cpr-skip");
}

function drawTriage() {
  let q = currentStep();
  let top = insetTop + 40;
  noStroke();
  fill(inkSoft); textSize(13); textStyle(NORMAL);
  text(t("question") + " " + (asked + 1), width / 2, top + 20);

  // short questions (the menus) leave more room for the buttons
  let short = q[lang].length < 40;
  let textH = short ? 50 : height * 0.2;
  fill(ink); textSize(short ? 22 : 24); textLeading(short ? 28 : 32);
  text(q[lang], width * 0.1, top + 46, width * 0.8, textH);

  let n = q.buttons.length;
  let startY = top + 46 + textH + 18;
  let room = height - insetBottom - 24 - startY;
  let gap = n > 6 ? 8 : 12;
  let bh = constrain((room - (n - 1) * gap) / n, 40, 58);
  for (let i = 0; i < n; i++) {
    let b = q.buttons[i];
    button(width / 2, startY + bh / 2 + i * (bh + gap), width * 0.78, bh, lang == "da" ? b[0] : b[1], b[2], bh < 50 ? 15 : 18);
  }
}

function drawRed() {
  noStroke();
  fill(216, 54, 60);
  rect(0, 0, width, height);
  fill(255); textStyle(BOLD); textSize(34); textLeading(42);
  text(t("red"), width * 0.1, height * 0.30, width * 0.8, height * 0.2);
  textStyle(NORMAL); textSize(14);
  text(t("redAgain"), width / 2, height - insetBottom - 50);
  buttons.push({ x: 0, y: 0, w: width, h: height, value: "restart" });
}

function drawQueued() {
  noStroke();
  fill(inkSoft); textSize(13); textStyle(NORMAL);
  text(t("queued"), width / 2, height * 0.22);
  fill(ink); textStyle(BOLD); textSize(40);
  text(t("number") + " " + queue, width / 2, height * 0.30);
  textStyle(NORMAL); textSize(16); textLeading(24);
  text(t("whileWaiting") + " " + PAGES[profile].title[lang].toLowerCase() + ".", width * 0.12, height * 0.36, width * 0.76, height * 0.12);
  fill(amber); textStyle(BOLD); textSize(14);
  text(t("worse"), width / 2, height * 0.52);
  button(width / 2, height * 0.66, width * 0.7, 60, t("next"), "go-wait");
}


// ========== WAITING SCREEN ==========

function drawCard(breath) {
  let cards = PAGES[profile].cards;
  let elapsed = millis() - cardStart;

  if (queue <= 1) {
    if (elapsed >= FADE) return;                    // you are next: the card fades out and does not return
  } else if (elapsed > CARD_TIME) {
    cardIndex = (cardIndex + 1) % cards.length;
    cardStart = millis();
    elapsed = 0;
  }

  let a = 255;
  if (queue <= 1) a = map(elapsed, 0, FADE, 255, 0);
  else {
    if (elapsed < FADE) a = map(elapsed, 0, FADE, 0, 255);
    if (elapsed > CARD_TIME - FADE) a = map(elapsed, CARD_TIME - FADE, CARD_TIME, 255, 0);
  }

  // the voice reads the card once it has faded in
  if (queue > 1 && cardSpoken != cardIndex && elapsed > FADE * 0.6) {
    cardSpoken = cardIndex;
    say(cardText(cards[cardIndex]));
  }

  let scale_ = 0.98 + 0.04 * breath;
  let w = width * 0.82, h = height * 0.34;
  let cy = insetTop + 30 + h / 2 + height * 0.12;
  push();
  translate(width / 2, cy);
  scale(scale_);
  noStroke();
  fill(red(cardFill), green(cardFill), blue(cardFill), alpha(cardFill) * a / 255);
  rect(-w / 2, -h / 2, w, h, 28);
  noFill();
  stroke(red(cardEdge), green(cardEdge), blue(cardEdge), alpha(cardEdge) * a / 255);
  strokeWeight(1);
  rect(-w / 2, -h / 2, w, h, 28);
  noStroke();

  let c = cards[cardIndex];
  fill(red(inkSoft), green(inkSoft), blue(inkSoft), a);
  textSize(13); textStyle(NORMAL);
  text(c[0][lang].toUpperCase(), 0, -h / 2 + 32);
  fill(red(ink), green(ink), blue(ink), a);
  textSize(22); textLeading(30);
  text(cardText(c), -w / 2 + 28, -h / 2 + 56, w - 56, h - 100);
  fill(red(inkSoft), green(inkSoft), blue(inkSoft), a * 0.8);
  textSize(12);
  let source = (profile == "general") ? "1813" : "akut.dk";
  let credit = source + " · " + PAGES[profile].title[lang];
  if (lang == "en" && source == "akut.dk") credit += " · " + t("translated");
  text(credit, 0, h / 2 - 24);
  pop();
}

function cardText(card) { return lang == "da" ? card[1] : card[2]; }

function drawSky(breath) {
  let k = (sin(millis() * 0.000017) + 1) / 2;       // drifts between the two palettes over about 3 minutes
  let pal = night ? SKY_NIGHT : SKY_DAY;
  let grad = drawingContext.createLinearGradient(0, 0, 0, height);
  let stops = [0, 0.4, 0.7, 1.0];
  for (let i = 0; i < 4; i++) {
    let a = pal[0][i], b = pal[1][i];
    grad.addColorStop(stops[i], "rgb(" + round(lerp(a[0], b[0], k)) + "," + round(lerp(a[1], b[1], k)) + "," + round(lerp(a[2], b[2], k)) + ")");
  }
  drawingContext.fillStyle = grad;
  noStroke();
  rect(0, 0, width, height);

  // the sun sits a little higher the closer you get to being next
  let level = map(queue, QUEUE_START, 1, 0.62, 0.50, true);
  let sx = width / 2, sy = height * level - breath * 10, r = width * 0.42;
  let sun = drawingContext.createRadialGradient(sx, sy, 0, sx, sy, r);
  if (night) { sun.addColorStop(0, "rgba(255,200,120,0.9)"); sun.addColorStop(0.35, "rgba(255,150,90,0.5)"); sun.addColorStop(1, "rgba(255,120,90,0)"); }
  else       { sun.addColorStop(0, "rgba(255,250,210,0.95)"); sun.addColorStop(0.35, "rgba(255,220,150,0.55)"); sun.addColorStop(1, "rgba(255,200,140,0)"); }
  drawingContext.fillStyle = sun;
  rect(0, 0, width, height);
}

function drawClouds() {
  noStroke();
  for (let c of clouds) {
    c.x += c.speed;
    if (c.x - c.w > width) c.x = -c.w;
    let bob = sin(frameCount * 0.004 + c.phase) * 6;
    fill(255, 255, 255, night ? 40 : 110);
    ellipse(c.x, c.y + bob, c.w, c.h);
    ellipse(c.x - c.w * 0.25, c.y + bob + c.h * 0.15, c.w * 0.55, c.h * 0.7);
    ellipse(c.x + c.w * 0.25, c.y + bob + c.h * 0.1, c.w * 0.6, c.h * 0.8);
  }
}

function figurePosition(n) {
  return map(n, QUEUE_START, 1, 50, width - 90, true);
}

function drawFigure() {
  let y = height - insetBottom - 150;
  stroke(lineColor); strokeWeight(2);
  line(30, y + 24, width - 30, y + 24);

  // the nurse at the end of the path
  noStroke(); fill(46, 158, 91);
  circle(width - 50, y, 30);
  fill(255); circle(width - 56, y - 4, 3); circle(width - 44, y - 4, 3);
  noFill(); stroke(255); strokeWeight(2);
  arc(width - 50, y + 2, 12, 8, 0, PI);

  // the figure only walks when the queue has moved
  let walking = abs(figureTarget - figureX) > 0.5;
  if (walking) { figureX = lerp(figureX, figureTarget, 0.02); stride += 0.18; }
  else stride += 0.03;
  let swing = sin(stride) * (walking ? 9 : 2);

  stroke(ink); strokeWeight(2.5);
  line(figureX, y - 6, figureX, y + 10);
  line(figureX, y + 10, figureX - swing * 0.6, y + 24);
  line(figureX, y + 10, figureX + swing * 0.6, y + 24);
  line(figureX, y - 2, figureX + swing * 0.4, y + 6);
  line(figureX, y - 2, figureX - swing * 0.4, y + 6);
  noStroke(); fill(ink);
  circle(figureX, y - 14, 13);
}

function drawBottom() {
  let y = height - insetBottom - 96;
  noStroke();
  fill(ink); textSize(18); textStyle(BOLD);
  text(queue <= 1 ? t("youAreNext") : t("youAre") + " " + queue, width / 2, y);

  fill(inkSoft); textSize(13); textStyle(NORMAL);
  text(queue <= 1 ? t("nurseSoon") : t("approx") + " " + (queue * MINUTES_PER_PLACE) + " " + t("minutes"), width / 2, y + 26);

  fill(amber); textSize(13); textStyle(BOLD);
  text(t("worse"), width / 2, y + 56);
}

// demo button: sun or moon, top right, below the notch
function drawSunMoon() {
  let x = width - 34, y = insetTop + 34;
  noStroke();
  fill(255, 255, 255, night ? 60 : 140);
  circle(x, y, 36);
  if (night) { fill(255, 240, 200); circle(x + 2, y, 16); fill(skyTop()); circle(x + 7, y - 3, 12); }
  else       { fill(255, 210, 90); circle(x, y, 16); }
  buttons.push({ x: x - 24, y: y - 24, w: 48, h: 48, value: "sunmoon" });
}
function skyTop() { return night ? color(60, 40, 110) : color(255, 196, 140); }

// demo button: language, top left on the start screen
function drawLanguage() {
  let x = 44, y = insetTop + 34;
  noStroke();
  fill(255, 255, 255, night ? 60 : 140);
  rect(x - 28, y - 16, 56, 32, 16);
  fill(ink); textSize(13); textStyle(BOLD);
  text(lang == "da" ? "DA · en" : "da · EN", x, y);
  buttons.push({ x: x - 28, y: y - 16, w: 56, h: 32, value: "language" });
}


// ========== BUTTONS AND TAPS ==========

function button(cx, cy, w, h, label, value, size) {
  noStroke();
  fill(red(cardFill), green(cardFill), blue(cardFill), alpha(cardFill));
  rect(cx - w / 2, cy - h / 2, w, h, h / 2);
  fill(ink); textSize(size || 18); textStyle(BOLD);
  text(label, cx, cy);
  buttons.push({ x: cx - w / 2, y: cy - h / 2, w: w, h: h, value: value });
}

function tap(mx, my) {
  if (millis() - lastTap < 150) return;             // one tap, not two (touch + mouse)
  lastTap = millis();
  startSound();

  for (let b of buttons) {
    if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) { handle(b.value); return; }
  }
  if (state == "waiting") queueMoves();             // tap outside the buttons: the queue moves (demo)
}

function handle(value) {
  if (value == "sunmoon")  { night = !night; setColors(); return; }
  if (value == "language") { lang = (lang == "da") ? "en" : "da"; return; }
  if (value == "restart")  { restart(); return; }

  if (state == "start" && value == "call") {
    state = "cpr"; cpr = "";
    say(t("sayCpr"));
    return;
  }
  if (state == "cpr") {
    if (value == "cpr-del") cpr = cpr.slice(0, -1);
    else if (value == "cpr-next" || value == "cpr-skip") {
      answers = {};
      if (value == "cpr-next") {
        let group = ageGroupFromCpr(cpr);              // the first six digits are the birthday
        if (group) answers.who = group;
      }
      state = "triage"; asked = 0;
      say(currentStep()[lang]);
    }
    else if (value.startsWith("cpr-") && cpr.length < 10) cpr += value.slice(4);
    return;
  }
  if (state == "triage") {
    let step = currentStep();
    answers[step.key] = value;
    asked += 1;
    if (step.redIf && value == step.redIf) { state = "red"; say(t("sayRed")); return; }
    let next = currentStep();
    if (next == null) {
      profile = pageKey();
      state = "queued";
      say(t("sayQueued")(queue, PAGES[profile].title[lang].toLowerCase()));
    } else {
      say(next[lang]);
    }
    return;
  }
  if (state == "queued" && value == "go-wait") {
    state = "waiting";
    cardStart = millis(); cardIndex = 0; cardSpoken = -1;
    figureX = figurePosition(queue); figureTarget = figureX;
  }
}

// akut.dk's age groups from the CPR number: ddmmyy in the first six digits.
// Returns "infant" (0 to 3 months), "child" (4 months to 12 years) or "adult" (13 and over); null if unreadable.
function ageGroupFromCpr(digits) {
  if (digits.length < 6) return null;
  let day = int(digits.slice(0, 2)), month = int(digits.slice(2, 4)), yy = int(digits.slice(4, 6));
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  let now = new Date();
  let century = (yy <= now.getFullYear() % 100) ? 2000 : 1900;    // 26 -> 2026, 85 -> 1985 (good enough for a demo)
  let birth = new Date(century + yy, month - 1, day);
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 4) return "infant";
  if (months < 13 * 12) return "child";
  return "adult";
}

function queueMoves() {
  if (queue > 1) {
    queue -= 1;
    figureTarget = figurePosition(queue);
    if (queue == 1) { cardStart = millis(); say(t("sayNext")); }
    else say(t("sayNumber")(queue));
  } else {
    restart();                                        // demo: tap again when you are next, and it starts over
  }
}

function restart() {
  state = "start"; queue = QUEUE_START; answers = {}; asked = 0; cardIndex = 0; cardSpoken = -1; cpr = ""; profile = "general";
  if (window.speechSynthesis) speechSynthesis.cancel();
}

function mousePressed() { tap(mouseX, mouseY); }
function touchStarted() { tap(mouseX, mouseY); return false; }

function keyPressed() {
  if (key === " ") { if (state == "waiting") queueMoves(); }
  if (key === "n") { night = !night; setColors(); }
  if (key === "l") lang = (lang == "da") ? "en" : "da";
  if (key === "r") restart();
  if (key === "m") musicChoice = (musicChoice == "piano") ? "mindfulness" : (musicChoice == "mindfulness") ? "off" : "piano";
}


// ========== SOUND ==========

function startSound() {
  if (soundStarted) return;
  userStartAudio();
  for (let name in musicFiles) {                     // both files loop all the time, only the volume changes
    musicFiles[name].setVolume(0);
    musicFiles[name].loop();
  }
  // iPhone Safari only allows speech that starts inside a tap: a silent utterance unlocks it
  if (window.speechSynthesis) {
    let u = new SpeechSynthesisUtterance("hej");
    u.volume = 0;
    u.lang = "da-DK";
    speechSynthesis.speak(u);
  }
  soundStarted = true;
}

// quiet during triage, full while waiting, ducked while the voice speaks, fading down when you are next
function updateMusic() {
  if (!soundStarted) return;
  let level = (state == "waiting") ? 1 : 0.35;
  if (state == "waiting" && queue <= 1) level = 0.3;
  let target = speaking ? 0.25 : 1;
  duck = lerp(duck, target, 0.05);
  for (let name in musicFiles) {
    let volume = (name == musicChoice) ? MUSIC_LEVEL * level * duck : 0;
    musicFiles[name].setVolume(volume, 0.15);
  }
}

// the phone's own voice, Danish or English
function say(text_) {
  if (!window.speechSynthesis || !voiceOn) return;
  speechSynthesis.cancel();
  // iPhone drops an utterance that starts right after cancel(), so we wait a moment
  setTimeout(() => {
    let u = new SpeechSynthesisUtterance(text_);
    u.lang = (lang == "da") ? "da-DK" : "en-GB";
    u.rate = 0.95;
    let wanted = (lang == "da") ? "da" : "en";
    let match = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(wanted));
    if (match.length) u.voice = match[0];
    u.onstart = () => { speaking = true; if (IS_IOS && soundStarted) getAudioContext().suspend(); };
    u.onend = () => { speaking = false; if (IS_IOS && soundStarted) getAudioContext().resume(); };
    u.onerror = (e) => { speaking = false; lastSpeechError = e.error || "error"; if (IS_IOS && soundStarted) getAudioContext().resume(); };
    speechSynthesis.speak(u);
  }, 80);
}


// ========== THE SUN ==========
// Sunrise and sunset for Copenhagen (55.68 N, 12.57 E) with the standard sunrise equation (NOAA/Almanac).
// Day = between sunrise and sunset, otherwise night. The demo button can still override.
const LAT = 55.68, LON = 12.57;

function sunTime(date, rising) {
  let start = new Date(date.getFullYear(), 0, 0);
  let N = floor((date - start) / 86400000);                   // day of the year
  let lngHour = LON / 15;
  let tt = N + ((rising ? 6 : 18) - lngHour) / 24;
  let M = 0.9856 * tt - 3.289;                                  // mean anomaly
  let L = M + 1.916 * sin(radians(M)) + 0.020 * sin(radians(2 * M)) + 282.634;
  L = (L + 360) % 360;                                          // true longitude
  let RA = degrees(atan(0.91764 * tan(radians(L))));
  RA = (RA + 360) % 360;
  RA = RA + (floor(L / 90) * 90 - floor(RA / 90) * 90);        // same quadrant as L
  RA = RA / 15;
  let sinDec = 0.39782 * sin(radians(L));
  let cosDec = cos(asin(sinDec));
  let cosH = (cos(radians(90.833)) - sinDec * sin(radians(LAT))) / (cosDec * cos(radians(LAT)));
  if (cosH > 1 || cosH < -1) return null;                       // polar day or night (not in Copenhagen)
  let H = rising ? 360 - degrees(acos(cosH)) : degrees(acos(cosH));
  H = H / 15;
  let T = H + RA - 0.06571 * tt - 6.622;
  let UT = (T - lngHour + 24) % 24;
  return (UT - date.getTimezoneOffset() / 60 + 24) % 24;        // local time in hours, e.g. 7.5 = 07:30
}

function isNight() {
  let now = new Date();
  let up = sunTime(now, true), down = sunTime(now, false);
  if (up == null || down == null) return false;
  let h = now.getHours() + now.getMinutes() / 60;
  console.log("Sunrise " + timeText(up) + ", sunset " + timeText(down));
  return h < up || h > down;
}

function timeText(hours) { return nf(floor(hours), 2) + "." + nf(floor((hours % 1) * 60), 2); }


// ========== COLORS ==========

function setColors() {
  if (night) {
    cardFill = color(30, 20, 50, 150); cardEdge = color(255, 200, 150, 90);
    ink = color(255, 240, 225); inkSoft = color(240, 200, 180);
    lineColor = color(255, 200, 150, 120); amber = color(255, 215, 90);
  } else {
    cardFill = color(255, 255, 255, 190); cardEdge = color(255, 255, 255, 220);
    ink = color(70, 40, 40); inkSoft = color(150, 100, 90);
    lineColor = color(255, 255, 255, 170); amber = color(140, 60, 20);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  readInsets();
  figureX = figurePosition(queue); figureTarget = figureX;
}

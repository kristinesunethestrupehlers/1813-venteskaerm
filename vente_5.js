// 1813 · VENTEUNIVERS, step 5 (the green version, built as code after the group's decisions 14 Nov 2026)
//
//   SMS  ->  "Opretter forbindelse"  ->  intro (the landscape rises, the figure walks to the hospital)  ->  home
//   home: Forbered din samtale (CPR -> age group, then one question at a time, confirm, sent)
//         · Din ventetid (the full landscape) · Find ro (sky only, breathing) · Gode råd til dig (one card at a time, browsable)
//   the queue runs on a timer; when it reaches zero the nurse answers and the participant gets three questions
//   (how long did you think you waited, how calm, how much unrest); the answers are kept for the test leader.
//
// Test leader panel: tap the "1813" title three times quickly. Scenario, noise, waiting time, status style, results.
// Controls (top right): day/night · voice on/off (speaker, OFF by default) · music on/off (off = the Danish ringback tone)
// Keyboard on a computer: n = night, v = voice, m = music, t = test leader panel, space = skip 30 s of waiting

// ------------------------------------------------------------ state
let state = "sms";              // sms, intro, home, flow, confirm, sent, red, wait, calm, advice, answered, survey, done
let night = false;
let insetTop = 0, insetBottom = 0;
let buttons = [], lastTap = 0;
let stateSince = 0;             // millis() when the state was entered

// ------------------------------------------------------------ test settings (the test leader can change them)
const SCENARIOS = [
  "Barn 2 år, feber 40", "Barn 5 år, opkast og diarré", "Barn 8 år, ondt i øret",
  "Voksen, influenza", "Voksen, mavesmerter", "Voksen, slået hovedet", "Spædbarn 2 mdr, feber"
];
const NOISES = ["ingen", "baby", "trafik", "storm", "børn"];
const NOISE_FILES = { baby: "lyd/noise-baby.mp3", trafik: "lyd/noise-traffic.mp3", storm: "lyd/noise-storm.mp3", "børn": "lyd/noise-children.mp3" };
let test = { scenario: 0, noise: "ingen", waitMin: 3, status: "stones", startedAt: 0 };
let panelOpen = false;
let titleTaps = [];

// ------------------------------------------------------------ queue
const QUEUE_START = 7;
let waitStart = 0;              // millis() when the queue started (after the intro)
let answeredAt = 0;
let lastSpokenNumber = 0;
function waitTotalMs() { return test.waitMin * 60 * 1000; }
function waitRemaining() { return waitStart ? max(0, waitTotalMs() - (millis() - waitStart)) : waitTotalMs(); }
function queueNumber() { return max(1, ceil(QUEUE_START * waitRemaining() / waitTotalMs())); }
function minutesLeft() { return max(1, ceil(waitRemaining() / 60000)); }
function progress() { return waitStart ? 1 - waitRemaining() / waitTotalMs() : 0; }
function queueSentence() { let n = queueNumber(); return n == 1 ? "Du er den næste." : "Du er nummer " + n + " i køen. Der er cirka " + minutesLeft() + " minutter til."; }

// ------------------------------------------------------------ the questionnaire (one question at a time)
let answers = {};               // who (infant/child/adult), theme, sub, q0..q2, temp, together
let cpr = "";
let qIndex = 0;
let flowDone = false;
const AGE_BUTTONS = [["0 til 3 måneder", "infant"], ["4 måneder til 12 år", "child"], ["13 år og op", "adult"]];

function flowSteps() {
  let steps = [];
  if (!answers.who) {
    steps.push({ key: "cpr", type: "cpr" });
    if (answers.cpr == "skip") steps.push({ key: "who", text: "Hvor gammel er den, det drejer sig om?", buttons: AGE_BUTTONS });
    return steps;
  }
  steps.push({ key: "temp",     text: "Har du målt temperaturen?",                buttons: [["Ja","yes"],["Nej","no"]] });
  steps.push({ key: "together", text: "Er du sammen med den, det drejer sig om?",  buttons: [["Ja","yes"],["Nej","no"]] });
  steps.push({ key: "theme",    text: "Hvad drejer det sig om?",                    buttons: THEMES[answers.who].map((th,i) => [th.da, String(i)]) });
  if (answers.theme == null) return steps;
  let th = THEMES[answers.who][int(answers.theme)];
  if (th.sub.length > 1) { steps.push({ key: "sub", text: "Hvad passer bedst?", buttons: th.sub.map((sb,i) => [sb[0], String(i)]) }); if (answers.sub == null) return steps; }
  let sub = th.sub[int(answers.sub || 0)];
  let pk = sub[2] || "general";
  if (pk == "direct") return steps;                         // psychiatric help / assault: no more questions
  PAGES[pk].questions.slice(0, 3).forEach((q,i) => steps.push({ key: "q"+i, text: q.da, buttons: (q.buttons || YES_NO).map(b => [b[0], b[2]]), redIf: q.redIf }));
  return steps;
}
function currentPage() {
  if (!answers.who || answers.theme == null) return "general";
  let th = THEMES[answers.who][int(answers.theme)]; let sub = th.sub[int(answers.sub || 0)];
  return sub[2] && PAGES[sub[2]] ? sub[2] : "general";
}
function ageGroupFromCpr(digits) {
  if (digits.length < 6) return null;
  let day = int(digits.slice(0, 2)), month = int(digits.slice(2, 4)), yy = int(digits.slice(4, 6));
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  let now = new Date();
  let century = (yy <= now.getFullYear() % 100) ? 2000 : 1900;   // the six first digits decide (prototype; the 7th digit is ignored)
  let birth = new Date(century + yy, month - 1, day);
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 4) return "infant";
  if (months < 13 * 12) return "child";
  return "adult";
}

// ------------------------------------------------------------ advice deck
let cardIndex = 0, cardShownAt = 0;
const CARD_SECONDS = 25;
function adviceCards() {
  let pk = currentPage();
  let cards = PAGES[pk].cards.slice();
  if (pk != "general") cards = cards.concat(PAGES.general.cards);
  return cards;
}

// ------------------------------------------------------------ sound
const MUSIC = { piano: "lyd/golden-sunset-piano.mp3", mindfulness: "lyd/radiant-mindfulness.mp3" };
let musicFiles = {}, noiseFiles = {};
let musicOn = true, voiceOn = false, soundStarted = false, soundError = "";
let ringOsc;
let speaking = false, speakingUntil = 0, duck = 1;
let voices = [];
let currentUtterance = null;

// ------------------------------------------------------------ colours
const C = {
  day:   { ink: "#1E3A2C", soft: "#5E7A68", accent: "#2F7A52", accent2: "#9FD5A8", card: "#FFFBF3", cardsh: "rgba(40,70,50,0.18)", red: "#B2321C",
           skyTop: "#CFE6F4", skyBot: "#F4F1DE", far: ["#9CC9A5","#6FA982"], mid: ["#78B384","#4F8F5E"], near: ["#5A9C6B","#3A7449"], path: "#E0D2B2", pathEdge: "#C2AE86", walked: "#B89F78", ground: "#F4F1DE" },
  night: { ink: "#F2F4EA", soft: "#B9C7B6", accent: "#9FD5A8", accent2: "#2F7A52", card: "#1C3330", cardsh: "rgba(0,0,0,0.35)", red: "#FF7A66",
           skyTop: "#0B1A2E", skyBot: "#1E4A4A", far: ["#22504A","#163631"], mid: ["#1B4A3F","#113029"], near: ["#164238","#0E2A24"], path: "#6A6552", pathEdge: "#4A463A", walked: "#8A7A5C", ground: "#0E2A24" }
};
function col() { return night ? C.night : C.day; }

// ------------------------------------------------------------ setup / draw
function preload() {
  musicFiles.piano = loadSound(MUSIC.piano);
  musicFiles.mindfulness = loadSound(MUSIC.mindfulness);
  for (let k in NOISE_FILES) noiseFiles[k] = loadSound(NOISE_FILES[k]);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER); textFont("Helvetica");
  readInsets();
  night = isNight();
  if (window.speechSynthesis) { voices = speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => { voices = speechSynthesis.getVoices(); }; }
  enter("sms");
}
function readInsets() {
  let t = document.getElementById("inset-top"), b = document.getElementById("inset-bottom");
  insetTop = t ? t.offsetHeight : 0; insetBottom = b ? b.offsetHeight : 0;
}
function enter(s) { state = s; stateSince = millis(); }
function since() { return millis() - stateSince; }

function draw() {
  // every frame starts from a clean, opaque canvas and a known fill state (Safari kept old frames when fill was off)
  drawingContext.globalAlpha = 1;
  fill(0); noStroke();
  buttons = [];
  let breath = (sin(frameCount * 0.013) + 1) / 2;

  // the queue ends: the nurse answers
  if (waitStart && !answeredAt && waitRemaining() <= 0 && ["home","flow","confirm","sent","wait","calm","advice","red"].includes(state)) {
    answeredAt = millis(); enter("answered"); stopAmbience(); say("Sygeplejersken tager telefonen nu.");
  }
  // the voice follows the queue
  if (waitStart && !answeredAt && voiceOn && !["flow","confirm","sms","intro","survey"].includes(state) && queueNumber() != lastSpokenNumber) {
    lastSpokenNumber = queueNumber(); say(queueSentence());
  }

  if (state == "sms")           drawSms();
  else if (state == "intro")    drawIntro();
  else if (state == "home")     drawHome();
  else if (state == "flow")     drawFlow();
  else if (state == "confirm")  drawConfirm();
  else if (state == "sent")     drawSent();
  else if (state == "red")      drawRed();
  else if (state == "wait")     drawWait(breath);
  else if (state == "calm")     drawCalm(breath);
  else if (state == "advice")   drawAdvice();
  else if (state == "answered") drawAnswered();
  else if (state == "survey")   drawSurvey();
  else if (state == "done")     drawDone();

  if (panelOpen) drawPanel();
  updateSound(breath);
}

// ============================================================ screens
function drawSms() {
  background("#F2F2F7");
  noStroke();
  fill("#FFFFFF"); rect(0, 0, width, insetTop + 92);
  fill("#C7C7CC"); circle(width/2, insetTop + 40, 44);
  fill("#FFFFFF"); textSize(18); textStyle(BOLD); text("1813", width/2, insetTop + 40);
  fill("#8E8E93"); textSize(12); textStyle(NORMAL); text("1813 >", width/2, insetTop + 76);
  fill("#8E8E93"); textSize(11); text("i dag " + nf(hour(),2) + "." + nf(minute(),2), width/2, insetTop + 118);
  let bw = min(width * 0.76, 330), bx = 16, by = insetTop + 140;
  let msg = "Fortæl os om din situation, så vi bedst muligt kan hjælpe dig. Oplev 1813's venteunivers:";
  fill("#E9E9EB"); rect(bx, by, bw, 132, 18);
  fill("#111"); textSize(15); textAlign(LEFT, TOP); textLeading(20);
  text(msg, bx + 14, by + 12, bw - 28, 100);
  fill("#0A7AFF"); text("1813.dk/venteunivers", bx + 14, by + 98);
  textAlign(CENTER, CENTER);
  buttons.push({ x: bx, y: by, w: bw, h: 132, value: "open-link" });
  fill("#FFFFFF"); rect(0, height - insetBottom - 56, width, 56 + insetBottom);
  fill("#E9E9EB"); rect(50, height - insetBottom - 46, width - 100, 36, 18);
  fill("#8E8E93"); textSize(13); text("iMessage", width/2, height - insetBottom - 28);
}

function drawIntro() {
  // 0 to 1.8 s: "Opretter forbindelse". 1.8 to 3.0 s: the landscape slides up. 3.0 to 6.4 s: the figure walks. 6.4 to 7.2 s: path and figure fade.
  let t = since();
  let c = col();
  drawSky(true);
  if (t < 2400) {
    let a = t < 1800 ? 1 : 1 - (t - 1800) / 600;
    noStroke(); fill(red(c.ink), green(c.ink), blue(c.ink), 255 * a); textSize(16); textStyle(NORMAL);
    text("Opretter forbindelse til 1813", width/2, height * 0.42);
    for (let i = 0; i < 3; i++) { let k = 0.5 + 0.5 * sin(frameCount * 0.12 - i * 1.1); fill(red(c.accent), green(c.accent), blue(c.accent), (80 + 175 * k) * a); circle(width/2 - 16 + i * 16, height * 0.42 + 30, 6 + 3 * k); }
  }
  let rise = constrain((t - 1800) / 1200, 0, 1); rise = 1 - pow(1 - rise, 3);
  let walk = constrain((t - 3000) / 3400, 0, 1);
  let fade = constrain((t - 6400) / 800, 0, 1);
  if (rise > 0) { push(); translate(0, (1 - rise) * height); drawLandscape(insetTop + 150, height - insetBottom - 120, walk, 1 - fade, true); pop(); }
  if (t > 7000) { enter("home"); waitStart = millis(); test.startedAt = millis(); lastSpokenNumber = 0; startAmbience(); }
}

function drawHome() {
  drawSky(); drawHills(insetTop + 222, height);
  statusBlock();
  drawTopBar("", false);
  let c = col();
  noStroke(); textSize(30); textStyle(BOLD);
  fill(c.cardsh); text("Velkommen til 1813", width/2 + 1, insetTop + 176);
  fill(c.ink); text("Velkommen til 1813", width/2, insetTop + 174);
  let y = insetTop + 230, h = 70, gap = 12, bx = 24, bw = width - 48;
  if (width > 600) { bw = 520; bx = (width - bw) / 2; }
  menuBox(bx, y, bw, h, "Forbered din samtale", flowDone ? "Sendt til sygeplejersken" : "Start her", "check", "flow", !flowDone);
  menuBox(bx, y + (h+gap), bw, h, "Din ventetid", "Nr. " + queueNumber() + " i køen", "clock", "wait", false, minutesLeft() + " min.");
  menuBox(bx, y + 2*(h+gap), bw, h, "Find ro", "Mens du venter", "cloud", "calm", false);
  menuBox(bx, y + 3*(h+gap), bw, h, "Gode råd til dig", "Fra akut.dk", "heart", "advice", false);
}

function drawFlow() {
  drawSky(); drawHills(height - insetBottom - 170, height);
  statusBlock();
  drawTopBar("Forbered din samtale", true);
  let steps = flowSteps();
  if (qIndex >= steps.length) { enter("confirm"); return; }
  let q = steps[qIndex];
  let c = col();
  if (q.type == "cpr") { drawCprStep(); return; }
  noStroke(); fill(c.soft); textSize(12); text("SPØRGSMÅL " + (qIndex + 1), width/2, insetTop + 150);
  fill(c.ink); textSize(q.text.length < 34 ? 24 : 21); textLeading(30); textStyle(BOLD);
  text(q.text, width*0.1, insetTop + 170, width*0.8, 110);
  textStyle(NORMAL);
  let n = q.buttons.length;
  let top = insetTop + 290, room = height - insetBottom - 190 - top;
  let cols = n > 6 ? 2 : 1, rows = ceil(n / cols);
  let gapB = cols == 2 ? 8 : 12, bh = constrain((room - (rows-1)*gapB) / rows, 40, 56);
  let full = min(width*0.78, 420), bw = cols == 2 ? full * 0.55 : full;
  for (let i = 0; i < n; i++) {
    let cx = cols == 2 ? (i % 2 == 0 ? width/2 - bw/2 - 5 : width/2 + bw/2 + 5) : width/2;
    let row = floor(i / cols);
    choiceButton(cx, top + bh/2 + row*(bh+gapB), bw, bh, q.buttons[i][0], "ans:" + q.buttons[i][1], false, cols == 2 ? 13 : (bh < 48 ? 15 : 17));
  }
}

function drawCprStep() {
  let c = col();
  noStroke(); fill(c.ink); textSize(20); textStyle(BOLD); textLeading(26);
  text("CPR-nummer på den, det drejer sig om", width*0.1, insetTop + 150, width*0.8, 60);
  textStyle(NORMAL);
  // the field
  let fw = min(width - 80, 300), fx = (width - fw)/2, fy = insetTop + 216;
  card(fx, fy, fw, 46, 12);
  let shown = cpr.slice(0, 6) + (cpr.length > 6 ? "-" + cpr.slice(6) : "");
  fill(cpr.length ? c.ink : c.soft); textSize(22); textStyle(cpr.length ? BOLD : NORMAL); text(shown || "ddmmåå-xxxx", width/2, fy + 23); textStyle(NORMAL);
  // keypad
  let keys = ["1","2","3","4","5","6","7","8","9","slet","0","videre"];
  let kw = min((width - 48) / 3 - 8, 100), kh = 44, gap = 8;
  let top = fy + 64, room = height - insetBottom - 190 - top;
  kh = constrain((room - 3*gap) / 4, 36, 48);
  let left = width/2 - 1.5*kw - gap;
  for (let i = 0; i < 12; i++) {
    let k = keys[i], cx = left + (i % 3) * (kw + gap) + kw/2, cy = top + floor(i/3) * (kh + gap) + kh/2;
    if (k == "slet") choiceButton(cx, cy, kw, kh, "⌫", "key:del", false, 18);
    else if (k == "videre") primaryButton(cx, cy, kw, kh, "Videre", "key:go", 15);
    else choiceButton(cx, cy, kw, kh, k, "key:" + k, false, 20);
  }
  fill(c.soft); textSize(13); text("Kender det ikke", width/2, top + 4*(kh+gap) + 10);
  buttons.push({ x: width/2 - 80, y: top + 4*(kh+gap) - 8, w: 160, h: 36, value: "key:skip" });
}

function drawConfirm() {
  drawSky(); drawHills(height - insetBottom - 170, height);
  statusBlock();
  drawTopBar("Forbered din samtale", true);
  let c = col();
  noStroke(); fill(c.ink); textSize(24); textStyle(BOLD);
  text("Er du sikker på dine svar?", width*0.1, insetTop + 170, width*0.8, 80);
  textStyle(NORMAL); fill(c.soft); textSize(14);
  text((flowSteps().length - 1) + " svar klar til sygeplejersken", width/2, insetTop + 250);
  primaryButton(width/2, insetTop + 320, min(width*0.72, 320), 54, "Ja, send", "send");
  choiceButton(width/2, insetTop + 390, min(width*0.72, 320), 50, "Gennemgå igen", "review", false, 16);
}

function drawSent() {
  drawSky(); drawHills(height - insetBottom - 170, height);
  statusBlock();
  drawTopBar("", false);
  let c = col();
  noStroke(); fill(c.accent); circle(width/2, insetTop + 220, 64);
  stroke(night ? "#0E2A24" : "#FFFFFF"); strokeWeight(5); noFill();
  line(width/2 - 14, insetTop + 222, width/2 - 4, insetTop + 232); line(width/2 - 4, insetTop + 232, width/2 + 16, insetTop + 208);
  noStroke(); fill(c.ink); textSize(24); textStyle(BOLD); text("Sendt", width/2, insetTop + 290);
  textStyle(NORMAL); fill(c.soft); textSize(15); text("Sygeplejersken har dine svar.", width/2, insetTop + 320);
  if (since() > 2200) enter("home");
}

function drawRed() {
  background("#C8403F");
  noStroke(); fill("#FFFFFF"); textSize(34); textStyle(BOLD); textLeading(42);
  text("Læg på, og ring 112 nu", width*0.1, height*0.3, width*0.8, height*0.2);
  textStyle(NORMAL); textSize(14); text("Tryk for at starte forfra", width/2, height - insetBottom - 50);
  buttons.push({ x: 0, y: 0, w: width, h: height, value: "restart" });
}

function drawWait(breath) {
  drawSky();
  drawLandscape(insetTop + 150, height - insetBottom - 120, progress(), 1, false, breath);
  drawTopBar("Din ventetid", true);
  let c = col();
  noStroke(); fill(c.cardsh); rect(25, insetTop + 118, 124, 30, 15); fill(c.accent); rect(24, insetTop + 116, 124, 30, 15);
  fill(night ? "#0E2A24" : "#FFFFFF"); textSize(14); textStyle(BOLD); text("ca. " + minutesLeft() + " min.", 86, insetTop + 131);
  fill(c.ground); rect(0, height - insetBottom - 120, width, 120 + insetBottom);
  card(24, height - insetBottom - 104, width-48, 64);
  fill(c.ink); textSize(18); textStyle(BOLD); text(queueNumber() == 1 ? "Du er den næste" : "Du er nr. " + queueNumber() + " i køen", width/2, height - insetBottom - 72);
  textStyle(NORMAL);
}

function drawCalm(breath) {
  drawSky();
  drawTopBar("Find ro", true);
  let c = col();
  let cx = width/2, cy = insetTop + 150 + (height - insetTop - insetBottom - 300) * 0.45;
  let phase = (millis() % 8000) / 8000;
  let inhale = phase < 0.5;
  let k = inhale ? phase * 2 : 1 - (phase - 0.5) * 2;
  let e = 0.5 - 0.5 * cos(k * PI);
  let s1 = 0.86 + 0.14 * e;
  noStroke();
  fill(red(c.accent), green(c.accent), blue(c.accent), 30); blobShape(cx, cy, 150 * s1, 0.06, 3, 5, 0.4);
  fill(red(c.accent), green(c.accent), blue(c.accent), 50); blobShape(cx, cy, 110 * s1, 0.07, 4, 6, 1.3);
  fill(night ? color(36,70,64) : color(255,255,255,235)); blobShape(cx, cy, 70 * s1, 0.06, 3, 5, 2.2);
  fill(c.ink); textSize(15); textStyle(BOLD); text(inhale ? "Ind gennem næsen" : "Ud gennem munden", cx, cy - 6);
  textStyle(NORMAL); textSize(12); fill(c.soft); text("4 sekunder", cx, cy + 16);
  textSize(12); fill(c.soft); let txt = "Nr. " + queueNumber() + " i køen · ca. " + minutesLeft() + " min.";
  text(txt, width/2 + 6, height - insetBottom - 28);
  pulseDot(width/2 + 6 - textWidth(txt)/2 - 12, height - insetBottom - 28, 4);
}

function drawAdvice() {
  drawSky(); drawHills(height - insetBottom - 170, height);
  statusBlock();
  drawTopBar("Gode råd til dig", true);
  let c = col();
  let page = PAGES[currentPage()];
  let cards = adviceCards();
  if (cardIndex >= cards.length) cardIndex = 0;
  if (millis() - cardShownAt > CARD_SECONDS * 1000) { cardIndex = (cardIndex + 1) % cards.length; cardShownAt = millis(); say(cards[cardIndex][1]); }
  noStroke(); fill(c.ink); textSize(20); textStyle(BOLD); text(page.title.da, width/2, insetTop + 150);
  textStyle(NORMAL); fill(c.soft); textSize(12); text(currentPage() == "general" ? "Svar på spørgsmålene, så passer rådene til dig" : "Fra akut.dk", width/2, insetTop + 174);
  // one big card
  let cd = cards[cardIndex];
  let cw = min(width - 48, 440), cx0 = (width - cw)/2, top = insetTop + 200, bottom = height - insetBottom - 200;
  let ch = min(bottom - top, 280);
  card(cx0, top, cw, ch);
  fill(c.accent); textSize(11); textStyle(BOLD); text(cd[0].da.toUpperCase(), width/2, top + 24);
  fill(c.ink); textSize(ch > 220 ? 19 : 16); textStyle(NORMAL); textLeading(ch > 220 ? 27 : 22);
  text(cd[1], cx0 + 24, top + 44, cw - 48, ch - 90);
  // dots and arrows
  for (let i = 0; i < cards.length; i++) { fill(i == cardIndex ? c.accent : (night ? "rgba(255,255,255,0.25)" : "rgba(30,58,44,0.18)")); circle(width/2 - (cards.length-1)*6 + i*12, top + ch - 22, i == cardIndex ? 8 : 6); }
  stroke(c.soft); strokeWeight(2); noFill();
  line(cx0 + 26, top + ch - 22, cx0 + 20, top + ch - 16); line(cx0 + 20, top + ch - 16, cx0 + 26, top + ch - 10);
  line(cx0 + cw - 26, top + ch - 22, cx0 + cw - 20, top + ch - 16); line(cx0 + cw - 20, top + ch - 16, cx0 + cw - 26, top + ch - 10);
  noStroke(); fill(0);
  buttons.push({ x: cx0, y: top, w: cw/2, h: ch, value: "card:prev" });
  buttons.push({ x: cx0 + cw/2, y: top, w: cw/2, h: ch, value: "card:next" });
}

function drawAnswered() {
  drawSky(); drawHills(height - insetBottom - 170, height);
  drawTopBar("", false);
  let c = col();
  noStroke(); fill(c.accent); circle(width/2, insetTop + 230, 90);
  fill("#FFFFFF"); circle(width/2 - 14, insetTop + 222, 6); circle(width/2 + 14, insetTop + 222, 6);
  noFill(); stroke("#FFFFFF"); strokeWeight(4); arc(width/2, insetTop + 236, 36, 22, 0, PI); noStroke();
  fill(c.ink); textSize(24); textLeading(30); textStyle(BOLD); text("Sygeplejersken tager telefonen", width*0.1, insetTop + 300, width*0.8, 70);
  textStyle(NORMAL); fill(c.soft); textSize(14); text("Du ventede " + nf(floor(waitTotalMs()/60000),1) + " min.", width/2, insetTop + 380);
  primaryButton(width/2, insetTop + 440, min(width*0.6, 280), 52, "Videre", "to-survey");
}

let survey = { step: 0, estimate: null, calm: null, energy: null };
function drawSurvey() {
  drawSky(); drawHills(height - insetBottom - 170, height);
  drawTopBar("Tre spørgsmål", false);
  let c = col();
  noStroke(); fill(c.soft); textSize(12); text((survey.step + 1) + " AF 3", width/2, insetTop + 150);
  fill(c.ink); textStyle(BOLD); textSize(22); textLeading(28);
  if (survey.step == 0) {
    text("Hvor længe tror du, du ventede?", width*0.1, insetTop + 170, width*0.8, 80);
    let opts = [1,2,3,4,5,6,8,10];
    for (let i = 0; i < opts.length; i++) {
      let cx = width/2 - 120 + (i % 4) * 80, cy = insetTop + 290 + floor(i/4) * 70;
      choiceButton(cx, cy, 68, 50, opts[i] + " min", "est:" + opts[i], false, 15);
    }
  } else {
    let q = survey.step == 1 ? "Hvor rolig følte du dig, mens du ventede?" : "Hvor meget uro eller energi var der i kroppen?";
    text(q, width*0.1, insetTop + 170, width*0.8, 80);
    textStyle(NORMAL); textSize(12); fill(c.soft);
    text(survey.step == 1 ? "1 = slet ikke rolig · 5 = helt rolig" : "1 = helt stille · 5 = meget uro", width/2, insetTop + 250);
    for (let i = 1; i <= 5; i++) choiceButton(width/2 - 140 + (i-1) * 70, insetTop + 310, 58, 54, String(i), "scale:" + i, false, 18);
  }
}

function drawDone() {
  drawSky(); drawHills(height - insetBottom - 170, height);
  drawTopBar("", false);
  let c = col();
  noStroke(); fill(c.ink); textSize(26); textStyle(BOLD); text("Tak", width/2, insetTop + 220);
  textStyle(NORMAL); fill(c.soft); textSize(15); text("Dine svar er gemt til testlederen.", width/2, insetTop + 256);
  primaryButton(width/2, insetTop + 330, min(width*0.6, 280), 52, "Ny test", "restart");
}

// ============================================================ shared pieces
function drawTopBar(title, back) {
  let c = col();
  if (back) { stroke(c.ink); strokeWeight(2.5); noFill(); line(36, insetTop + 26, 28, insetTop + 34); line(28, insetTop + 34, 36, insetTop + 42); noStroke(); buttons.push({ x: 8, y: insetTop + 10, w: 56, h: 48, value: "home" }); }
  noStroke(); fill(c.ink); textStyle(BOLD);
  if (back) { textAlign(LEFT, CENTER); textSize(18); text(title, 54, insetTop + 34); textAlign(CENTER, CENTER); }
  else { textSize(20); text("1813", width/2, insetTop + 34); buttons.push({ x: width/2 - 60, y: insetTop + 10, w: 120, h: 48, value: "title-tap" }); }
  textStyle(NORMAL);
  let x = width - 28, y = insetTop + 34;
  iconButton(x, y, "night");  iconButton(x - 40, y, "voice");  iconButton(x - 80, y, "music");
  let w = 272, px = (width - w)/2, py = insetTop + 66;
  fill(c.cardsh); rect(px+1, py+2, w, 28, 14); fill("#FFFBF3"); rect(px, py, w, 28, 14);
  fill("#B2321C"); textSize(12); textStyle(BOLD); text("Bliver det værre: læg på og ring 112", width/2, py + 14); textStyle(NORMAL);
}

function iconButton(cx, cy, kind) {
  let c = col();
  let on = kind == "night" ? night : kind == "voice" ? voiceOn : musicOn;
  noStroke(); fill(on ? c.accent : (night ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.55)")); circle(cx, cy, 34);
  let ik = on ? (night ? "#0E2A24" : "#FFFFFF") : c.ink;
  stroke(ik); strokeWeight(2); noFill();
  if (kind == "night") { if (night) { noStroke(); fill(ik); circle(cx+1, cy, 12); fill(c.accent); circle(cx+5, cy-3, 10); } else { noStroke(); fill(ik); circle(cx, cy, 10); stroke(ik); for (let a = 0; a < TWO_PI; a += PI/4) line(cx + cos(a)*8, cy + sin(a)*8, cx + cos(a)*11, cy + sin(a)*11); } }
  if (kind == "voice") { noStroke(); fill(ik); beginShape(); vertex(cx-9,cy-4); vertex(cx-4,cy-4); vertex(cx+2,cy-9); vertex(cx+2,cy+9); vertex(cx-4,cy+4); vertex(cx-9,cy+4); endShape(CLOSE); noFill(); stroke(ik); arc(cx+5, cy, 10, 12, -PI/3, PI/3); arc(cx+5, cy, 18, 20, -PI/3, PI/3); if (!on) line(cx-10, cy+10, cx+10, cy-10); }
  if (kind == "music") { noStroke(); fill(ik); circle(cx-4, cy+5, 7); circle(cx+5, cy+3, 7); stroke(ik); line(cx-1, cy+5, cx-1, cy-8); line(cx+8, cy+3, cx+8, cy-10); line(cx-1, cy-8, cx+8, cy-10); if (!on) line(cx-10, cy+10, cx+10, cy-10); }
  noStroke(); fill(ik);
  buttons.push({ x: cx-20, y: cy-20, w: 40, h: 40, value: "toggle:" + kind });
}

function card(x, y, w, h, r = 18) { let c = col(); noStroke(); fill(c.cardsh); rect(x+2, y+4, w, h, r); fill(c.card); rect(x, y, w, h, r); }

function menuBox(x, y, w, h, title, sub, icon, target, highlight, pill) {
  let c = col();
  card(x, y, w, h);
  if (highlight) { noFill(); stroke(c.accent); strokeWeight(3); rect(x, y, w, h, 18); noStroke(); }
  fill(night ? "#244640" : "#E7F3E8"); circle(x+32, y+h/2, 40);
  stroke(c.accent); strokeWeight(2); noFill();
  let cx = x+32, cy = y+h/2;
  if (icon == "clock") { circle(cx, cy, 18); line(cx, cy-5, cx, cy); line(cx, cy, cx+4, cy+3); }
  if (icon == "cloud") { beginShape(); vertex(cx-9,cy+4); bezierVertex(cx-14,cy+4,cx-13,cy-5,cx-8,cy-6); bezierVertex(cx-7,cy-12,cx+3,cy-13,cx+5,cy-8); bezierVertex(cx+11,cy-9,cx+13,cy,cx+8,cy+4); endShape(CLOSE); }
  if (icon == "check") { circle(cx, cy, 18); line(cx-4, cy, cx-1, cy+3); line(cx-1, cy+3, cx+5, cy-4); }
  if (icon == "heart") { beginShape(); vertex(cx, cy+7); bezierVertex(cx-12,cy-2,cx-7,cy-10,cx,cy-4); bezierVertex(cx+7,cy-10,cx+12,cy-2,cx,cy+7); endShape(CLOSE); }
  noStroke();
  fill(c.ink); textAlign(LEFT, CENTER); textSize(16); textStyle(BOLD); text(title, x+64, y+h/2-9);
  textStyle(NORMAL); fill(c.soft); textSize(12); text(sub, x+64, y+h/2+12); textAlign(CENTER, CENTER);
  stroke(c.soft); strokeWeight(2); noFill(); line(x+w-26, y+h/2-6, x+w-20, y+h/2); line(x+w-20, y+h/2, x+w-26, y+h/2+6); noStroke(); fill(c.ink);
  if (pill) { fill(c.accent); rect(x+w-100, y+12, 62, 22, 11); fill(night ? "#0E2A24" : "#FFFFFF"); textSize(11); textStyle(BOLD); text(pill, x+w-69, y+23); textStyle(NORMAL); }
  buttons.push({ x, y, w, h, value: "go:" + target });
}

function choiceButton(cx, cy, w, h, label, value, selected, size) {
  let c = col();
  noStroke(); fill(c.cardsh); rect(cx-w/2+1, cy-h/2+3, w, h, h/2);
  fill(selected ? c.accent : (night ? "#244640" : "#EEF4EC")); rect(cx-w/2, cy-h/2, w, h, h/2);
  fill(selected ? (night ? "#0E2A24" : "#FFFFFF") : c.ink); textSize(size || 16); textStyle(BOLD); text(label, cx, cy); textStyle(NORMAL);
  buttons.push({ x: cx-w/2, y: cy-h/2, w, h, value });
}
function primaryButton(cx, cy, w, h, label, value, size) {
  let c = col();
  noStroke(); fill(c.cardsh); rect(cx-w/2+1, cy-h/2+3, w, h, h/2);
  fill(c.accent); rect(cx-w/2, cy-h/2, w, h, h/2);
  fill(night ? "#0E2A24" : "#FFFFFF"); textSize(size || 17); textStyle(BOLD); text(label, cx, cy); textStyle(NORMAL);
  buttons.push({ x: cx-w/2, y: cy-h/2, w, h, value });
}

// the queue status, bottom quarter, three styles the test leader can switch between
function statusBlock() {
  let c = col();
  let top = height - insetBottom - 170;
  noStroke(); fill(c.ground); rect(0, top, width, height - top);
  let cw = min(width - 48, 440), cx0 = (width - cw)/2;
  card(cx0, top + 16, cw, 124);
  let n = queueNumber(), m = minutesLeft();
  let txt = n == 1 ? "Du er den næste" : "Nr. " + n + " i køen · ca. " + m + " min.";
  fill(c.ink); textSize(17); textStyle(BOLD); text(txt, width/2 + 8, top + 42);
  textStyle(NORMAL);
  pulseDot(width/2 + 8 - textWidth(txt)/2 - 14, top + 42, 5);
  let p = progress();
  if (test.status == "stones") {
    for (let i = 0; i < QUEUE_START; i++) {
      let x = width/2 - (QUEUE_START-1) * 20 + i * 40, y = top + 92;
      let passed = i < QUEUE_START - n;
      fill(passed ? c.accent : (night ? "rgba(255,255,255,0.18)" : "rgba(30,58,44,0.14)")); circle(x, y, passed ? 16 : 12);
    }
    stroke(night ? "rgba(255,255,255,0.18)" : "rgba(30,58,44,0.14)"); strokeWeight(2); line(width/2 - (QUEUE_START-1)*20, top + 92, width/2 + (QUEUE_START-1)*20, top + 92); noStroke();
    characterSmall(width/2 - (QUEUE_START-1) * 20 + (QUEUE_START - n) * 40, top + 84, 0.55);
  } else if (test.status == "bar") {
    let bx = cx0 + 24, bw = cw - 48, by = top + 86, bh = 14;
    let pulse = 1 + 0.03 * sin(frameCount * 0.013);
    fill(night ? "rgba(255,255,255,0.14)" : "rgba(30,58,44,0.12)"); rect(bx, by, bw, bh, 7);
    fill(c.accent); rect(bx, by - (bh*pulse - bh)/2, bw * p, bh * pulse, 7);
  } else {
    let bx = cx0 + 24, bw = cw - 48;
    stroke(night ? "rgba(255,255,255,0.18)" : "rgba(30,58,44,0.14)"); strokeWeight(6); line(bx, top + 100, bx + bw, top + 100); noStroke();
    for (let i = 1; i < 8; i++) { let x = bx + bw * i/8; fill(i/8 <= p ? c.accent : (night ? "rgba(255,255,255,0.2)" : "rgba(30,58,44,0.16)")); circle(x, top + 100, 6); }
    characterSmall(bx + bw * p, top + 92, 0.7);
  }
}
function pulseDot(x, y, r) { let c = col(); let k = 0.5 + 0.5 * sin(frameCount * 0.06); noStroke(); fill(red(c.accent), green(c.accent), blue(c.accent), 60 + 120 * k); circle(x, y, r * 2 + 4 * k); fill(c.accent); circle(x, y, r); }

// ============================================================ landscape
function setGradient(x0, y0, x1, y1, c1, c2) {
  fill(1, 2, 3);                                        // p5 caches the fill; a dummy colour first, so the next fill() is applied
  let g = drawingContext.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, c1); g.addColorStop(1, c2); drawingContext.fillStyle = g;
}
function drawSky(quiet) {
  let c = col();
  background(c.skyTop);                                 // always an opaque clear
  noStroke();
  setGradient(0, 0, 0, height, c.skyTop, c.skyBot); rect(0, 0, width, height);
  fill(0);
  if (night) {
    for (let i = 0; i < 40; i++) { let x = (i*149) % width, y = (i*83) % int(height*0.4) + 16; fill(255, 255, 255, 110 + (i%4)*30); circle(x, y, i%3 ? 1.6 : 2.4); }
    fill("#F6F0D8"); circle(60, insetTop + 128, 40); fill(c.skyTop); circle(76, insetTop + 120, 32);
  } else { fill(255, 226, 138, 70); circle(width - 64, insetTop + 128, 80); fill("#FFE28A"); circle(width - 64, insetTop + 128, 48); }
  // small clouds in a band between the 112 line and the headline
  for (let [cx, cy, w] of [[90, insetTop + 124, 90], [300, insetTop + 134, 70]]) {
    let drift = (frameCount * 0.06 + cx) % (width + 160) - 80;
    fill(255, 255, 255, night ? 22 : 190);
    ellipse(drift, cy, w, w/4); ellipse(drift - w*0.22, cy + 3, w*0.5, w/6); ellipse(drift + w*0.24, cy + 2, w*0.55, w/5);
  }
  fill(0);
}
function hill(top, a1, a2, bottom, c1, c2) {
  setGradient(0, top, 0, bottom, c1, c2);
  beginShape(); vertex(0, a1); bezierVertex(width*0.3, top, width*0.6, a2 + 40, width, a2); vertex(width, bottom); vertex(0, bottom); endShape(CLOSE);
  // a light rim along the ridge gives the hills some body
  noFill(); stroke(255, 255, 255, night ? 18 : 55); strokeWeight(5);
  beginShape(); vertex(0, a1); bezierVertex(width*0.3, top, width*0.6, a2 + 40, width, a2); endShape();
  noStroke(); fill(0);
}
function drawHills(top, bottom) {
  let c = col(); noStroke();
  let span = bottom - top;
  hill(top, top + 60, top + 36, bottom, c.far[0], c.far[1]);
  hill(top + span*0.3, top + span*0.42, top + span*0.36, bottom, c.mid[0], c.mid[1]);
  hill(top + span*0.62, top + span*0.74, top + span*0.70, bottom, c.near[0], c.near[1]);
}
// The path and the hospital are designed in a 390 px wide frame and scaled, so the shape holds on an iPad too.
function drawLandscape(top, bottom, figT, pathAlpha, walking, breath) {
  let c = col();
  drawHills(top, bottom);
  let span = bottom - top;
  let s = min(width / 390, 1.25), ox = (width - 390 * s) / 2;
  const X = x => ox + x * s;
  let P0 = [X(120), bottom + 6], P1 = [X(372), bottom - span*0.28], P2 = [X(4), top + span*0.42], P3 = [X(176), top + 104];
  const B = t => { let u = 1-t; return [u*u*u*P0[0]+3*u*u*t*P1[0]+3*u*t*t*P2[0]+t*t*t*P3[0], u*u*u*P0[1]+3*u*u*t*P1[1]+3*u*t*t*P2[1]+t*t*t*P3[1]]; };
  const D = t => { let u = 1-t; return [3*u*u*(P1[0]-P0[0])+6*u*t*(P2[0]-P1[0])+3*t*t*(P3[0]-P2[0]), 3*u*u*(P1[1]-P0[1])+6*u*t*(P2[1]-P1[1])+3*t*t*(P3[1]-P2[1])]; };
  let N = 60, L = [], R = [];
  for (let i = 0; i <= N; i++) { let t = i/N, [x,y] = B(t), [dx,dy] = D(t), len = Math.hypot(dx,dy) || 1, nx = -dy/len, ny = dx/len, w = (36*(1-t) + 10) * s; L.push([x+nx*w/2, y+ny*w/2]); R.push([x-nx*w/2, y-ny*w/2]); }
  push();
  drawingContext.globalAlpha = pathAlpha;
  // the forecourt in front of the hospital, so the path arrives somewhere
  let hx = P3[0] + 2, hy = P3[1] - 8;
  noStroke(); fill(c.path); ellipse(hx, hy + 10, 70 * s, 22 * s);
  // the path: shadow, body, edges, the walked part, stones
  fill(0, 0, 0, 40); beginShape(); for (let p of L) vertex(p[0], p[1]+4); for (let p of R.slice().reverse()) vertex(p[0], p[1]+4); endShape(CLOSE);
  fill(c.path); beginShape(); for (let p of L) vertex(p[0], p[1]); for (let p of R.slice().reverse()) vertex(p[0], p[1]); endShape(CLOSE);
  let k = floor(N * figT);
  if (k > 1) { fill(c.walked); beginShape(); for (let p of L.slice(0, k+1)) vertex(p[0], p[1]); for (let p of R.slice(0, k+1).reverse()) vertex(p[0], p[1]); endShape(CLOSE); }
  noFill(); stroke(c.pathEdge); strokeWeight(1.5);
  beginShape(); for (let p of L) vertex(p[0], p[1]); endShape(); beginShape(); for (let p of R) vertex(p[0], p[1]); endShape();
  noStroke();
  for (let j = 1; j < 10; j++) { let t = j/10, [x,y] = B(t); if (t <= figT) { fill(c.accent); circle(x, y-3, 7*s); } else { fill(night ? "rgba(201,194,168,0.45)" : "rgba(255,255,255,0.6)"); circle(x, y-3, 5.5*s); } }
  // trees
  for (let [t, side, h, kind] of [[0.08,1,52,"round"],[0.3,-1,44,"pine"],[0.55,1,36,"pine"],[0.72,-1,30,"round"],[0.9,1,22,"pine"]]) { let [x,y] = B(t); tree(x + side*(60*(1-t)+26)*s, y+6, h*s, kind); }
  // lampposts
  for (let t of [0.2, 0.5, 0.8]) { let [x,y] = B(t); x += (t == 0.5 ? -1 : 1) * 18 * s; stroke(night ? "#C9C2A8" : "#2B2B2B"); strokeWeight(2.5); line(x, y, x, y-30); line(x-5, y-30, x+5, y-30); noStroke();
    if (night) { fill(255, 226, 138, 45); circle(x, y-35, 36); fill(255, 226, 138, 115); circle(x, y-35, 18); fill("#FFF6C8"); circle(x, y-35, 8); } else { fill("#8E8E8E"); rect(x-4, y-38, 8, 7, 2); } }
  hospital(hx, hy - 4, s);
  // the character: walks during the intro, bounces while waiting
  let [fx, fy] = B(walking ? figT : 0.04 + 0.96 * figT);
  let bounce = walking ? abs(sin(frameCount * 0.25)) * 4 : abs(sin(frameCount * 0.09)) * 5;
  let sway = walking ? 0 : sin(frameCount * 0.045) * 4;
  character(fx + sway, fy - bounce, 1);
  drawingContext.globalAlpha = 1;
  pop();
  noStroke(); fill(c.ground); rect(0, bottom, width, height - bottom);
}
// a small block of a building: front, side, roof, canopy, windows, cross. (hx, hy) is the middle of the front's foot.
function hospital(hx, hy, s) {
  push(); translate(hx, hy); scale(s);
  noStroke();
  fill(0, 0, 0, 55); ellipse(6, 4, 110, 18);                                     // shadow on the grass
  fill(night ? "#9E9A8A" : "#C9CFCC"); rect(-40, -2, 58, 6, 1);                 // plinth under the front
  fill(night ? "#E6E0CC" : "#F7F7F2"); rect(-40, -46, 58, 46);                   // front face
  fill(night ? "#B5B09E" : "#D9DEDC"); quad(18, -46, 40, -60, 40, -14, 18, 0);    // side face
  fill(night ? "#C9C4B0" : "#E8ECEA"); quad(-40, -46, -18, -60, 40, -60, 18, -46); // roof
  fill(night ? "#8F8B7C" : "#B9C2BF"); quad(-40, -46, -18, -60, -18, -58, -40, -44); // roof edge
  // entrance: canopy, door, two steps
  fill(night ? "#8F8B7C" : "#B9C2BF"); quad(-20, -22, -2, -22, 2, -18, -24, -18);
  fill(night ? "#5E5A4C" : "#8FA7B5"); rect(-18, -18, 14, 18, 1);
  fill(night ? "#FFE28A" : "#C9DEEA"); rect(-16, -16, 10, 9, 1);
  fill(night ? "#9E9A8A" : "#C9CFCC"); rect(-24, 2, 26, 3, 1); rect(-27, 5, 32, 3, 1);
  // windows, two rows
  let w = night ? "#FFE28A" : "#BFD8EA", f = night ? "#8F8B7C" : "#D0D6D4";
  for (let [wx, wy] of [[-34,-40],[-20,-40],[-6,-40],[8,-40],[-34,-26],[8,-26],[-34,-12],[8,-12]]) { fill(f); rect(wx-1, wy-1, 10, 9, 1); fill(w); rect(wx, wy, 8, 7, 1); }
  for (let [wx, wy] of [[23,-44],[31,-49],[23,-30],[31,-35],[23,-16],[31,-21]]) { fill(night ? "#E0C878" : "#A9C4D6"); quad(wx, wy, wx+5, wy-3, wx+5, wy+4, wx, wy+7); }
  if (night) { fill(255, 226, 138, 40); ellipse(-11, -8, 36, 18); }
  // the cross on a white sign above the entrance
  fill("#FFFFFF"); rect(-17, -36, 12, 12, 2);
  fill("#D8363C"); rect(-12.5, -34, 3, 8, 0.5); rect(-15, -31.5, 8, 3, 0.5);
  pop();
}
function tree(x, y, h, kind) {
  let light = night ? "#1F4A3C" : "#2E6B4C", dark = night ? "#12302A" : "#1C4631", trunk = night ? "#3A2B22" : "#6B4A33";
  noStroke(); fill(0, 0, 0, 45); ellipse(x, y+2, h*0.7, 6);
  if (kind == "pine") { fill(trunk); rect(x-2, y-6, 4, 8, 1); for (let [w, hh, yy] of [[h*0.7, h*0.45, y-6], [h*0.55, h*0.4, y-6-h*0.3], [h*0.4, h*0.35, y-6-h*0.55]]) { fill(light); triangle(x, yy-hh, x-w/2, yy, x, yy); fill(dark); triangle(x, yy-hh, x+w/2, yy, x, yy); } }
  else { fill(trunk); rect(x-2, y-8, 4, 10, 1); fill(light); circle(x, y-8-h*0.35, h*0.8); fill(dark); arc(x, y-8-h*0.35, h*0.8, h*0.8, -HALF_PI, HALF_PI); }
}
function character(x, y, k) {
  noStroke(); fill(0, 0, 0, 60); ellipse(x, y+4*k, 18*k, 6*k);
  let body = "#F07A5A", dark = "#C85A3E";
  stroke(dark); strokeWeight(3*k); line(x-4*k, y, x-5*k, y+6*k); line(x+4*k, y, x+5*k, y+6*k);
  noStroke(); fill(body); beginShape(); vertex(x-10*k, y-2*k); bezierVertex(x-12*k, y-26*k, x+12*k, y-26*k, x+10*k, y-2*k); bezierVertex(x+9*k, y+3*k, x-9*k, y+3*k, x-10*k, y-2*k); endShape(CLOSE);
  fill(200, 90, 62, 90); beginShape(); vertex(x+2*k, y-23*k); bezierVertex(x+10*k, y-22*k, x+11*k, y-8*k, x+9*k, y-1*k); bezierVertex(x+8*k, y+2*k, x+3*k, y+2*k, x+2*k, y+1*k); endShape(CLOSE);
  stroke(body); strokeWeight(3*k); line(x-9*k, y-11*k, x-15*k, y-6*k); line(x+9*k, y-11*k, x+15*k, y-14*k); noStroke();
  fill("#2B1B16"); circle(x-3.5*k, y-15*k, 3.2*k); circle(x+3.5*k, y-15*k, 3.2*k);
  noFill(); stroke("#2B1B16"); strokeWeight(1.6*k); arc(x, y-10*k, 7*k, 5*k, 0.15, PI-0.15); noStroke();
  fill(255, 180, 160, 200); circle(x-6*k, y-11*k, 3.2*k); circle(x+6*k, y-11*k, 3.2*k);
}
function characterSmall(x, y, k) { let b = abs(sin(frameCount * 0.09)) * 3 * k; character(x, y - b, k); }
function blobShape(cx, cy, R, amp, k1, k2, ph) { beginShape(); for (let i = 0; i < 80; i++) { let a = i/80*TWO_PI, r = R*(1 + amp*sin(k1*a+ph) + amp*0.5*cos(k2*a+ph*1.7)); vertex(cx + r*cos(a), cy + r*sin(a)); } endShape(CLOSE); }

// ============================================================ test leader panel
function drawPanel() {
  buttons = [];
  noStroke(); fill(0, 0, 0, 150); rect(0, 0, width, height);
  let w = min(width - 32, 420), x = (width - w)/2, y = insetTop + 20, h = height - insetTop - insetBottom - 40;
  fill("#FFFFFF"); rect(x, y, w, h, 18);
  fill("#1E3A2C"); textSize(17); textStyle(BOLD); text("Testleder", width/2, y + 24);
  textStyle(NORMAL); textSize(12); fill("#5E7A68");
  let yy = y + 50;
  text("Scenarie (kortet)", width/2, yy); yy += 14;
  for (let i = 0; i < SCENARIOS.length; i++) { panelChoice(x + 12, yy + i*28, w - 24, 24, SCENARIOS[i], "p:sc:" + i, test.scenario == i); }
  yy += SCENARIOS.length * 28 + 10;
  text("Støj i høretelefonerne", width/2, yy); yy += 14;
  for (let i = 0; i < NOISES.length; i++) panelChoice(x + 12 + i * ((w-24)/5), yy, (w-24)/5 - 4, 26, NOISES[i], "p:noise:" + NOISES[i], test.noise == NOISES[i], 11);
  yy += 40; text("Ventetid, før sygeplejersken svarer", width/2, yy); yy += 14;
  [2,3,4,5,6].forEach((m,i) => panelChoice(x + 12 + i * ((w-24)/5), yy, (w-24)/5 - 4, 26, m + " min", "p:wait:" + m, test.waitMin == m, 11));
  yy += 40; text("Køstatus i fanerne", width/2, yy); yy += 14;
  [["stones","Sten"],["bar","Bar"],["figure","Figur"]].forEach((s,i) => panelChoice(x + 12 + i * ((w-24)/3), yy, (w-24)/3 - 4, 26, s[1], "p:status:" + s[0], test.status == s[0], 11));
  yy += 44;
  let res = loadResults();
  fill("#5E7A68"); textSize(12); text("Resultater: " + res.length + (res.length ? "  ·  seneste: gæt " + res[res.length-1].estimateMin + " min, reelt " + res[res.length-1].waitMin + " min, ro " + res[res.length-1].calm + ", uro " + res[res.length-1].energy : ""), width/2, yy);
  yy += 24;
  panelChoice(x + 12, yy, (w-24)/2 - 4, 30, "Kopiér CSV", "p:csv", false, 12);
  panelChoice(x + 12 + (w-24)/2, yy, (w-24)/2 - 4, 30, "Slet resultater", "p:clear", false, 12);
  yy += 46;
  fill("#2F7A52"); rect(x + 12, yy, w - 24, 44, 22); fill("#FFFFFF"); textSize(15); textStyle(BOLD); text("Start test forfra med disse valg", width/2, yy + 22); textStyle(NORMAL);
  buttons.push({ x: x+12, y: yy, w: w-24, h: 44, value: "p:start" });
  yy += 60;
  panelChoice(x + 12, yy, w - 24, 30, "Test lyden nu (støj 3 sek.)", "p:testnoise", false, 12);
  yy += 40;
  fill("#5E7A68"); textSize(10);
  let ctx = typeof getAudioContext == "function" ? getAudioContext() : null;
  let loaded = Object.keys(noiseFiles).map(k => k + (noiseFiles[k].isLoaded() ? "✓" : "✗")).join(" ");
  text("Lyd: " + (soundStarted ? "startet" : "ikke startet") + " · kontekst: " + (ctx ? ctx.state : "?") + " · " + loaded + (soundError ? " · fejl: " + soundError : ""), x + 12, yy - 8, w - 24, 30);
  fill("#5E7A68"); textSize(11); text("Luk: tryk uden for boksen", width/2, y + h - 14);
  buttons.push({ x, y, w, h, value: "p:none" });
  buttons.push({ x: 0, y: 0, w: width, h: height, value: "p:close" });
}
function panelChoice(x, y, w, h, label, value, selected, size) {
  noStroke(); fill(selected ? "#2F7A52" : "#EEF4EC"); rect(x, y, w, h, h/2);
  fill(selected ? "#FFFFFF" : "#1E3A2C"); textSize(size || 12); textStyle(selected ? BOLD : NORMAL); text(label, x + w/2, y + h/2); textStyle(NORMAL);
  buttons.unshift({ x, y, w, h, value });
}
function loadResults() { try { return JSON.parse(localStorage.getItem("venteunivers-results") || "[]"); } catch (e) { return []; } }
function saveResult(r) { let a = loadResults(); a.push(r); try { localStorage.setItem("venteunivers-results", JSON.stringify(a)); } catch (e) {} }
function resultsCsv() {
  let rows = [["tid","scenarie","stoej","ventetid_min","gaet_min","ro_1_5","uro_1_5","spoergsmaal_sendt","status_stil"]];
  for (let r of loadResults()) rows.push([r.time, r.scenario, r.noise, r.waitMin, r.estimateMin, r.calm, r.energy, r.flowDone, r.status]);
  return rows.map(r => r.join(";")).join("\n");
}

// ============================================================ taps
function tap(mx, my) {
  if (millis() - lastTap < 150) return;
  lastTap = millis();
  startSound();
  for (let b of buttons) if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) { handle(b.value); return; }
}
function handle(v) {
  if (v.startsWith("p:")) { handlePanel(v.slice(2)); return; }
  if (v == "title-tap") { let now = millis(); titleTaps = titleTaps.filter(t => now - t < 1500); titleTaps.push(now); if (titleTaps.length >= 3) { panelOpen = true; titleTaps = []; } return; }
  if (v.startsWith("toggle:")) {
    let k = v.slice(7);
    if (k == "night") night = !night;
    if (k == "voice") { voiceOn = !voiceOn; if (voiceOn) { lastSpokenNumber = queueNumber(); say(waitStart && !answeredAt ? queueSentence() : "Oplæsning er slået til."); } else if (window.speechSynthesis) speechSynthesis.cancel(); }
    if (k == "music") musicOn = !musicOn;
    return;
  }
  if (state == "sms" && v == "open-link") { enter("intro"); return; }
  if (v == "home") { enter("home"); return; }
  if (v.startsWith("go:")) {
    let t = v.slice(3);
    if (t == "flow") { if (flowDone) { cardIndex = 0; cardShownAt = millis(); enter("advice"); say(adviceCards()[0][1]); } else { answers = {}; cpr = ""; qIndex = 0; enter("flow"); say("Tast CPR-nummeret på den, det drejer sig om."); } }
    else {
      enter(t);
      if (t == "calm") say("Træk vejret ind gennem næsen, og ud gennem munden.");
      if (t == "advice") { cardIndex = 0; cardShownAt = millis(); say(adviceCards()[0][1]); }
      if (t == "wait") say(queueSentence());
    }
    return;
  }
  if (state == "flow" && v.startsWith("key:")) {
    let k = v.slice(4);
    if (k == "del") cpr = cpr.slice(0, -1);
    else if (k == "skip") { answers.cpr = "skip"; qIndex = 1; say(flowSteps()[1].text); }
    else if (k == "go") { let g = ageGroupFromCpr(cpr); if (g) { answers.who = g; qIndex = 0; say(flowSteps()[0].text); } else { answers.cpr = "skip"; qIndex = 1; say(flowSteps()[1].text); } }
    else if (cpr.length < 10) cpr += k;
    return;
  }
  if (state == "flow" && v.startsWith("ans:")) {
    let steps = flowSteps(); let q = steps[qIndex]; let val = v.slice(4);
    answers[q.key] = val;
    if (q.key == "who") { answers.who = val; qIndex = 0; say(flowSteps()[0].text); return; }
    if (q.redIf && val == q.redIf) { enter("red"); say("Læg på, og ring et, et, to nu."); return; }
    qIndex += 1;
    let next = flowSteps();
    if (qIndex >= next.length) { enter("confirm"); say("Er du sikker på dine svar?"); } else say(next[qIndex].text);
    return;
  }
  if (state == "confirm") {
    if (v == "send") { flowDone = true; enter("sent"); say("Sendt. Sygeplejersken har dine svar. " + queueSentence()); lastSpokenNumber = queueNumber(); }
    if (v == "review") { qIndex = 0; let who = answers.who; answers = { who }; enter("flow"); say(flowSteps()[0].text); }
    return;
  }
  if (state == "advice" && v.startsWith("card:")) {
    let cards = adviceCards();
    cardIndex = (cardIndex + (v == "card:next" ? 1 : cards.length - 1)) % cards.length; cardShownAt = millis(); say(cards[cardIndex][1]);
    return;
  }
  if (v == "to-survey") { survey = { step: 0, estimate: null, calm: null, energy: null }; enter("survey"); return; }
  if (state == "survey") {
    if (v.startsWith("est:")) { survey.estimate = int(v.slice(4)); survey.step = 1; }
    else if (v.startsWith("scale:")) {
      if (survey.step == 1) { survey.calm = int(v.slice(6)); survey.step = 2; }
      else { survey.energy = int(v.slice(6));
        saveResult({ time: new Date().toISOString().slice(0,16).replace("T"," "), scenario: SCENARIOS[test.scenario], noise: test.noise, waitMin: test.waitMin, estimateMin: survey.estimate, calm: survey.calm, energy: survey.energy, flowDone: flowDone ? "ja" : "nej", status: test.status });
        enter("done"); }
    }
    return;
  }
  if (v == "restart") { restart(); return; }
}
function handlePanel(v) {
  if (v == "close") { panelOpen = false; return; }
  if (v == "none") return;
  if (v.startsWith("sc:")) test.scenario = int(v.slice(3));
  if (v.startsWith("noise:")) test.noise = v.slice(6);
  if (v.startsWith("wait:")) test.waitMin = int(v.slice(5));
  if (v.startsWith("status:")) test.status = v.slice(7);
  if (v == "csv") { try { navigator.clipboard.writeText(resultsCsv()); } catch (e) {} }
  if (v == "clear") { try { localStorage.removeItem("venteunivers-results"); } catch (e) {} }
  if (v == "testnoise") { startSound(); if (test.noise != "ingen" && noiseFiles[test.noise]) { let f = noiseFiles[test.noise]; if (!f.isPlaying()) f.loop(); f.setVolume(0.7, 0.3); setTimeout(() => { if (state == "sms" || state == "intro" || panelOpen) f.setVolume(0, 0.5); }, 3000); } }
  if (v == "start") { panelOpen = false; restart(); }
}
function restart() {
  stopAmbience();
  state = "sms"; stateSince = millis(); waitStart = 0; answeredAt = 0; answers = {}; cpr = ""; qIndex = 0; flowDone = false; cardIndex = 0; lastSpokenNumber = 0;
  if (window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
}
function mouseReleased() { tap(mouseX, mouseY); }
function touchEnded() { tap(mouseX, mouseY); return false; }
function touchStarted() { return false; }
function keyPressed() {
  if (key === "n") night = !night;
  if (key === "v") handle("toggle:voice");
  if (key === "m") musicOn = !musicOn;
  if (key === "t") panelOpen = !panelOpen;
  if (key === " " && waitStart) waitStart -= 30000;
}

// ============================================================ sound engine
// Everything that plays is started inside the first tap (iOS wants a user gesture); later we only change volumes.
function startSound() {
  if (soundStarted) return;
  soundStarted = true;
  try {
    userStartAudio();
    let ctx = getAudioContext(); if (ctx && ctx.state != "running") ctx.resume();
    for (let k in musicFiles) { musicFiles[k].setVolume(0); musicFiles[k].loop(); }
    for (let k in noiseFiles) { if (noiseFiles[k].isLoaded()) { noiseFiles[k].setVolume(0); noiseFiles[k].loop(); } }
    ringOsc = new p5.Oscillator("sine"); ringOsc.freq(425); ringOsc.amp(0); ringOsc.start();
  } catch (e) { soundError = String(e).slice(0, 60); }
}
function startAmbience() {
  if (!soundStarted) return;
  for (let k in noiseFiles) { if (!noiseFiles[k].isPlaying() && noiseFiles[k].isLoaded()) { noiseFiles[k].setVolume(0); noiseFiles[k].loop(); } }
  if (test.noise != "ingen" && noiseFiles[test.noise]) noiseFiles[test.noise].setVolume(0.7, 1.5);
}
function stopAmbience() { for (let k in noiseFiles) if (noiseFiles[k].isPlaying()) noiseFiles[k].setVolume(0, 0.5); }
function updateSound(breath) {
  if (!soundStarted || !ringOsc) return;
  if (speaking && millis() > speakingUntil && !speechSynthesis.speaking) speaking = false;
  duck = lerp(duck, speaking ? 0.15 : 1, 0.05);
  let inCall = waitStart && !answeredAt && state != "sms" && state != "intro";
  let musicLevel = (inCall && musicOn) ? (state == "calm" ? 0.5 : state == "wait" ? 0.45 : 0.3) * duck : 0;
  musicFiles.piano.setVolume(state == "calm" ? 0 : musicLevel, 0.2);
  musicFiles.mindfulness.setVolume(state == "calm" ? musicLevel : 0, 0.2);
  let ring = (inCall && !musicOn) ? ((millis() % 5000) < 1000 ? 0.08 : 0) : 0;
  ringOsc.amp(ring * duck, 0.05);
}
function say(text_) {
  if (!voiceOn || !window.speechSynthesis) return;
  let u = new SpeechSynthesisUtterance(text_);
  u.lang = "da-DK"; u.rate = 0.95; u.volume = 1;
  let m = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith("da")); if (m.length) u.voice = m[0];
  u.onstart = () => { speaking = true; speakingUntil = millis() + 1500 + text_.length * 90; };
  u.onend = () => { speaking = false; }; u.onerror = () => { speaking = false; };
  currentUtterance = u;
  if (speechSynthesis.paused) speechSynthesis.resume();
  if (speechSynthesis.speaking || speechSynthesis.pending) { speechSynthesis.cancel(); setTimeout(() => { speechSynthesis.resume(); speechSynthesis.speak(u); }, 120); }
  else speechSynthesis.speak(u);
}

// ============================================================ the sun over Copenhagen
const LAT = 55.68, LON = 12.57;
function sunTime(date, rising) {
  let start = new Date(date.getFullYear(), 0, 0), N = floor((date - start) / 86400000), lngHour = LON / 15;
  let tt = N + ((rising ? 6 : 18) - lngHour) / 24, M = 0.9856 * tt - 3.289;
  let L = (M + 1.916 * sin(radians(M)) + 0.020 * sin(radians(2*M)) + 282.634 + 360) % 360;
  let RA = (degrees(atan(0.91764 * tan(radians(L)))) + 360) % 360; RA = (RA + (floor(L/90)*90 - floor(RA/90)*90)) / 15;
  let sinDec = 0.39782 * sin(radians(L)), cosDec = cos(asin(sinDec));
  let cosH = (cos(radians(90.833)) - sinDec * sin(radians(LAT))) / (cosDec * cos(radians(LAT)));
  if (cosH > 1 || cosH < -1) return null;
  let Hh = (rising ? 360 - degrees(acos(cosH)) : degrees(acos(cosH))) / 15;
  let T = Hh + RA - 0.06571 * tt - 6.622, UT = (T - lngHour + 24) % 24;
  return (UT - date.getTimezoneOffset() / 60 + 24) % 24;
}
function isNight() { let now = new Date(), up = sunTime(now, true), down = sunTime(now, false); if (up == null || down == null) return false; let h = now.getHours() + now.getMinutes()/60; return h < up || h > down; }
function windowResized() { resizeCanvas(windowWidth, windowHeight); readInsets(); }

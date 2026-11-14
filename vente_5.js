// 1813 · VENTEUNIVERS, step 5 (the green version, built as code after the group's decisions 14 Nov 2026)
//
//   SMS  ->  intro animation (the landscape rises, the figure walks to the hospital)  ->  home
//   home: Forbered din samtale (highlighted, one question at a time, confirm, sent) · Din ventetid (the full landscape)
//         · Find ro (sky only, breathing) · Gode råd til dig (three cards from akut.dk)
//   the queue runs on a timer; when it reaches zero the nurse answers and the participant gets three questions
//   (how long did you think you waited, how calm, how much energy); the answers are kept for the test leader.
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
  { name: "Barn 2 år, feber 40",            who: "child",  theme: 0, page: "child-fever" },
  { name: "Barn 5 år, opkast og diarré",    who: "child",  theme: 6, page: "child-vomiting" },
  { name: "Barn 8 år, ondt i øret",         who: "child",  theme: 3, page: "child-ear" },
  { name: "Voksen, influenza",              who: "adult",  theme: 2, page: "adult-flu" },
  { name: "Voksen, mavesmerter",            who: "adult",  theme: 4, page: "adult-stomach" },
  { name: "Voksen, slået hovedet",          who: "adult",  theme: 9, page: "injury-head" },
  { name: "Spædbarn 2 mdr, feber",          who: "infant", theme: 2, page: "infant-fever" }
];
const NOISES = ["ingen", "baby", "trafik", "storm", "børn"];
const NOISE_FILES = { baby: "lyd/noise-baby.mp3", trafik: "lyd/noise-traffic.mp3", storm: "lyd/noise-storm.mp3", "børn": "lyd/noise-children.mp3" };
let test = { scenario: 0, noise: "ingen", waitMin: 3, status: "stones", running: false, startedAt: 0 };
let panelOpen = false;
let titleTaps = [];

// ------------------------------------------------------------ queue
const QUEUE_START = 7;
let waitStart = 0;              // millis() when the queue started (after the intro)
let answeredAt = 0;
function waitTotalMs() { return test.waitMin * 60 * 1000; }
function waitElapsed() { return waitStart ? constrain(millis() - waitStart, 0, waitTotalMs()) : 0; }
function waitRemaining() { return waitStart ? max(0, waitTotalMs() - (millis() - waitStart)) : waitTotalMs(); }
function queueNumber() { return max(1, ceil(QUEUE_START * waitRemaining() / waitTotalMs())); }
function minutesLeft() { return max(1, ceil(waitRemaining() / 60000)); }
function progress() { return waitStart ? 1 - waitRemaining() / waitTotalMs() : 0; }

// ------------------------------------------------------------ the questionnaire (one question at a time)
let answers = {};
let qIndex = 0;
let flowDone = false;
let pageKey = "general";
function scenario() { return SCENARIOS[test.scenario]; }

function flowSteps() {
  let sc = scenario();
  let steps = [
    { key: "temp",     text: "Har du målt temperaturen?",                       buttons: [["Ja","yes"],["Nej","no"]] },
    { key: "together", text: "Er du sammen med den, det drejer sig om?",         buttons: [["Ja","yes"],["Nej","no"]] },
    { key: "theme",    text: "Hvad drejer det sig om?",                           buttons: THEMES[sc.who].map((th,i) => [th.da, String(i)]) }
  ];
  if (answers.theme != null) {
    let th = THEMES[sc.who][int(answers.theme)];
    if (th.sub.length > 1) steps.push({ key: "sub", text: "Hvad passer bedst?", buttons: th.sub.map((sb,i) => [sb[0], String(i)]) });
  }
  if (answers.theme != null && (answers.sub != null || THEMES[sc.who][int(answers.theme)].sub.length == 1)) {
    let th = THEMES[sc.who][int(answers.theme)];
    let sub = th.sub[int(answers.sub || 0)];
    let pk = sub[2] || "general";
    if (pk == "direct") return steps;                       // psychiatric help / assault: no more questions
    let page = PAGES[pk];
    page.questions.slice(0, 3).forEach((q,i) => steps.push({ key: "q"+i, text: q.da, buttons: (q.buttons || YES_NO).map(b => [b[0], b[2]]), redIf: q.redIf }));
  }
  return steps;
}
function currentPage() {
  let sc = scenario();
  if (answers.theme == null) return PAGES[sc.page] ? sc.page : "general";
  let th = THEMES[sc.who][int(answers.theme)]; let sub = th.sub[int(answers.sub || 0)];
  return sub[2] && PAGES[sub[2]] ? sub[2] : "general";
}

// ------------------------------------------------------------ sound
const MUSIC = { piano: "lyd/golden-sunset-piano.mp3", mindfulness: "lyd/radiant-mindfulness.mp3" };
let musicFiles = {}, noiseFiles = {};
let musicOn = true, voiceOn = false, soundStarted = false;
let ringOsc, ringPhase = 0;
let speaking = false, speakingUntil = 0, duck = 1;
let voices = [], currentUtterance = null;
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

// ------------------------------------------------------------ colours
const C = {
  day:   { ink: "#1E3A2C", soft: "#5E7A68", accent: "#2F7A52", accent2: "#9FD5A8", card: "#FFFBF3", cardsh: "rgba(40,70,50,0.18)", red: "#B2321C",
           skyTop: "#CFE6F4", skyBot: "#F4F1DE", far: ["#8FBF9A","#6FA982"], mid: ["#6BA876","#4F8F5E"], near: ["#4E9160","#3A7449"], path: "#D9C9A8", walked: "#B89F78", ground: "#F4F1DE" },
  night: { ink: "#F2F4EA", soft: "#B9C7B6", accent: "#9FD5A8", accent2: "#2F7A52", card: "#1C3330", cardsh: "rgba(0,0,0,0.35)", red: "#FF7A66",
           skyTop: "#0B1A2E", skyBot: "#1E4A4A", far: ["#1A3F3A","#163631"], mid: ["#163A33","#113029"], near: ["#12342C","#0E2A24"], path: "#5E5A4A", walked: "#8A7A5C", ground: "#0E2A24" }
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
  buttons = [];
  let breath = (sin(frameCount * 0.013) + 1) / 2;

  // the queue ends: the nurse answers
  if (waitStart && !answeredAt && waitRemaining() <= 0 && ["home","flow","confirm","sent","wait","calm","advice","red"].includes(state)) {
    answeredAt = millis(); enter("answered"); stopAmbience(); say("Sygeplejersken tager telefonen nu.");
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
  // iPhone Messages look-alike
  fill("#FFFFFF"); rect(0, 0, width, insetTop + 92);
  fill("#C7C7CC"); circle(width/2, insetTop + 40, 44);
  fill("#FFFFFF"); textSize(18); textStyle(BOLD); text("1813", width/2, insetTop + 40);
  fill("#8E8E93"); textSize(12); textStyle(NORMAL); text("1813 >", width/2, insetTop + 76);
  fill("#8E8E93"); textSize(11); text("i dag " + nf(hour(),2) + "." + nf(minute(),2), width/2, insetTop + 118);
  // the bubble
  let bw = width * 0.76, bx = 16, by = insetTop + 140;
  let msg = "Fortæl os om din situation, så vi bedst muligt kan hjælpe dig. Oplev 1813's venteunivers:";
  fill("#E9E9EB"); rect(bx, by, bw, 150, 18);
  fill("#111"); textSize(15); textAlign(LEFT, TOP); textLeading(20);
  text(msg, bx + 14, by + 12, bw - 28, 100);
  fill("#0A7AFF"); text("1813.dk/venteunivers", bx + 14, by + 112);
  textAlign(CENTER, CENTER);
  buttons.push({ x: bx, y: by, w: bw, h: 150, value: "open-link" });
  // keyboard bar
  fill("#FFFFFF"); rect(0, height - insetBottom - 56, width, 56 + insetBottom);
  fill("#E9E9EB"); rect(50, height - insetBottom - 46, width - 100, 36, 18);
  fill("#8E8E93"); textSize(13); text("iMessage", width/2, height - insetBottom - 28);
}

function drawIntro() {
  // 0 to 1.2 s: the landscape slides up. 1.2 to 4.2 s: the figure walks to the hospital. 4.2 to 5.0 s: path and figure fade.
  let t = since();
  let rise = constrain(t / 1200, 0, 1); rise = 1 - pow(1 - rise, 3);
  let walk = constrain((t - 1200) / 3000, 0, 1);
  let fade = constrain((t - 4200) / 800, 0, 1);
  drawSky();
  push(); translate(0, (1 - rise) * height);
  drawLandscape(insetTop + 150, height - insetBottom - 120, walk, 1 - fade, true);
  pop();
  if (t > 4800) { enter("home"); waitStart = millis(); test.startedAt = millis(); startAmbience(); }
}

function drawHome() {
  drawSky(); drawHills(insetTop + 150, height);
  statusBlock();
  drawTopBar("", false);
  let c = col();
  noStroke(); fill(c.ink); textSize(30); textStyle(BOLD);
  text("Velkommen til 1813", width/2, insetTop + 172);
  let y = insetTop + 222, h = 72, gap = 12;
  menuBox(24, y, width-48, h, "Forbered din samtale", flowDone ? "Sendt til sygeplejersken" : "Start her", "check", "flow", true);
  menuBox(24, y + (h+gap), width-48, h, "Din ventetid", "Nr. " + queueNumber() + " i køen", "clock", "wait", false, minutesLeft() + " min.");
  menuBox(24, y + 2*(h+gap), width-48, h, "Find ro", "Mens du venter", "cloud", "calm", false);
  menuBox(24, y + 3*(h+gap), width-48, h, "Gode råd til dig", "Fra akut.dk", "heart", "advice", false);
}

function drawFlow() {
  drawSky(); drawHills(height - insetBottom - 170, height);
  statusBlock();
  drawTopBar("Forbered din samtale", true);
  let steps = flowSteps();
  if (qIndex >= steps.length) { enter("confirm"); return; }
  let q = steps[qIndex];
  let c = col();
  noStroke(); fill(c.soft); textSize(12); text("SPØRGSMÅL " + (qIndex + 1), width/2, insetTop + 150);
  fill(c.ink); textSize(q.text.length < 34 ? 24 : 21); textLeading(30); textStyle(BOLD);
  text(q.text, width*0.1, insetTop + 170, width*0.8, 110);
  textStyle(NORMAL);
  let n = q.buttons.length;
  let top = insetTop + 290, room = height - insetBottom - 190 - top;
  let cols = n > 6 ? 2 : 1, rows = ceil(n / cols);
  let gapB = cols == 2 ? 8 : 12, bh = constrain((room - (rows-1)*gapB) / rows, 40, 56);
  let bw = cols == 2 ? width*0.43 : width*0.78;
  for (let i = 0; i < n; i++) {
    let cx = cols == 2 ? (i % 2 == 0 ? width/2 - bw/2 - 5 : width/2 + bw/2 + 5) : width/2;
    let row = floor(i / cols);
    choiceButton(cx, top + bh/2 + row*(bh+gapB), bw, bh, q.buttons[i][0], "ans:" + q.buttons[i][1], false, cols == 2 ? 13 : (bh < 48 ? 15 : 17));
  }
}

function drawConfirm() {
  drawSky(); drawHills(height - insetBottom - 170, height);
  statusBlock();
  drawTopBar("Forbered din samtale", true);
  let c = col();
  noStroke(); fill(c.ink); textSize(24); textStyle(BOLD);
  text("Er du sikker på dine svar?", width*0.1, insetTop + 170, width*0.8, 80);
  textStyle(NORMAL); fill(c.soft); textSize(14);
  text(flowSteps().length + " svar klar til sygeplejersken", width/2, insetTop + 250);
  primaryButton(width/2, insetTop + 320, width*0.72, 54, "Ja, send", "send");
  choiceButton(width/2, insetTop + 390, width*0.72, 50, "Gennemgå igen", "review", false, 16);
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
  // the time, top left, away from the hospital
  noStroke(); fill(c.cardsh); rect(25, insetTop + 118, 124, 30, 15); fill(c.accent); rect(24, insetTop + 116, 124, 30, 15);
  fill(night ? "#0E2A24" : "#FFFFFF"); textSize(14); textStyle(BOLD); text("ca. " + minutesLeft() + " min.", 86, insetTop + 131);
  // bottom card
  fill(c.ground); rect(0, height - insetBottom - 120, width, 120 + insetBottom);
  card(24, height - insetBottom - 104, width-48, 64);
  fill(c.ink); textSize(18); textStyle(BOLD); text("Du er nr. " + queueNumber() + " i køen", width/2, height - insetBottom - 72);
  textStyle(NORMAL);
}

function drawCalm(breath) {
  drawSky();
  drawTopBar("Find ro", true);
  let c = col();
  let cx = width/2, cy = insetTop + 150 + (height - insetTop - insetBottom - 300) * 0.45;
  // 4 s in, 4 s out: the blobs grow and shrink
  let phase = (millis() % 8000) / 8000;                   // 0..1
  let inhale = phase < 0.5;
  let k = inhale ? phase * 2 : 1 - (phase - 0.5) * 2;      // 0..1..0
  let e = 0.5 - 0.5 * cos(k * PI);                          // eased
  let s1 = 0.86 + 0.14 * e;
  noStroke();
  fill(red(c.accent), green(c.accent), blue(c.accent), 30); blobShape(cx, cy, 150 * s1, 0.06, 3, 5, 0.4);
  fill(red(c.accent), green(c.accent), blue(c.accent), 50); blobShape(cx, cy, 110 * s1, 0.07, 4, 6, 1.3);
  fill(night ? color(36,70,64) : color(255,255,255,235)); blobShape(cx, cy, 70 * s1, 0.06, 3, 5, 2.2);
  fill(c.ink); textSize(15); textStyle(BOLD); text(inhale ? "Ind gennem næsen" : "Ud gennem munden", cx, cy - 6);
  textStyle(NORMAL); textSize(12); fill(c.soft); text("4 sekunder", cx, cy + 16);
  // the small status line, nothing big: calm
  textSize(12); fill(c.soft); let line = "Nr. " + queueNumber() + " i køen · ca. " + minutesLeft() + " min.";
  text(line, width/2 + 6, height - insetBottom - 28);
  pulseDot(width/2 + 6 - textWidth(line)/2 - 12, height - insetBottom - 28, 4);
}

function drawAdvice() {
  drawSky(); drawHills(height - insetBottom - 170, height);
  statusBlock();
  drawTopBar("Gode råd til dig", true);
  let c = col();
  let page = PAGES[currentPage()];
  noStroke(); fill(c.ink); textSize(22); textStyle(BOLD); text(page.title.da, width/2, insetTop + 150);
  textStyle(NORMAL); fill(c.soft); textSize(12); text(currentPage() == "general" ? "1813" : "Fra akut.dk", width/2, insetTop + 174);
  let y = insetTop + 200;
  let cards = page.cards.slice(0, 3);
  let avail = height - insetBottom - 190 - y;
  let ch = min(100, (avail - 2*10) / 3);
  for (let cd of cards) {
    card(24, y, width-48, ch);
    fill(c.accent); textSize(10); textStyle(BOLD); text(cd[0].da.toUpperCase(), width/2, y + 16);
    fill(c.ink); textSize(ch < 90 ? 13 : 14); textStyle(NORMAL); textLeading(ch < 90 ? 17 : 19);
    text(cd[1], 40, y + 26, width - 80, ch - 32);
    y += ch + 10;
  }
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
  primaryButton(width/2, insetTop + 440, width*0.6, 52, "Videre", "to-survey");
}

// the three questions for the test, asked by the app itself
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
  primaryButton(width/2, insetTop + 330, width*0.6, 52, "Ny test", "restart");
}

// ============================================================ shared pieces
function drawTopBar(title, back) {
  let c = col();
  if (back) { stroke(c.ink); strokeWeight(2.5); noFill(); line(36, insetTop + 26, 28, insetTop + 34); line(28, insetTop + 34, 36, insetTop + 42); noStroke(); buttons.push({ x: 8, y: insetTop + 10, w: 56, h: 48, value: "home" }); }
  noStroke(); fill(c.ink); textStyle(BOLD);
  if (back) { textAlign(LEFT, CENTER); textSize(18); text(title, 54, insetTop + 34); textAlign(CENTER, CENTER); }
  else { textSize(20); text("1813", width/2, insetTop + 34); buttons.push({ x: width/2 - 60, y: insetTop + 10, w: 120, h: 48, value: "title-tap" }); }
  textStyle(NORMAL);
  // right side: night, voice, music
  let x = width - 28, y = insetTop + 34;
  iconButton(x, y, "night");  iconButton(x - 40, y, "voice");  iconButton(x - 80, y, "music");
  // the 112 line: red on a light pill, both day and night
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
  noStroke();
  buttons.push({ x: cx-20, y: cy-20, w: 40, h: 40, value: "toggle:" + kind });
}

function card(x, y, w, h, r = 18) { let c = col(); noStroke(); fill(c.cardsh); rect(x+2, y+4, w, h, r); fill(c.card); rect(x, y, w, h, r); }

function menuBox(x, y, w, h, title, sub, icon, target, highlight, pill) {
  let c = col();
  card(x, y, w, h);
  if (highlight) { noFill(); stroke(c.accent); strokeWeight(3); rect(x, y, w, h, 18); noStroke(); }
  // icon
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
  stroke(c.soft); strokeWeight(2); noFill(); line(x+w-26, y+h/2-6, x+w-20, y+h/2); line(x+w-20, y+h/2, x+w-26, y+h/2+6); noStroke();
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
function primaryButton(cx, cy, w, h, label, value) {
  let c = col();
  noStroke(); fill(c.cardsh); rect(cx-w/2+1, cy-h/2+3, w, h, h/2);
  fill(c.accent); rect(cx-w/2, cy-h/2, w, h, h/2);
  fill(night ? "#0E2A24" : "#FFFFFF"); textSize(17); textStyle(BOLD); text(label, cx, cy); textStyle(NORMAL);
  buttons.push({ x: cx-w/2, y: cy-h/2, w, h, value });
}

// the queue status, bottom quarter, three styles the test leader can switch between
function statusBlock() {
  let c = col();
  let top = height - insetBottom - 170;
  noStroke(); fill(c.ground); rect(0, top, width, height - top);
  card(24, top + 16, width - 48, 124);
  let n = queueNumber(), m = minutesLeft();
  fill(c.ink); textSize(17); textStyle(BOLD); text("Nr. " + n + " i køen · ca. " + m + " min.", width/2 + 8, top + 42);
  textStyle(NORMAL);
  pulseDot(width/2 - textWidth("Nr. " + n + " i køen · ca. " + m + " min.")/2 - 10, top + 42, 5);
  let p = progress();
  if (test.status == "stones") {
    // seven stones, one per place; the ones you have passed are filled
    for (let i = 0; i < QUEUE_START; i++) {
      let x = width/2 - (QUEUE_START-1) * 20 + i * 40, y = top + 92;
      let passed = i < QUEUE_START - n;
      fill(passed ? c.accent : (night ? "rgba(255,255,255,0.18)" : "rgba(30,58,44,0.14)")); circle(x, y, passed ? 16 : 12);
    }
    stroke(night ? "rgba(255,255,255,0.18)" : "rgba(30,58,44,0.14)"); strokeWeight(2); line(width/2 - (QUEUE_START-1)*20, top + 92, width/2 + (QUEUE_START-1)*20, top + 92); noStroke();
    characterSmall(width/2 - (QUEUE_START-1) * 20 + (QUEUE_START - n) * 40, top + 84, 0.55);
  } else if (test.status == "bar") {
    // a bar that fills with time and breathes very slightly
    let bx = 48, bw = width - 96, by = top + 86, bh = 14;
    let pulse = 1 + 0.03 * sin(frameCount * 0.013);
    fill(night ? "rgba(255,255,255,0.14)" : "rgba(30,58,44,0.12)"); rect(bx, by, bw, bh, 7);
    fill(c.accent); rect(bx, by - (bh*pulse - bh)/2, bw * p, bh * pulse, 7);
  } else {
    // the figure on a short path
    stroke(night ? "rgba(255,255,255,0.18)" : "rgba(30,58,44,0.14)"); strokeWeight(6); line(48, top + 100, width - 48, top + 100); noStroke();
    for (let i = 1; i < 8; i++) { let x = 48 + (width-96) * i/8; fill(i/8 <= p ? c.accent : (night ? "rgba(255,255,255,0.2)" : "rgba(30,58,44,0.16)")); circle(x, top + 100, 6); }
    characterSmall(48 + (width-96) * p, top + 92, 0.7);
  }
}
function pulseDot(x, y, r) { let c = col(); let k = 0.5 + 0.5 * sin(frameCount * 0.06); noStroke(); fill(red(c.accent), green(c.accent), blue(c.accent), 60 + 120 * k); circle(x, y, r * 2 + 4 * k); fill(c.accent); circle(x, y, r); }

// ============================================================ landscape
function setGradient(x0, y0, x1, y1, c1, c2) {
  let g = drawingContext.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, c1); g.addColorStop(1, c2); drawingContext.fillStyle = g;
}
function drawSky() {
  let c = col(); noStroke();
  setGradient(0, 0, 0, height, c.skyTop, c.skyBot); rect(0, 0, width, height);
  if (night) {
    for (let i = 0; i < 40; i++) { let x = (i*149) % width, y = (i*83) % int(height*0.4) + 16; fill(255, 255, 255, 110 + (i%4)*30); circle(x, y, i%3 ? 1.6 : 2.4); }
    fill("#F6F0D8"); circle(60, insetTop + 128, 40); fill(c.skyTop); circle(76, insetTop + 120, 32);
  } else { fill(255, 226, 138, 70); circle(width - 64, insetTop + 128, 80); fill("#FFE28A"); circle(width - 64, insetTop + 128, 48); }
  for (let [cx, cy, w] of [[90, insetTop + 170, 130], [300, insetTop + 140, 100]]) {
    let drift = (frameCount * 0.08 + cx) % (width + 200) - 100;
    fill(255, 255, 255, night ? 30 : 215);
    ellipse(drift, cy, w, w/3.5); ellipse(drift - w*0.22, cy + 5, w*0.56, w/5); ellipse(drift + w*0.24, cy + 3, w*0.6, w/4.5);
  }
}
function hill(top, a1, a2, bottom, c1, c2) {
  setGradient(0, top, 0, bottom, c1, c2);
  beginShape(); vertex(0, a1); bezierVertex(width*0.3, top, width*0.6, a2 + 40, width, a2); vertex(width, bottom); vertex(0, bottom); endShape(CLOSE);
}
function drawHills(top, bottom) {
  let c = col(); noStroke();
  hill(top, top + 60, top + 36, bottom, c.far[0], c.far[1]);
  let span = bottom - top;
  hill(top + span*0.3, top + span*0.42, top + span*0.36, bottom, c.mid[0], c.mid[1]);
  hill(top + span*0.62, top + span*0.74, top + span*0.70, bottom, c.near[0], c.near[1]);
}
function drawLandscape(top, bottom, figT, pathAlpha, walking, breath) {
  let c = col();
  drawHills(top, bottom);
  let span = bottom - top;
  let P0 = [width*0.3, bottom + 6], P1 = [width*0.95, bottom - span*0.28], P2 = [width*0.02, top + span*0.42], P3 = [width/2 - 10, top + 96];
  const B = t => { let u = 1-t; return [u*u*u*P0[0]+3*u*u*t*P1[0]+3*u*t*t*P2[0]+t*t*t*P3[0], u*u*u*P0[1]+3*u*u*t*P1[1]+3*u*t*t*P2[1]+t*t*t*P3[1]]; };
  const D = t => { let u = 1-t; return [3*u*u*(P1[0]-P0[0])+6*u*t*(P2[0]-P1[0])+3*t*t*(P3[0]-P2[0]), 3*u*u*(P1[1]-P0[1])+6*u*t*(P2[1]-P1[1])+3*t*t*(P3[1]-P2[1])]; };
  let N = 48, L = [], R = [];
  for (let i = 0; i <= N; i++) { let t = i/N, [x,y] = B(t), [dx,dy] = D(t), len = Math.hypot(dx,dy) || 1, nx = -dy/len, ny = dx/len, w = 34*(1-t) + 9; L.push([x+nx*w/2, y+ny*w/2]); R.push([x-nx*w/2, y-ny*w/2]); }
  push();
  drawingContext.globalAlpha = pathAlpha;
  noStroke(); fill(0, 0, 0, 45); beginShape(); for (let p of L) vertex(p[0], p[1]+3); for (let p of R.slice().reverse()) vertex(p[0], p[1]+3); endShape(CLOSE);
  fill(c.path); beginShape(); for (let p of L) vertex(p[0], p[1]); for (let p of R.slice().reverse()) vertex(p[0], p[1]); endShape(CLOSE);
  let k = floor(N * figT);
  if (k > 1) { fill(c.walked); beginShape(); for (let p of L.slice(0, k+1)) vertex(p[0], p[1]); for (let p of R.slice(0, k+1).reverse()) vertex(p[0], p[1]); endShape(CLOSE); }
  for (let j = 1; j < 10; j++) { let t = j/10, [x,y] = B(t); if (t <= figT) { fill(c.accent); circle(x, y-3, 7); } else { fill(night ? "rgba(201,194,168,0.45)" : "rgba(255,255,255,0.5)"); circle(x, y-3, 5.5); } }
  // trees
  for (let [t, side, h, kind] of [[0.08,1,52,"round"],[0.3,-1,44,"pine"],[0.55,1,36,"pine"],[0.72,-1,30,"round"],[0.9,1,22,"pine"]]) { let [x,y] = B(t); tree(x + side*(60*(1-t)+26), y+6, h, kind); }
  // lampposts
  for (let t of [0.2, 0.5, 0.8]) { let [x,y] = B(t); x += (t == 0.5 ? -1 : 1) * 18; stroke(night ? "#C9C2A8" : "#2B2B2B"); strokeWeight(2.5); line(x, y, x, y-30); line(x-5, y-30, x+5, y-30); noStroke();
    if (night) { fill(255, 226, 138, 45); circle(x, y-35, 36); fill(255, 226, 138, 115); circle(x, y-35, 18); fill("#FFF6C8"); circle(x, y-35, 8); } else { fill("#8E8E8E"); rect(x-4, y-38, 8, 7, 2); } }
  // hospital, standing on the grass beside the end of the path
  let hx = P3[0] + 34, hy = P3[1] - 34;
  fill(0, 0, 0, 55); ellipse(hx, hy + 22, 80, 14);
  fill(night ? "#E9E2CF" : "#FFFFFF"); quad(hx-30, hy-20, hx+14, hy-20, hx+14, hy+20, hx-30, hy+20);
  fill(night ? "#A9A595" : "#D4D9D8"); quad(hx+14, hy-20, hx+30, hy-30, hx+30, hy+10, hx+14, hy+20);
  fill(night ? "#8F8B7C" : "#C9CFCC"); quad(hx-30, hy-20, hx-14, hy-30, hx+30, hy-30, hx+14, hy-20);
  fill("#D8363C"); rect(hx-6, hy-14, 6, 16, 1); rect(hx-11, hy-9, 16, 6, 1);
  for (let wx of [-26, -18, 2]) { fill(night ? "#FFE28A" : "#BFD8EA"); rect(hx+wx, hy+4, 6, 7, 1); }
  fill(night ? "#6B6558" : "#9CB3C2"); rect(hx-12, hy+8, 8, 12, 1);
  // the character: walks during the intro, bounces while waiting
  let [fx, fy] = B(walking ? figT : 0.04 + 0.96 * figT);
  let bounce = walking ? abs(sin(frameCount * 0.25)) * 4 : abs(sin(frameCount * 0.09)) * 5;
  let sway = walking ? 0 : sin(frameCount * 0.045) * 4;
  character(fx + sway, fy - bounce, 1);
  drawingContext.globalAlpha = 1;
  pop();
  noStroke(); fill(c.ground); rect(0, bottom, width, height - bottom);
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
  let x = 16, y = insetTop + 20, w = width - 32, h = height - insetTop - insetBottom - 40;
  fill("#FFFFFF"); rect(x, y, w, h, 18);
  fill("#1E3A2C"); textSize(17); textStyle(BOLD); text("Testleder", width/2, y + 24);
  textStyle(NORMAL); textSize(12); fill("#5E7A68");
  let yy = y + 50;
  text("Scenarie (kortet)", width/2, yy); yy += 14;
  for (let i = 0; i < SCENARIOS.length; i++) { panelChoice(x + 12, yy + i*28, w - 24, 24, SCENARIOS[i].name, "p:sc:" + i, test.scenario == i); }
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
    if (k == "voice") { voiceOn = !voiceOn; if (voiceOn) say("Oplæsning er slået til."); else if (window.speechSynthesis) speechSynthesis.cancel(); }
    if (k == "music") musicOn = !musicOn;
    return;
  }
  if (state == "sms" && v == "open-link") { enter("intro"); return; }
  if (v == "home") { enter("home"); return; }
  if (v.startsWith("go:")) {
    let t = v.slice(3);
    if (t == "flow") { if (!flowDone) { answers = {}; qIndex = 0; } enter(flowDone ? "advice" : "flow"); if (!flowDone) say(flowSteps()[0].text); }
    else { enter(t); if (t == "calm") say("Træk vejret ind gennem næsen, og ud gennem munden."); if (t == "advice") say(PAGES[currentPage()].cards[0][1]); }
    return;
  }
  if (state == "flow" && v.startsWith("ans:")) {
    let steps = flowSteps(); let q = steps[qIndex]; let val = v.slice(4);
    answers[q.key] = val;
    if (q.redIf && val == q.redIf) { enter("red"); say("Læg på, og ring et, et, to nu."); return; }
    qIndex += 1;
    let next = flowSteps();
    if (qIndex >= next.length) { enter("confirm"); say("Er du sikker på dine svar?"); } else say(next[qIndex].text);
    return;
  }
  if (state == "confirm") {
    if (v == "send") { flowDone = true; pageKey = currentPage(); enter("sent"); say("Sendt. Sygeplejersken har dine svar."); }
    if (v == "review") { qIndex = 0; answers = {}; enter("flow"); say(flowSteps()[0].text); }
    return;
  }
  if (v == "to-survey") { survey = { step: 0, estimate: null, calm: null, energy: null }; enter("survey"); return; }
  if (state == "survey") {
    if (v.startsWith("est:")) { survey.estimate = int(v.slice(4)); survey.step = 1; }
    else if (v.startsWith("scale:")) {
      if (survey.step == 1) { survey.calm = int(v.slice(6)); survey.step = 2; }
      else { survey.energy = int(v.slice(6));
        saveResult({ time: new Date().toISOString().slice(0,16).replace("T"," "), scenario: scenario().name, noise: test.noise, waitMin: test.waitMin, estimateMin: survey.estimate, calm: survey.calm, energy: survey.energy, flowDone: flowDone ? "ja" : "nej", status: test.status });
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
  if (v == "start") { panelOpen = false; restart(); }
}
function restart() {
  stopAmbience();
  state = "sms"; stateSince = millis(); waitStart = 0; answeredAt = 0; answers = {}; qIndex = 0; flowDone = false; pageKey = "general";
  if (window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
}
function mouseReleased() { tap(mouseX, mouseY); }
function touchEnded() { tap(mouseX, mouseY); return false; }
function touchStarted() { return false; }
function keyPressed() {
  if (key === "n") night = !night;
  if (key === "v") voiceOn = !voiceOn;
  if (key === "m") musicOn = !musicOn;
  if (key === "t") panelOpen = !panelOpen;
  if (key === " " && waitStart) waitStart -= 30000;
}

// ============================================================ sound engine
function startSound() {
  if (soundStarted) return;
  userStartAudio();
  for (let k in musicFiles) { musicFiles[k].setVolume(0); musicFiles[k].loop(); }
  ringOsc = new p5.Oscillator("sine"); ringOsc.freq(425); ringOsc.amp(0); ringOsc.start();
  soundStarted = true;
}
function startAmbience() {
  if (!soundStarted) return;
  if (test.noise != "ingen" && noiseFiles[test.noise]) { let f = noiseFiles[test.noise]; f.setVolume(0); f.loop(); f.setVolume(0.7, 1.5); }
}
function stopAmbience() { for (let k in noiseFiles) if (noiseFiles[k].isPlaying()) noiseFiles[k].stop(); }
function updateSound(breath) {
  if (!soundStarted) return;
  if (speaking && millis() > speakingUntil && !speechSynthesis.speaking) speaking = false;
  duck = lerp(duck, speaking ? 0.15 : 1, 0.05);
  let inCall = waitStart && !answeredAt && state != "sms" && state != "intro";
  let musicLevel = (inCall && musicOn) ? (state == "calm" ? 0.5 : state == "wait" ? 0.45 : 0.3) * duck : 0;
  musicFiles.piano.setVolume(state == "calm" ? 0 : musicLevel, 0.2);
  musicFiles.mindfulness.setVolume(state == "calm" ? musicLevel : 0, 0.2);
  // music off: the Danish ringback tone, 1 s on, 4 s off
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

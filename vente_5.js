// 1813 · VENTEUNIVERS, step 5 (the green version, built as code after the group's decisions 14 Nov 2026)
//
//   SMS  ->  "Opretter forbindelse"  ->  intro (the landscape rises, the figure walks to the hospital)  ->  home
//   home: Forbered din samtale (CPR -> age group, then one question at a time, confirm, sent)
//         · Din ventetid (the full landscape) · Find ro (sky only, breathing) · Gode råd til dig (one card at a time, browsable)
//   the queue runs on a timer; when it reaches zero the nurse answers and the participant gets three questions
//   (how long did you think you waited, how calm you felt, how calm the body was; 5 is the good end in both); the answers are kept for the test leader.
//
// Test leader panel: tap the "1813" title three times quickly. Scenario, noise, waiting time, status style, results.
// Controls (top right): day/night · voice on/off (speaker, OFF by default) · music on/off (off = the Danish ringback tone)
// Keyboard on a computer: n = night, v = voice, m = music, t = test leader panel, space = skip 30 s of waiting

// ------------------------------------------------------------ state
let state = "age";              // age (the tester picks the age from the card), sms, intro, home, flow, confirm, sent, red, wait, calm, advice, answered, survey, done
let night = false;
let insetTop = 0, insetBottom = 0;
let buttons = [], lastTap = 0;
let stateSince = 0;             // millis() when the state was entered

// ------------------------------------------------------------ test settings (the test leader can change them)
// the person the call is about: the name is fixed, the age comes from the card the tester drew
const PERSON_NAME = "Alex";
const AGES = [["0 til 3 måneder", "infant"], ["4 måneder til 12 år", "child"], ["13 år og op", "adult"]];   // akut.dk's own groups
let ageChoice = -1;
function personLine() { return ageChoice < 0 ? "" : PERSON_NAME + ", " + AGES[ageChoice][0]; }
// the noise in the headphones depends on who the call is about (her rule 15 Nov):
//   0 to 3 months: a baby crying · 4 months to 12 years: a baby, or children making noise · 13 and up: traffic, storm, people talking, mixed or changing
const NOISE_FILES = { baby: "lyd/noise-baby.mp3", "børn": "lyd/noise-children.mp3", trafik: "lyd/noise-traffic.mp3?v=2", storm: "lyd/noise-storm.mp3?v=3", snak: "lyd/noise-talk.mp3" };   // ?v= so the phone fetches the new mixes
const NOISE_SETS = {
  infant: [["ingen", "ingen"], ["baby", "babygråd"]],
  child:  [["ingen", "ingen"], ["baby", "babygråd"], ["børn", "børn der larmer"]],
  adult:  [["ingen", "ingen"], ["trafik", "trafik"], ["storm", "storm"], ["snak", "folk der snakker"], ["blandet", "blandet"], ["skiftende", "skiftende"]]
};
function noiseSet() { return NOISE_SETS[ageChoice < 0 ? "adult" : AGES[ageChoice][1]]; }
// when the age changes, a noise that does not fit the group becomes the group's nearest one (never silently "ingen")
function fitNoiseToAge() { if (!test.noiseChosen) test.noise = noiseSet()[1][0]; }   // the age sets the default; a choice by the test leader always stands
const ALL_NOISES = [["ingen", "ingen"], ["baby", "babygråd"], ["børn", "børn der larmer"], ["trafik", "trafik"], ["storm", "storm"], ["snak", "folk der snakker"], ["blandet", "blandet"], ["skiftende", "skiftende"]];
// the level of every file right now, for the chosen noise
function noiseTargets() {
  let e = (test.escalate ? 0.55 + 0.45 * progress() : 1) * (test.level || 0.6);
  if (test.noise == "blandet") return { trafik: 0.85 * e, snak: 0.85 * e };
  if (test.noise == "skiftende") { let k = ["trafik", "snak", "storm"][floor(millis() / 20000) % 3]; return { [k]: e }; }
  return { [test.noise]: e };
}
let test = { noise: "ingen", noiseChosen: false, waitMin: 3, status: "stones", startedAt: 0, mode: "app", events: false, escalate: false, level: 0.6 };
const LEVELS = [[0.4, "lav"], [0.6, "mellem"], [0.8, "høj"]];   // the noise ceiling, so the test leader can balance noise against the call on the day
// mode: "app" = the venteunivers, "1813" = the control condition (today's 1813: hold music and the looped message, nothing else)
// events: sudden sounds now and then · escalate: the noise grows over the wait · noiseChosen: the test leader picked it herself
const SITUATIONS = { infant: ["Barnet er blevet slapt og svært at få kontakt til", "Barnet kaster nu op"], child: ["Barnet kaster nu op", "Feberen er steget til 40"], adult: ["Smerterne er blevet værre", "Du er begyndt at kaste op"] };
function situationsForAge() { return SITUATIONS[ageChoice < 0 ? "adult" : AGES[ageChoice][1]]; }
let situation = null, situationChoice = "", hungUp = false;
const RED_SCREEN = false;         // false: a 112 answer in the questions no longer ends the test with the red screen (it stopped too many tests, 25 Nov 2026)
let eventsPlayed = 0, nextEvent = 0;
let callMsgAt = 0;
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
function queueSentence() { let n = queueNumber(); return n == 1 ? "Du er den næste." : "Du er nummer " + n + " i køen."; }

// ------------------------------------------------------------ the questionnaire (one question at a time)
let answers = {};               // who (infant/child/adult, from the age chosen at the start), theme, sub, q0..q2, temp, together
let qIndex = 0;
let flowDone = false;

function flowSteps() {
  let steps = [];
  if (!answers.who) answers.who = ageChoice < 0 ? "adult" : AGES[ageChoice][1];
  steps.push({ key: "temp",     text: "Har du målt temperaturen?",                buttons: [["Ja","yes"],["Nej","no"]] });
  steps.push({ key: "together", text: "Er du sammen med den, det drejer sig om?",  buttons: [["Ja","yes"],["Nej","no"]] });
  steps.push({ key: "theme",    text: "Hvad drejer det sig om?",                    buttons: THEMES[answers.who].map((th,i) => [th.da, String(i)]) });
  if (answers.theme == null) return steps;
  let th = THEMES[answers.who][int(answers.theme)];
  if (th.sub.length > 1) { steps.push({ key: "sub", text: "Hvad passer bedst?", buttons: th.sub.map((sb,i) => [sb[0], String(i)]) }); if (answers.sub == null) return steps; }
  let sub = th.sub[int(answers.sub || 0)];
  let pk = sub[2] || "general";
  if (pk == "direct") return steps;                         // psychiatric help / assault: no more questions
  PAGES[pk].questions.filter(q => !/under (\S+ )?(måneder|år)\?/.test(q.da)).slice(0, 3).forEach((q,i) => steps.push({ key: "q"+i, text: q.da, buttons: (q.buttons || YES_NO).map(b => [b[0], b[2]]), redIf: q.redIf }));
  return steps;
}
function currentPage() {
  if (!answers.who || answers.theme == null) return "general";
  let th = THEMES[answers.who][int(answers.theme)]; let sub = th.sub[int(answers.sub || 0)];
  return sub[2] && PAGES[sub[2]] ? sub[2] : "general";
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
const MUSIC = { piano: "lyd/golden-sunset-piano.mp3", mindfulness: "lyd/radiant-mindfulness.mp3", hold: "lyd/hold-1813-vivaldi.mp3?v=3" };   // hold = today's 1813: Vivaldi through a telephone filter (1813 plays music in the queue; the tune is unknown)
let musicFiles = {}, noiseFiles = {};
let musicOn = true, voiceOn = false, soundStarted = false, soundError = "";
let ringOsc;
let noiseStarted = {};
let hornFile = null;            // a real car horn (CC0) for the sudden sounds
let answerFile = null;          // optional: the group's own recording of the nurse answering (lyd/svar-1813.mp3); spoken text is the fallback          // each noise file is started exactly once (p5's isPlaying() is unreliable right after a restart)
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
  musicFiles.hold = loadSound(MUSIC.hold);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER); textFont("Helvetica");
  readInsets();
  night = isNight();
  if (window.speechSynthesis) { voices = speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => { voices = speechSynthesis.getVoices(); }; }
  for (let k in NOISE_FILES) noiseFiles[k] = loadSound(NOISE_FILES[k], () => {}, e => { soundError = (soundError + " " + k + ": " + String(e && e.message || e)).slice(0, 90); });
  hornFile = loadSound("lyd/event-horn.mp3", () => {}, () => {});
  answerFile = loadSound("lyd/svar-1813.mp3", () => {}, () => { answerFile = null; });
  connectRemote();
  enter("age");
}
function readInsets() {
  let t = document.getElementById("inset-top"), b = document.getElementById("inset-bottom");
  insetTop = t ? t.offsetHeight : 0; insetBottom = b ? b.offsetHeight : 0;
}
function enter(s) { state = s; stateSince = millis(); }
function since() { return millis() - stateSince; }

// Everything that must keep running while the tab is hidden (a browser stops draw() in a background tab, and the test
// leader's page is often the front tab on the same computer) lives in tick(), driven by draw() AND by a timer.
let lastTick = 0;
function tick() {
  if (millis() - lastTick < 100) return;
  lastTick = millis();
  // the queue ends: the nurse answers
  if (waitStart && !answeredAt && waitRemaining() <= 0 && ["home","flow","confirm","sent","wait","calm","advice","red","call"].includes(state)) {
    answeredAt = millis(); situation = null; enter("answered"); silenceAll(); nurseAnswers();
  }
  // the control condition repeats today's message every 30 s
  if (state == "call" && !answeredAt && millis() - callMsgAt > 30000) { callMsgAt = millis(); say("Velkommen til Akuttelefonen 1813. Du er nummer " + queueNumber() + " i køen. Ved livstruende sygdom eller tilskadekomst: læg på, og ring et, et, to.", true); }
  // sudden sounds, when the test leader wants them
  if (test.events && ambienceOn && !answeredAt && soundStarted) { if (!nextEvent) nextEvent = millis() + random(15000, 30000); else if (millis() > nextEvent) { playEvent(random(["phone", "doorbell", "horn"])); eventsPlayed++; nextEvent = millis() + random(20000, 40000); } }
  // the voice follows the queue
  if (waitStart && !answeredAt && voiceOn && !["flow","confirm","sms","intro","survey"].includes(state) && queueNumber() != lastSpokenNumber) {
    lastSpokenNumber = queueNumber(); say(queueSentence());
  }
  // the loading screen and the "sent" screen move on even if the tab is hidden
  if (state == "intro" && since() > 7000) { enter("home"); lastSpokenNumber = 0; startAmbience(); }
  if (state == "sent" && since() > 2200) enter("home");
  publishState();
  updateSound();
}
setInterval(() => { try { tick(); } catch (e) {} }, 500);

function draw() {
  // every frame starts from a clean, opaque canvas and a known fill state (Safari kept old frames when fill was off)
  drawingContext.globalAlpha = 1;
  fill(0); noStroke();
  buttons = [];
  let breath = (sin(frameCount * 0.013) + 1) / 2;
  tick();

  if (state == "age")           drawAge();
  else if (state == "sms")      drawSms();
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
  else if (state == "call")     drawCall();

  if (situation && !answeredAt) drawSituation();
  if (panelOpen) drawPanel();
}

// ============================================================ screens
function drawAge() {
  drawSky(); drawHills(height - insetBottom - 170, height);
  let c = col();
  noStroke(); fill(c.soft); textSize(12); text("SIMULERING", width/2, insetTop + 60);
  fill(c.ink); textSize(24); textStyle(BOLD); textLeading(30);
  text("Hvor gammel er den, du ringer om?", width*0.1, insetTop + 84, width*0.8, 80);
  textStyle(NORMAL); fill(c.soft); textSize(13); text("Se på kortet, du har trukket", width/2, insetTop + 170);
  let bw = min(width*0.78, 340), bh = 56, gap = 14;
  for (let i = 0; i < AGES.length; i++) choiceButton(width/2, insetTop + 230 + i * (bh + gap), bw, bh, AGES[i][0], "age:" + i, ageChoice == i, 18);
  fill(c.soft); textSize(12); text(PERSON_NAME + " er navnet i simuleringen", width/2, insetTop + 230 + 3 * (bh + gap) + 6);
}
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
}

function drawHome() {
  drawSky(); drawHills(insetTop + 222, height);
  statusBlock();
  drawTopBar("", false);
  let c = col();
  noStroke(); textSize(30); textStyle(BOLD);
  fill(c.cardsh); text("Velkommen til 1813", width/2 + 1, insetTop + 176);
  fill(c.ink); text("Velkommen til 1813", width/2, insetTop + 170);
  textStyle(NORMAL); textSize(15); fill(c.soft); text(personLine(), width/2, insetTop + 198);
  let y = insetTop + 230, h = 70, gap = 12, bx = 24, bw = width - 48;
  if (width > 600) { bw = 520; bx = (width - bw) / 2; }
  menuBox(bx, y, bw, h, "Forbered din samtale", flowDone ? "Sendt til sygeplejersken" : "Start her", "check", "flow", !flowDone);
  menuBox(bx, y + (h+gap), bw, h, "Din ventetid", "Nr. " + queueNumber() + " i køen", "clock", "wait", false);
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

function drawConfirm() {
  drawSky(); drawHills(height - insetBottom - 170, height);
  statusBlock();
  drawTopBar("Forbered din samtale", true);
  let c = col();
  noStroke(); fill(c.ink); textSize(24); textStyle(BOLD);
  text("Er du sikker på dine svar?", width*0.1, insetTop + 170, width*0.8, 80);
  textStyle(NORMAL); fill(c.soft); textSize(14);
  text(flowSteps().length + " svar klar til sygeplejersken", width/2, insetTop + 250);
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
  noStroke();
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
  textSize(12); fill(c.soft); let txt = queueNumber() == 1 ? "Du er den næste" : "Nr. " + queueNumber() + " i køen";
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
  fill(c.ink); textSize(24); textLeading(30); textStyle(BOLD); text(hungUp ? "Du lagde på og ringede 112" : "Sygeplejersken tager telefonen", width*0.1, insetTop + 300, width*0.8, 70);
  textStyle(NORMAL);
  primaryButton(width/2, insetTop + 400, min(width*0.6, 280), 52, "Videre", "to-survey");
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
    let q = survey.step == 1 ? "Hvor rolig følte du dig, mens du ventede?" : "Hvor rolig var din krop, mens du ventede?";   // both scales now run the same way: 5 is the good end
    text(q, width*0.1, insetTop + 170, width*0.8, 80);
    textStyle(NORMAL); textSize(14); fill(c.soft);
    text(survey.step == 1 ? "1 = slet ikke rolig · 5 = helt rolig" : "1 = meget uro i kroppen · 5 = helt rolig krop", width/2, insetTop + 250);
    for (let i = 1; i <= 5; i++) choiceButton(width/2 - 140 + (i-1) * 70, insetTop + 310, 58, 54, String(i), "scale:" + i, false, 18);
  }
}

function drawDone() {
  drawSky(); drawHills(height - insetBottom - 170, height);
  drawTopBar("", false);
  let c = col();
  noStroke(); fill(c.ink); textSize(26); textStyle(BOLD); text("Tak", width/2, insetTop + 220);
  textStyle(NORMAL); fill(c.soft); textSize(15); text("Dine svar er gemt til testlederen.", width/2, insetTop + 256);
  textSize(11); text(remote.connected_any ? "Sendt til testlederens computer" : "Gemt på telefonen (ingen forbindelse til testlederen)", width/2, insetTop + 280);
  primaryButton(width/2, insetTop + 330, min(width*0.6, 280), 52, "Ny test", "restart");
}

// the control condition: a plain phone call, as 1813 is today
function drawCall() {
  background("#1C1C1E");
  noStroke(); fill("#FFFFFF"); textSize(34); textStyle(BOLD); text("1813", width/2, insetTop + 110);
  textStyle(NORMAL); fill("#AEAEB2"); textSize(16); text("Akuttelefonen", width/2, insetTop + 146);
  let labels = ["lydløs", "tastatur", "højttaler", "tilføj", "FaceTime", "kontakter"];
  for (let i = 0; i < 6; i++) {
    let cx = width/2 + ((i % 3) - 1) * 100, cy = insetTop + 300 + floor(i/3) * 110;
    fill("#3A3A3C"); circle(cx, cy, 74); fill("#AEAEB2"); textSize(12); text(labels[i], cx, cy + 56);
    stroke("#FFFFFF"); strokeWeight(2); noFill();
    if (i == 0) { line(cx-8, cy-10, cx+8, cy+10); rect(cx-5, cy-12, 10, 16, 5); }
    if (i == 1) { for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) point(cx-8+c*8, cy-8+r*8); }
    if (i == 2) { beginShape(); vertex(cx-10,cy-4); vertex(cx-5,cy-4); vertex(cx+1,cy-10); vertex(cx+1,cy+10); vertex(cx-5,cy+4); vertex(cx-10,cy+4); endShape(CLOSE); arc(cx+5, cy, 12, 14, -PI/3, PI/3); }
    if (i == 3) { line(cx-10, cy, cx+10, cy); line(cx, cy-10, cx, cy+10); }
    if (i == 4) { rect(cx-12, cy-7, 16, 14, 3); triangle(cx+4, cy, cx+12, cy-6, cx+12, cy+6); }
    if (i == 5) { circle(cx, cy-4, 10); arc(cx, cy+12, 22, 16, PI, TWO_PI); }
    noStroke();
  }
  fill("#FF3B30"); circle(width/2, height - insetBottom - 110, 74);
  stroke("#FFFFFF"); strokeWeight(3); noFill(); arc(width/2, height - insetBottom - 104, 26, 14, PI + 0.3, TWO_PI - 0.3); noStroke();
  buttons.push({ x: width/2 - 60, y: insetTop + 86, w: 120, h: 48, value: "title-tap" });
}
// a change in the situation, sent by the test leader: the participant has to decide
function drawSituation() {
  noStroke(); fill(0, 0, 0, 120); rect(0, 0, width, height);
  let w = min(width - 48, 360), x = (width - w)/2, h = 250, y = height/2 - h/2 - 40;
  fill("#FFFBF3"); rect(x, y, w, h, 22);
  fill("#B2321C"); textSize(12); textStyle(BOLD); text("NY SITUATION", width/2, y + 28);
  fill("#1E3A2C"); textSize(22); textLeading(28); text(situation.text, x + 24, y + 48, w - 48, 90);
  textStyle(NORMAL);
  buttons = [];
  let save = night; night = false;                     // the buttons use the day palette on the cream card
  choiceButton(width/2, y + 160, w - 60, 48, "Bliv i køen", "sit:stay", false, 16);
  night = save;
  noStroke(); fill("#B2321C"); rect(x + 30, y + 196, w - 60, 44, 22); fill("#FFFFFF"); textSize(16); textStyle(BOLD); text("Læg på og ring 112", width/2, y + 218); textStyle(NORMAL);
  buttons.push({ x: x + 30, y: y + 196, w: w - 60, h: 44, value: "sit:112" });
}
// the ending: the group's own recording if it exists, otherwise the voice
function nurseAnswers() {
  if (answerFile && answerFile.isLoaded()) { try { answerFile.setVolume(1); answerFile.play(); return; } catch (e) {} }
  say("Sygeplejersken tager telefonen nu.", true);
}
function showSituation(text) { situation = { text, at: millis() }; situationChoice = ""; }   // shown, never spoken: the voice is 1813's, not the test leader's

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
  let n = queueNumber();
  let txt = n == 1 ? "Du er den næste" : "Nr. " + n + " i køen";
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
// The hills and the scene (path, trees, hospital, lampposts) are painted ONCE into offscreen buffers with texture,
// light and shadow, then drawn as images every frame. Only the walked path, the stones and the character move.
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
    fill(246, 240, 216, 40); circle(60, insetTop + 128, 70);
    fill("#F6F0D8"); circle(60, insetTop + 128, 40); fill(c.skyTop); circle(76, insetTop + 120, 32);
  } else {
    for (let [r, a] of [[200, 18], [140, 30], [90, 60]]) { fill(255, 226, 138, a); circle(width - 64, insetTop + 128, r); }
    fill("#FFE28A"); circle(width - 64, insetTop + 128, 48);
  }
  // small clouds in a band between the 112 line and the headline
  for (let [cx, cy, w] of [[90, insetTop + 124, 90], [300, insetTop + 134, 70]]) {
    let drift = (frameCount * 0.06 + cx) % (width + 160) - 80;
    fill(255, 255, 255, night ? 22 : 190);
    ellipse(drift, cy, w, w/4); ellipse(drift - w*0.22, cy + 3, w*0.5, w/6); ellipse(drift + w*0.24, cy + 2, w*0.55, w/5);
  }
  fill(0);
}

const BUF = new Map();
function buffer(key, paint) {
  if (width < 2 || height < 2) return null;              // a tab opened in the background can start with no size
  let k = key + "|" + night + "|" + width + "x" + height;
  if (!BUF.has(k)) {
    if (BUF.size > 8) BUF.clear();
    let g = createGraphics(width, height); g.pixelDensity(pixelDensity());
    paint(g); BUF.set(k, g);
  }
  return BUF.get(k);
}
function gradFill(g, x0, y0, x1, y1, c1, c2) {
  g.fill(1, 2, 3);
  let gr = g.drawingContext.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.drawingContext.fillStyle = gr;
}
function ridge(g, a1, top, a2) { g.vertex(0, a1); g.bezierVertex(width*0.3, top, width*0.6, a2 + 40, width, a2); }
function hillShape(g, a1, top, a2, bottom, dy = 0) { g.beginShape(); g.vertex(0, a1 + dy); g.bezierVertex(width*0.3, top + dy, width*0.6, a2 + 40 + dy, width, a2 + dy); g.vertex(width, bottom); g.vertex(0, bottom); g.endShape(CLOSE); }

// one hill layer: shadow cast on the hill behind, gradient body, grass texture, ridge light, haze
function paintHill(g, top, a1, a2, bottom, c1, c2, haze, seed) {
  let c = col();
  g.noStroke();
  for (let [dy, al] of [[-12, 10], [-6, 16], [-2, 22]]) { g.fill(0, 20, 10, al); hillShape(g, a1, top, a2, bottom, dy); }
  gradFill(g, 0, top, 0, bottom, c1, c2); hillShape(g, a1, top, a2, bottom);
  randomSeed(seed);
  for (let i = 0; i < 150; i++) {
    let t = random(), rx = bezierPoint(0, width*0.3, width*0.6, width, t), ry = bezierPoint(a1, top, a2 + 40, a2, t);
    let d = random(); let y = ry + d*d * (bottom - ry) + 6;
    let w = random(16, 70), h = w * random(0.22, 0.4);
    if (random() < 0.5) g.fill(255, 255, 230, random(2, night ? 4 : 8)); else g.fill(0, 25, 10, random(2, 7));
    g.ellipse(rx + random(-40, 40), y, w, h);
  }
  // sunlit side: a soft light wash from the top right, a shade wash bottom left
  gradFill(g, width, top, 0, bottom, night ? "rgba(255,240,200,0.05)" : "rgba(255,245,200,0.16)", "rgba(0,20,10,0.10)"); hillShape(g, a1, top, a2, bottom);
  g.noFill();
  for (let [sw, al] of [[10, 6], [3, 22]]) { g.stroke(255, 255, 235, night ? al * 0.35 : al); g.strokeWeight(sw); g.beginShape(); ridge(g, a1, top, a2); g.endShape(); }
  g.noStroke();
  if (haze > 0) { g.fill(red(c.skyBot), green(c.skyBot), blue(c.skyBot), haze); hillShape(g, a1, top, a2, bottom); }
}
function hillLayers(top, bottom) {
  let c = col(), span = bottom - top;
  let far = c.far, mid = c.mid, near = c.near;
  return [
    { top: top,               a1: top + 60,          a2: top + 36,          c1: far[0],  c2: far[1],  haze: night ? 24 : 36, seed: 11 },
    { top: top + span*0.26,   a1: top + span*0.36,   a2: top + span*0.31,   c1: mid[0],  c2: mid[1],  haze: night ? 6 : 12, seed: 37 },
    { top: top + span*0.52,   a1: top + span*0.58,   a2: top + span*0.66,   c1: lerpColor(color(mid[0]), color(near[0]), 0.5).toString(), c2: lerpColor(color(mid[1]), color(near[1]), 0.5).toString(), haze: 0, seed: 41 },
    { top: top + span*0.76,   a1: top + span*0.86,   a2: top + span*0.81,   c1: near[0], c2: near[1], haze: 0, seed: 53 }
  ];
}
function drawHills(top, bottom) {
  let g = buffer("hills:" + top + ":" + bottom, g => { for (let L of hillLayers(top, bottom)) paintHill(g, L.top, L.a1, L.a2, bottom, L.c1, L.c2, L.haze, L.seed); });
  if (g) image(g, 0, 0);
}

// The path and the hospital are designed in a 390 px wide frame and scaled, so the shape holds on an iPad too.
let SCENE = null;      // the path geometry of the last scene buffer: B(t), L, R, s
function sceneGeometry(top, bottom) {
  let span = bottom - top;
  let s = min(width / 390, 1.25), ox = (width - 390 * s) / 2;
  const X = x => ox + x * s;
  let P0 = [X(110), bottom + 70], P1 = [X(380), bottom - span*0.30], P2 = [X(4), top + span*0.42], P3 = [X(176), top + 112];
  const B = t => { let u = 1-t; return [u*u*u*P0[0]+3*u*u*t*P1[0]+3*u*t*t*P2[0]+t*t*t*P3[0], u*u*u*P0[1]+3*u*u*t*P1[1]+3*u*t*t*P2[1]+t*t*t*P3[1]]; };
  const D = t => { let u = 1-t; return [3*u*u*(P1[0]-P0[0])+6*u*t*(P2[0]-P1[0])+3*t*t*(P3[0]-P2[0]), 3*u*u*(P1[1]-P0[1])+6*u*t*(P2[1]-P1[1])+3*t*t*(P3[1]-P2[1])]; };
  let N = 60, L = [], R = [];
  for (let i = 0; i <= N; i++) { let t = i/N, [x,y] = B(t), [dx,dy] = D(t), len = Math.hypot(dx,dy) || 1, nx = -dy/len, ny = dx/len, w = (38*(1-t) + 11) * s; L.push([x+nx*w/2, y+ny*w/2]); R.push([x-nx*w/2, y-ny*w/2]); }
  return { B, L, R, N, s, P3, hx: P3[0] + 12.65 * s * 1.15, hy: P3[1] - 10 };
}
function pathPoly(g, L, R, dx, dy) { g.beginShape(); for (let p of L) g.vertex(p[0]+dx, p[1]+dy); for (let p of R.slice().reverse()) g.vertex(p[0]+dx, p[1]+dy); g.endShape(CLOSE); }

function paintScene(g, top, bottom) {
  let c = col();
  let S = sceneGeometry(top, bottom); SCENE = S;
  let { B, L, R, s, hx, hy } = S;
  g.noStroke();
  // a soft shadow on the lawn under and to the left of the building (light from the top right)
  g.fill(0, 25, 10, 22); g.ellipse(hx - 14 * s, hy + 12, 170 * s, 44 * s);
  g.fill(0, 25, 10, 22); g.ellipse(hx - 6 * s, hy + 8, 120 * s, 30 * s);
  // the path: two soft shadows, body, a light centre, edges, pebbles
  g.fill(0, 0, 0, 16); pathPoly(g, L, R, 0, 9);
  g.fill(0, 0, 0, 30); pathPoly(g, L, R, 0, 4);
  g.fill(c.path); pathPoly(g, L, R, 0, 0);
  g.noFill(); g.stroke(255, 255, 240, night ? 14 : 60); g.strokeWeight(12 * s); g.beginShape(); for (let i = 0; i <= 60; i++) { let [x,y] = B(i/60); g.vertex(x, y); } g.endShape();
  g.stroke(c.pathEdge); g.strokeWeight(1.6);
  g.beginShape(); for (let p of L) g.vertex(p[0], p[1]); g.endShape(); g.beginShape(); for (let p of R) g.vertex(p[0], p[1]); g.endShape();
  g.noStroke(); randomSeed(7);
  for (let i = 0; i < 70; i++) { let t = random(), [x,y] = B(t), w = (38*(1-t) + 11) * s; g.fill(night ? 255 : 90, night ? 255 : 70, night ? 230 : 40, random(14, 40)); g.ellipse(x + random(-w*0.4, w*0.4), y + random(-3, 3), random(2, 5) * s, random(1.5, 3) * s); }
  // bushes and flowers along the path
  randomSeed(19);
  for (let i = 0; i < 14; i++) { let t = random(0.05, 0.95), side = random() < 0.5 ? -1 : 1, [x,y] = B(t), w = (38*(1-t) + 11) * s; bush(g, x + side * (w/2 + random(10, 26) * s), y + random(2, 8), (10 + 10 * (1-t)) * s); }
  // trees
  for (let [t, side, h, kind] of [[0.06,1,60,"round"],[0.12,-1,46,"round"],[0.3,-1,50,"pine"],[0.38,1,42,"round"],[0.55,1,38,"pine"],[0.62,-1,30,"round"],[0.72,-1,30,"pine"],[0.9,1,22,"pine"],[0.86,-1,20,"round"]]) { let [x,y] = B(t); tree(g, x + side*(62*(1-t)+28)*s, y + 6, h * s, kind); }
  // a row of trees on the ridges
  randomSeed(29);
  for (let i = 0; i < 9; i++) { let x = random(width); let hy2 = top + 36 + (bottom-top) * 0.22 + random(-6, 6); if (abs(x - hx) < 110 * s) continue; tree(g, x, hy2, random(14, 20) * s, random() < 0.5 ? "pine" : "round"); }
  // lampposts
  for (let t of [0.2, 0.5, 0.8]) { let [x,y] = B(t); x += (t == 0.5 ? -1 : 1) * 20 * s;
    g.noStroke(); g.fill(0, 0, 0, 40); g.ellipse(x, y + 1, 10, 4);
    g.stroke(night ? "#C9C2A8" : "#2B2B2B"); g.strokeWeight(2.5); g.line(x, y, x, y - 30); g.line(x - 5, y - 30, x + 5, y - 30); g.noStroke();
    if (night) { g.fill(255, 226, 138, 25); g.circle(x, y - 35, 60); g.fill(255, 226, 138, 50); g.circle(x, y - 35, 36); g.fill(255, 226, 138, 120); g.circle(x, y - 35, 18); g.fill("#FFF6C8"); g.circle(x, y - 35, 8); g.fill(255, 226, 138, 22); g.ellipse(x, y + 2, 70, 22); }
    else { g.fill("#8E8E8E"); g.rect(x - 4, y - 38, 8, 7, 2); } }
  hospital(g, hx, hy - 2, s * 1.15);
  // a soft vignette, like a lens
  let v = g.drawingContext.createRadialGradient(width/2, height*0.5, height*0.25, width/2, height*0.5, height*0.8);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, night ? "rgba(0,0,0,0.30)" : "rgba(20,40,20,0.16)");
  g.fill(1, 2, 3); g.drawingContext.fillStyle = v; g.rect(0, top - 40, width, bottom - top + 40);
}

function drawLandscape(top, bottom, figT, pathAlpha, walking, breath) {
  let c = col();
  drawHills(top, bottom);
  let g = buffer("scene:" + top + ":" + bottom, g => paintScene(g, top, bottom));
  let S = sceneGeometry(top, bottom);
  let { B, L, R, N, s } = S;
  push();
  drawingContext.globalAlpha = pathAlpha;
  if (g) image(g, 0, 0);
  // the walked part of the path and the stones
  let k = floor(N * figT);
  if (k > 1) { noStroke(); fill(red(c.walked), green(c.walked), blue(c.walked), 200); beginShape(); for (let p of L.slice(0, k+1)) vertex(p[0], p[1]); for (let p of R.slice(0, k+1).reverse()) vertex(p[0], p[1]); endShape(CLOSE); }
  noStroke();
  for (let j = 1; j < 10; j++) { let t = j/10, [x,y] = B(t); fill(0, 0, 0, 30); ellipse(x, y - 1, 8*s, 4*s); if (t <= figT) { fill(c.accent); circle(x, y-3, 7*s); fill(255, 255, 255, 90); circle(x - 1.5*s, y - 4.5*s, 2.5*s); } else { fill(night ? "rgba(201,194,168,0.5)" : "rgba(255,255,255,0.7)"); circle(x, y-3, 5.5*s); } }
  // the character: walks during the intro, bounces while waiting
  let [fx, fy] = B(walking ? figT : 0.04 + 0.96 * figT);
  let bounce = walking ? abs(sin(frameCount * 0.25)) * 4 : abs(sin(frameCount * 0.09)) * 5;
  let sway = walking ? 0 : sin(frameCount * 0.045) * 4;
  character(fx + sway, fy - bounce, 1);
  drawingContext.globalAlpha = 1;
  pop();
  noStroke(); fill(c.ground); rect(0, bottom, width, height - bottom);
}

// a small block of a building that stands on the ground: contact shadow, plinth, front, side, roof, canopy, windows, cross, hedges
function hospital(g, hx, hy, s) {
  g.push(); g.translate(hx, hy); g.scale(s);
  g.noStroke();
  let c = col();
  // the ground around the building: a worn lawn patch, the building's cast shadow (light from the top right)
  for (let [rx, ry, al] of [[150, 46, 14], [120, 36, 16], [90, 26, 18]]) { g.fill(0, 25, 10, al); g.ellipse(-8, 6, rx, ry); }
  for (let [o, al] of [[0, 34], [5, 20], [10, 10]]) { g.fill(0, 20, 10, al); g.beginShape(); g.vertex(-42, -2); g.vertex(18, 1); g.vertex(42, -13); g.vertex(30 - o, 14 + o); g.vertex(-20 - o, 18 + o); g.vertex(-86 - o*1.6, 16 + o); g.endShape(CLOSE); }
  // the forecourt in front of the entrance, in the same perspective as the path (narrow at the facade, wide towards us)
  g.fill(c.path); g.beginShape(); g.vertex(-46, 0); g.vertex(16, 0); g.vertex(26, 13); g.vertex(-58, 13); g.endShape(CLOSE);
  g.fill(c.pathEdge); g.quad(-58, 12, 26, 12, 26, 14, -58, 14);
  g.fill(255, 255, 240, night ? 8 : 45); g.quad(-45, 0.5, 15, 0.5, 15, 2.5, -45, 2.5);
  // contact shadow right under the walls
  g.fill(0, 15, 8, 70); g.quad(-42, -1, 18, -1, 18, 2, -42, 2); g.quad(18, -1, 42, -15, 42, -12, 18, 2);
  for (let [o, al] of [[7, 18], [4, 30], [1.5, 60]]) { g.fill(0, 15, 8, al); g.beginShape(); g.vertex(-42, 0); g.vertex(18, 0); g.vertex(42, -14); g.vertex(42 + o, -14 + o*0.6); g.vertex(18 + o, o); g.vertex(-42 - o*0.4, o); g.endShape(CLOSE); }
  g.fill(night ? "#8F8B7C" : "#B9C2BF"); g.quad(-42, -3, 18, -3, 18, 1, -42, 1);                // plinth
  g.fill(night ? "#9E9A8A" : "#A9B3B0"); g.quad(18, -3, 42, -17, 42, -13, 18, 1);
  gradFill(g, -40, -48, -40, 0, night ? "#E9E3D0" : "#FBFBF7", night ? "#CFC9B6" : "#E3E6E2"); g.rect(-40, -48, 58, 46);   // front face
  gradFill(g, 18, -48, 40, -48, night ? "#B5B09E" : "#D6DCDA", night ? "#8F8B7C" : "#B8C2BE"); g.quad(18, -48, 40, -62, 40, -16, 18, -2); // side face
  g.fill(night ? "#C9C4B0" : "#EEF1EF"); g.quad(-40, -48, -18, -62, 40, -62, 18, -48);          // roof
  g.fill(night ? "#8F8B7C" : "#C3CBC8"); g.quad(-40, -48, -18, -62, -18, -60, -40, -46);
  g.fill(night ? "#A8A392" : "#CBD2CF"); g.quad(-6, -60, 2, -65, 14, -65, 6, -60); g.rect(-6, -60, 12, 3);  // rooftop unit
  // entrance: canopy with shadow, glass door, steps
  g.fill(0, 0, 0, 35); g.quad(-21, -20, 0, -20, 4, -15, -25, -15);
  g.fill(night ? "#8F8B7C" : "#B9C2BF"); g.quad(-21, -23, 0, -23, 4, -19, -25, -19);
  g.fill(night ? "#5E5A4C" : "#8FA7B5"); g.rect(-18, -19, 14, 17, 1);
  g.fill(night ? "#FFE28A" : "#D5E6EF"); g.rect(-16.5, -17.5, 5, 13, 0.5); g.rect(-10.5, -17.5, 5, 13, 0.5);
  g.fill(night ? "#9E9A8A" : "#C9CFCC"); g.rect(-24, -1, 26, 3, 1); g.rect(-27, 2, 32, 3, 1);
  // windows with a reflection
  let w = night ? "#FFE28A" : "#BFD8EA", f = night ? "#8F8B7C" : "#C9D1CE";
  for (let [wx, wy] of [[-35,-42],[-21,-42],[-7,-42],[7,-42],[-35,-28],[7,-28],[-35,-14],[7,-14]]) { g.fill(f); g.rect(wx-1, wy-1, 10, 9, 1); g.fill(w); g.rect(wx, wy, 8, 7, 1); g.fill(255, 255, 255, night ? 40 : 110); g.triangle(wx, wy, wx + 4, wy, wx, wy + 5); }
  for (let [wx, wy] of [[23,-46],[31,-51],[23,-32],[31,-37],[23,-18],[31,-23]]) { g.fill(night ? "#E0C878" : "#A9C4D6"); g.quad(wx, wy, wx+5, wy-3, wx+5, wy+4, wx, wy+7); }
  if (night) { g.fill(255, 226, 138, 45); g.ellipse(-11, -6, 40, 20); }
  // the cross on a white sign above the entrance
  g.fill(0, 0, 0, 25); g.rect(-16, -37, 12, 12, 2);
  g.fill("#FFFFFF"); g.rect(-17, -38, 12, 12, 2);
  g.fill("#D8363C"); g.rect(-12.5, -36, 3, 8, 0.5); g.rect(-15, -33.5, 8, 3, 0.5);
  if (night) { g.fill(216, 54, 60, 40); g.circle(-11, -32, 22); }
  g.pop();
  // hedges hide the seams: at the front corners and along the forecourt edge
  bush(g, hx - 46 * s, hy + 2 * s, 7.5 * s); bush(g, hx - 38 * s, hy + 4 * s, 6 * s);
  bush(g, hx + 44 * s, hy - 10 * s, 7 * s); bush(g, hx + 36 * s, hy - 2 * s, 6 * s);
  for (let i = 0; i < 3; i++) bush(g, hx + (-62 + i * 9) * s, hy + 16 * s, 6 * s);
  for (let i = 0; i < 2; i++) bush(g, hx + (22 + i * 9) * s, hy + 16 * s, 6 * s);
}
function bush(g, x, y, r) {
  let light = night ? "#245244" : "#3E8A5C", dark = night ? "#15382E" : "#245F3D";
  g.noStroke(); g.fill(0, 0, 0, 40); g.ellipse(x, y + r*0.35, r*2.2, r*0.7);
  g.fill(dark); g.circle(x - r*0.5, y, r*1.1); g.circle(x + r*0.5, y, r*1.1); g.circle(x, y - r*0.3, r*1.3);
  g.fill(light); g.circle(x - r*0.15, y - r*0.5, r*0.8); g.circle(x + r*0.45, y - r*0.25, r*0.6);
  if (!night && r > 8) { for (let i = 0; i < 3; i++) { g.fill(i % 2 ? "#F4B6C2" : "#FFF3C4"); g.circle(x + (i - 1) * r*0.45, y - r*0.6 + (i % 2) * r*0.3, r*0.22); } }
}
function tree(g, x, y, h, kind) {
  let light = night ? "#246050" : "#4E9A6A", mid = night ? "#1B4A3E" : "#2F7A52", dark = night ? "#12302A" : "#1F5A3B", trunk = night ? "#3A2B22" : "#6B4A33";
  g.noStroke(); g.fill(0, 0, 0, 50); g.ellipse(x + h*0.06, y + 2, h*0.8, h*0.16);
  if (kind == "pine") {
    g.fill(trunk); g.rect(x - h*0.04, y - h*0.15, h*0.08, h*0.17, 1);
    for (let [w, hh, yy] of [[h*0.72, h*0.42, y - h*0.1], [h*0.58, h*0.4, y - h*0.36], [h*0.42, h*0.36, y - h*0.6], [h*0.26, h*0.3, y - h*0.82]]) {
      g.fill(dark); g.triangle(x, yy - hh, x - w/2, yy, x + w/2, yy);
      g.fill(light); g.triangle(x, yy - hh, x - w/2, yy, x, yy); g.fill(mid); g.triangle(x, yy - hh, x + w*0.08, yy, x, yy);
    }
  } else {
    g.fill(trunk); g.rect(x - h*0.05, y - h*0.3, h*0.1, h*0.32, 1);
    let cy = y - h*0.55, r = h*0.5;
    g.fill(dark); g.circle(x, cy + r*0.1, r*2); g.circle(x - r*0.5, cy + r*0.2, r*1.3); g.circle(x + r*0.5, cy + r*0.2, r*1.3);
    g.fill(mid); g.circle(x - r*0.1, cy - r*0.1, r*1.6); g.circle(x + r*0.45, cy - r*0.2, r*1.1);
    g.fill(light); g.circle(x - r*0.35, cy - r*0.45, r*0.9); g.circle(x + r*0.15, cy - r*0.65, r*0.7);
    g.fill(255, 255, 220, night ? 10 : 50); g.circle(x - r*0.45, cy - r*0.6, r*0.5);
  }
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
  text("Alder (vælges på startskærmen)", width/2, yy); yy += 14;
  for (let i = 0; i < AGES.length; i++) panelChoice(x + 12 + i * ((w-24)/3), yy, (w-24)/3 - 4, 26, AGES[i][0], "p:age:" + i, ageChoice == i, 11);
  yy += 34;
  text("Støj i høretelefonerne (alderen vælger kun standarden)", width/2, yy); yy += 14;
  for (let i = 0; i < ALL_NOISES.length; i++) panelChoice(x + 12 + (i % 4) * ((w-24)/4), yy + floor(i/4) * 30, (w-24)/4 - 4, 26, ALL_NOISES[i][1], "p:noise:" + ALL_NOISES[i][0], test.noise == ALL_NOISES[i][0], 10);
  yy += 64; text("Ventetid, før sygeplejersken svarer", width/2, yy); yy += 14;
  [2,3,4,5,6].forEach((m,i) => panelChoice(x + 12 + i * ((w-24)/5), yy, (w-24)/5 - 4, 26, m + " min", "p:wait:" + m, test.waitMin == m, 11));
  yy += 34; text("Version", width/2, yy); yy += 14;
  [["app", "Venteunivers"], ["1813", "Almindelig 1813"]].forEach((m, i) => panelChoice(x + 12 + i * ((w-24)/2), yy, (w-24)/2 - 4, 26, m[1], "p:mode:" + m[0], test.mode == m[0], 11));
  yy += 34; textAlign(LEFT, CENTER); text("Støjens styrke", x + 16, yy + 13); textAlign(CENTER, CENTER);
  LEVELS.forEach((L, i) => panelChoice(x + w - 12 - 172 + i * 58, yy, 54, 26, L[1], "p:level:" + L[0], abs((test.level || 0.6) - L[0]) < 0.01, 11));
  yy += 30; textAlign(LEFT, CENTER); text("Pludselige lyde", x + 16, yy + 13); textAlign(CENTER, CENTER);
  panelChoice(x + w - 12 - 112, yy, 52, 26, "fra", "p:events:0", !test.events, 11); panelChoice(x + w - 12 - 54, yy, 52, 26, "til", "p:events:1", test.events, 11);
  yy += 30; textAlign(LEFT, CENTER); text("Optrapning af støjen", x + 16, yy + 13); textAlign(CENTER, CENTER);
  panelChoice(x + w - 12 - 112, yy, 52, 26, "fra", "p:escalate:0", !test.escalate, 11); panelChoice(x + w - 12 - 54, yy, 52, 26, "til", "p:escalate:1", test.escalate, 11);
  yy += 34; text("Ny situation (pop op hos deltageren)", width/2, yy); yy += 14;
  situationsForAge().forEach((t, i) => panelChoice(x + 12 + i * ((w-24)/2), yy, (w-24)/2 - 4, 26, t, "p:sit:" + i, false, 10));
  yy += 34; text("Køstatus i fanerne", width/2, yy); yy += 14;
  [["stones","Sten"],["bar","Bar"],["figure","Figur"]].forEach((s,i) => panelChoice(x + 12 + i * ((w-24)/3), yy, (w-24)/3 - 4, 26, s[1], "p:status:" + s[0], test.status == s[0], 11));
  yy += 34;
  let res = loadResults();
  fill("#5E7A68"); textSize(12); text("Resultater: " + res.length + (res.length ? "  ·  seneste: gæt " + res[res.length-1].estimateMin + " min, reelt " + res[res.length-1].waitMin + " min, ro " + res[res.length-1].calm + ", uro " + res[res.length-1].energy : ""), width/2, yy);
  yy += 20;
  panelChoice(x + 12, yy, (w-24)/2 - 4, 30, "Kopiér CSV", "p:csv", false, 12);
  panelChoice(x + 12 + (w-24)/2, yy, (w-24)/2 - 4, 30, "Slet resultater", "p:clear", false, 12);
  yy += 38;
  fill("#2F7A52"); rect(x + 12, yy, w - 24, 44, 22); fill("#FFFFFF"); textSize(15); textStyle(BOLD); text("Start test forfra med disse valg", width/2, yy + 22); textStyle(NORMAL);
  buttons.push({ x: x+12, y: yy, w: w-24, h: 44, value: "p:start" });
  yy += 52;
  panelChoice(x + 12, yy, w - 24, 30, "Test lyden nu (støj 3 sek.)", "p:testnoise", false, 12);
  yy += 38;
  fill("#5E7A68"); textSize(10);
  let ctx = typeof getAudioContext == "function" ? getAudioContext() : null;
  let loaded = Object.keys(noiseFiles).map(k => k + (noiseFiles[k].isLoaded() ? (noiseStarted[k] ? "▶" : "✓") : "✗") + (noiseStarted[k] ? nf(noiseFiles[k].output.gain.value, 1, 1) : "")).join(" ");
  text("Lyd: " + (soundStarted ? "startet" : "ikke startet") + " · kontekst: " + (ctx ? ctx.state : "?") + " · valg: " + test.noise + (ambienceOn ? " (til)" : " (fra)") + " · " + loaded + (soundError ? " · fejl: " + soundError : ""), x + 12, yy - 8, w - 24, 44);
  fill("#5E7A68"); textSize(10); text("Fjernstyring: rum \"" + ROOM + "\" · " + remoteStatus() + " · åbn testleder.html på en anden telefon", width/2, y + h - 30);
  textSize(11); text("Luk: tryk uden for boksen", width/2, y + h - 14);
  buttons.push({ x, y, w, h, value: "p:none" });
  buttons.push({ x: 0, y: 0, w: width, h: height, value: "p:close" });
}
function panelChoice(x, y, w, h, label, value, selected, size) {
  noStroke(); fill(selected ? "#2F7A52" : "#EEF4EC"); rect(x, y, w, h, h/2);
  fill(selected ? "#FFFFFF" : "#1E3A2C"); textSize(size || 12); textStyle(selected ? BOLD : NORMAL); text(label, x + w/2, y + h/2); textStyle(NORMAL);
  buttons.unshift({ x, y, w, h, value });
}
function loadResults() { try { return JSON.parse(localStorage.getItem("venteunivers-results") || "[]"); } catch (e) { return []; } }
function saveResult(r) {
  let a = loadResults(); a.push(r);
  try { localStorage.setItem("venteunivers-results", JSON.stringify(a)); } catch (e) {}
  remotePublish("result", JSON.stringify(r));                       // one row to the test leader's page, kept there
  remotePublish("results", resultsCsv(), { retain: true });        // the whole file, so a page opened later gets it too
}
function csvVersion(m) { return (m == "1813" || m == "1813 i dag" || m == "almindelig") ? "almindelig" : "venteunivers"; }   // her names for the two versions
function csvStatus(v) { return ({ stones: "sten", bar: "bar", figure: "figur" })[v] || v; }
function localStamp() { let d = new Date(), z = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + " " + z(d.getHours()) + ":" + z(d.getMinutes()); }
function resultsCsv() {
  let rows = [["tid","person","version","stoej","lyde","optrapning","situation","ventetid_min","gaet_min","ro_1_5","uro_1_5","spoergsmaal_sendt","status_stil"]];
  for (let r of loadResults()) rows.push([r.time, r.scenario, csvVersion(r.mode), r.noise, r.events || 0, r.escalate || "nej", r.situation || "", String(r.waitMin).replace(".", ","), r.estimateMin, r.calm, r.energy, r.flowDone, csvStatus(r.status)]);
  return rows.map(r => r.join(";")).join("\n");
}

// ============================================================ taps
function tap(mx, my) {
  if (millis() - lastTap < 150) return;
  lastTap = millis();
  startSound();
  try { let ctx = getAudioContext(); if (ctx && ctx.state != "running") ctx.resume(); } catch (e) {}
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
  if (v.startsWith("sit:")) { situationChoice = v == "sit:stay" ? "blev i køen" : "ringede 112"; situation = null; if (v == "sit:112") { hungUp = true; answeredAt = millis(); silenceAll(); enter("answered"); } return; }
  if (state == "age" && v.startsWith("age:")) { ageChoice = int(v.slice(4)); fitNoiseToAge(); answers = {}; startTest(); return; }
  if (state == "sms" && v == "open-link") { enter("intro"); return; }
  if (v == "home") { enter("home"); return; }
  if (v.startsWith("go:")) {
    let t = v.slice(3);
    if (t == "flow") { if (flowDone) { cardIndex = 0; cardShownAt = millis(); enter("advice"); say(adviceCards()[0][1]); } else { answers = {}; qIndex = 0; enter("flow"); say(flowSteps()[0].text); } }
    else {
      enter(t);
      if (t == "calm") say("Træk vejret ind gennem næsen, og ud gennem munden.");
      if (t == "advice") { cardIndex = 0; cardShownAt = millis(); say(adviceCards()[0][1]); }
      if (t == "wait") say(queueSentence());
    }
    return;
  }
  if (state == "flow" && v.startsWith("ans:")) {
    let steps = flowSteps(); let q = steps[qIndex]; let val = v.slice(4);
    answers[q.key] = val;
    if (RED_SCREEN && q.redIf && val == q.redIf) { enter("red"); say("Læg på, og ring et, et, to nu."); return; }
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
      else { survey.energy = 6 - int(v.slice(6));   // stored as unrest (5 = much unrest), as before, so old and new results share the uro_1_5 column
        saveResult({ time: localStamp(), scenario: personLine(), noise: test.noise, waitMin: round((answeredAt - waitStart)/6000) / 10, estimateMin: survey.estimate, calm: survey.calm, energy: survey.energy, flowDone: flowDone ? "ja" : "nej", status: test.status, mode: test.mode, events: test.events ? eventsPlayed : 0, escalate: test.escalate ? "ja" : "nej", situation: situationChoice });
        enter("done"); }
    }
    return;
  }
  if (v == "restart") { restart(); return; }
}
function handlePanel(v) {
  if (v == "close") { panelOpen = false; return; }
  if (v == "none") return;
  if (v.startsWith("age:")) { ageChoice = int(v.slice(4)); fitNoiseToAge(); }
  if (v.startsWith("noise:")) { test.noise = v.slice(6); test.noiseChosen = true; }
  if (v.startsWith("wait:")) test.waitMin = int(v.slice(5));
  if (v.startsWith("status:")) test.status = v.slice(7);
  if (v.startsWith("mode:")) { test.mode = v.slice(5); panelOpen = false; if (state != "age") { restart(); if (ageChoice >= 0) { answers = {}; startTest(); } } }
  if (v.startsWith("events:")) test.events = v.endsWith("1");
  if (v.startsWith("level:")) test.level = parseFloat(v.slice(6));
  if (v.startsWith("escalate:")) test.escalate = v.endsWith("1");
  if (v.startsWith("sit:")) { panelOpen = false; showSituation(situationsForAge()[int(v.slice(4))]); }
  if (v == "csv") { try { navigator.clipboard.writeText(resultsCsv()); } catch (e) {} }
  if (v == "clear") { try { localStorage.removeItem("venteunivers-results"); } catch (e) {} remotePublish("results", "", { retain: true }); }
  if (v == "testnoise") { startSound(); let was = ambienceOn; ambienceOn = true; setTimeout(() => { ambienceOn = was; }, 3000); }
  if (v == "start") { panelOpen = false; restart(); }
}
// after the age is known: the venteunivers starts with the SMS, the control condition goes straight into the call
function startTest() {
  if (test.mode == "1813") { enter("call"); waitStart = millis(); test.startedAt = millis(); callMsgAt = 0; startAmbience(); }
  else { enter("sms"); waitStart = millis(); test.startedAt = millis(); }      // the wait counts from the moment the SMS is on the screen
}
function restart() {
  silenceAll();
  state = "age"; stateSince = millis(); waitStart = 0; answeredAt = 0; answers = {}; qIndex = 0; flowDone = false; cardIndex = 0; lastSpokenNumber = 0;
  situation = null; situationChoice = ""; hungUp = false; eventsPlayed = 0; nextEvent = 0; callMsgAt = 0;
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
    for (let k in musicFiles) { silentStart(musicFiles[k]); }
    for (let k in noiseFiles) startNoise(k);
    ringOsc = new p5.Oscillator("sine"); ringOsc.freq(425); ringOsc.amp(0); ringOsc.start();
  } catch (e) { soundError = String(e).slice(0, 60); }
}
let ambienceOn = false;
function startNoise(k) {
  if (noiseStarted[k] || !soundStarted || !noiseFiles[k].isLoaded()) return;
  try { silentStart(noiseFiles[k]); noiseStarted[k] = true; } catch (e) { soundError = ("start " + k + ": " + e).slice(0, 80); }
}
// start a loop without the short burst p5.sound gives when the gain is still 1 at the first sample
function silentStart(f) {
  try { let g = f.output.gain, now = getAudioContext().currentTime; g.cancelScheduledValues(now); g.setValueAtTime(0, now); g.value = 0; } catch (e) {}
  f.setVolume(0); f.loop();
  try { let g = f.output.gain, now = getAudioContext().currentTime; g.cancelScheduledValues(now); g.setValueAtTime(0, now); } catch (e) {}
}
function startAmbience() {
  if (!soundStarted) return;
  for (let k in noiseFiles) startNoise(k);
  ambienceOn = true;
}
function stopAmbience() { ambienceOn = false; }
// the call is answered: everything else goes quiet at once (noise, music, hold music, ringback, voice, pending sudden sounds)
function silenceAll() {
  ambienceOn = false; nextEvent = 0;
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  speaking = false;
  try {
    for (let k in noiseFiles) if (noiseStarted[k]) noiseFiles[k].setVolume(0, 0.15);
    for (let k in musicFiles) musicFiles[k].setVolume(0, 0.15);
    if (ringOsc) ringOsc.amp(0, 0.05);
  } catch (e) {}
}
function updateSound() {
  if (!soundStarted || !ringOsc) return;
  if (speaking && millis() > speakingUntil && !speechSynthesis.speaking) speaking = false;
  duck = lerp(duck, speaking ? 0.15 : 1, 0.05);
  let inCall = waitStart && !answeredAt && state != "sms" && state != "intro" && state != "call";
  let musicLevel = (inCall && musicOn) ? (state == "calm" ? 0.8 : state == "wait" ? 0.75 : 0.65) * duck : 0;
  musicFiles.piano.setVolume(state == "calm" ? 0 : musicLevel, 0.2);
  musicFiles.mindfulness.setVolume(state == "calm" ? musicLevel : 0, 0.2);
  musicFiles.hold.setVolume(state == "call" && !answeredAt ? 1.0 * duck : 0, 0.2);    // generic hold music, as 1813 has today; loud enough to be heard under the noise
  let ring = (inCall && !musicOn) ? ((millis() % 5000) < 1000 ? 0.08 : 0) : 0;
  ringOsc.amp(ring * duck, 0.05);
  let targets = noiseTargets();
  for (let k in noiseFiles) {
    startNoise(k);                                                   // also catches a file that finished loading after the first tap
    if (!noiseStarted[k]) continue;
    let on = ambienceOn && !answeredAt ? (targets[k] || 0) : 0;
    noiseFiles[k].setVolume(on * (speaking ? 0.3 : 1), 0.4);          // the noise steps back while 1813's voice speaks, in both versions
  }
}
function say(text_, force) {
  if ((!voiceOn && !force) || !window.speechSynthesis) return;
  text_ = text_.replace(/\b1813\b/g, "atten tretten").replace(/\b112\b/g, "et, et, to");   // said the Danish way, not as numbers
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

// sudden sounds, made with oscillators so no extra files are needed
function tone(type, freq, startMs, durMs, level) {
  setTimeout(() => { try { let o = new p5.Oscillator(type); o.freq(freq); o.amp(0); o.start(); o.amp(level, 0.02); setTimeout(() => { o.amp(0, 0.08); setTimeout(() => o.stop(), 120); }, durMs); } catch (e) {} }, startMs);
}
function playEvent(kind) {
  if (kind == "phone") { for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) tone("triangle", i % 2 ? 1300 : 1000, r * 900 + i * 50, 45, 0.25); }
  if (kind == "doorbell") { tone("sine", 659, 0, 420, 0.9); tone("triangle", 659, 0, 420, 0.25); tone("sine", 1318, 0, 250, 0.15); tone("sine", 523, 450, 900, 0.9); tone("triangle", 523, 450, 900, 0.25); tone("sine", 1046, 450, 300, 0.12); }
  if (kind == "horn") { if (hornFile && hornFile.isLoaded()) { try { hornFile.setVolume(1); hornFile.play(); } catch (e) {} } else { tone("sawtooth", 420, 0, 700, 0.3); tone("sawtooth", 530, 0, 700, 0.25); } }
}

// ============================================================ remote control from a second phone (MQTT over WebSocket, public broker)
const ROOM = ((new URLSearchParams(location.search).get("rum")) || "gruppe10").toLowerCase().replace(/[^a-z0-9æøå-]/g, "");
// two public brokers at the same time, so a network that blocks one port still gets through; duplicates are ignored
const BROKERS = [["mosquitto", "wss://test.mosquitto.org:8081/mqtt"], ["emqx", "wss://broker.emqx.io:8084/mqtt"], ["hivemq", "wss://broker.hivemq.com:8884/mqtt"]];
let remote = { clients: [], connected: {}, lastState: 0, seen: [], lastCmd: "", lastCmdAt: 0 };
Object.defineProperty(remote, "connected_any", { get() { return Object.values(remote.connected).some(v => v); } });
function connectRemote() {
  if (typeof mqtt == "undefined") return;
  for (let [name, url] of BROKERS) {
    try {
      let cl = mqtt.connect(url, { clientId: "vu-app-" + name + "-" + Math.random().toString(16).slice(2, 10), keepalive: 30, reconnectPeriod: 5000, clean: true, connectTimeout: 8000 });
      cl.on("connect", () => { remote.connected[name] = true; cl.subscribe("venteunivers/" + ROOM + "/cmd"); });
      cl.on("close", () => { remote.connected[name] = false; });
      cl.on("error", () => {});
      cl.on("message", (t, m) => { try { let c = JSON.parse(m.toString()); if (c.id) { if (remote.seen.includes(c.id)) return; remote.seen.push(c.id); if (remote.seen.length > 60) remote.seen.shift(); remote.lastCmd = c.id; remote.lastCmdAt = Date.now(); } handleRemote(c); remote.lastState = 0; } catch (e) {} });
      remote.clients.push(cl);
    } catch (e) {}
  }
}
function remotePublish(topic, payload, opts) { for (let cl of remote.clients) { try { if (cl.connected) cl.publish("venteunivers/" + ROOM + "/" + topic, payload, opts || {}); } catch (e) {} } }
function remoteStatus() { let on = BROKERS.filter(b => remote.connected[b[0]]).map(b => b[0]); return on.length ? "forbundet (" + on.join(", ") + ")" : "ikke forbundet"; }
function publishState() {
  if (!remote.connected_any || millis() - remote.lastState < 1500) return;
  remote.lastState = millis();
  let gains = {}; for (let k in noiseFiles) gains[k] = noiseStarted[k] ? round(noiseFiles[k].output.gain.value * 10) / 10 : -1;
  let st = { state, person: personLine(), age: ageChoice, nr: queueNumber(), min: minutesLeft(), left: round(waitRemaining() / 1000), running: !!(waitStart && !answeredAt), test, night, voiceOn, musicOn, flowDone, results: loadResults().length, situation: situation ? situation.text : "", choice: situationChoice, sound: soundStarted, ambience: ambienceOn, gains, lastCmd: remote.lastCmd, brokers: BROKERS.filter(b => remote.connected[b[0]]).map(b => b[0]), version: 14, t: Date.now() };
  remotePublish("state", JSON.stringify(st), { retain: true });
}
function handleRemote(c) {
  if (c.set) { for (let k in c.set) { if (k == "age") { ageChoice = int(c.set.age); fitNoiseToAge(); } else if (k == "noise") { test.noise = c.set.noise; test.noiseChosen = true; } else if (k == "mode") { if (test.mode != c.set.mode) { test.mode = c.set.mode; if (state != "age") { restart(); if (ageChoice >= 0) { answers = {}; startTest(); } } } } else if (k in test) test[k] = c.set[k]; } }
  if (c.start) { panelOpen = false; restart(); if (c.start == "now" && ageChoice >= 0) { answers = {}; startTest(); } }
  if (c.situation) showSituation(String(c.situation).slice(0, 80));
  if (c.answer && waitStart && !answeredAt) { waitStart = millis() - waitTotalMs(); lastTick = 0; tick(); }
  if (c.skip && waitStart) waitStart -= c.skip * 1000;
  if (typeof c.night == "boolean") night = c.night;
  if (typeof c.voice == "boolean") voiceOn = c.voice;
  if (typeof c.music == "boolean") musicOn = c.music;
  if (c.event) playEvent(c.event);
  if (c.clear) { try { localStorage.removeItem("venteunivers-results"); } catch (e) {} remotePublish("results", "", { retain: true }); }
  if (c.csv) remotePublish("results", resultsCsv());
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
function windowResized() { resizeCanvas(windowWidth, windowHeight); readInsets(); BUF.clear(); }

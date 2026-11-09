// 1813 WAITING SCREEN, step 4
//   "call" screen  ->  CPR (type or skip)  ->  triage (big buttons, 8 to 11 questions)  ->  "you are in the queue"
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

// ---------- TRIAGE QUESTIONS ----------
// Each question: key (where the answer is stored), text in both languages, buttons [label da, label en, value].
// "when" decides whether the question is asked, based on the answers so far.
// "red" lists the answers that send straight to "hang up and call 112".
// The same questions come first for everyone; then the branch for fever / sore throat / other.
const YES_NO = [["Ja", "Yes", "yes"], ["Nej", "No", "no"]];
const QUESTIONS = [
  { key: "who", da: "Hvem ringer du om?", en: "Who are you calling about?",
    buttons: [["Et barn", "A child", "child"], ["En voksen", "An adult", "adult"]] },
  { key: "what", da: "Hvad drejer det sig om?", en: "What is it about?",
    buttons: [["Feber", "Fever", "fever"], ["Ondt i halsen", "Sore throat", "throat"], ["Noget andet", "Something else", "other"]] },
  { key: "duration", da: "Hvor længe har det stået på?", en: "How long has it been going on?",
    buttons: [["Under et døgn", "Less than a day", "day"], ["1 til 3 dage", "1 to 3 days", "days"], ["Mere end 3 dage", "More than 3 days", "long"]] },
  { key: "worse", da: "Er det blevet værre den sidste time?", en: "Has it got worse in the last hour?", buttons: YES_NO },

  // fever
  { key: "temp", da: "Hvor høj er temperaturen?", en: "How high is the temperature?", when: a => a.what == "fever",
    buttons: [["Under 38", "Below 38", "u38"], ["38 til 39", "38 to 39", "38"], ["39 til 40", "39 to 40", "39"], ["Over 40", "Above 40", "40"]] },
  { key: "medicine", da: "Er der givet febernedsættende medicin inden for de sidste 4 timer?", en: "Has fever-reducing medicine been given in the last 4 hours?",
    when: a => a.what == "fever", buttons: YES_NO },
  { key: "breathing", da: "Trækker personen vejret hurtigere end normalt?", en: "Is the person breathing faster than normal?",
    when: a => a.what == "fever", buttons: YES_NO },
  { key: "drinking", da: "Drikker og tisser barnet som normalt?", en: "Is the child drinking and peeing as usual?",
    when: a => a.what == "fever" && a.who == "child", buttons: YES_NO },
  { key: "contact", da: "Er det nemt at få kontakt og øjenkontakt?", en: "Is it easy to get contact and eye contact?",
    when: a => a.what == "fever", buttons: YES_NO, red: ["no"] },
  { key: "rash", da: "Er der udslæt?", en: "Is there a rash?", when: a => a.what == "fever", buttons: YES_NO },
  { key: "glass", da: "Forsvinder udslættet, når du trykker et glas mod det?", en: "Does the rash fade when you press a glass against it?",
    when: a => a.what == "fever" && a.rash == "yes", buttons: YES_NO, red: ["no"] },

  // sore throat
  { key: "airway", da: "Er det svært at trække vejret?", en: "Is it hard to breathe?", when: a => a.what == "throat", buttons: YES_NO, red: ["yes"] },
  { key: "throatFever", da: "Er der feber over 38?", en: "Is there a fever above 38?", when: a => a.what == "throat", buttons: YES_NO },
  { key: "swallow", da: "Kan personen synke væske?", en: "Can the person swallow liquids?", when: a => a.what == "throat", buttons: YES_NO },
  { key: "mouth", da: "Kan personen åbne munden som normalt?", en: "Can the person open their mouth as usual?", when: a => a.what == "throat", buttons: YES_NO },
  { key: "tonsils", da: "Er der belægninger på mandlerne?", en: "Are there white patches on the tonsils?",
    when: a => a.what == "throat" && a.who == "adult", buttons: YES_NO },
  { key: "cough", da: "Er der hoste?", en: "Is there a cough?", when: a => a.what == "throat", buttons: YES_NO },

  // other
  { key: "sudden", da: "Er det kommet pludseligt?", en: "Did it come on suddenly?", when: a => a.what == "other", buttons: YES_NO },
  { key: "pain", da: "Er der smerter?", en: "Is there pain?", when: a => a.what == "other", buttons: YES_NO },
  { key: "painLevel", da: "Hvor stærke er smerterne, fra 1 til 10?", en: "How strong is the pain, from 1 to 10?",
    when: a => a.what == "other" && a.pain == "yes",
    buttons: [["1 til 3", "1 to 3", "low"], ["4 til 6", "4 to 6", "mid"], ["7 til 8", "7 to 8", "high"], ["9 til 10", "9 to 10", "top"]] },
  { key: "chest", da: "Er smerterne i brystet?", en: "Is the pain in the chest?", when: a => a.what == "other" && a.pain == "yes", buttons: YES_NO, red: ["yes"] },

  // last for everyone
  { key: "chronic", da: "Er der kronisk sygdom eller fast medicin?", en: "Any chronic illness or regular medication?", buttons: YES_NO }
];

// ---------- ADVICE CARDS ----------
// Danish texts are from akut.dk (Region Hovedstadens Akutberedskab): "Feber hos børn" 3 Jul 2026,
// "Feber" (adults) 7 Jul 2026, "Ondt i halsen hos børn" 3 Jul 2026, "Ondt i halsen" (adults) 17 Aug 2026.
// akut.dk has no English version (only a printable brochure), so the English cards are OUR translation.
// Order is ours: first what you can DO, then what to WATCH FOR. Cards are statements, never questions.
const DO = { da: "Det kan du gøre nu", en: "What you can do now" };
const WATCH = { da: "Vær opmærksom på", en: "Watch for" };
const ADVICE = {
  "fever-child": { title: { da: "Feber hos børn", en: "Fever in children" }, source: "akut.dk", cards: [
    [DO, "Sørg for, at dit barn får rigeligt at drikke.", "Make sure your child drinks plenty."],
    [DO, "Hold øje med, at du har god kontakt til dit barn.", "Keep checking that you have good contact with your child."],
    [DO, "Er barnet utilpas, må du gerne give paracetamol. Følg anvisningen på pakken.", "If the child is unwell, you may give paracetamol. Follow the instructions on the pack."],
    [DO, "Feber er kroppens egen reaktion. I langt de fleste tilfælde går den over af sig selv.", "Fever is the body's own reaction. In most cases it passes by itself."],
    [WATCH, "Hold øje med, om barnet drikker, og om det tisser som normalt.", "Watch whether the child is drinking and peeing as usual."],
    [WATCH, "Hold øje med, om barnet bliver slapt eller sløvt, og om du kan få øjenkontakt.", "Watch whether the child becomes limp or drowsy, and whether you can get eye contact."] ] },
  "fever-adult": { title: { da: "Feber hos voksne", en: "Fever in adults" }, source: "akut.dk", cards: [
    [DO, "Febernedsættende medicin kan lindre, fx paracetamol eller ibuprofen.", "Fever-reducing medicine can help, such as paracetamol or ibuprofen."],
    [DO, "Feber er ikke i sig selv grund til at kontakte en læge. Det afhænger af, hvordan du har det.", "Fever by itself is not a reason to contact a doctor. It depends on how you feel."],
    [DO, "De fleste sygdomme med feber er harmløse og går over af sig selv.", "Most illnesses with fever are harmless and pass by themselves."],
    [WATCH, "Mærk efter, om du får vejrtrækningsbesvær, bliver stiv i nakken eller udtalt sløv.", "Notice whether you get breathing difficulty, a stiff neck or marked drowsiness."],
    [WATCH, "Hold øje med små røde eller violette prikker, der ikke forsvinder, når du trykker et glas mod dem.", "Watch for small red or purple spots that do not fade when you press a glass against them."],
    [WATCH, "Hold øje med, om feberen holder sig over 40 grader, selvom du har taget febernedsættende medicin.", "Watch whether the fever stays above 40 degrees even after fever-reducing medicine."] ] },
  "throat-child": { title: { da: "Ondt i halsen hos børn", en: "Sore throat in children" }, source: "akut.dk", cards: [
    [DO, "Sørg for, at dit barn får rigeligt at drikke.", "Make sure your child drinks plenty."],
    [DO, "Giv mad og drikke, der er nemt at synke, fx lun te eller kold is.", "Give food and drink that is easy to swallow, such as warm tea or cold ice cream."],
    [DO, "Paracetamol kan lindre smerterne. Følg anvisningen på pakken.", "Paracetamol can ease the pain. Follow the instructions on the pack."],
    [DO, "De fleste halsbetændelser skyldes virus og går over af sig selv i løbet af 3 til 7 dage.", "Most throat infections are viral and pass by themselves within 3 to 7 days."],
    [WATCH, "Hold øje med, om barnet savler meget eller har svært ved at synke eller åbne munden.", "Watch whether the child drools a lot or has trouble swallowing or opening the mouth."],
    [WATCH, "Hold øje med, om barnet arbejder meget for at trække vejret.", "Watch whether the child is working hard to breathe."],
    [WATCH, "Hold øje med, om barnet drikker, og om det tisser som normalt.", "Watch whether the child is drinking and peeing as usual."] ] },
  "throat-adult": { title: { da: "Ondt i halsen", en: "Sore throat" }, source: "akut.dk", cards: [
    [DO, "Smertestillende håndkøbsmedicin, fx paracetamol, kan lindre.", "Over-the-counter painkillers such as paracetamol can help."],
    [DO, "Smertestillende mundhulespray fra apoteket kan også hjælpe.", "A pain-relieving throat spray from the pharmacy can also help."],
    [DO, "Kun 1 ud af 3 tilfælde af ondt i halsen skyldes bakterier. Forkølelsessymptomer peger på virus.", "Only 1 in 3 sore throats is bacterial. Cold symptoms point to a virus."],
    [WATCH, "Feber over 38, belægninger på mandlerne og ømme kirtler under kæben kan være tegn på halsbetændelse.", "Fever above 38, white patches on the tonsils and tender glands under the jaw can be signs of tonsillitis."],
    [WATCH, "Hold øje med, om du kan åbne munden normalt, som når du gaber højt.", "Watch whether you can open your mouth normally, as when you yawn."],
    [WATCH, "Hold øje med pludseligt hududslæt, og om smerterne varer ved efter 5 til 7 dage.", "Watch for a sudden rash, and whether the pain lasts beyond 5 to 7 days."] ] },
  "other": { title: { da: "Mens du venter", en: "While you wait" }, source: "1813", cards: [
    [{ da: "Mens du venter", en: "While you wait" }, "Har du en medicinliste, så hav den ved hånden.", "If you have a medication list, keep it at hand."],
    [{ da: "Mens du venter", en: "While you wait" }, "Sæt dig et roligt sted, hvor du kan tale frit.", "Sit somewhere quiet where you can talk freely."],
    [{ da: "Mens du venter", en: "While you wait" }, "Sygeplejersken vil spørge, hvornår det startede, og om det er blevet værre.", "The nurse will ask when it started and whether it has got worse."] ] }
};

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
let questionIndex = 0;
let asked = 0;                 // how many questions this person has answered (the counter on screen)
let profile = "fever-child";

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
  let q = currentQuestion();
  let top = insetTop + 40;
  noStroke();
  fill(inkSoft); textSize(13); textStyle(NORMAL);
  text(t("question") + " " + (asked + 1), width / 2, top + 20);

  fill(ink); textSize(24); textLeading(32);
  text(q[lang], width * 0.1, top + 50, width * 0.8, height * 0.22);

  let n = q.buttons.length, bh = 58, gap = 14;
  let startY = max(top + 50 + height * 0.22 + 20, height * 0.42);
  for (let i = 0; i < n; i++) {
    let b = q.buttons[i];
    button(width / 2, startY + i * (bh + gap), width * 0.76, bh, lang == "da" ? b[0] : b[1], b[2]);
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
  text(t("whileWaiting") + " " + ADVICE[profile].title[lang].toLowerCase() + ".", width * 0.12, height * 0.36, width * 0.76, height * 0.12);
  fill(amber); textStyle(BOLD); textSize(14);
  text(t("worse"), width / 2, height * 0.52);
  button(width / 2, height * 0.66, width * 0.7, 60, t("next"), "go-wait");
}


// ========== WAITING SCREEN ==========

function drawCard(breath) {
  let cards = ADVICE[profile].cards;
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
  let credit = ADVICE[profile].source + " · " + ADVICE[profile].title[lang];
  if (lang == "en" && ADVICE[profile].source == "akut.dk") credit += " · " + t("translated");
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

function button(cx, cy, w, h, label, value) {
  noStroke();
  fill(red(cardFill), green(cardFill), blue(cardFill), alpha(cardFill));
  rect(cx - w / 2, cy - h / 2, w, h, h / 2);
  fill(ink); textSize(18); textStyle(BOLD);
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
      state = "triage"; questionIndex = 0; asked = 0; answers = {};
      say(currentQuestion()[lang]);
    }
    else if (value.startsWith("cpr-") && cpr.length < 10) cpr += value.slice(4);
    return;
  }
  if (state == "triage") {
    let q = currentQuestion();
    answers[q.key] = value;
    asked += 1;
    if (q.red && q.red.includes(value)) { state = "red"; say(t("sayRed")); return; }
    let next = nextQuestion(questionIndex + 1);
    if (next == -1) {
      profile = chooseProfile();
      state = "queued";
      say(t("sayQueued")(queue, ADVICE[profile].title[lang].toLowerCase()));
    } else {
      questionIndex = next;
      say(currentQuestion()[lang]);
    }
    return;
  }
  if (state == "queued" && value == "go-wait") {
    state = "waiting";
    cardStart = millis(); cardIndex = 0; cardSpoken = -1;
    figureX = figurePosition(queue); figureTarget = figureX;
  }
}

function currentQuestion() { return QUESTIONS[questionIndex]; }

// the next question that fits the answers so far; -1 when there are no more
function nextQuestion(from) {
  for (let i = from; i < QUESTIONS.length; i++) {
    let q = QUESTIONS[i];
    if (!q.when || q.when(answers)) return i;
  }
  return -1;
}

function chooseProfile() {
  if (answers.what == "other") return "other";
  return answers.what + "-" + answers.who;
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
  state = "start"; queue = QUEUE_START; answers = {}; questionIndex = 0; asked = 0; cardIndex = 0; cardSpoken = -1; cpr = "";
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
  // iPhone Safari only allows speech that starts inside a tap: an empty utterance unlocks it
  if (window.speechSynthesis) {
    let u = new SpeechSynthesisUtterance("");
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
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  // iPhone drops an utterance that starts right after cancel(), so we wait a moment
  setTimeout(() => {
    let u = new SpeechSynthesisUtterance(text_);
    u.lang = (lang == "da") ? "da-DK" : "en-GB";
    u.rate = 0.95;
    let wanted = (lang == "da") ? "da" : "en";
    let match = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(wanted));
    if (match.length) u.voice = match[0];
    u.onstart = () => { speaking = true; };
    u.onend = () => { speaking = false; };
    u.onerror = () => { speaking = false; };
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

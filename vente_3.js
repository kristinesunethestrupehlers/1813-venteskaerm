// VENTESKÆRMEN, trin 3: hele forløbet med lyd
//   start  →  fiktiv triage (store knapper)  →  "du er i køen"  →  venteskærmen  →  "du er den næste"
//
// Lyd: rolig musik fra en fil (mappen lyd/) og telefonens egen danske stemme,
// der læser kortene og nummeret op. Musikken dæmpes, mens stemmen taler.
//
// Demo-knapper:  sol/måne i øverste højre hjørne skifter dag/nat (ikke en del af designet)
//                tryk på skærmen under ventetiden = køen rykker ét nummer
// Tastatur:      mellemrum = køen rykker   n = dag/nat   r = forfra   m = skift musik (piano / mindfulness / fra)

let tilstand = "start";        // "start", "triage", "roed", "udfald", "venter"
let nat = false;

// ---------- SVARENE FRA TRIAGEN ----------
let svar = {};                 // fx { hvem: "barn", hvad: "feber", temp: "39 til 40", ... }
let spoergsmaalNr = 0;
let profil = "feber-barn";

// Spørgsmålene. Hvert spørgsmål har en nøgle (hvor svaret gemmes), en tekst og knapper.
// "naar" bestemmer, om spørgsmålet skal stilles, ud fra de svar, der allerede er givet.
// "roed" er de svar, der sender direkte til "læg på og ring 112".
const SPOERGSMAAL = [
  { noegle: "hvem", tekst: "Hvem ringer du om?",
    knapper: [["Et barn", "barn"], ["En voksen", "voksen"]] },
  { noegle: "hvad", tekst: "Hvad drejer det sig om?",
    knapper: [["Feber", "feber"], ["Ondt i halsen", "hals"], ["Noget andet", "andet"]] },

  // feber
  { noegle: "temp", tekst: "Hvor høj er temperaturen?",
    naar: s => s.hvad == "feber",
    knapper: [["Under 38", "u38"], ["38 til 39", "38"], ["39 til 40", "39"], ["Over 40", "40"]] },
  { noegle: "dage", tekst: "Har feberen varet i mere end 3 dage?",
    naar: s => s.hvad == "feber",
    knapper: [["Ja", "ja"], ["Nej", "nej"]] },
  { noegle: "drikker", tekst: "Drikker og tisser barnet som normalt?",
    naar: s => s.hvad == "feber" && s.hvem == "barn",
    knapper: [["Ja", "ja"], ["Nej", "nej"]] },
  { noegle: "prikker", tekst: "Er der prikker i huden, der ikke forsvinder, når du trykker et glas mod dem?",
    naar: s => s.hvad == "feber",
    knapper: [["Ja", "ja"], ["Nej", "nej"]], roed: ["ja"] },

  // ondt i halsen
  { noegle: "vejr", tekst: "Er det svært at trække vejret?",
    naar: s => s.hvad == "hals",
    knapper: [["Ja", "ja"], ["Nej", "nej"]], roed: ["ja"] },
  { noegle: "dage", tekst: "Har det varet i mere end 3 dage?",
    naar: s => s.hvad == "hals",
    knapper: [["Ja", "ja"], ["Nej", "nej"]] },
  { noegle: "synke", tekst: "Kan barnet synke og åbne munden som normalt?",
    naar: s => s.hvad == "hals" && s.hvem == "barn",
    knapper: [["Ja", "ja"], ["Nej", "nej"]] },

  // noget andet
  { noegle: "pludselig", tekst: "Er det kommet pludseligt?",
    naar: s => s.hvad == "andet",
    knapper: [["Ja", "ja"], ["Nej", "nej"]] }
];

// ---------- RÅDENE ----------
// Fra akut.dk (Region Hovedstadens Akutberedskab): "Feber hos børn" 3/7 2026, "Feber" (voksne) 7/7 2026,
// "Ondt i halsen hos børn" 3/7 2026, "Ondt i halsen" (voksne) 17/8 2026.
// Rækkefølgen er vores: først det, man kan GØRE, så det, man skal VÆRE OPMÆRKSOM PÅ.
// Kortene er udsagn, aldrig spørgsmål (spørgsmål hører til triagen, og borgeren kan ikke svare her).
const RAAD = {
  "feber-barn": { titel: "Feber hos børn", kilde: "akut.dk", kort: [
    ["Det kan du gøre nu", "Sørg for, at dit barn får rigeligt at drikke."],
    ["Det kan du gøre nu", "Hold øje med, at du har god kontakt til dit barn."],
    ["Det kan du gøre nu", "Er barnet utilpas, må du gerne give paracetamol. Følg anvisningen på pakken."],
    ["Det kan du gøre nu", "Feber er kroppens egen reaktion. I langt de fleste tilfælde går den over af sig selv."],
    ["Vær opmærksom på", "Hold øje med, om barnet drikker, og om det tisser som normalt."],
    ["Vær opmærksom på", "Hold øje med, om barnet bliver slapt eller sløvt, og om du kan få øjenkontakt."] ] },
  "feber-voksen": { titel: "Feber hos voksne", kilde: "akut.dk", kort: [
    ["Det kan du gøre nu", "Febernedsættende medicin kan lindre, fx paracetamol eller ibuprofen."],
    ["Det kan du gøre nu", "Feber er ikke i sig selv grund til at kontakte en læge. Det afhænger af, hvordan du har det."],
    ["Det kan du gøre nu", "De fleste sygdomme med feber er harmløse og går over af sig selv."],
    ["Vær opmærksom på", "Mærk efter, om du får vejrtrækningsbesvær, bliver stiv i nakken eller udtalt sløv."],
    ["Vær opmærksom på", "Hold øje med små røde eller violette prikker, der ikke forsvinder, når du trykker et glas mod dem."],
    ["Vær opmærksom på", "Hold øje med, om feberen holder sig over 40 grader, selvom du har taget febernedsættende medicin."] ] },
  "hals-barn": { titel: "Ondt i halsen hos børn", kilde: "akut.dk", kort: [
    ["Det kan du gøre nu", "Sørg for, at dit barn får rigeligt at drikke."],
    ["Det kan du gøre nu", "Giv mad og drikke, der er nemt at synke, fx lun te eller kold is."],
    ["Det kan du gøre nu", "Paracetamol kan lindre smerterne. Følg anvisningen på pakken."],
    ["Det kan du gøre nu", "De fleste halsbetændelser skyldes virus og går over af sig selv i løbet af 3 til 7 dage."],
    ["Vær opmærksom på", "Hold øje med, om barnet savler meget eller har svært ved at synke eller åbne munden."],
    ["Vær opmærksom på", "Hold øje med, om barnet arbejder meget for at trække vejret."],
    ["Vær opmærksom på", "Hold øje med, om barnet drikker, og om det tisser som normalt."] ] },
  "hals-voksen": { titel: "Ondt i halsen", kilde: "akut.dk", kort: [
    ["Det kan du gøre nu", "Smertestillende håndkøbsmedicin, fx paracetamol, kan lindre."],
    ["Det kan du gøre nu", "Smertestillende mundhulespray fra apoteket kan også hjælpe."],
    ["Det kan du gøre nu", "Kun 1 ud af 3 tilfælde af ondt i halsen skyldes bakterier. Forkølelsessymptomer peger på virus."],
    ["Vær opmærksom på", "Feber over 38, belægninger på mandlerne og ømme kirtler under kæben kan være tegn på halsbetændelse."],
    ["Vær opmærksom på", "Hold øje med, om du kan åbne munden normalt, som når du gaber højt."],
    ["Vær opmærksom på", "Hold øje med pludseligt hududslæt, og om smerterne varer ved efter 5 til 7 dage."] ] },
  "andet": { titel: "Mens du venter", kilde: "1813", kort: [
    ["Mens du venter", "Find sundhedskortet frem, så det er klar, når sygeplejersken ringer."],
    ["Mens du venter", "Har du en medicinliste, så hav den ved hånden."],
    ["Mens du venter", "Sæt dig et roligt sted, hvor du kan tale frit."],
    ["Mens du venter", "Sygeplejersken vil spørge, hvornår det startede, og om det er blevet værre."] ] }
};

// ---------- KØEN ----------
let koe = 7;
let koeStart = 7;
const MIN_PR_NUMMER = 2;

// ---------- KORTENE ----------
const KORT_TID = 40000;
const FADE = 2500;
let kortStart = 0;
let kortNr = 0;
let kortLaestOp = -1;          // hvilket kort stemmen sidst læste op

// ---------- FIGUREN ----------
let figurX = 0, figurMaal = 0, skridt = 0;

// ---------- SKYER OG HIMMEL ----------
let skyer = [];
const HIMMEL_DAG = [
  [ [255, 196, 140], [255, 160, 130], [250, 120, 120], [255, 215, 120] ],
  [ [150, 200, 240], [255, 190, 150], [255, 140, 110], [255, 230, 150] ] ];
const HIMMEL_NAT = [
  [ [ 60,  40, 110], [150,  70, 120], [230, 100,  90], [255, 170,  80] ],
  [ [ 35,  30,  80], [110,  60, 110], [200,  90,  90], [240, 150,  90] ] ];
let tekst, tekstSvag, linje, gul, kortFyld, kortKant;

// ---------- LYD ----------
// Musikken er to filer fra Pixabay (Pixabay Content License, fri brug, skal nævnes i artiklen):
//   "Golden Sunset Piano Music" af clavier-music (pixabay.com, id 200136)
//   "Radiant Mindfulness" af BreakzStudios (pixabay.com, id 165866)
const MUSIK = { piano: "lyd/golden-sunset-piano.mp3", mindfulness: "lyd/radiant-mindfulness.mp3" };
let musikValg = "piano";       // "piano", "mindfulness" eller "fra"   (tast m skifter)
let musikFiler = {};
let lydStartet = false;
const MUSIK_STYRKE = 0.45;     // musikkens lydstyrke, når der ikke tales
let duk = 1;                   // 1 = fuld musik, 0.25 = dæmpet mens stemmen taler
let taler = false;

// ---------- KNAPPER ----------
let knapper = [];              // de knapper, der er på skærmen lige nu: {x, y, w, h, vaerdi}
let sidsteTryk = 0;


function preload() {
  musikFiler.piano = loadSound(MUSIK.piano);
  musikFiler.mindfulness = loadSound(MUSIK.mindfulness);
}


function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  textFont("Helvetica");

  let h = hour();
  nat = (h >= 20 || h < 6);
  saetFarver();

  for (let i = 0; i < 5; i++) {
    skyer.push({ x: random(width), y: random(height * 0.08, height * 0.75),
                 w: random(120, 260), h: random(40, 80), fart: random(0.05, 0.15), fase: random(100) });
  }

}


function draw() {
  let aande = (sin(frameCount * 0.013) + 1) / 2;
  knapper = [];

  tegnHimmel(aande);
  tegnSkyer();

  if (tilstand == "start")       tegnStart();
  else if (tilstand == "triage") tegnTriage();
  else if (tilstand == "roed")   tegnRoed();
  else if (tilstand == "udfald") tegnUdfald();
  else if (tilstand == "venter") { tegnKort(aande); tegnFigur(); tegnBund(); }

  if (tilstand != "roed") tegnSolMaane();   // demo-knappen dag/nat, på alle skærme undtagen den røde

  opdaterMusik(aande);
}


// ========== SKÆRMENE ==========

function tegnStart() {
  noStroke();
  fill(tekst);
  textStyle(BOLD);
  textSize(44);
  text("1813", width / 2, height * 0.30);
  textStyle(NORMAL);
  textSize(16);
  fill(tekstSvag);
  text("Akuttelefonen", width / 2, height * 0.30 + 36);

  textSize(15);
  textLeading(22);
  text("Vi stiller dig et par spørgsmål, så du får de råd, der passer til dig.", width * 0.15, height * 0.42, width * 0.7, height * 0.12);

  knap(width / 2, height * 0.62, width * 0.7, 60, "Start", "start");

  textSize(12);
  fill(tekstSvag);
  text("Prototype · ikke Region Hovedstadens app", width / 2, height - 40);
}

function tegnTriage() {
  let q = aktueltSpoergsmaal();
  noStroke();
  fill(tekstSvag);
  textSize(13);
  textStyle(NORMAL);
  text("SPØRGSMÅL " + (spoergsmaalNr + 1), width / 2, height * 0.14);

  fill(tekst);
  textSize(24);
  textLeading(32);
  text(q.tekst, width * 0.1, height * 0.18, width * 0.8, height * 0.22);

  let n = q.knapper.length;
  let kh = 58, mellemrum = 14;
  let startY = height * 0.46;
  for (let i = 0; i < n; i++) {
    knap(width / 2, startY + i * (kh + mellemrum), width * 0.76, kh, q.knapper[i][0], q.knapper[i][1]);
  }
}

function tegnRoed() {
  noStroke();
  fill(216, 54, 60);
  rect(0, 0, width, height);
  fill(255);
  textStyle(BOLD);
  textSize(34);
  textLeading(42);
  text("Læg på, og ring 112 nu", width * 0.1, height * 0.30, width * 0.8, height * 0.2);
  textStyle(NORMAL);
  textSize(14);
  text("Tryk for at starte forfra", width / 2, height - 60);
  knapper.push({ x: 0, y: 0, w: width, h: height, vaerdi: "forfra" });
}

function tegnUdfald() {
  noStroke();
  fill(tekstSvag);
  textSize(13);
  text("DU ER I KØEN", width / 2, height * 0.22);
  fill(tekst);
  textStyle(BOLD);
  textSize(40);
  text("Nr. " + koe, width / 2, height * 0.30);
  textStyle(NORMAL);
  textSize(16);
  textLeading(24);
  text("Mens du venter, får du råd om " + RAAD[profil].titel.toLowerCase() + ".", width * 0.12, height * 0.36, width * 0.76, height * 0.12);
  fill(gul);
  textStyle(BOLD);
  textSize(14);
  text("Bliver det værre: læg på og ring 112", width / 2, height * 0.52);
  knap(width / 2, height * 0.66, width * 0.7, 60, "Videre", "videre");
}


// ========== VENTESKÆRMEN ==========

function tegnKort(aande) {
  let liste = RAAD[profil].kort;
  let tid = millis() - kortStart;

  if (koe <= 1) {
    // den næste: kortet toner ud og kommer ikke igen
    if (tid < FADE) { /* lad det tone ud herunder */ } else return;
  } else if (tid > KORT_TID) {
    kortNr = (kortNr + 1) % liste.length;
    kortStart = millis();
    tid = 0;
  }

  let alfa = 255;
  if (koe <= 1) alfa = map(tid, 0, FADE, 255, 0);
  else {
    if (tid < FADE) alfa = map(tid, 0, FADE, 0, 255);
    if (tid > KORT_TID - FADE) alfa = map(tid, KORT_TID - FADE, KORT_TID, 255, 0);
  }

  // stemmen læser kortet op, når det er tonet ind
  if (koe > 1 && kortLaestOp != kortNr && tid > FADE * 0.6) {
    kortLaestOp = kortNr;
    sig(liste[kortNr][1]);
  }

  let skala = 0.98 + 0.04 * aande;
  let w = width * 0.82, hKort = height * 0.36;
  push();
  translate(width / 2, height * 0.40);
  scale(skala);
  noStroke();
  fill(red(kortFyld), green(kortFyld), blue(kortFyld), alpha(kortFyld) * alfa / 255);
  rect(-w / 2, -hKort / 2, w, hKort, 28);
  noFill();
  stroke(red(kortKant), green(kortKant), blue(kortKant), alpha(kortKant) * alfa / 255);
  strokeWeight(1);
  rect(-w / 2, -hKort / 2, w, hKort, 28);
  noStroke();

  let k = liste[kortNr];
  fill(red(tekstSvag), green(tekstSvag), blue(tekstSvag), alfa);
  textSize(13); textStyle(NORMAL);
  text(k[0].toUpperCase(), 0, -hKort / 2 + 32);
  fill(red(tekst), green(tekst), blue(tekst), alfa);
  textSize(22); textLeading(30);
  text(k[1], -w / 2 + 28, -hKort / 2 + 56, w - 56, hKort - 100);
  fill(red(tekstSvag), green(tekstSvag), blue(tekstSvag), alfa * 0.8);
  textSize(12);
  text(RAAD[profil].kilde + " · " + RAAD[profil].titel, 0, hKort / 2 - 24);
  pop();
}

function tegnHimmel(aande) {
  let t = (sin(millis() * 0.000017) + 1) / 2;
  let pal = nat ? HIMMEL_NAT : HIMMEL_DAG;
  let grad = drawingContext.createLinearGradient(0, 0, 0, height);
  let stop = [0, 0.4, 0.7, 1.0];
  for (let i = 0; i < 4; i++) {
    let a = pal[0][i], b = pal[1][i];
    grad.addColorStop(stop[i], "rgb(" + round(lerp(a[0], b[0], t)) + "," + round(lerp(a[1], b[1], t)) + "," + round(lerp(a[2], b[2], t)) + ")");
  }
  drawingContext.fillStyle = grad;
  noStroke();
  rect(0, 0, width, height);

  // solen står lidt højere, jo tættere man er på at være den næste
  let hoejde = map(koe, koeStart, 1, 0.62, 0.50, true);
  let sx = width / 2, sy = height * hoejde - aande * 10, r = width * 0.42;
  let sol = drawingContext.createRadialGradient(sx, sy, 0, sx, sy, r);
  if (nat) { sol.addColorStop(0, "rgba(255,200,120,0.9)"); sol.addColorStop(0.35, "rgba(255,150,90,0.5)"); sol.addColorStop(1, "rgba(255,120,90,0)"); }
  else     { sol.addColorStop(0, "rgba(255,250,210,0.95)"); sol.addColorStop(0.35, "rgba(255,220,150,0.55)"); sol.addColorStop(1, "rgba(255,200,140,0)"); }
  drawingContext.fillStyle = sol;
  rect(0, 0, width, height);
}

function tegnSkyer() {
  noStroke();
  for (let s of skyer) {
    s.x += s.fart;
    if (s.x - s.w > width) s.x = -s.w;
    let bob = sin(frameCount * 0.004 + s.fase) * 6;
    fill(255, 255, 255, nat ? 40 : 110);
    ellipse(s.x, s.y + bob, s.w, s.h);
    ellipse(s.x - s.w * 0.25, s.y + bob + s.h * 0.15, s.w * 0.55, s.h * 0.7);
    ellipse(s.x + s.w * 0.25, s.y + bob + s.h * 0.1, s.w * 0.6, s.h * 0.8);
  }
}

function figurPosition(n) {
  return map(n, koeStart, 1, 50, width - 90, true);
}

function tegnFigur() {
  let y = height - 150;
  stroke(linje); strokeWeight(2);
  line(30, y + 24, width - 30, y + 24);

  noStroke(); fill(46, 158, 91);
  circle(width - 50, y, 30);
  fill(255); circle(width - 56, y - 4, 3); circle(width - 44, y - 4, 3);
  noFill(); stroke(255); strokeWeight(2);
  arc(width - 50, y + 2, 12, 8, 0, PI);

  let gaar = abs(figurMaal - figurX) > 0.5;
  if (gaar) { figurX = lerp(figurX, figurMaal, 0.02); skridt += 0.18; }
  else skridt += 0.03;
  let sving = sin(skridt) * (gaar ? 9 : 2);

  stroke(tekst); strokeWeight(2.5);
  line(figurX, y - 6, figurX, y + 10);
  line(figurX, y + 10, figurX - sving * 0.6, y + 24);
  line(figurX, y + 10, figurX + sving * 0.6, y + 24);
  line(figurX, y - 2, figurX + sving * 0.4, y + 6);
  line(figurX, y - 2, figurX - sving * 0.4, y + 6);
  noStroke(); fill(tekst);
  circle(figurX, y - 14, 13);
}

function tegnBund() {
  let y = height - 96;
  noStroke();
  fill(tekst); textSize(18); textStyle(BOLD);
  if (koe <= 1) text("Du er den næste", width / 2, y);
  else          text("Du er nr. " + koe, width / 2, y);

  fill(tekstSvag); textSize(13); textStyle(NORMAL);
  if (koe <= 1) text("Sygeplejersken tager telefonen om lidt", width / 2, y + 26);
  else          text("Ca. " + (koe * MIN_PR_NUMMER) + " minutter endnu", width / 2, y + 26);

  fill(gul); textSize(13); textStyle(BOLD);
  text("Bliver det værre: læg på og ring 112", width / 2, y + 56);
}

// demo-knappen: sol eller måne i hjørnet
function tegnSolMaane() {
  let x = width - 34, y = 44;
  noStroke();
  fill(255, 255, 255, nat ? 60 : 140);
  circle(x, y, 36);
  if (nat) { fill(255, 240, 200); circle(x + 2, y, 16); fill(red(bgKant()), green(bgKant()), blue(bgKant())); circle(x + 7, y - 3, 12); }
  else     { fill(255, 210, 90); circle(x, y, 16); }
  knapper.push({ x: x - 24, y: y - 24, w: 48, h: 48, vaerdi: "solmaane" });
}
function bgKant() { return nat ? color(60, 40, 110) : color(255, 196, 140); }


// ========== KNAPPER OG TRYK ==========

function knap(cx, cy, w, h, label, vaerdi) {
  noStroke();
  fill(red(kortFyld), green(kortFyld), blue(kortFyld), alpha(kortFyld));
  rect(cx - w / 2, cy - h / 2, w, h, h / 2);
  fill(tekst);
  textSize(18); textStyle(BOLD);
  text(label, cx, cy);
  knapper.push({ x: cx - w / 2, y: cy - h / 2, w: w, h: h, vaerdi: vaerdi });
}

function tryk(mx, my) {
  if (millis() - sidsteTryk < 300) return;   // ét tryk, ikke to (touch + mus)
  sidsteTryk = millis();
  startLyd();

  for (let k of knapper) {
    if (mx >= k.x && mx <= k.x + k.w && my >= k.y && my <= k.y + k.h) { haandter(k.vaerdi); return; }
  }
  // tryk uden for knapperne: under ventetiden rykker køen (demo)
  if (tilstand == "venter") koenRykker();
}

function haandter(vaerdi) {
  if (vaerdi == "solmaane") { nat = !nat; saetFarver(); return; }
  if (vaerdi == "forfra")   { forfra(); return; }

  if (tilstand == "start" && vaerdi == "start") {
    tilstand = "triage"; spoergsmaalNr = 0; svar = {};
    sig(aktueltSpoergsmaal().tekst);
    return;
  }
  if (tilstand == "triage") {
    let q = aktueltSpoergsmaal();
    svar[q.noegle] = vaerdi;
    if (q.roed && q.roed.includes(vaerdi)) { tilstand = "roed"; sig("Læg på, og ring 1 1 2 nu."); return; }
    let naeste = naesteSpoergsmaal(spoergsmaalNr + 1);
    if (naeste == -1) {
      profil = vaelgProfil();
      tilstand = "udfald";
      sig("Du er i køen som nummer " + koe + ". Mens du venter, får du råd om " + RAAD[profil].titel.toLowerCase() + ". Bliver det værre, så læg på og ring 1 1 2.");
    } else {
      spoergsmaalNr = naeste;
      sig(aktueltSpoergsmaal().tekst);
    }
    return;
  }
  if (tilstand == "udfald" && vaerdi == "videre") {
    tilstand = "venter";
    kortStart = millis(); kortNr = 0; kortLaestOp = -1;
    figurX = figurPosition(koe); figurMaal = figurX;
  }
}

function aktueltSpoergsmaal() { return SPOERGSMAAL[spoergsmaalNr]; }

// finder det næste spørgsmål, der passer til svarene; -1 hvis der ikke er flere
function naesteSpoergsmaal(fra) {
  for (let i = fra; i < SPOERGSMAAL.length; i++) {
    let q = SPOERGSMAAL[i];
    if (!q.naar || q.naar(svar)) return i;
  }
  return -1;
}

function vaelgProfil() {
  if (svar.hvad == "andet") return "andet";
  return svar.hvad + "-" + svar.hvem;
}

function koenRykker() {
  if (koe > 1) {
    koe -= 1;
    figurMaal = figurPosition(koe);
    if (koe == 1) { kortStart = millis(); sig("Du er den næste."); }
    else sig("Du er nu nummer " + koe + ".");
  } else {
    forfra();   // demo: tryk igen, når man er den næste, så starter det forfra
  }
}

function forfra() {
  tilstand = "start"; koe = koeStart; svar = {}; spoergsmaalNr = 0; kortNr = 0; kortLaestOp = -1;
  if (window.speechSynthesis) speechSynthesis.cancel();
}

function mousePressed()  { tryk(mouseX, mouseY); }
function touchStarted()  { tryk(mouseX, mouseY); return false; }

function keyPressed() {
  if (key === " ") { if (tilstand == "venter") koenRykker(); }
  if (key === "n") { nat = !nat; saetFarver(); }
  if (key === "r") forfra();
  if (key === "m") musikValg = (musikValg == "piano") ? "mindfulness" : (musikValg == "mindfulness") ? "fra" : "piano";
}


// ========== LYD ==========

function startLyd() {
  if (lydStartet) return;
  userStartAudio();
  for (let navn in musikFiler) {        // begge filer kører i ring hele tiden, kun styrken ændres
    musikFiler[navn].setVolume(0);
    musikFiler[navn].loop();
  }
  lydStartet = true;
}

// musikken: stille under triagen, fuld under ventetiden, dæmpet mens stemmen taler,
// og toner ned, når man er den næste
function opdaterMusik(aande) {
  if (!lydStartet) return;
  let niveau = (tilstand == "venter") ? 1 : 0.35;
  if (tilstand == "venter" && koe <= 1) niveau = 0.3;
  let maal = taler ? 0.25 : 1;
  duk = lerp(duk, maal, 0.05);
  for (let navn in musikFiler) {
    let styrke = (navn == musikValg) ? MUSIK_STYRKE * niveau * duk : 0;
    musikFiler[navn].setVolume(styrke, 0.15);
  }
}

// telefonens egen danske stemme
function sig(tekst) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  let u = new SpeechSynthesisUtterance(tekst);
  u.lang = "da-DK";
  u.rate = 0.95;
  u.pitch = 1;
  let stemmer = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith("da"));
  if (stemmer.length) u.voice = stemmer[0];
  u.onstart = () => { taler = true; };
  u.onend = () => { taler = false; };
  u.onerror = () => { taler = false; };
  speechSynthesis.speak(u);
}


// ========== FARVER ==========

function saetFarver() {
  if (nat) {
    kortFyld = color(30, 20, 50, 150); kortKant = color(255, 200, 150, 90);
    tekst = color(255, 240, 225); tekstSvag = color(240, 200, 180);
    linje = color(255, 200, 150, 120); gul = color(255, 215, 90);
  } else {
    kortFyld = color(255, 255, 255, 190); kortKant = color(255, 255, 255, 220);
    tekst = color(70, 40, 40); tekstSvag = color(150, 100, 90);
    linje = color(255, 255, 255, 170); gul = color(140, 60, 20);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  figurX = figurPosition(koe); figurMaal = figurX;
}

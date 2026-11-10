// CONTENT FROM AKUT.DK (Region Hovedstadens Akutberedskab), fetched 9 Nov 2026.
// The structure is akut.dk's own: three age groups, their themes, and the sub-themes under each theme.
// For every page we have read, there are:
//   questions: 2 to 4 yes/no questions taken from the page's "ring 112 hvis" (-> red) and "ring læge hvis" lists
//   cards:     the page's "gode råd" (what you can DO) and "ring læge hvis" rewritten as things to WATCH FOR
// Cards are statements, never questions. "Wait a few hours and see" is left out on purpose (group decision 9 Nov).
// akut.dk exists only in Danish, so every English text here is OUR translation.
// Pages we have not read yet have no cards; the app then shows the general "while you wait" cards.

const YES_NO = [["Ja", "Yes", "yes"], ["Nej", "No", "no"]];
const DO = { da: "Det kan du gøre nu", en: "What you can do now" };
const WATCH = { da: "Vær opmærksom på", en: "Watch for" };

// ---------- AGE GROUPS, THEMES AND SUB-THEMES (akut.dk's menus) ----------
// sub: [label da, label en, page key or null]
const THEMES = {
  infant: [
    { da: "Mave og tarm", en: "Stomach and bowel", sub: [["Gylp og opkast", "Spitting up and vomiting", "infant-stomach"], ["Diarré", "Diarrhoea", "infant-stomach"], ["Forstoppelse", "Constipation", "infant-stomach"], ["Dehydrering", "Dehydration", "infant-stomach"]] },
    { da: "Sløvhed", en: "Drowsiness", sub: [["Sløvhed og slaphed", "Drowsy and limp", "infant-drowsy"], ["Nedsat appetit", "Reduced appetite", "infant-drowsy"]] },
    { da: "Feber og infektion", en: "Fever and infection", sub: [["Feber over 38 grader", "Fever above 38 degrees", "infant-fever"]] },
    { da: "Påvirket vejrtrækning", en: "Affected breathing", sub: [["Besværet vejrtrækning", "Laboured breathing", "infant-breathing"], ["Tilstoppet næse", "Blocked nose", "infant-breathing"], ["Ændret hudfarve", "Changed skin colour", "infant-breathing"]] },
    { da: "Smerter", en: "Pain", sub: [["Smerter og gråd", "Pain and crying", "infant-pain"], ["Spiseproblemer", "Feeding problems", "infant-pain"]] },
    { da: "Ansigt, øjne og mundhule", en: "Face, eyes and mouth", sub: [["Øjenbetændelse", "Eye infection", "infant-face"], ["Trøske", "Thrush", "infant-face"], ["Tilstoppet næse", "Blocked nose", "infant-face"]] },
    { da: "Hud", en: "Skin", sub: [["Gulsot", "Jaundice", "infant-skin"], ["Udslæt", "Rash", "infant-skin"], ["Hudforandringer", "Skin changes", "infant-skin"]] },
    { da: "Urinveje og kønsorganer", en: "Urinary tract and genitals", sub: [["Bleudslæt", "Nappy rash", "infant-urinary"], ["Hævelse", "Swelling", "infant-urinary"]] },
    { da: "Nybagte mødre", en: "New mothers", sub: [["Tristhed", "Sadness", "infant-mother"], ["Depression", "Depression", "infant-mother"], ["Efterfødselsreaktion", "Postnatal reaction", "infant-mother"]] },
    { da: "Skade", en: "Injury", sub: [["Slået hovedet", "Head injury", "injury-head"], ["Fald, vrid og slag", "Falls, sprains and blows", "injury-fall"], ["Sår og flænger", "Cuts and wounds", "injury-wound"], ["Fremmedlegemer", "Foreign objects", "injury-foreign"], ["Forbrænding", "Burns", "injury-burn"], ["Bid fra flåter, hugorme og dyr", "Bites from ticks, adders and animals", null], ["Tandskade", "Dental injury", "injury-tooth"], ["Forgiftning (Giftlinjen)", "Poisoning (Poison line)", "injury-poison"], ["Seksuelle overgreb", "Sexual assault", "direct"]] },
    { da: "Psykisk hjælp", en: "Mental health help", direct: true, sub: [["Akut psykiatrisk hjælp", "Acute psychiatric help", "direct"]] }
  ],
  child: [
    { da: "Feber", en: "Fever", sub: [["Feber", "Fever", "child-fever"], ["Forkølelse", "Common cold", "child-fever"], ["Virus", "Virus", "child-fever"]] },
    { da: "Ondt i halsen", en: "Sore throat", sub: [["Halsbetændelse", "Throat infection", "child-throat"], ["Hævede og ømme kirtler på halsen", "Swollen, tender glands in the neck", "child-throat"]] },
    { da: "Ondt i maven", en: "Stomach ache", sub: [["Mavesmerter", "Stomach pain", "child-stomach"], ["Forstoppelse", "Constipation", "child-stomach"], ["Maveinfektion", "Stomach infection", "child-stomach"]] },
    { da: "Ondt i øret", en: "Earache", sub: [["Mellemørebetændelse", "Middle ear infection", "child-ear"], ["Hul på trommehinden", "Burst eardrum", "child-ear"]] },
    { da: "Udslæt", en: "Rash", sub: [["Udslæt", "Rash", "child-rash"], ["Huden er varm, hævet og øm", "Skin is warm, swollen and tender", "child-rash"], ["Røde prikker", "Red spots", "child-rash"]] },
    { da: "Vejrtrækningsbesvær", en: "Breathing difficulty", sub: [["Tung vejrtrækning", "Heavy breathing", "child-breathing"], ["Infektion i luftvejene", "Airway infection", "child-breathing"]] },
    { da: "Opkast og diarré", en: "Vomiting and diarrhoea", sub: [["Opkast", "Vomiting", "child-vomiting"], ["Diarré", "Diarrhoea", "child-vomiting"], ["Dehydrering", "Dehydration", "child-vomiting"]] },
    { da: "Røde øjne", en: "Red eyes", sub: [["Øjenbetændelse", "Eye infection", "child-eyes"], ["Pus i øjnene", "Pus in the eyes", "child-eyes"], ["Pollenallergi", "Pollen allergy", "child-eyes"]] },
    { da: "Skade", en: "Injury", sub: [["Slået hovedet", "Head injury", "injury-head"], ["Fald, vrid og slag", "Falls, sprains and blows", "injury-fall"], ["Sår og flænger", "Cuts and wounds", "injury-wound"], ["Fremmedlegemer", "Foreign objects", "injury-foreign"], ["Forbrænding", "Burns", "injury-burn"], ["Bid fra flåter, hugorme og dyr", "Bites from ticks, adders and animals", null], ["Tandskade", "Dental injury", "injury-tooth"], ["Forgiftning (Giftlinjen)", "Poisoning (Poison line)", "injury-poison"], ["Seksuelle overgreb", "Sexual assault", "direct"]] },
    { da: "Psykisk hjælp", en: "Mental health help", direct: true, sub: [["Akut psykiatrisk hjælp", "Acute psychiatric help", "direct"]] }
  ],
  adult: [
    { da: "Feber", en: "Fever", sub: [["Feber", "Fever", "adult-fever"], ["Forkølelse og virusinfektion", "Cold and viral infection", "adult-fever"]] },
    { da: "Hovedet", en: "Head", sub: [["Hovedpine", "Headache", "adult-headache"], ["Svimmelhed", "Dizziness", "adult-dizzy"], ["Næseblod", "Nosebleed", "adult-nosebleed"], ["Tandpine", "Toothache", "adult-toothache"]] },
    { da: "Hals og luftveje", en: "Throat and airways", sub: [["Hoste", "Cough", "adult-cough"], ["Ondt i halsen", "Sore throat", "adult-throat"], ["Forkølelse", "Common cold", "adult-cold"], ["Bihulebetændelse", "Sinusitis", "adult-cold"], ["Influenza", "Flu", "adult-flu"], ["Astma", "Asthma", "adult-asthma"]] },
    { da: "Bryst og øvre ryg", en: "Chest and upper back", sub: [["Hoste og åndedrætsbesvær", "Cough and breathing difficulty", "adult-cough"], ["Smerter og ubehag", "Pain and discomfort", "adult-chest"], ["Hjertebanken", "Palpitations", "adult-palpitations"], ["Højt blodtryk", "High blood pressure", "adult-bloodpressure"]] },
    { da: "Mave og urinveje", en: "Stomach and urinary tract", sub: [["Diarré og opkast", "Diarrhoea and vomiting", "adult-vomiting"], ["Mavesmerter", "Stomach pain", "adult-stomach"], ["Blærebetændelse", "Cystitis", "adult-urinary"], ["Forstoppelse", "Constipation", "adult-constipation"], ["Brok", "Hernia", null], ["Testikelbetændelse", "Testicle inflammation", null]] },
    { da: "Huden", en: "Skin", sub: [["Bylder", "Boils", "adult-boils"], ["Pludseligt opståede sår", "Sudden sores", "adult-sores"], ["Udslæt og prikker", "Rash and spots", "adult-rash"]] },
    { da: "Pludselige smerter", en: "Sudden pain", sub: [["Nakke", "Neck", "adult-pain-neck"], ["Lænd", "Lower back", "adult-pain-back"], ["Arme og hænder", "Arms and hands", "adult-pain-arms"], ["Ben og fødder", "Legs and feet", "adult-pain-legs"]] },
    { da: "Ører og øjne", en: "Ears and eyes", sub: [["Ondt i øret", "Earache", "adult-ear"], ["Rødt øje", "Red eye", "adult-eye"], ["Bygkorn", "Stye", "adult-stye"]] },
    { da: "Graviditet og gynækologi", en: "Pregnancy and gynaecology", sub: [["Unormale blødninger", "Abnormal bleeding", "adult-bleeding"], ["Brystbetændelse", "Mastitis", "adult-mastitis"], ["Efterfødselsgener", "After the birth", "adult-postnatal"], ["Graviditet og blødning", "Pregnancy and bleeding", "adult-pregnancy-bleeding"], ["Graviditetssmerter og hovedpine", "Pregnancy pain and headache", "adult-pregnancy-pain"], ["Smerter i underlivet", "Pelvic pain", "adult-pelvic"], ["Spontan abort", "Miscarriage", "adult-miscarriage"]] },
    { da: "Skade", en: "Injury", sub: [["Slået hovedet", "Head injury", "injury-head"], ["Fald, vrid og slag", "Falls, sprains and blows", "injury-fall"], ["Sår og flænger", "Cuts and wounds", "injury-wound"], ["Fremmedlegemer", "Foreign objects", "injury-foreign"], ["Forbrænding", "Burns", "injury-burn"], ["Bid fra flåter, hugorme og dyr", "Bites from ticks, adders and animals", null], ["Tandskade", "Dental injury", "injury-tooth"], ["Forgiftning (Giftlinjen)", "Poisoning (Poison line)", "injury-poison"], ["Seksuelle overgreb", "Sexual assault", "direct"]] },
    { da: "Psykisk hjælp", en: "Mental health help", direct: true, sub: [["Akut psykiatrisk hjælp", "Acute psychiatric help", "direct"]] }
  ]
};

// ---------- THE PAGES WE HAVE READ ----------
// questions: { da, en, red: true when "yes" means hang up and call 112 }
// cards: [DO or WATCH, da, en]
const PAGES = {
  // -------- children 4 months to 12 years --------
  "child-fever": { title: { da: "Feber hos børn", en: "Fever in children" }, updated: "3. juli 2026",
    questions: [
      { da: "Er det nemt at få kontakt og øjenkontakt med barnet?", en: "Is it easy to get contact and eye contact with the child?", redIf: "no" },
      { da: "Har barnet kramper lige nu?", en: "Is the child having a seizure right now?", redIf: "yes" },
      { da: "Er der udslæt, der ikke forsvinder, når du trykker et glas mod det?", en: "Is there a rash that does not fade when you press a glass against it?", redIf: "yes" },
      { da: "Hvor høj er temperaturen?", en: "How high is the temperature?", buttons: [["Under 38", "Below 38", "u38"], ["38 til 39", "38 to 39", "38"], ["39 til 40", "39 to 40", "39"], ["Over 40", "Above 40", "40"]] },
      { da: "Drikker og tisser barnet som normalt?", en: "Is the child drinking and peeing as usual?" } ],
    cards: [
      [DO, "Sørg for, at dit barn får rigeligt at drikke.", "Make sure your child drinks plenty."],
      [DO, "Hold øje med, at du har god kontakt til dit barn.", "Keep checking that you have good contact with your child."],
      [DO, "Er barnet utilpas, må du gerne give paracetamol. Følg anvisningen på pakken.", "If the child is unwell, you may give paracetamol. Follow the instructions on the pack."],
      [DO, "Feber er kroppens egen reaktion. I langt de fleste tilfælde går den over af sig selv.", "Fever is the body's own reaction. In most cases it passes by itself."],
      [WATCH, "Hold øje med, om barnet drikker, og om det tisser som normalt.", "Watch whether the child is drinking and peeing as usual."],
      [WATCH, "Hold øje med, om barnet bliver slapt eller sløvt, og om du kan få øjenkontakt.", "Watch whether the child becomes limp or drowsy, and whether you can get eye contact."] ] },

  "child-throat": { title: { da: "Ondt i halsen hos børn", en: "Sore throat in children" }, updated: "3. juli 2026",
    questions: [
      { da: "Arbejder barnet hårdt for at trække vejret?", en: "Is the child working hard to breathe?", redIf: "yes" },
      { da: "Savler barnet meget, eller har det meget svært ved at synke?", en: "Is the child drooling a lot, or finding it very hard to swallow?" },
      { da: "Kan barnet åbne munden som normalt?", en: "Can the child open their mouth as usual?" },
      { da: "Drikker og tisser barnet som normalt?", en: "Is the child drinking and peeing as usual?" } ],
    cards: [
      [DO, "Sørg for, at dit barn får rigeligt at drikke.", "Make sure your child drinks plenty."],
      [DO, "Giv mad og drikke, der er nemt at synke, fx lun te eller kold is.", "Give food and drink that is easy to swallow, such as warm tea or cold ice cream."],
      [DO, "Paracetamol kan lindre smerterne. Følg anvisningen på pakken.", "Paracetamol can ease the pain. Follow the instructions on the pack."],
      [DO, "De fleste halsbetændelser skyldes virus og går over af sig selv i løbet af 3 til 7 dage.", "Most throat infections are viral and pass by themselves within 3 to 7 days."],
      [WATCH, "Hold øje med, om barnet savler meget eller har svært ved at synke eller åbne munden.", "Watch whether the child drools a lot or has trouble swallowing or opening the mouth."],
      [WATCH, "Hold øje med, om barnet arbejder meget for at trække vejret.", "Watch whether the child is working hard to breathe."] ] },

  "child-stomach": { title: { da: "Ondt i maven hos børn", en: "Stomach ache in children" }, updated: "3. juli 2026",
    questions: [
      { da: "Er det nemt at få kontakt og øjenkontakt med barnet?", en: "Is it easy to get contact and eye contact with the child?", redIf: "no" },
      { da: "Har barnet voldsomme, konstante mavesmerter?", en: "Does the child have severe, constant stomach pain?", redIf: "yes" },
      { da: "Har barnet slugt magneter eller et knapbatteri?", en: "Has the child swallowed magnets or a button battery?" },
      { da: "Er der blod i opkast eller afføring, eller er opkastet grønt?", en: "Is there blood in vomit or stool, or is the vomit green?" },
      { da: "Har barnet også feber?", en: "Does the child also have a fever?" } ],
    cards: [
      [DO, "Tag den med ro, og vær opmærksom på barnets signaler.", "Take it easy and pay attention to the child's signals."],
      [DO, "Hos større børn skyldes mavesmerter oftest forstoppelse eller maveinfektion, og det går oftest over af sig selv.", "In older children stomach pain is most often constipation or a stomach bug, and it usually passes by itself."],
      [DO, "Små børn siger næsten altid, at det gør ondt ved navlen, uanset hvad årsagen er.", "Small children almost always say it hurts around the navel, whatever the cause."],
      [WATCH, "Hold øje med, om smerterne flytter sig til nederste højre side af maven.", "Watch whether the pain moves to the lower right side of the stomach."],
      [WATCH, "Hold øje med, om barnet bliver slapt eller sløvt, eller ligger forpint og ikke vil bevæge sig.", "Watch whether the child becomes limp or drowsy, or lies in pain and does not want to move."],
      [WATCH, "Hold øje med blod i opkast eller afføring.", "Watch for blood in vomit or stool."] ] },

  "child-ear": { title: { da: "Ondt i øret hos børn", en: "Earache in children" }, updated: "3. juli 2026",
    questions: [
      { da: "Er barnet under 6 måneder?", en: "Is the child under 6 months old?" },
      { da: "Har barnet haft kraftige øresmerter i mere end et døgn, selvom det har fået paracetamol?", en: "Has the child had severe ear pain for more than a day despite paracetamol?" },
      { da: "Stritter øret mere end det plejer, eller er barnet rødt og ømt bag øret?", en: "Does the ear stick out more than usual, or is it red and tender behind the ear?" },
      { da: "Har barnet feber, drikker mindre og er sværere at få kontakt til?", en: "Does the child have a fever, drink less and seem harder to reach?" } ],
    cards: [
      [DO, "Lad barnet ligge med hovedet højt eller sidde oprejst.", "Let the child lie with the head raised or sit upright."],
      [DO, "Paracetamol kan lindre smerterne. Følg anvisningen på pakken.", "Paracetamol can ease the pain. Follow the instructions on the pack."],
      [DO, "Sørg for, at dit barn får rigeligt at drikke.", "Make sure your child drinks plenty."],
      [DO, "Som regel er der ikke grund til antibiotika. De fleste børn bliver raske uden.", "Antibiotics are usually not needed. Most children recover without them."],
      [WATCH, "Hold øje med, om der løber betændelse ud af øret. Så er der gået hul på trommehinden, og smerterne bliver mindre. Hullet lukker sig selv på få dage.", "Watch for fluid running from the ear. That means the eardrum has burst, the pain eases, and the hole closes by itself within days."],
      [WATCH, "Hold øje med, om øret stritter, eller om barnet bliver rødt og ømt bag øret.", "Watch whether the ear sticks out, or the child becomes red and tender behind the ear."] ] },

  "child-rash": { title: { da: "Udslæt hos børn", en: "Rash in children" }, updated: "3. juli 2026",
    questions: [
      { da: "Forsvinder udslættet, når du trykker et glas mod det?", en: "Does the rash fade when you press a glass against it?", redIf: "no" },
      { da: "Er barnet stift i nakken og har svært ved at bevæge hovedet?", en: "Is the child stiff in the neck and struggling to move the head?", redIf: "yes" },
      { da: "Hæver huden op omkring næse og mund?", en: "Is the skin swelling around the nose and mouth?", redIf: "yes" },
      { da: "Er det nemt at få kontakt og øjenkontakt med barnet?", en: "Is it easy to get contact and eye contact with the child?", redIf: "no" },
      { da: "Har barnet feber, og spreder rødmen sig i løbet af timer?", en: "Does the child have a fever, and is the redness spreading over hours?" } ],
    cards: [
      [DO, "Hold øje med dit barns almene tilstand.", "Keep an eye on your child's general condition."],
      [DO, "Paracetamol kan lindre smerter i huden. Følg anvisningen på pakken.", "Paracetamol can ease pain in the skin. Follow the instructions on the pack."],
      [DO, "Sørg for kølige omgivelser.", "Keep the surroundings cool."],
      [DO, "Langt de fleste udslæt er ufarlige og går over af sig selv. Ofte skyldes de en virus.", "Most rashes are harmless and pass by themselves. They are often caused by a virus."],
      [WATCH, "Hold øje med røde eller violette prikker, der ikke forsvinder under et glas. De kan sprede sig over minutter til få timer.", "Watch for red or purple spots that do not fade under a glass. They can spread over minutes to a few hours."],
      [WATCH, "Hold øje med, om barnet bliver slapt eller sløvt.", "Watch whether the child becomes limp or drowsy."] ] },

  "child-breathing": { title: { da: "Vejrtrækningsbesvær hos børn", en: "Breathing difficulty in children" }, updated: "3. juli 2026",
    questions: [
      { da: "Er det nemt at få kontakt og øjenkontakt med barnet?", en: "Is it easy to get contact and eye contact with the child?", redIf: "no" },
      { da: "Arbejder barnet hårdt for at trække vejret, med tydelig lyd eller indtrækninger mellem ribbenene?", en: "Is the child working hard to breathe, with clear sounds or the skin pulling in between the ribs?" },
      { da: "Er barnet under 6 måneder?", en: "Is the child under 6 months old?" },
      { da: "Har barnet haft feber i mere end 3 til 5 dage?", en: "Has the child had a fever for more than 3 to 5 days?" } ],
    cards: [
      [DO, "Sørg for kølig og frisk luft.", "Make sure the air is cool and fresh."],
      [DO, "Giv saltvandsdråber i næsen.", "Use saline drops in the nose."],
      [DO, "Lad barnet ligge med hovedet højt.", "Let the child lie with the head raised."],
      [DO, "Sørg for, at barnet får rigeligt at drikke.", "Make sure the child drinks plenty."],
      [DO, "Er barnet utilpas, må du gerne give paracetamol. Følg anvisningen på pakken.", "If the child is unwell, you may give paracetamol. Follow the instructions on the pack."],
      [WATCH, "Hold øje med, om barnet arbejder hårdt for at trække vejret, med lyd på eller indtrækninger under og mellem ribbenene.", "Watch whether the child is working hard to breathe, with sounds or the skin pulling in under and between the ribs."],
      [WATCH, "Hold øje med, om barnet bliver slapt eller sløvt.", "Watch whether the child becomes limp or drowsy."] ] },

  "child-vomiting": { title: { da: "Opkast og diarré hos børn", en: "Vomiting and diarrhoea in children" }, updated: "3. juli 2026",
    questions: [
      { da: "Er det nemt at få kontakt og øjenkontakt med barnet?", en: "Is it easy to get contact and eye contact with the child?", redIf: "no" },
      { da: "Har barnet voldsomme, konstante mavesmerter?", en: "Does the child have severe, constant stomach pain?", redIf: "yes" },
      { da: "Drikker og tisser barnet som normalt?", en: "Is the child drinking and peeing as usual?" },
      { da: "Er der blod i afføring eller opkast?", en: "Is there blood in the stool or vomit?" },
      { da: "Er barnet under 6 måneder?", en: "Is the child under 6 months old?" } ],
    cards: [
      [DO, "Giv små portioner væske med korte mellemrum, fx et par skeer eller slurke hvert 5. minut.", "Give small amounts of fluid at short intervals, for example a few spoonfuls or sips every 5 minutes."],
      [DO, "Lad barnet drikke det, det har lyst til. Sodavand og juice fortyndes helst med vand.", "Let the child drink what it likes. Soft drinks and juice are best diluted with water."],
      [DO, "Det gør ikke noget, hvis barnet ikke vil spise i et par dage, så længe det drikker og tisser.", "It does not matter if the child will not eat for a couple of days, as long as it drinks and pees."],
      [DO, "Har barnet feber, må du gerne give paracetamol. Følg anvisningen på pakken.", "If the child has a fever, you may give paracetamol. Follow the instructions on the pack."],
      [DO, "Opkast og diarré smitter. Vask og sprit hænder.", "Vomiting and diarrhoea are contagious. Wash and sanitise hands."],
      [WATCH, "Hold øje med, om barnet drikker, og om det tisser som normalt, også når du giver små portioner.", "Watch whether the child is drinking and peeing as usual, even when you give small amounts."],
      [WATCH, "Hold øje med blod i afføring eller opkast, og om barnet bliver uroligt, forpint eller ikke vil bevæge sig.", "Watch for blood in stool or vomit, and whether the child becomes restless, in pain or unwilling to move."] ] },

  "child-eyes": { title: { da: "Røde øjne hos børn", en: "Red eyes in children" }, updated: "3. juli 2026",
    questions: [
      { da: "Er øjet meget rødt, er øjenomgivelserne hævede, eller er der meget pus?", en: "Is the eye very red, are the surroundings swollen, or is there a lot of pus?" },
      { da: "Virker det, som om barnets syn er påvirket?", en: "Does the child's vision seem affected?" },
      { da: "Har barnet feber, drikker mindre og er sværere at få kontakt til?", en: "Does the child have a fever, drink less and seem harder to reach?" } ],
    cards: [
      [DO, "Rens øjnene et par gange om dagen, indefra øjenkrogen og udad, med vat vædet i lunkent vand. Nyt vat til hvert øje.", "Clean the eyes a couple of times a day, from the inner corner outwards, with cotton wool dipped in lukewarm water. New cotton wool for each eye."],
      [DO, "Undgå at gnide i øjnene.", "Avoid rubbing the eyes."],
      [DO, "Vask hænder før og efter.", "Wash hands before and after."],
      [DO, "Røde øjne er som regel en mild øjenbetændelse, der forsvinder af sig selv. Barnet må godt komme i institution.", "Red eyes are usually a mild eye infection that passes by itself. The child may go to nursery."],
      [WATCH, "Hold øje med, om rødmen sidder tæt på det farvede i øjet, eller om der kommer mere pus.", "Watch whether the redness is close to the coloured part of the eye, or whether more pus appears."],
      [WATCH, "Hold øje med, om det bliver bedre inden for 5 til 7 dage.", "Watch whether it improves within 5 to 7 days."] ] },

  // -------- teenagers and adults --------
  "adult-fever": { title: { da: "Feber", en: "Fever" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der udtalt vejrtrækningsbesvær eller smerter i brystet?", en: "Is there marked breathing difficulty or chest pain?", redIf: "yes" },
      { da: "Er der nakkestivhed eller små røde eller violette prikker i huden?", en: "Is there a stiff neck or small red or purple spots on the skin?", redIf: "yes" },
      { da: "Er personen forvirret, slap eller meget sløv?", en: "Is the person confused, limp or very drowsy?", redIf: "yes" },
      { da: "Hvor høj er temperaturen?", en: "How high is the temperature?", buttons: [["Under 38", "Below 38", "u38"], ["38 til 39", "38 to 39", "38"], ["39 til 40", "39 to 40", "39"], ["Over 40", "Above 40", "40"]] },
      { da: "Er der taget febernedsættende medicin inden for de sidste 4 timer?", en: "Has fever-reducing medicine been taken in the last 4 hours?" } ],
    cards: [
      [DO, "Febernedsættende medicin kan lindre, fx paracetamol eller ibuprofen.", "Fever-reducing medicine can help, such as paracetamol or ibuprofen."],
      [DO, "Feber er ikke i sig selv grund til at kontakte en læge. Det afhænger af, hvordan du har det.", "Fever by itself is not a reason to contact a doctor. It depends on how you feel."],
      [DO, "De fleste sygdomme med feber er harmløse og går over af sig selv.", "Most illnesses with fever are harmless and pass by themselves."],
      [WATCH, "Mærk efter, om du får vejrtrækningsbesvær, bliver stiv i nakken eller udtalt sløv.", "Notice whether you get breathing difficulty, a stiff neck or marked drowsiness."],
      [WATCH, "Hold øje med små røde eller violette prikker, der ikke forsvinder, når du trykker et glas mod dem.", "Watch for small red or purple spots that do not fade when you press a glass against them."],
      [WATCH, "Hold øje med, om feberen holder sig over 40 grader, selvom du har taget febernedsættende medicin.", "Watch whether the fever stays above 40 degrees even after fever-reducing medicine."] ] },

  "adult-throat": { title: { da: "Ondt i halsen", en: "Sore throat" }, updated: "17. august 2026",
    questions: [
      { da: "Er det svært at trække vejret, eller snævrer halsen sig sammen?", en: "Is it hard to breathe, or is the throat tightening?", redIf: "yes" },
      { da: "Er det kommet pludseligt og blevet hurtigt værre over få timer?", en: "Did it come on suddenly and get rapidly worse over a few hours?", redIf: "yes" },
      { da: "Kan du åbne munden normalt, som når du gaber højt?", en: "Can you open your mouth normally, as when you yawn?" },
      { da: "Er der feber over 38?", en: "Is there a fever above 38?" },
      { da: "Er der belægninger på mandlerne eller ømme kirtler under kæben?", en: "Are there white patches on the tonsils or tender glands under the jaw?" } ],
    cards: [
      [DO, "Smertestillende håndkøbsmedicin, fx paracetamol, kan lindre.", "Over-the-counter painkillers such as paracetamol can help."],
      [DO, "Smertestillende mundhulespray fra apoteket kan også hjælpe.", "A pain-relieving throat spray from the pharmacy can also help."],
      [DO, "Kun 1 ud af 3 tilfælde af ondt i halsen skyldes bakterier. Forkølelsessymptomer peger på virus.", "Only 1 in 3 sore throats is bacterial. Cold symptoms point to a virus."],
      [WATCH, "Feber over 38, belægninger på mandlerne og ømme kirtler under kæben kan være tegn på halsbetændelse.", "Fever above 38, white patches on the tonsils and tender glands under the jaw can be signs of tonsillitis."],
      [WATCH, "Hold øje med, om du kan åbne munden normalt, som når du gaber højt.", "Watch whether you can open your mouth normally, as when you yawn."],
      [WATCH, "Hold øje med pludseligt hududslæt, og om smerterne varer ved efter 5 til 7 dage.", "Watch for a sudden rash, and whether the pain lasts beyond 5 to 7 days."] ] },

  "adult-cold": { title: { da: "Forkølelse eller ondt i bihulerne", en: "Common cold or sinus pain" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der vejrtrækningsbesvær eller smerter, når du trækker vejret?", en: "Is there breathing difficulty or pain when you breathe?" },
      { da: "Har symptomerne varet i mere end 10 dage?", en: "Have the symptoms lasted more than 10 days?" },
      { da: "Er det pludselig blevet værre igen efter nogle dages bedring?", en: "Has it suddenly got worse again after some days of improvement?" } ],
    cards: [
      [DO, "Drik rigeligt med væske.", "Drink plenty of fluids."],
      [DO, "Hvil dig. Aktivitet kan dyrkes efter velbefindende.", "Rest. Be active as you feel able."],
      [DO, "Næsedråber eller næsespray kan give bedre luftpassage.", "Nose drops or nasal spray can help you breathe more freely."],
      [DO, "Symptomerne topper normalt efter 3 til 4 dage og forsvinder efter ca. 7 til 10 dage. Antibiotika virker ikke på virus.", "Symptoms usually peak after 3 to 4 days and pass after about 7 to 10 days. Antibiotics do not work on viruses."],
      [WATCH, "Hold øje med pludselig forværring med ny feber, smerter ved vejrtrækning eller åndenød. Det kan være lungebetændelse.", "Watch for a sudden worsening with new fever, pain when breathing or shortness of breath. It can be pneumonia."],
      [WATCH, "Hosten kan vare nogle uger, og det er normalt at blive øm i brystkassen. Søg hjælp, hvis vejrtrækningen bliver smertefuld.", "The cough can last some weeks, and a sore chest is normal. Seek help if breathing becomes painful."] ] },

  "adult-flu": { title: { da: "Influenza", en: "Flu" }, updated: "7. juli 2026",
    questions: [
      { da: "Er bevidstheden sløret eller påvirket?", en: "Is consciousness clouded or affected?", redIf: "yes" },
      { da: "Er der tiltagende, svær hovedpine eller nakkestivhed?", en: "Is there increasing, severe headache or a stiff neck?", redIf: "yes" },
      { da: "Er der vejrtrækningsbesvær eller brystsmerter ved hoste?", en: "Is there breathing difficulty or chest pain when coughing?", redIf: "yes" },
      { da: "Er personen over 65 eller kronisk syg?", en: "Is the person over 65 or chronically ill?" } ],
    cards: [
      [DO, "Tag febernedsættende medicin, fx paracetamol.", "Take fever-reducing medicine, such as paracetamol."],
      [DO, "Sørg for rigeligt med væske. Under sygdom har kroppen brug for mere end normalt.", "Drink plenty of fluids. When ill, the body needs more than usual."],
      [DO, "Hvil dig, men hold dig lidt i gang.", "Rest, but keep moving a little."],
      [DO, "Mål temperaturen én gang i døgnet, så du kan følge sygdommen.", "Take your temperature once a day so you can follow the illness."],
      [DO, "Influenza er normalt overstået efter 7 til 8 dage. Det er normalt at føle sig svækket bagefter.", "Flu is normally over after 7 to 8 days. Feeling weak afterwards is normal."],
      [WATCH, "Hold øje med pludselig forværring, typisk 5 til 7 dage efter starten.", "Watch for a sudden worsening, typically 5 to 7 days after onset."],
      [WATCH, "Hold øje med åndenød eller smerter, når du trækker vejret.", "Watch for shortness of breath or pain when you breathe."] ] },

  "adult-cough": { title: { da: "Hoste og åndedrætsbesvær", en: "Cough and breathing difficulty" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der udtalt vejrtrækningsbesvær eller smerter i brystet?", en: "Is there marked breathing difficulty or chest pain?", redIf: "yes" },
      { da: "Er personen forvirret, slap eller meget sløv?", en: "Is the person confused, limp or very drowsy?", redIf: "yes" },
      { da: "Gør det ondt, når du trækker vejret?", en: "Does it hurt when you breathe?" },
      { da: "Har der været feber og hoste i mere end 5 dage?", en: "Have there been fever and cough for more than 5 days?" } ],
    cards: [
      [DO, "Drik rigeligt med væske.", "Drink plenty of fluids."],
      [DO, "Er du øm i brystkassen af at hoste, kan paracetamol og ibuprofen hjælpe.", "If your chest is sore from coughing, paracetamol and ibuprofen can help."],
      [DO, "Hostemedicin har som regel meget begrænset effekt.", "Cough medicine usually has very limited effect."],
      [DO, "Hoste starter ofte tør og bliver våd til sidst. Det er normalt at blive øm i brystkassen.", "A cough often starts dry and turns wet towards the end. A sore chest is normal."],
      [WATCH, "Hold øje med pludselig forværring, typisk 5 til 7 dage efter starten.", "Watch for a sudden worsening, typically 5 to 7 days after onset."],
      [WATCH, "Hold øje med åndenød eller smerter, når du trækker vejret. Varer hosten mere end 4 uger, skal du kontakte din læge.", "Watch for shortness of breath or pain when breathing. If the cough lasts more than 4 weeks, contact your doctor."] ] },

  "adult-asthma": { title: { da: "Astma", en: "Asthma" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der stadig åndenød i hvile, selvom anfaldet burde være klinget af?", en: "Is there still shortness of breath at rest, although the attack should have eased?", redIf: "yes" },
      { da: "Er der gået mere end 20 minutter uden bedring?", en: "Has it been more than 20 minutes without improvement?", redIf: "yes" },
      { da: "Har anfaldsmedicinen haft effekt?", en: "Has the reliever medicine had an effect?" } ],
    cards: [
      [DO, "Brug din anfaldsmedicin. Gentag eventuelt efter fem minutter med 1 til 2 pust, hvis første dosis ikke er nok.", "Use your reliever medicine. Repeat after five minutes with 1 to 2 puffs if the first dose is not enough."],
      [DO, "Forsøg at holde dig i ro. Angst kan irritere luftvejene yderligere.", "Try to stay calm. Anxiety can irritate the airways further."],
      [DO, "Undgå så vidt muligt at være alene under et anfald.", "Avoid being alone during an attack if you can."],
      [WATCH, "Hold øje med, om anfaldet klinger af, og om der stadig er åndenød i hvile.", "Watch whether the attack eases, and whether there is still shortness of breath at rest."],
      [WATCH, "Kold luft, infektioner, pollen, dyrehår og forurening kan udløse anfald.", "Cold air, infections, pollen, animal hair and pollution can trigger attacks."] ] },

  "adult-vomiting": { title: { da: "Diarré og opkast", en: "Diarrhoea and vomiting" }, updated: "7. juli 2026",
    questions: [
      { da: "Er bevidstheden påvirket?", en: "Is consciousness affected?", redIf: "yes" },
      { da: "Er der blod eller mørkt grums, som kaffegrums, i opkastet?", en: "Is there blood or dark grains, like coffee grounds, in the vomit?", redIf: "yes" },
      { da: "Er der tegn på væskemangel: ingen urin, udtalt træthed, tørst, forvirring eller svimmelhed?", en: "Are there signs of dehydration: no urine, marked tiredness, thirst, confusion or dizziness?" },
      { da: "Er der svære mavesmerter, selvom du har taget smertestillende?", en: "Is there severe stomach pain despite painkillers?" } ],
    cards: [
      [DO, "Drik vand med lidt salt og sukker: 1 liter vand, en halv teske salt og 3 teskeer sukker. Eller elektrolytblanding fra apoteket.", "Drink water with a little salt and sugar: 1 litre of water, half a teaspoon of salt and 3 teaspoons of sugar. Or an electrolyte mix from the pharmacy."],
      [DO, "Drik hyppigt, men i små mængder. Store mængder kan fremprovokere opkast.", "Drink often, but in small amounts. Large amounts can provoke vomiting."],
      [DO, "Paracetamol og ibuprofen efter behov mod smerter og feber. Kaster du op inden for 15 minutter, kan du tage en ny dosis.", "Paracetamol and ibuprofen as needed for pain and fever. If you vomit within 15 minutes, you can take a new dose."],
      [DO, "Vent med at spise, til opkastningerne aftager. Start så med små portioner kogt ris, kylling, banan eller yoghurt.", "Wait to eat until the vomiting eases. Then start with small portions of boiled rice, chicken, banana or yoghurt."],
      [DO, "Vask hænder grundigt, især efter toiletbesøg og før måltider.", "Wash your hands thoroughly, especially after the toilet and before meals."],
      [WATCH, "Hold øje med tegn på væskemangel: ingen urin, udtalt træthed, tørst, forvirring eller svimmelhed.", "Watch for signs of dehydration: no urine, marked tiredness, thirst, confusion or dizziness."],
      [WATCH, "Hold øje med, om det varer mere end 3 til 5 dage, eller bliver værre.", "Watch whether it lasts more than 3 to 5 days, or gets worse."] ] },

  "adult-stomach": { title: { da: "Mavesmerter", en: "Stomach pain" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der pludselige smerter i både maven og brystkassen?", en: "Is there sudden pain in both the stomach and the chest?", redIf: "yes" },
      { da: "Er der kraftige mavesmerter, og har personen besvimet?", en: "Is there severe stomach pain, and has the person fainted?", redIf: "yes" },
      { da: "Er der blod i opkast eller afføring, rød eller sort?", en: "Is there blood in vomit or stool, red or black?" },
      { da: "Er der feber sammen med smerterne?", en: "Is there a fever together with the pain?" },
      { da: "Sidder smerterne i nederste højre side af maven?", en: "Is the pain in the lower right side of the stomach?" } ],
    cards: [
      [DO, "Paracetamol kan lindre smerter og dæmpe feber.", "Paracetamol can ease pain and reduce fever."],
      [DO, "Drik rigeligt med væske. Det holder fordøjelsen i gang.", "Drink plenty of fluids. It keeps digestion going."],
      [DO, "En varmepude på maven kan lindre krampagtige smerter.", "A heat pad on the stomach can ease cramping pain."],
      [DO, "Hvile og afslapning hjælper, hvis smerterne skyldes stress eller fordøjelsen.", "Rest and relaxation help if the pain is from stress or digestion."],
      [WATCH, "Hold øje med, hvor smerten sidder, og hvor hurtigt den udvikler sig.", "Watch where the pain is, and how fast it develops."],
      [WATCH, "Smerter, der starter ved navlen og flytter sig til nederste højre side, kan være blindtarmsbetændelse. De bliver værre, når du hopper.", "Pain that starts at the navel and moves to the lower right side can be appendicitis. It gets worse when you jump."],
      [WATCH, "Hold øje med blod i opkast eller afføring, og om du bliver svag, forvirret eller svimmel.", "Watch for blood in vomit or stool, and whether you become weak, confused or dizzy."] ] },

  "adult-urinary": { title: { da: "Urinveje, fx blærebetændelse", en: "Urinary tract, e.g. cystitis" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der feber over 38 sammen med vandladningsgener?", en: "Is there a fever above 38 together with urinary symptoms?" },
      { da: "Er der blod i urinen?", en: "Is there blood in the urine?" },
      { da: "Er der kraftige smerter i maven eller i siden af ryggen?", en: "Is there severe pain in the stomach or the side of the back?" },
      { da: "Er det pludselig svært at tømme blæren?", en: "Has it suddenly become hard to empty the bladder?" } ],
    cards: [
      [DO, "Drik rigeligt, gerne 1,5 til 2 liter om dagen. Det skyller bakterierne ud.", "Drink plenty, ideally 1.5 to 2 litres a day. It flushes the bacteria out."],
      [DO, "Tøm blæren helt og regelmæssigt.", "Empty the bladder completely and regularly."],
      [DO, "Paracetamol eller ibuprofen kan lindre svie og smerte.", "Paracetamol or ibuprofen can ease the stinging and pain."],
      [DO, "Milde tilfælde kan ofte klares uden antibiotika.", "Mild cases can often be managed without antibiotics."],
      [WATCH, "Hold øje med feber over 38, blod i urinen og smerter i siden af ryggen.", "Watch for fever above 38, blood in the urine and pain in the side of the back."],
      [WATCH, "Pludselige, kraftige smerter i den ene side af ryggen, der kommer i anfald, kan være nyresten.", "Sudden, severe pain in one side of the back that comes in waves can be kidney stones."] ] },

  "adult-constipation": { title: { da: "Forstoppelse", en: "Constipation" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der kraftige mavesmerter eller opkastninger sammen med forstoppelsen?", en: "Is there severe stomach pain or vomiting together with the constipation?" },
      { da: "Er personen gravid eller ammende?", en: "Is the person pregnant or breastfeeding?" },
      { da: "Er det blevet værre, selvom du har prøvet rådene?", en: "Has it got worse although you have tried the advice?" } ],
    cards: [
      [DO, "Drik rigeligt med vand. Det blødgør afføringen.", "Drink plenty of water. It softens the stool."],
      [DO, "Vær fysisk aktiv. Gåture og let træning sætter gang i tarmen.", "Be physically active. Walks and light exercise get the bowel going."],
      [DO, "Spis fiberrigt. Svesker og sveskejuice virker afføringsfremmende.", "Eat fibre. Prunes and prune juice have a laxative effect."],
      [DO, "Milde afføringsmidler fra håndkøb, fx Movicol eller Lactulose, kan bruges midlertidigt. Drik rigeligt sammen med dem.", "Mild over-the-counter laxatives such as Movicol or Lactulose can be used for a while. Drink plenty with them."],
      [WATCH, "Hold øje med kraftige mavesmerter eller opkast sammen med forstoppelsen.", "Watch for severe stomach pain or vomiting together with the constipation."],
      [WATCH, "Movicol bør ikke bruges i mere end 14 dage uden aftale med lægen, og ikke af gravide eller ammende.", "Movicol should not be used for more than 14 days without your doctor's agreement, and not when pregnant or breastfeeding."] ] },

  "adult-pain-neck": { title: { da: "Pludselige smerter i nakken", en: "Sudden neck pain" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der svær hovedpine, feber over 38 og stivhed i nakken?", en: "Is there severe headache, fever above 38 and a stiff neck?", redIf: "yes" },
      { da: "Er personen lyssky, forvirret, meget svimmel, eller har personen været besvimet?", en: "Is the person sensitive to light, confused, very dizzy, or has the person fainted?", redIf: "yes" },
      { da: "Er der pludselig svaghed eller lammelse i arme eller ben?", en: "Is there sudden weakness or paralysis in arms or legs?", redIf: "yes" },
      { da: "Er der føleforstyrrelser eller nedsat kraft i arme eller hænder?", en: "Is there numbness or reduced strength in arms or hands?" } ],
    cards: [
      [DO, "Undgå det, der forværrer smerterne, og skift stilling jævnligt.", "Avoid what makes the pain worse, and change position regularly."],
      [DO, "Læg en varmepude eller et varmt håndklæde på nakken i 15 til 20 minutter ad gangen.", "Put a heat pad or a warm towel on the neck for 15 to 20 minutes at a time."],
      [DO, "Lav forsigtige nakkestræk, hvis det ikke gør smerterne værre.", "Do gentle neck stretches if they do not make the pain worse."],
      [DO, "Paracetamol eller ibuprofen efter anvisning.", "Paracetamol or ibuprofen as directed."],
      [DO, "Nakkesmerter uden skade skyldes oftest muskelspændinger, holdning eller stress og er som regel harmløse.", "Neck pain without injury is usually muscle tension, posture or stress, and is usually harmless."],
      [WATCH, "Hold øje med føleforstyrrelser eller nedsat kraft i arme og hænder, svimmelhed og balanceproblemer.", "Watch for numbness or reduced strength in arms and hands, dizziness and balance problems."],
      [WATCH, "Hold øje med hovedpine, der varer ved eller tager til, og let feber sammen med smerterne.", "Watch for headache that lasts or increases, and mild fever together with the pain."] ] },

  "adult-pain-back": { title: { da: "Pludselige smerter i lænden", en: "Sudden lower back pain" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der kraftige rygsmerter sammen med svær utilpashed, svimmelhed eller besvimelse?", en: "Is there severe back pain together with feeling very unwell, dizziness or fainting?", redIf: "yes" },
      { da: "Er smerterne meget intense og kommet akut?", en: "Is the pain very intense and did it come on acutely?", redIf: "yes" },
      { da: "Er der prikken, følelsesløshed eller svækkelse i benene?", en: "Is there tingling, numbness or weakness in the legs?" },
      { da: "Er der problemer med at styre vandladning eller afføring?", en: "Are there problems controlling urination or bowel movements?" } ],
    cards: [
      [DO, "Hold dig aktiv med lette daglige gøremål og korte gåture. Undgå tunge løft.", "Stay active with light daily tasks and short walks. Avoid heavy lifting."],
      [DO, "Undgå langvarigt sengeleje. Det kan gøre smerterne værre.", "Avoid long periods in bed. It can make the pain worse."],
      [DO, "Paracetamol eller ibuprofen efter behov, og varme eller kulde på området i 15 til 20 minutter ad gangen.", "Paracetamol or ibuprofen as needed, and heat or cold on the area for 15 to 20 minutes at a time."],
      [DO, "Lette strækøvelser eller afspænding kan hjælpe.", "Gentle stretches or relaxation can help."],
      [WATCH, "Hold øje med prikken, følelsesløshed eller svækkelse i benene, og smerter, der stråler ned i benene.", "Watch for tingling, numbness or weakness in the legs, and pain radiating down the legs."],
      [WATCH, "Hold øje med problemer med at gå normalt eller med at styre vandladning og afføring.", "Watch for trouble walking normally or controlling urination and bowel movements."] ] },

  "adult-pain-arms": { title: { da: "Pludselige smerter i arme og hænder", en: "Sudden pain in arms and hands" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der pludselige stærke smerter med føleforstyrrelser, kulde og blålig hudfarve?", en: "Is there sudden severe pain with numbness, coldness and bluish skin?", redIf: "yes" },
      { da: "Er der hævelse og spænding i en muskel i armen?", en: "Is there swelling and tightness in a muscle in the arm?" },
      { da: "Er der feber over 38 sammen med smerterne?", en: "Is there a fever above 38 together with the pain?" },
      { da: "Er der stærke smerter, også i hvile?", en: "Is there severe pain, even at rest?" } ],
    cards: [
      [DO, "Hold armen eller hånden i en behagelig stilling, og undgå tunge løft og gentagne bevægelser.", "Keep the arm or hand in a comfortable position, and avoid heavy lifting and repeated movements."],
      [DO, "Læg en ispose i et klæde på det ømme sted i 15 til 20 minutter flere gange om dagen.", "Put an ice pack wrapped in a cloth on the sore spot for 15 to 20 minutes several times a day."],
      [DO, "Paracetamol eller ibuprofen efter anvisning.", "Paracetamol or ibuprofen as directed."],
      [DO, "Lav forsigtige strækøvelser, og hold leddene i gang, hvis det ikke gør ondt.", "Do gentle stretches and keep the joints moving, if it does not hurt."],
      [WATCH, "Hold øje med hævelse, rødme og varme i et led, og om grebsstyrken bliver svagere.", "Watch for swelling, redness and heat in a joint, and whether your grip gets weaker."],
      [WATCH, "Hold øje med føleforstyrrelser, kulde eller blålig farve i hånden.", "Watch for numbness, coldness or a bluish colour in the hand."] ] },

  "adult-pain-legs": { title: { da: "Pludselige smerter i ben og fødder", en: "Sudden pain in legs and feet" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der intens, pludselig smerte i benet med bleg eller blålig hud?", en: "Is there intense, sudden pain in the leg with pale or bluish skin?", redIf: "yes" },
      { da: "Er følesansen eller evnen til at bevæge benet væk?", en: "Is feeling or the ability to move the leg lost?", redIf: "yes" },
      { da: "Er der hævelse og spænding i en muskel i læg eller lår?", en: "Is there swelling and tightness in a muscle in the calf or thigh?" },
      { da: "Er der følelsesløshed eller kulde i benet eller foden?", en: "Is there numbness or coldness in the leg or foot?" } ],
    cards: [
      [DO, "Hold benet eller foden hævet for at mindske hævelse.", "Keep the leg or foot raised to reduce swelling."],
      [DO, "Læg en ispose eller en pose frosne ærter i et klæde på det ømme sted i 15 til 20 minutter flere gange om dagen.", "Put an ice pack or a bag of frozen peas wrapped in a cloth on the sore spot for 15 to 20 minutes several times a day."],
      [DO, "En elastisk bandage kan mindske hævelse og støtte området.", "An elastic bandage can reduce swelling and support the area."],
      [DO, "Paracetamol eller ibuprofen efter anvisning.", "Paracetamol or ibuprofen as directed."],
      [WATCH, "Hold øje med hævelse og spænding i læg eller lår, og om bevægeligheden i foden eller benet bliver mindre.", "Watch for swelling and tightness in the calf or thigh, and whether movement in the foot or leg decreases."],
      [WATCH, "Hold øje med følelsesløshed, kulde eller farveskift i benet eller foden.", "Watch for numbness, coldness or colour change in the leg or foot."] ] },


  // -------- infants 0 to 3 months (akut.dk, 3. juli 2026). Danish only: the group decided 10 Nov that the English
  //          switch covers the screen texts and the pages translated earlier; the rest stays in Danish. --------
  "infant-stomach": { title: { da: "Spædbarn: mave og tarm" }, updated: "3. juli 2026",
    questions: [
      { da: "Er opkastet grønt?", redIf: "yes" },
      { da: "Er der frisk blod eller sort, tjæreagtig afføring?" },
      { da: "Er der færre våde bleer end normalt, eller tør mund?" },
      { da: "Kaster barnet op i store mængder efter hvert måltid?" } ],
    cards: [
      [DO, "Hold barnet oprejst efter måltider."],
      [DO, "Massér maven blidt med uret, og bevæg benene som cykling ved forstoppelse."],
      [DO, "Fortsæt med at amme eller give flaske hyppigt."],
      [DO, "Let gylp og løs afføring er normalt og varierer fra barn til barn."],
      [WATCH, "Hold øje med vægtøgning, våde bleer og barnets almene tilstand."],
      [WATCH, "Hold øje med grønt opkast, blod i afføringen, og om barnet bliver sløvt."] ] },
  "infant-drowsy": { title: { da: "Spædbarn: sløvhed eller slaphed" }, updated: "3. juli 2026",
    questions: [
      { da: "Er barnet svært at vække, eller reagerer det ikke som normalt på lyd, lys og berøring?", redIf: "yes" },
      { da: "Holder barnet pauser i vejrtrækningen, eller er vejrtrækningen hurtig og besværet?", redIf: "yes" },
      { da: "Er huden bleg, blålig eller grålig, især omkring læber og negle?", redIf: "yes" },
      { da: "Er temperaturen 38 eller derover, eller under 36?" },
      { da: "Nægter barnet at spise over flere måltider?" } ],
    cards: [
      [DO, "Hold barnet varmt, men undgå overophedning."],
      [DO, "Forsøg forsigtigt at vække barnet: tal til det, eller stryg det på kinden."],
      [DO, "Tilbyd bryst eller flaske, hvis barnet vil."],
      [DO, "Giv ikke medicin uden lægens anvisning. Din ro kan berolige barnet."],
      [WATCH, "Hold øje med ændringer i adfærd, vejrtrækning og hudfarve."],
      [WATCH, "Hold øje med tørre slimhinder og antallet af våde bleer i døgnet."] ] },
  "infant-fever": { title: { da: "Spædbarn: feber og infektion" }, updated: "3. juli 2026",
    questions: [
      { da: "Er barnet sløvt, eller er det svært at få kontakt?", redIf: "yes" },
      { da: "Er vejrtrækningen hurtig eller besværet?", redIf: "yes" },
      { da: "Er der udslæt, der ikke blegner, når du trykker på det?", redIf: "yes" },
      { da: "Er temperaturen 38 eller derover, målt i endetarmen?" },
      { da: "Er der opkast, diarré eller færre våde bleer?" } ],
    cards: [
      [DO, "Mål temperaturen med et digitalt termometer i endetarmen."],
      [DO, "Klæd barnet let på, og pak det ikke for varmt ind."],
      [DO, "Tilbyd bryst eller flaske hyppigt."],
      [DO, "Skab ro omkring barnet, og giv ikke febernedsættende medicin uden lægens anvisning."],
      [WATCH, "Hos børn under 3 måneder skal feber på 38 eller derover altid tages alvorligt."],
      [WATCH, "Hold øje med sløvhed, utrøstelig gråd, nedsat appetit og hudfarve."] ] },
  "infant-breathing": { title: { da: "Spædbarn: påvirket vejrtrækning" }, updated: "3. juli 2026",
    questions: [
      { da: "Er der pauser i vejrtrækningen på mere end 10 sekunder?", redIf: "yes" },
      { da: "Bliver huden blålig omkring fingre, hænder, fødder eller læber?", redIf: "yes" },
      { da: "Trækkes huden ind under eller mellem ribbenene eller under halsen, når barnet trækker vejret?" },
      { da: "Er vejrtrækningen meget hurtig eller hvæsende?" },
      { da: "Er barnet sløvt, irritabelt, eller afviser det mad?" } ],
    cards: [
      [DO, "Brug saltvandsdråber, hvis næsen er tilstoppet."],
      [DO, "Hold øje med barnets brystkasse og mavebevægelser."],
      [DO, "Spædbørns vejrtrækning er ofte uregelmæssig og hurtigere end voksnes. Lette snorkelyde kan være normale."],
      [DO, "Undgå rygning i hjemmet og omkring barnet."],
      [WATCH, "Hold øje med indtrækninger mellem ribbenene og pauser i vejrtrækningen."],
      [WATCH, "Hold øje med hudfarven og temperaturen."] ] },
  "infant-pain": { title: { da: "Spædbarn: smerter" }, updated: "3. juli 2026",
    questions: [
      { da: "Græder barnet vedvarende og kan ikke trøstes med amning, vugning eller kontakt?" },
      { da: "Krummer barnet sig sammen eller spænder op, som om det har ondt?" },
      { da: "Er temperaturen 38 eller derover?" },
      { da: "Er der opkast, diarré eller udslæt?" } ],
    cards: [
      [DO, "Vug barnet, hold det tæt, eller syng for det."],
      [DO, "Tjek de grundlæggende behov: sult, træthed, ren ble."],
      [DO, "Læg mærke til, hvornår og hvor længe barnet græder."],
      [DO, "Giv ikke medicin uden lægens anvisning."],
      [WATCH, "Hold øje med ændringer i spise- og sovemønster."],
      [WATCH, "Hold øje med feber, opkast, diarré og udslæt."] ] },
  "infant-face": { title: { da: "Spædbarn: ansigt, øjne og mundhule" }, updated: "3. juli 2026",
    questions: [
      { da: "Er barnets vejrtrækning eller spisning påvirket af den tilstoppede næse?" },
      { da: "Er øjet rødt og hævet med pus?" },
      { da: "Er temperaturen 38 eller derover?" },
      { da: "Virker barnet generet af lys?" } ],
    cards: [
      [DO, "Rens øjet med sterilt saltvand eller kogt, afkølet vand, fra den indre øjenkrog og udad, ny vatrondel hver gang."],
      [DO, "Brug saltvandsdråber til spædbørn ved tilstoppet næse, og hæv hovedenden af sengen let."],
      [DO, "Trøske er hvide belægninger i munden, der ikke kan fjernes. Det er ofte ufarligt. Kog sutter og flasker dagligt."],
      [DO, "Vask hænder ofte."],
      [WATCH, "Hold øje med tykt, grønt eller gult sekret i øjet."],
      [WATCH, "Hold øje med, om barnet har svært ved at spise eller virker irritabelt."] ] },
  "infant-skin": { title: { da: "Spædbarn: huden" }, updated: "3. juli 2026",
    questions: [
      { da: "Er der udslæt, der ikke forsvinder, når du trykker på huden?", redIf: "yes" },
      { da: "Er huden og det hvide i øjnene gulligt efter barnets første leveuge?" },
      { da: "Spreder udslættet sig hurtigt, eller ser det betændt ud med rødme, varme eller pus?" },
      { da: "Er der blærer, sår eller væskende områder?" } ],
    cards: [
      [DO, "Nyfødte kan have hormonknopper eller tør hud. Det er normalt."],
      [DO, "Brug uparfumerede produkter, og undgå overdreven badning."],
      [DO, "Klip barnets negle, så det ikke kradser sig."],
      [DO, "Ved gulsot: sørg for, at barnet får nok mad, og lad det få dagslys indendørs, ikke direkte sol."],
      [WATCH, "Hold øje med udslættets udseende og udbredelse."],
      [WATCH, "Hold øje med, om barnet bliver sløvt, spiser dårligt eller ikke tager på."] ] },
  "infant-urinary": { title: { da: "Spædbarn: urinveje og kønsorganer" }, updated: "3. juli 2026",
    questions: [
      { da: "Har barnet tre eller færre tunge, våde bleer i døgnet?" },
      { da: "Er der synligt blod i bleen eller urinen?" },
      { da: "Er der pus eller unormalt udflåd fra kønsorganerne?" },
      { da: "Er temperaturen 38 eller derover?" } ],
    cards: [
      [DO, "Skift ble ofte, og lad huden lufttørre."],
      [DO, "Brug zinksalve eller barrieresalve ved bleudslæt."],
      [DO, "Vask området med lunkent vand ved hvert bleskift, og undgå parfume og sæbe."],
      [DO, "Rød-orange pletter i bleen de første dage og hævede kønslæber eller pung er normalt og går over af sig selv."],
      [WATCH, "Hold øje med antallet af våde bleer, mørk urin og usædvanlig lugt."],
      [WATCH, "Hold øje med, om barnet virker smerteplaget ved vandladning."] ] },
  "infant-mother": { title: { da: "Nybagte mødre: efterfødselsreaktioner" }, updated: "3. juli 2026",
    questions: [
      { da: "Har du hallucinationer, vrangforestillinger eller føler dig forvirret?", redIf: "yes" },
      { da: "Har du akutte tanker om selvmord eller om at skade dig selv eller andre?", redIf: "yes" },
      { da: "Har du tanker om at skade dig selv eller dit barn?" },
      { da: "Har du overvældende angst eller panikanfald, der gør det svært at tage vare på dig selv eller barnet?" } ],
    cards: [
      [DO, "Del dine tanker med en partner, en ven eller familien."],
      [DO, "Prioritér søvn og hvile, når det er muligt, og tag imod hjælp til pasning."],
      [DO, "Gå en tur eller lav let motion, hvis det er muligt."],
      [DO, "Humørsvingninger efter fødslen er almindelige og går typisk over inden for to uger."],
      [WATCH, "Hold øje med vedvarende tristhed, manglende energi og negative følelser over for barnet."],
      [WATCH, "Hold øje med tanker om at skade dig selv eller barnet. Så skal du tale med en læge."] ] },

  // -------- adults, the remaining themes (akut.dk, 7. juli 2026). Danish only. --------
  "adult-headache": { title: { da: "Hovedpine" }, updated: "7. juli 2026",
    questions: [
      { da: "Kom hovedpinen pludseligt og meget kraftigt, som et smæld i baghovedet?", redIf: "yes" },
      { da: "Er der lammelser, talebesvær, synsforstyrrelser eller påvirket bevidsthed?", redIf: "yes" },
      { da: "Er der svær hovedpine sammen med nakkestivhed og høj feber?", redIf: "yes" },
      { da: "Er der opkastninger sammen med en ukendt, svær hovedpine?" },
      { da: "Er hovedpinen vedvarende sammen med hukommelses- eller koncentrationsbesvær?" } ],
    cards: [
      [DO, "Drik rigeligt væske, og sov tilstrækkeligt og regelmæssigt."],
      [DO, "Tænk over arbejdsstilling og blikretning for at undgå muskelspændinger."],
      [DO, "Motion, bevægelse og frisk luft kan hjælpe."],
      [DO, "Mild og moderat hovedpine kan oftest ses an med smertestillende håndkøbsmedicin."],
      [WATCH, "Hold øje med, om hovedpinen bliver ved eller kommer igen. Før gerne en hovedpinedagbog."],
      [WATCH, "Hold øje med opkastninger, usikker gang og psykiske ændringer."] ] },
  "adult-dizzy": { title: { da: "Svimmelhed" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der pludselig dobbeltsyn, synstab, talebesvær eller nedsat kraft i en arm eller et ben?", redIf: "yes" },
      { da: "Hænger den ene mundvig, eller kan personen ikke smile?", redIf: "yes" },
      { da: "Er der en trykkende fornemmelse i brystkassen?", redIf: "yes" },
      { da: "Forsvinder svimmelheden, når du ligger eller sidder helt stille?" },
      { da: "Har du sukkersyge, hjertesygdom, eller får du blodfortyndende medicin?" } ],
    cards: [
      [DO, "Sørg for at drikke og spise rigeligt."],
      [DO, "Rejs dig langsomt, hvis svimmelheden kommer, når du ændrer stilling."],
      [DO, "Anfald af svimmelhed som eneste symptom skyldes oftest ufarlige øresten. Anfaldene går over, når du holder dig i ro."],
      [DO, "Kvalme og ubehag ved pludselig svimmelhed er normalt."],
      [WATCH, "Hold øje med, om der kommer andre symptomer end svimmelhed, kvalme og opkast."],
      [WATCH, "Hold øje med, om svimmelheden er så udtalt, at du ikke kan tage vare på dig selv."] ] },
  "adult-toothache": { title: { da: "Tandpine" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der blødning efter tandudtrækning eller operation?" },
      { da: "Er der feber og påvirket almentilstand sammen med tandpinen?" },
      { da: "Er det en skade på tænderne, fx en tand, der er slået ud?" } ],
    cards: [
      [DO, "Den hyppigste årsag til tandpine er caries, der har bredt sig til tandnerven. Bestil tid hos din tandlæge, når klinikken åbner."],
      [DO, "Smertestillende håndkøbsmedicin kan lindre indtil da."],
      [DO, "Tandlægevagten kan hjælpe ved mindre tandskader og akut tandpine, når din tandlæge har lukket. Gratis for børn og unge under 22 år."],
      [WATCH, "Hold øje med feber og hævelse. Kun ved udbredt infektion er der brug for lægelig behandling."] ] },
  "adult-nosebleed": { title: { da: "Næseblod" }, updated: "7. juli 2026",
    questions: [
      { da: "Er blødningen stærk, og er du blevet akut dårlig og meget medtaget?", redIf: "yes" },
      { da: "Har blødningen varet mere end 30 minutter, selvom du har klemt om næsen?" },
      { da: "Kommer blødningen igen, efter den er stoppet?" },
      { da: "Er du i blodfortyndende behandling?" } ],
    cards: [
      [DO, "Sæt dig oprejst med hovedet let bøjet mod brystet."],
      [DO, "Klem med tommel- og pegefinger på begge sider midt på næsen i mindst 10 minutter uden at slippe."],
      [DO, "Spyt blodet ud. Synker du det, får du kvalme."],
      [DO, "En isklump i munden eller en kold klud over næseryggen kan lindre."],
      [WATCH, "Hold øje med, om blødningen stopper inden for 30 minutter."],
      [WATCH, "Pil ikke, og puds ikke næse i dagene efter, så den ikke begynder at bløde igen."] ] },
  "adult-chest": { title: { da: "Smerter og ubehag i brystet" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der trykkende, kraftige smerter i brystet, der ikke lindres ved hvile?", redIf: "yes" },
      { da: "Stråler smerterne ud i venstre arm, hals eller ryg, eller er der intens åndenød?", redIf: "yes" },
      { da: "Er der stærk svimmelhed, eller har personen været bevidstløs?", redIf: "yes" },
      { da: "Er der åndenød, stærk kvalme eller svimmelhed sammen med ømheden?" },
      { da: "Ryger du, eller har du sukkersyge, forhøjet blodtryk eller kendt hjertesygdom?" } ],
    cards: [
      [DO, "Forsøg at slappe af, og undgå overbelastning af brystmusklerne."],
      [DO, "Tag dybe, rolige vejrtrækninger, og prøv at ændre stilling for at se, om ubehaget mindskes."],
      [DO, "En varmepude på det ømme område og smertestillende håndkøbsmedicin kan lindre muskelsmerter."],
      [DO, "Går smerterne væk ved hvile eller ændret stilling, kan de ofte ses an."],
      [WATCH, "Hold øje med, om smerterne varer ved, forværres eller kommer igen uden tydelig grund."],
      [WATCH, "Hold øje med trykkende smerter, udstråling til arm, hals eller ryg, og åndenød."] ] },
  "adult-palpitations": { title: { da: "Hjertebanken" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der akutte, intense brystsmerter eller trykken for brystet?", redIf: "yes" },
      { da: "Er der stærkt besvær med vejrtrækningen, eller har personen mistet bevidstheden?", redIf: "yes" },
      { da: "Er der akut forvirring, synsforstyrrelser eller svær kraftnedsættelse i arme eller ben?", redIf: "yes" },
      { da: "Er der åndenød eller svimmelhed sammen med hjertebanken?" },
      { da: "Har hjertebanken varet mere end 20 til 30 minutter uden tydelig grund?" } ],
    cards: [
      [DO, "Forsøg at slappe af, og træk vejret roligt og dybt."],
      [DO, "Undgå koffein og alkohol. De kan øge hjertebanken."],
      [DO, "Læg mærke til, om noget udløser hjertebanken, fx stress eller anstrengelse."],
      [DO, "Hjertebanken, der kommer og går uden andre symptomer, kan ofte vente, til du kan tale med din egen læge."],
      [WATCH, "Hold øje med åndenød, svimmelhed og brystsmerter."],
      [WATCH, "Hold øje med, hvor længe det varer. Notér episoderne."] ] },
  "adult-bloodpressure": { title: { da: "Højt blodtryk" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der pludselige, intense brystsmerter eller åndenød?", redIf: "yes" },
      { da: "Er der svær hovedpine, der føles anderledes end normalt, sammen med forvirring, taleproblemer eller synsforstyrrelser?", redIf: "yes" },
      { da: "Har du målt over 160/100 flere gange?" },
      { da: "Er der svimmelhed, træthed eller hjertebanken, der ikke går væk ved hvile?" } ],
    cards: [
      [DO, "Skab rolige omgivelser, og fokusér på dybe, rolige vejrtrækninger."],
      [DO, "Drik rigeligt væske, og undgå koffein og alkohol."],
      [DO, "Har du et blodtryksapparat, så mål morgen og aften over flere dage, og se efter mønstre."],
      [DO, "Et moderat forhøjet blodtryk uden andre symptomer er for de fleste ikke akut farligt og kan vurderes af egen læge."],
      [WATCH, "Hold øje med brystsmerter, åndenød og svær hovedpine."],
      [WATCH, "Hold øje med symptomer, du ikke har oplevet før."] ] },
  "adult-boils": { title: { da: "Bylder" }, updated: "7. juli 2026",
    questions: [
      { da: "Er bylden på størrelse med en golfbold, eller vokser den hurtigt?" },
      { da: "Er området omkring bylden meget rødt, varmt eller hævet, eller er der feber?" },
      { da: "Sidder bylden i ansigtet, ved et led, nær endetarmen eller ved kønsorganerne?" },
      { da: "Har du diabetes eller svækket immunforsvar?" } ],
    cards: [
      [DO, "Læg en varm, fugtig klud på bylden i 15 til 20 minutter flere gange om dagen."],
      [DO, "Klem eller stik ikke i bylden. Det kan sprede infektionen."],
      [DO, "Vask hænder før og efter, og hold området rent med mild sæbe og vand."],
      [DO, "Paracetamol kan lindre efter behov."],
      [WATCH, "Hold øje med, om bylden vokser, om der kommer flere, og om du bliver alment utilpas."],
      [WATCH, "Hold øje med rødme og varme, der breder sig, og feber."] ] },
  "adult-sores": { title: { da: "Pludseligt opståede sår" }, updated: "7. juli 2026",
    questions: [
      { da: "Er såret dybt eller stort, eller bløder det kraftigt?" },
      { da: "Er der rødme, varme, hævelse eller pus, eller feber over 38?" },
      { da: "Er såret fra et bid fra et dyr eller et menneske?" },
      { da: "Har du diabetes eller svækket immunforsvar?" } ],
    cards: [
      [DO, "Skyl såret forsigtigt med lunkent vand."],
      [DO, "Dæk det med en ren forbinding eller plaster, og skift dagligt, eller hvis det bliver vådt."],
      [DO, "Pil ikke i såret eller skorperne. Giv det luft, når det er muligt."],
      [DO, "Paracetamol kan lindre efter behov."],
      [WATCH, "Hold øje med tegn på infektion: rødme, varme, hævelse, pus og feber."],
      [WATCH, "Hold øje med smerter, der ikke lindres af smertestillende."] ] },
  "adult-rash": { title: { da: "Udslæt og prikker" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der små røde eller lilla prikker, der ikke blegner, når du trykker på dem?", redIf: "yes" },
      { da: "Er der nakkestivhed, lysskyhed, forvirring eller påvirket bevidsthed?", redIf: "yes" },
      { da: "Er der hævelse i ansigt eller hals eller vejrtrækningsbesvær?", redIf: "yes" },
      { da: "Breder rødmen sig hurtigt, eller er der feber og kulderystelser?", redIf: "yes" },
      { da: "Er udslættet udbredt sammen med feber over 38?" } ],
    cards: [
      [DO, "Undgå nye hudplejeprodukter, vaskemidler eller fødevarer, der kan være årsagen."],
      [DO, "En kølig, fugtig klud på området kan lindre. Vask med mild sæbe og vand."],
      [DO, "Brug mild fugtighedscreme uden parfume, og løst bomuldstøj."],
      [DO, "Krads ikke. Antihistamin mod kløe efter aftale med en sundhedsfaglig."],
      [WATCH, "Hold øje med, om udslættet spreder sig hurtigt, væsker eller danner blærer."],
      [WATCH, "Hold øje med feber, hovedpine og muskelsmerter sammen med udslættet."] ] },
  "adult-ear": { title: { da: "Ondt i øret" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der uudholdelige smerter trods smertestillende håndkøbsmedicin?" },
      { da: "Stritter øret mere end normalt, eller er der udtalt ømhed bag øret?" },
      { da: "Er der rødme eller hævelse af øret eller øregangen?" },
      { da: "Er der trykkende hovedpine, svimmelhed eller høretab?" } ],
    cards: [
      [DO, "Smertestillende håndkøbsmedicin lindrer."],
      [DO, "Smerterne forsvinder næsten altid af sig selv inden for 3 døgn."],
      [DO, "Pus eller blod fra øret er ufarligt. Det er et lille hul på trommehinden, som lukker af sig selv, og smerterne aftager straks."],
      [WATCH, "Hold øje med, om øret stritter, eller om der er ømhed bag øret."],
      [WATCH, "Hold øje med, om du bliver så syg, at du ikke kan stå på benene."] ] },
  "adult-eye": { title: { da: "Rødt øje" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der pludseligt synstab på et eller begge øjne?", redIf: "yes" },
      { da: "Er der kraftige eller dybe smerter i eller omkring øjet?" },
      { da: "Er synet nedsat, ændret eller sløret, eller er du lyssky?" },
      { da: "Har pupillerne forskellig størrelse?" } ],
    cards: [
      [DO, "Vask og sprit hænder, og gnid ikke i øjnene."],
      [DO, "Rens øjenlåget flere gange dagligt, og fjern pus med vatrondeller vædet i kogt, afkølet vand. Ny vatrondel til hvert øje, fra øjenkrogen og ud mod øret."],
      [DO, "Brug briller, ikke kontaktlinser, til infektionen er ovre."],
      [DO, "Et rødt øje uden væsentlige smerter er som regel ufarligt og går over."],
      [WATCH, "Hold øje med smerter, synsændringer og lysskyhed."],
      [WATCH, "Hold øje med pupillerne."] ] },
  "adult-stye": { title: { da: "Bygkorn" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der kraftige eller dybe smerter i eller omkring øjet?" },
      { da: "Breder rødme og hævelse sig ud over øjenlåget?" },
      { da: "Er der pus fra øjenlåget?" } ],
    cards: [
      [DO, "Væd en stofklud med varmt vand, og læg den på øjenlåget 3 til 4 gange dagligt i 10 til 15 minutter."],
      [DO, "Massér blidt med kluden i kirtlernes retning: øvre øjenlåg fra øjenbrynet mod hagen, nedre øjenlåg omvendt."],
      [DO, "Tilstanden heler normalt af sig selv."],
      [WATCH, "Hold øje med, om rødme og hævelse breder sig, og om der kommer pus."] ] },
  "adult-bleeding": { title: { da: "Unormale blødninger" }, updated: "7. juli 2026",
    questions: [
      { da: "Er du svimmel eller ved at besvime?" },
      { da: "Skal du skifte bind hver time eller oftere?" },
      { da: "Er der store blodklumper?" },
      { da: "Er der smerter i underlivet og feber over 38?" },
      { da: "Er du gravid?" } ],
    cards: [
      [DO, "Notér blødningens mængde, farve og varighed."],
      [DO, "Brug hygiejnebind, ikke tamponer."],
      [DO, "Hold dig i ro, og få hvilet."],
      [DO, "Undgå samleje, til årsagen er afklaret."],
      [WATCH, "Hold øje med mængden: bind hver time eller oftere, og store klumper."],
      [WATCH, "Er du gravid, skal enhver blødning drøftes med en sundhedsfaglig."] ] },
  "adult-mastitis": { title: { da: "Brystbetændelse" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der feber på 38 eller derover?" },
      { da: "Er der rødme, varme eller hævelse i brystet?" },
      { da: "Er der en hård knude, der ikke bliver mindre efter amning?" },
      { da: "Er der pus eller unormalt udflåd fra brystvorten?" } ],
    cards: [
      [DO, "Am hyppigt. Start med det ømme bryst, og tøm det helt."],
      [DO, "Brug varme omslag før amning, og massér forsigtigt det ømme område mod brystvorten under amning."],
      [DO, "Kolde omslag efter amning kan mindske hævelse og smerter."],
      [DO, "Paracetamol eller ibuprofen efter behov."],
      [WATCH, "Hold øje med feber, rødme og varme."],
      [WATCH, "Hold øje med, om smerterne bliver værre eller ikke forsvinder efter et par dage."] ] },
  "adult-postnatal": { title: { da: "Efterfødselsgener" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der pludselige, stærke smerter i maven eller bækkenet?" },
      { da: "Gennembløder du mere end ét bind i timen i flere timer, eller er der klumper på størrelse med en bordtennisbold?" },
      { da: "Føler du dig svimmel eller tæt på at besvime?" },
      { da: "Er der feber på 38 eller derover sammen med ildelugtende eller misfarvet udflåd?" },
      { da: "Er der rødme, hævelse, varme eller pus ved kejsersnitssår eller bristninger?" } ],
    cards: [
      [DO, "Sørg for søvn og hvile, og undgå tunge løft de første uger."],
      [DO, "Skift hygiejnebind regelmæssigt, og vask hænder før og efter toiletbesøg."],
      [DO, "Tag brusebad i stedet for karbad."],
      [DO, "Paracetamol efter behov, og en varmepude på ømme områder."],
      [WATCH, "Hold øje med blødningens mængde, og om den pludselig bliver kraftigere."],
      [WATCH, "Hold øje med udflåd, der lugter eller skifter farve, og med smerter ved vandladning."] ] },
  "adult-pregnancy-bleeding": { title: { da: "Graviditet og blødning" }, updated: "7. juli 2026",
    questions: [
      { da: "Bløder du kraftigt og gennembløder flere bind i timen?", redIf: "yes" },
      { da: "Føler du dig svimmel, tæt på at besvime, eller har du hjertebanken?", redIf: "yes" },
      { da: "Er der feber over 38 sammen med blødningen?" },
      { da: "Er der smerter, kramper eller sammentrækninger sammen med blødningen?" },
      { da: "Er du efter uge 20, og mærker du mindre liv?" } ],
    cards: [
      [DO, "Notér blødningens mængde, farve og varighed."],
      [DO, "Brug hygiejnebind, ikke tamponer."],
      [DO, "Hold dig i ro, og undgå anstrengelse og samleje, til årsagen er afklaret."],
      [DO, "Let pletblødning kan forekomme i graviditeten og er ikke altid tegn på noget alvorligt."],
      [WATCH, "Hold øje med mængden, og om blødningen tiltager."],
      [WATCH, "Hold øje med smerter, feber og mindre liv."] ] },
  "adult-pregnancy-pain": { title: { da: "Graviditetssmerter og hovedpine" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der hovedpine med synsforstyrrelser som sløret syn eller lysglimt?" },
      { da: "Er der kraftige eller tiltagende mavesmerter, især øverst til højre under ribbenene?" },
      { da: "Er der smerter sammen med blødning fra skeden, eller feber over 38?" },
      { da: "Er der svimmelhed, kvalme eller opkast sammen med hovedpinen?" } ],
    cards: [
      [DO, "Sørg for hvile og søvn, og drik rigeligt vand."],
      [DO, "Tag pauser i løbet af dagen, og undgå stress."],
      [DO, "Ved mavesmerter: spis små, hyppige måltider, og undgå fed eller krydret mad."],
      [DO, "Brug behageligt tøj, der ikke strammer, og støttende fodtøj."],
      [WATCH, "Hold øje med hovedpine, der ikke lindres af håndkøbsmedicin, og synsforstyrrelser."],
      [WATCH, "Hold øje med smerter øverst til højre i maven, blødning og feber."] ] },
  "adult-pelvic": { title: { da: "Smerter i underlivet" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der svimmelhed, besvimelse eller hjertebanken?" },
      { da: "Er der feber over 38?" },
      { da: "Er der blødning fra skeden eller unormalt udflåd?" },
      { da: "Er der kvalme eller opkast sammen med smerterne?" },
      { da: "Kan du være gravid?" } ],
    cards: [
      [DO, "Tag det roligt, og undgå anstrengende aktiviteter."],
      [DO, "Find en behagelig stilling, der lindrer."],
      [DO, "En varmepude eller et varmt bad kan lindre milde smerter."],
      [DO, "Paracetamol efter anvisning. Undgå ibuprofen, hvis du er gravid."],
      [WATCH, "Hold øje med, om smerterne varer ved eller bliver værre."],
      [WATCH, "Hold øje med feber, blødning, udflåd og smerter ved vandladning eller afføring."] ] },
  "adult-miscarriage": { title: { da: "Spontan abort" }, updated: "7. juli 2026",
    questions: [
      { da: "Er der kraftig blødning eller blødning med klumper?" },
      { da: "Er der mavesmerter eller kramper sammen med blødningen?" },
      { da: "Er der udflåd med vævslignende materiale?" } ],
    cards: [
      [DO, "Hvil dig, og undgå anstrengende aktiviteter."],
      [DO, "Notér mængden og typen af blødning."],
      [DO, "Tal med en pårørende eller en professionel om dine bekymringer og følelser."],
      [WATCH, "Hold øje med smerternes intensitet og varighed."],
      [WATCH, "Spontane aborter er relativt almindelige i tidlig graviditet. Du er ikke alene om det."] ] },

  // -------- injuries (akut.dk, "Skade", 22. juni 2026). Danish only. --------
  "injury-head": { title: { da: "Slået hovedet" }, updated: "22. juni 2026",
    questions: [
      { da: "Har personen været bevidstløs i mere end 2 til 3 minutter, eller er vejrtrækningen unormal?", redIf: "yes" },
      { da: "Er der kramper eller gentagne besvimelser?", redIf: "yes" },
      { da: "Er personen faldet fra stor højde?", redIf: "yes" },
      { da: "Har personen været besvimet eller haft hukommelsestab?" },
      { da: "Er der tiltagende hovedpine eller gentagne opkastninger?" },
      { da: "Er personen forvirret, usammenhængende eller svær at vække?" } ],
    cards: [
      [DO, "Hold dig i ro: undgå fysisk anstrengelse, stress, rusmidler og skærm."],
      [DO, "Paracetamol, så længe du har ondt. Undgå ibuprofen og acetylsalicylsyre."],
      [DO, "Vær ikke alene det første døgn efter et kraftigt slag."],
      [DO, "Det er normalt at være fortumlet i minutterne lige efter slaget."],
      [WATCH, "Hold øje med bevidsthedsniveauet det første døgn: forvirring, sløvhed, svær at vække."],
      [WATCH, "Hold øje med tiltagende hovedpine og gentagne opkastninger."] ] },
  "injury-fall": { title: { da: "Fald, vrid og slag" }, updated: "22. juni 2026",
    questions: [
      { da: "Er der en synlig fejlstilling, eller stikker knogle ud gennem huden?", redIf: "yes" },
      { da: "Kan du støtte på eller bruge det?" },
      { da: "Er hævelsen kommet inden for få minutter?" },
      { da: "Er der følelsesløshed eller kulde nedenfor skaden?" } ],
    cards: [
      [DO, "Aflast det skadede område de første par dage. Lidt bevægelse til smertegrænsen er godt."],
      [DO, "Køl med is i 20 minutter hver time i mindst 3 timer. Det virker bedst det første døgn."],
      [DO, "Brug støttebind eller forbinding om dagen, ikke om natten, og hold skadestedet over hjertehøjde, når du hviler."],
      [DO, "Smertestillende håndkøbsmedicin til de akutte smerter."],
      [WATCH, "Det er normalt, at bevægeligheden mindskes det første døgn, fordi leddet hæver."],
      [WATCH, "Hold øje med, om du kan støtte, og om der er følelsesløshed eller kulde nedenfor skaden."] ] },
  "injury-wound": { title: { da: "Sår og flænger" }, updated: "22. juni 2026",
    questions: [
      { da: "Er der en stærk blødning, der måske pulserer, og som ikke stopper efter 10 minutters tryk?", redIf: "yes" },
      { da: "Er der synlige muskler, knogler eller organer i såret?", redIf: "yes" },
      { da: "Er personen besvimet eller klamtsvedende?", redIf: "yes" },
      { da: "Er såret mere end 2 til 3 cm langt, eller gaber det?" },
      { da: "Er der fremmedlegemer eller snavs i såret?" },
      { da: "Er det mere end 10 år siden sidste stivkrampevaccination, eller 5 år, hvis der er jord i såret?" } ],
    cards: [
      [DO, "Stop blødningen: tryk med et rent stykke tøj i mindst 5 minutter, og hold såret over hjertehøjde."],
      [DO, "Rens såret med rent, rindende vand og eventuelt mild sæbe."],
      [DO, "Dæk det med en ren bandage eller plaster. Skift dagligt, eller hvis det bliver vådt."],
      [DO, "Sår på kroppen skal sys inden 6 timer, i ansigtet inden 24 timer, hvis de skal sys."],
      [WATCH, "Hold øje med, om blødningen stopper inden for 20 til 30 minutter med tryk."],
      [WATCH, "Hold øje med tegn på infektion: rødme, varme, hævelse, dunkende smerter og feber."] ] },
  "injury-foreign": { title: { da: "Fremmedlegemer" }, updated: "22. juni 2026",
    questions: [
      { da: "Er luftvejene blokerede, eller er personen bevidstløs?", redIf: "yes" },
      { da: "Er der slugt magneter, batterier, skarpe genstande eller noget større end 2 cm?" },
      { da: "Sidder fremmedlegemet i øret eller endetarmen?" },
      { da: "Sidder der noget fast i hud, næse eller øje, som ikke kan fjernes?" } ],
    cards: [
      [DO, "I øjet: gnid ikke. Hold øjenlågene åbne, og skyl under lunkent rindende vand et par gange."],
      [DO, "I huden: vask med vand og sæbe, steriliser en nål i en flamme, åbn huden let, og brug en pincet."],
      [DO, "I næsen hos børn: hold det frie næsebor lukket, og blæs kraftigt og hurtigt ind i barnets mund."],
      [DO, "I øre og endetarm: forsøg ikke selv. Det skubber genstanden dybere ind."],
      [WATCH, "Slugte genstande under 2 cm giver som oftest ikke gener."],
      [WATCH, "Hold øje med pludselige mavesmerter efter slugte genstande."] ] },
  "injury-burn": { title: { da: "Forbrænding" }, updated: "22. juni 2026",
    questions: [
      { da: "Er forbrændingen større end personens egen håndflade?" },
      { da: "Sidder den i ansigtet, på kønsorganerne eller ved et led, eller går den hele vejen rundt om en arm eller et ben?" },
      { da: "Er den forårsaget af elektricitet eller kemi?" },
      { da: "Er det et barn under ét år?" },
      { da: "Er der stadig smerter efter tre timers afkøling?" } ],
    cards: [
      [DO, "Tag tøjet af det forbrændte område, hvis det er muligt."],
      [DO, "Skyl straks med koldt eller lunkent vand, ca. 15 grader, i mindst 30 minutter og til smertefrihed."],
      [DO, "Smertefrihed er, når der ikke er smerte i 15 minutter efter afkølingen."],
      [DO, "Brandsår væsker meget og bør forbindes de første 10 dage. Lad forbindingen sidde."],
      [WATCH, "Hold øje med, om du er smertefri efter tre timer."],
      [WATCH, "Hold øje med infektion i dagene efter: lugt, ny pludselig smerte eller feber."] ] },
  "injury-tooth": { title: { da: "Tandskade" }, updated: "22. juni 2026",
    questions: [
      { da: "Er det en blivende tand, der er slået ud?" },
      { da: "Er der blødning efter tandudtrækning eller operation?" },
      { da: "Er det en mælketand?" } ],
    cards: [
      [DO, "En udslået blivende tand skal sættes på plads hurtigst muligt. Skyl den 10 sekunder i koldt vand, hvis den er snavset."],
      [DO, "Rør ikke roden. Det kan fjerne rodfibrene."],
      [DO, "Kan tanden ikke sættes i, så opbevar den i munden, i mælk eller i saltvand på vej til tandlægen."],
      [DO, "Man gør ikke noget ved en mistet mælketand."],
      [WATCH, "Behandling af alvorlige tandskader og efterblødninger er gratis på Regionens Tandlægevagt."] ] },
  "injury-poison": { title: { da: "Forgiftning" }, updated: "28. september 2026",
    questions: [
      { da: "Er personen bevidstløs, eller er vejrtrækningen påvirket?", redIf: "yes" },
      { da: "Ved du, hvad personen har indtaget?" },
      { da: "Er det medicin, rusmidler, kemikalier, planter eller svampe?" } ],
    cards: [
      [DO, "Ring til Giftlinjen på 8212 1212. Den er åben hele døgnet, og du taler med en specialuddannet læge eller sygeplejerske."],
      [DO, "Hav emballagen eller navnet på det indtagne klar."],
      [DO, "Giftlinjen beder om navn, CPR-nummer og telefonnummer."],
      [WATCH, "Hold øje med bevidsthed og vejrtrækning."] ] },

  // -------- straight through: no questions, no cards (akut.dk "psykiatrisk hjælp"; sexual assault) --------
  "direct": { title: { da: "Akut hjælp", en: "Acute help" }, updated: "", questions: [], cards: [
      [{ da: "Du er den næste", en: "You are next" }, "En sundhedsfaglig medarbejder tager telefonen om lidt og hjælper dig videre.", "A healthcare professional will answer shortly and help you on."] ] },

  // -------- when we have no page for the choice --------
  "general": { title: { da: "Mens du venter", en: "While you wait" }, updated: "",
    questions: [
      { da: "Er det kommet pludseligt?", en: "Did it come on suddenly?" },
      { da: "Er der smerter?", en: "Is there pain?" },
      { da: "Er der feber?", en: "Is there a fever?" } ],
    cards: [
      [{ da: "Mens du venter", en: "While you wait" }, "Har du en medicinliste, så hav den ved hånden.", "If you have a medication list, keep it at hand."],
      [{ da: "Mens du venter", en: "While you wait" }, "Sæt dig et roligt sted, hvor du kan tale frit.", "Sit somewhere quiet where you can talk freely."],
      [{ da: "Mens du venter", en: "While you wait" }, "Sygeplejersken vil spørge, hvornår det startede, og om det er blevet værre.", "The nurse will ask when it started and whether it has got worse."] ] }
};

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
    { da: "Mave og tarm", en: "Stomach and bowel", sub: [["Gylp og opkast", "Spitting up and vomiting", null], ["Diarré", "Diarrhoea", null], ["Forstoppelse", "Constipation", null], ["Dehydrering", "Dehydration", null]] },
    { da: "Sløvhed", en: "Drowsiness", sub: [["Sløvhed og slaphed", "Drowsy and limp", null], ["Nedsat appetit", "Reduced appetite", null]] },
    { da: "Feber og infektion", en: "Fever and infection", sub: [["Feber over 38 grader", "Fever above 38 degrees", null]] },
    { da: "Påvirket vejrtrækning", en: "Affected breathing", sub: [["Besværet vejrtrækning", "Laboured breathing", null], ["Tilstoppet næse", "Blocked nose", null], ["Ændret hudfarve", "Changed skin colour", null]] },
    { da: "Smerter", en: "Pain", sub: [["Smerter og gråd", "Pain and crying", null], ["Spiseproblemer", "Feeding problems", null]] },
    { da: "Ansigt, øjne og mundhule", en: "Face, eyes and mouth", sub: [["Øjenbetændelse", "Eye infection", null], ["Trøske", "Thrush", null]] },
    { da: "Hud", en: "Skin", sub: [["Gulsot", "Jaundice", null], ["Udslæt", "Rash", null]] },
    { da: "Urinveje og kønsorganer", en: "Urinary tract and genitals", sub: [["Bleudslæt", "Nappy rash", null], ["Hævelse", "Swelling", null]] }
  ],
  child: [
    { da: "Feber", en: "Fever", sub: [["Feber", "Fever", "child-fever"], ["Forkølelse", "Common cold", "child-fever"], ["Virus", "Virus", "child-fever"]] },
    { da: "Ondt i halsen", en: "Sore throat", sub: [["Halsbetændelse", "Throat infection", "child-throat"], ["Hævede og ømme kirtler på halsen", "Swollen, tender glands in the neck", "child-throat"]] },
    { da: "Ondt i maven", en: "Stomach ache", sub: [["Mavesmerter", "Stomach pain", "child-stomach"], ["Forstoppelse", "Constipation", "child-stomach"], ["Maveinfektion", "Stomach infection", "child-stomach"]] },
    { da: "Ondt i øret", en: "Earache", sub: [["Mellemørebetændelse", "Middle ear infection", "child-ear"], ["Hul på trommehinden", "Burst eardrum", "child-ear"]] },
    { da: "Udslæt", en: "Rash", sub: [["Udslæt", "Rash", "child-rash"], ["Huden er varm, hævet og øm", "Skin is warm, swollen and tender", "child-rash"], ["Røde prikker", "Red spots", "child-rash"]] },
    { da: "Vejrtrækningsbesvær", en: "Breathing difficulty", sub: [["Tung vejrtrækning", "Heavy breathing", "child-breathing"], ["Infektion i luftvejene", "Airway infection", "child-breathing"]] },
    { da: "Opkast og diarré", en: "Vomiting and diarrhoea", sub: [["Opkast", "Vomiting", "child-vomiting"], ["Diarré", "Diarrhoea", "child-vomiting"], ["Dehydrering", "Dehydration", "child-vomiting"]] },
    { da: "Røde øjne", en: "Red eyes", sub: [["Øjenbetændelse", "Eye infection", "child-eyes"], ["Pus i øjnene", "Pus in the eyes", "child-eyes"], ["Pollenallergi", "Pollen allergy", "child-eyes"]] }
  ],
  adult: [
    { da: "Feber", en: "Fever", sub: [["Feber", "Fever", "adult-fever"], ["Forkølelse og virusinfektion", "Cold and viral infection", "adult-fever"]] },
    { da: "Hovedet", en: "Head", sub: [["Hovedpine", "Headache", null], ["Svimmelhed", "Dizziness", null], ["Næseblod", "Nosebleed", null], ["Tandpine", "Toothache", null]] },
    { da: "Hals og luftveje", en: "Throat and airways", sub: [["Hoste", "Cough", "adult-cough"], ["Ondt i halsen", "Sore throat", "adult-throat"], ["Forkølelse", "Common cold", "adult-cold"], ["Bihulebetændelse", "Sinusitis", "adult-cold"], ["Influenza", "Flu", "adult-flu"], ["Astma", "Asthma", "adult-asthma"]] },
    { da: "Bryst og øvre ryg", en: "Chest and upper back", sub: [["Åndedrætsbesvær", "Breathing difficulty", null], ["Smerter og ubehag", "Pain and discomfort", null], ["Hjertebanken", "Palpitations", null], ["Højt blodtryk", "High blood pressure", null]] },
    { da: "Mave og urinveje", en: "Stomach and urinary tract", sub: [["Diarré og opkast", "Diarrhoea and vomiting", "adult-vomiting"], ["Mavesmerter", "Stomach pain", "adult-stomach"], ["Blærebetændelse", "Cystitis", "adult-urinary"], ["Forstoppelse", "Constipation", "adult-constipation"], ["Brok", "Hernia", null], ["Testikelbetændelse", "Testicle inflammation", null]] },
    { da: "Huden", en: "Skin", sub: [["Bylder", "Boils", null], ["Pludseligt opståede sår", "Sudden sores", null], ["Udslæt og prikker", "Rash and spots", null]] },
    { da: "Pludselige smerter", en: "Sudden pain", sub: [["Nakke", "Neck", "adult-pain-neck"], ["Lænd", "Lower back", "adult-pain-back"], ["Arme og hænder", "Arms and hands", "adult-pain-arms"], ["Ben og fødder", "Legs and feet", "adult-pain-legs"]] },
    { da: "Ører og øjne", en: "Ears and eyes", sub: [["Ondt i øret", "Earache", null], ["Røde øjne", "Red eyes", null], ["Bygkorn", "Stye", null]] },
    { da: "Graviditet og gynækologi", en: "Pregnancy and gynaecology", sub: [["Smerter", "Pain", null], ["Blødning", "Bleeding", null], ["Spontan abort", "Miscarriage", null], ["Brystbetændelse", "Mastitis", null]] }
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

# 1813 · venteunivers

Prototype af et venteunivers til Akuttelefonen 1813. Semesterprojekt, Advanced Design Processes, ITU efterår 2026 (gruppe 10). Ikke Region Hovedstadens app.

Bygget i p5.js. Råd og struktur fra akut.dk (Region Hovedstadens Akutberedskab).

## Sådan testes den (Expo)
1. Åbn linket på en iPhone, læg den evt. på hjemmeskærmen (Del → Føj til hjemmeskærm).
2. Testleder: tryk tre gange hurtigt på "1813" øverst. Vælg scenariekort, støj i høretelefonerne, ventetid og køstatus-stil, og tryk "Start test forfra".
3. Deltageren åbner sms'en, ser indledningen, og bruger appen. Når ventetiden er gået, "tager sygeplejersken telefonen", og appen stiller tre spørgsmål. Svarene gemmes i telefonen og kan kopieres som CSV fra testlederpanelet.

## Fjernstyring fra en anden telefon
Åbn `testleder.html` på testlederens telefon (samme mappe som appen, fx .../1813-venteskaerm/testleder.html). Begge telefoner skal være på nettet. Appen og fjernstyringen taler sammen gennem en offentlig MQTT-broker (broker.emqx.io) i et "rum", som standard `gruppe10`. Vil I have jeres eget rum, så åbn begge sider med `?rum=jeresnavn`. Fra fjernstyringen kan man vælge alder, version, støj, ventetid og køstatus, starte testen, springe frem, lade sygeplejersken svare, sende en "ny situation" som pop op (deltageren vælger "Bliv i køen" eller "Læg på og ring 112"), og hente resultaterne som CSV.

## Slutningen: jeres egen stemme
Læg en lydfil med navnet `lyd/svar-1813.mp3` i mappen (fx "1813, du taler med Mette, hvad kan jeg hjælpe med?"). Findes filen, afspilles den i det øjeblik sygeplejersken "tager telefonen", i begge versioner. Findes den ikke, siger den syntetiske stemme det i stedet.

## Kontrolbetingelse
Alt er ens i de to betingelser (alder, støj, pludselige lyde, optrapning, ny situation, ventetid, dukke, sygeplejerskens svar, de tre spørgsmål). Det eneste, der skifter, er det, 1813 giver deltageren i ventetiden.
Vælg "1813 i dag" under Version. Deltageren får så et almindeligt opkaldsbillede, ventemusik gennem telefonfilter og beskeden "Du er nummer N i køen. Ved livstruende sygdom eller tilskadekomst, læg på og ring 112" hvert 30. sekund. Samme støj, samme ventetid og samme tre spørgsmål bagefter, så de to versioner kan sammenlignes.

Tastatur på computer: n = nat/dag, v = stemme, m = musik, t = testlederpanel, mellemrum = spring 30 sekunder frem.

## Lyd
- Musik fra Pixabay: "Golden Sunset Piano Music" (clavier-music) og "Radiant Mindfulness" (BreakzStudios). Ventemusikken i kontrolbetingelsen er Vivaldis "Forår" (The Modena Chamber Orchestra, public domain, Wikimedia Commons) sendt gennem et telefonfilter, som generisk ventemusik.
- Fjernstyring: MQTT.js (MIT) i `libraries/mqtt.min.js`.
- Støj til testen fra Wikimedia Commons, klippet til 60 sekunder, normaliseret og gemt uden ID3-mærkat (iPhone afkoder ellers ikke filen). Valget følger alderen: 0 til 3 måneder = babygråd; 4 måneder til 12 år = babygråd eller børn der larmer; 13 år og op = trafik, storm, folk der snakker, blandet eller skiftende.
  - Babygråd: "Crying newborn baby", the_yura, CC0.
  - Børn der larmer: "Ambient sound children playing in a park 2026-05-19", Schlurcher, CC BY-SA 4.0.
  - Trafik (mix): "2023-Mai-20 14h38min Wien äußerer Lerchenfelder Gürtel Thaliagasse Sirene autos motorrad", DrTrumpet, CC BY-SA 4.0, og "Audio sound of a busy traffic in Porthacourt", ElemePodcast, CC BY 4.0.
  - Storm (mix): "Summer thunderstorm in the woods", Serg Childed; "Mansoura city weather, Heavy rains and thunder", Aimty17; "Thunder.wav", Subhashish Panigrahi; "Thunder 01", Amuzujoe. Alle CC BY-SA 4.0.
  - Folk der snakker: "Restaurant ambience", stephan, public domain.
  - Bildyt (pludselig lyd): "Car Horn", 15HPanska_Ruttner_Jan, CC0. Telefon og dørklokke er syntetiske.

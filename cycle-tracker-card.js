// cycle-tracker-card.js v4
// Lovelace Custom Card – Cycle Tracker
// v4: istoricul salvat în HA prin servicii (add_past_cycle / delete_cycle)

function smartLen(history, haLen) {
  if (history.length < 2) return haLen || 28;
  const s = [...history].sort((a, b) => new Date(a) - new Date(b));
  const lens = [];
  for (let i = 1; i < s.length; i++) {
    const d = Math.round((new Date(s[i]) - new Date(s[i-1])) / 86400000);
    if (d >= 15 && d <= 50) lens.push(d);
  }
  return lens.length ? Math.round(lens.reduce((a,b)=>a+b) / lens.length) : haLen || 28;
}

function isIrregular(h) {
  if (h.length < 3) return false;
  const s = [...h].sort((a,b) => new Date(a)-new Date(b));
  const lens = [];
  for (let i = 1; i < s.length; i++) {
    const d = Math.round((new Date(s[i])-new Date(s[i-1]))/86400000);
    if (d >= 15 && d <= 50) lens.push(d);
  }
  if (lens.length < 2) return false;
  const avg = lens.reduce((a,b)=>a+b)/lens.length;
  return Math.sqrt(lens.reduce((a,b)=>a+Math.pow(b-avg,2)/lens.length,0)) > 4;
}

function trendDir(h) {
  if (h.length < 4) return null;
  const s = [...h].sort((a,b)=>new Date(a)-new Date(b));
  const lens = [];
  for (let i = 1; i < s.length; i++) {
    const d = Math.round((new Date(s[i])-new Date(s[i-1]))/86400000);
    if (d >= 15 && d <= 50) lens.push(d);
  }
  if (lens.length < 3) return null;
  const hh = Math.floor(lens.length/2);
  const a1 = lens.slice(0,hh).reduce((a,b)=>a+b)/hh;
  const a2 = lens.slice(-hh).reduce((a,b)=>a+b)/hh;
  if (a2-a1 > 2) return 'longer';
  if (a1-a2 > 2) return 'shorter';
  return 'stable';
}

const FERT_PCT = { maxim:98, foarte_inalt:80, inalt:55, moderat:25, scazut:5 };
const FERT_LBL = { maxim:'Maxim', foarte_inalt:'Foarte înalt', inalt:'Înalt', moderat:'Moderat', scazut:'Scăzut' };

// Recomandări rotative per fază — se selectează în funcție de ziua ciclului
const RECS = {
  menstruatie: [
    [{i:'🛁',t:'<strong>Căldură locală:</strong> Pernă termică sau plasture termic pe abdomen — reduce crampele cu până la 40%.'},
     {i:'🥗',t:'<strong>Fier hemic:</strong> Carne slabă de vită, ficat, spanac + vitamina C pentru absorbție optimă.'},
     {i:'🧘',t:'<strong>Yoga yin:</strong> Postura Child\'s Pose și Supta Baddha Konasana relaxează musculatura pelvică.'},
     {i:'💧',t:'<strong>Hidratare:</strong> Cel puțin 2L apă/zi — reduce balonarea și crampele.'}],
    [{i:'🫖',t:'<strong>Ceai de ghimbir:</strong> 2-3 căni/zi — efect antiinflamator similar ibuprofenului în doze mici.'},
     {i:'🐟',t:'<strong>Omega-3:</strong> Somon, sardine sau semințe de in — reduc prostaglandinele care cauzează crampe.'},
     {i:'🚶',t:'<strong>Mers ușor 20-30 min:</strong> Eliberează endorfine care calmează durerea natural.'},
     {i:'😴',t:'<strong>Somn extra:</strong> Corpul folosește mai multă energie — dormi cu 30-60 min în plus dacă poți.'}],
    [{i:'🧆',t:'<strong>Linte și leguminoase:</strong> Fier non-hemic + fibre — combate oboseala și susține digestia.'},
     {i:'🍫',t:'<strong>Ciocolată neagră >70%:</strong> Magneziu natural + efect antioxidant. 2-3 pătrate sunt suficiente.'},
     {i:'🛀',t:'<strong>Baie caldă cu sare Epsom:</strong> Magneziul transdermic relaxează musculatura.'},
     {i:'📵',t:'<strong>Limitează cafeina:</strong> Crește cortizolul și poate intensifica crampele și anxietatea.'}],
    [{i:'🌡️',t:'<strong>Antiinflamatoare naturale:</strong> Curcumă + piper negru în mâncare sau ceai.'},
     {i:'🥬',t:'<strong>Vitamina K2:</strong> Kale, broccoli, varză de Bruxelles — susțin coagularea normală.'},
     {i:'🎵',t:'<strong>Muzică și relaxare:</strong> Cortizolul scăzut în această fază face meditația mai eficientă.'},
     {i:'🩺',t:'<strong>Ciclu dureros?</strong> Dismenoreea severă poate indica endometrioză — discută cu medicul.'}],
  ],
  foliculara: [
    [{i:'🏋️',t:'<strong>Forță maximă:</strong> Estrogenul crește rezistența musculară — ideal pentru antrenamente intense.'},
     {i:'🥦',t:'<strong>Legume crucifere:</strong> Broccoli, kale, varză — susțin metabolizarea estrogenului prin ficatul.'},
     {i:'🎯',t:'<strong>Proiecte noi:</strong> Claritate mentală crescută — creierul formează conexiuni noi mai ușor.'},
     {i:'🌿',t:'<strong>Zinc + seleniu:</strong> Susțin maturarea foliculilor. Surse: semințe de dovleac, nuci braziliene.'}],
    [{i:'🏃',t:'<strong>Cardio cu intensitate mare:</strong> HIIT, alergare — recuperarea musculară e mai rapidă acum.'},
     {i:'🥚',t:'<strong>Proteine de calitate:</strong> Ouă, leguminoase, tofu — susțin sinteza hormonală.'},
     {i:'💡',t:'<strong>Brainstorming:</strong> Creativitatea și memoria de lucru sunt la vârf — planifică, inovează.'},
     {i:'☀️',t:'<strong>Vitamina D:</strong> Expunere solară 15-20 min sau supliment 1000-2000 UI — esențial pentru folicul.'}],
    [{i:'🫐',t:'<strong>Antioxidanți:</strong> Afine, căpșune, rodie — protejează foliculii de stresul oxidativ.'},
     {i:'🧠',t:'<strong>Învățare:</strong> Estrogenul facilitează neuroplasticitatea — ideal pentru cursuri sau abilități noi.'},
     {i:'💪',t:'<strong>Volum de antrenament:</strong> Poți crește cu 10-15% față de faza luteală — corpul se adaptează mai ușor.'},
     {i:'🥑',t:'<strong>Grăsimi sănătoase:</strong> Avocado, ulei de măsline — precursori hormonali esențiali.'}],
    [{i:'🌊',t:'<strong>Hidratare activă:</strong> Adaugă electroliți — sodiu, potasiu, magneziu — pentru antrenamente lungi.'},
     {i:'🍳',t:'<strong>Colina:</strong> Ouă, ficat — susțin memoria și funcția hepatică în metabolizarea estrogenului.'},
     {i:'🤝',t:'<strong>Social și networking:</strong> Empatia și comunicarea sunt crescute — momentul ideal pentru întâlniri.'},
     {i:'🌱',t:'<strong>Probiotice:</strong> Iaurt, kefir, kimchi — microbiomul intestinal influențează nivelul estrogenului.'}],
  ],
  ovulatie: [
    [{i:'⚡',t:'<strong>Performanță de vârf:</strong> Testosteronul + estrogenul cresc forța, viteza și coordonarea.'},
     {i:'🍓',t:'<strong>Antioxidanți intensivi:</strong> Fructe de pădure, roșii, nuci — protejează ovulul eliberat.'},
     {i:'💬',t:'<strong>Comunicare maximă:</strong> Empatia și carisma sunt la vârf — prezentări, negocieri, date.'},
     {i:'💦',t:'<strong>Hidratare crescută:</strong> Temperatura bazală crește ușor — necesarul de apă e mai mare.'}],
    [{i:'🏊',t:'<strong>Sport de echipă sau dans:</strong> Energia socială e crescută — activitățile de grup sunt mai plăcute.'},
     {i:'🥩',t:'<strong>Proteine + zinc:</strong> Stridii, carne de vită, semințe de dovleac — susțin calitatea ovulului.'},
     {i:'🧬',t:'<strong>Fereastră de 24h:</strong> Ovulul e viabil doar 12-24 ore, dar spermatozoizii supraviețuiesc 5 zile.'},
     {i:'🎤',t:'<strong>Vocea e mai persuasivă:</strong> Studii arată că tonul vocii se modifică subtil în jurul ovulației.'}],
    [{i:'🌡️',t:'<strong>Temperatura bazală:</strong> Crește cu 0.2-0.5°C după ovulație — semn că a avut loc.'},
     {i:'🫐',t:'<strong>Vitamina C:</strong> Kiwi, ardei roșu, căpșune — susțin integritatea foliculului și ovulul.'},
     {i:'🧘',t:'<strong>Mindfulness:</strong> Conștientizează semnalele corpului — mittelschmerz (durere laterală) = ovulație.'},
     {i:'💃',t:'<strong>Energie socială maximă:</strong> Planifică activitățile care necesită energie și prezență.'}],
  ],
  luteala: [
    [{i:'🍫',t:'<strong>Magneziu:</strong> 300-400mg/zi din ciocolată neagră, nuci, semințe — reduce PMS cu 40%.'},
     {i:'🌙',t:'<strong>Somn prioritar:</strong> Temperatura bazală ridicată poate perturba somnul — cameră răcoroasă 18-20°C.'},
     {i:'🧴',t:'<strong>Piele sensibilă:</strong> Progesteronul poate activa sebum — curățare blândă, non-comedogenică.'},
     {i:'📓',t:'<strong>Jurnal:</strong> Introspecția e naturală acum — scrie, procesează emoțiile, nu le suprima.'}],
    [{i:'🥗',t:'<strong>Carbohidrați complecși:</strong> Quinoa, orez brun, cartofi dulci — stabilizează glicemia și mood-ul.'},
     {i:'🚴',t:'<strong>Cardio moderat:</strong> Ciclism, înot, pilates — evită HIIT în ultima săptămână de fază.'},
     {i:'🌿',t:'<strong>Vitex agnus-castus:</strong> Studii sugerează reducerea simptomelor PMS — consultă medicul.'},
     {i:'☕',t:'<strong>Limitează cafeina:</strong> Agravează anxietatea și sensibilitatea sânilor în faza luteală târzie.'}],
    [{i:'🐟',t:'<strong>Omega-3 + B6:</strong> Somon, ton, banane — reduc retenția de apă și iritabilitatea premenstruală.'},
     {i:'🧠',t:'<strong>Sarcini de detaliu:</strong> Atenția la detalii e crescută — ideal pentru analiză, editare, verificare.'},
     {i:'🛁',t:'<strong>Self-care activ:</strong> Masaj, saună blândă, uleiuri esențiale de lavandă — scad cortizolul.'},
     {i:'🥜',t:'<strong>Triptofan:</strong> Nuci, semințe, curcan — precursor al serotoninei, combate iritabilitatea.'}],
    [{i:'💊',t:'<strong>Vitamina B6 (50mg/zi):</strong> Reduce retenția de apă, sensibilitatea sânilor și schimbările de dispoziție.'},
     {i:'🏃',t:'<strong>Mers în natură:</strong> 30 min zilnic reduce simptomele PMDD — efectul e dovedit clinic.'},
     {i:'🍵',t:'<strong>Ceai de zmeură roșie:</strong> Tonifiază musculatura uterină — tradițional recomandat premenstrual.'},
     {i:'😮‍💨',t:'<strong>Respirație diafragmatică:</strong> 5 min/zi de respirație profundă scade cortizolul cu până la 25%.'}],
    [{i:'🌊',t:'<strong>Retenție de apă:</strong> Limitează sarea, bea mai multă apă paradoxal — flushează excesul de sodiu.'},
     {i:'🎨',t:'<strong>Creativitate introvertită:</strong> Energia e orientată spre interior — scris, pictură, muzică.'},
     {i:'🥦',t:'<strong>DIM (Diindolylmethane):</strong> Din broccoli și varză — ajută ficatul să proceseze excesul de estrogen.'},
     {i:'🌙',t:'<strong>Melatonina naturală:</strong> Evită ecranele cu 1h înainte de culcare — progesteronul perturbă somnul.'}],
  ],
};

// Selectează setul de recs în funcție de ziua ciclului
function getRecsForDay(phase, cycleDay) {
  const pool = RECS[phase] || RECS.foliculara;
  return pool[cycleDay % pool.length];
}

const PHASES = {
  menstruatie: {
    name:'Menstruație 🌹',
    bg:'linear-gradient(135deg,rgba(232,96,122,0.18),rgba(155,77,110,0.10))',
    br:'rgba(232,96,122,0.26)',
    desc:'Corpul se regenerează. Odihnă, căldură și hidratare sunt esențiale.',
  },
  foliculara: {
    name:'Foliculară 🌱',
    bg:'linear-gradient(135deg,rgba(196,168,224,0.14),rgba(91,200,184,0.07))',
    br:'rgba(196,168,224,0.22)',
    desc:'FSH crește, folicul se maturizează. Estrogenul aduce energie în creștere.',
  },
  ovulatie: {
    name:'Fereastră Fertilă ✨',
    bg:'linear-gradient(135deg,rgba(77,200,240,0.14),rgba(107,143,232,0.08))',
    br:'rgba(77,200,240,0.28)',
    desc:'Vârf LH (ziua -1), eliberare ovul (ziua 0). Fertilitate maximă 2 zile.',
  },
  luteala: {
    name:'Luteală 🍂',
    bg:'linear-gradient(135deg,rgba(196,98,45,0.18),rgba(155,77,110,0.08))',
    br:'rgba(196,98,45,0.30)',
    desc:'Progesteronul domină această fază — durează fix ~14 zile indiferent de lungimea ciclului.',
  },
};

const MS = ['Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec'];
const ML = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
const DAYS_RO = ['Duminică','Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă'];
function fmtDate(d) { return (!d||isNaN(d)) ? '—' : `${d.getDate()} ${MS[d.getMonth()]}`; }
function fmtDateL(d) { return (!d||isNaN(d)) ? '—' : `${d.getDate()} ${ML[d.getMonth()]} ${d.getFullYear()}`; }
function fmtDateFull(d) { return (!d||isNaN(d)) ? '—' : `${DAYS_RO[d.getDay()]}, ${d.getDate()} ${ML[d.getMonth()]} ${d.getFullYear()}`; }

const DAY_DETAILS = {
  period:     { sticker:'🩸', emoji:'🌹', label:'Menstruație',        phaseIco:'🌹', recIco:'🛁',  color:'rgba(232,96,122,0.18)',  border:'rgba(232,96,122,0.32)',  hormonal:'Estrogen și progesteron sunt la nivel minim. Uterul elimină mucoasa endometrială. FSH începe să crească ușor.',                                                                        fert:2,  fertLbl:'Scăzut',       rec:'Odihnă activă — yoga ușoară, stretching. Alimente bogate în fier (spanac, linte). Evită efortul intens.' },
  foliculara: { sticker:'🌿', emoji:'🌱', label:'Foliculară',          phaseIco:'🌱', recIco:'🏃',  color:'rgba(91,200,184,0.14)',   border:'rgba(91,200,184,0.25)',  hormonal:'FSH stimulează creșterea foliculilor. Estrogenul crește progresiv, îmbunătățind energia, starea de spirit și claritatea mentală.',                                                   fert:5,  fertLbl:'Scăzut',       rec:'Energie în creștere — ideal pentru antrenamente de forță, proiecte noi și socializare. Consum de zinc și vitamina D.' },
  'fert-low': { sticker:'💜', emoji:'💜', label:'Fertilă',             phaseIco:'🌸', recIco:'🥗',  color:'rgba(155,111,212,0.18)', border:'rgba(155,111,212,0.35)', hormonal:'Estrogenul e la nivel ridicat. Mucusul cervical devine mai fluid. Spermatozoizii pot supraviețui 3-5 zile.',                                                                         fert:45, fertLbl:'Înalt',        rec:'Fereastră fertilă activă. Mucusul cervical susține mobilitatea spermatozoizilor. Antioxidanți pentru calitatea ovulului.' },
  'fert-high':{ sticker:'💙', emoji:'💙', label:'Foarte fertilă',      phaseIco:'🔵', recIco:'🫐',  color:'rgba(107,143,232,0.18)', border:'rgba(107,143,232,0.38)', hormonal:'Vârf de estrogen iminent. LH începe să crească. Mucusul cervical e transparent și elastic — semn de fertilitate maximă apropiată.',                                                        fert:75, fertLbl:'Foarte înalt',  rec:'Una dintre cele mai fertile zile. Mucus cervical tip "albuș de ou" — semn că ovulația e la 1-2 zile distanță.' },
  peak:       { sticker:'✨', emoji:'✨', label:'Ovulație',             phaseIco:'🥚', recIco:'💪',  color:'rgba(77,200,240,0.18)',  border:'rgba(77,200,240,0.42)',  hormonal:'Vârf LH declanșează eliberarea ovulului. Temperatura bazală crește ușor. Ovulul e viabil 12-24 ore.',                                                                                    fert:98, fertLbl:'Maxim',         rec:'Fertilitate maximă — ~31-33% șanse de concepție. Performanță fizică și cognitivă la vârf. Energie și încredere crescute.' },
  luteal:     { sticker:'🍂', emoji:'🍂', label:'Luteală',             phaseIco:'🌙', recIco:'🍫',  color:'rgba(196,98,45,0.15)',   border:'rgba(196,98,45,0.28)',   hormonal:'Progesteronul domină această fază. Temperatura bazală rămâne ridicată. Dacă nu apare sarcina, nivelul hormonal scade treptat spre finalul fazei.',                                          fert:3,  fertLbl:'Scăzut',       rec:'Prioritizează somnul și recuperarea. Magneziu pentru PMS, ciocolată neagră >70%. Jurnal pentru emoții.' },
  normal:     { sticker:'🌿', emoji:'🌿', label:'Foliculară timpurie', phaseIco:'🌱', recIco:'💧',  color:'rgba(255,255,255,0.06)', border:'rgba(255,255,255,0.10)', hormonal:'Hormoni în tranziție. Corpul se pregătește pentru următoarea fază a ciclului.',                                                                                                                   fert:3,  fertLbl:'Scăzut',       rec:'Perioadă de tranziție. Menține un stil de viață echilibrat — hidratare, somn regulat, alimentație variată.' },
};

class CycleTrackerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._entryId = null;
    this._prefix = null;
    this._histOpen = false;
    this._inpOpen = false;
    this._lastSensors = null;
  }

  setConfig(config) { this._config = config || {}; }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.innerHTML) this._build();
    this._updateFromHass();
  }

  getCardSize() { return 14; }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&family=Nunito:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :host{display:block;font-family:'Nunito',sans-serif;--teal:#5BC8B8;--rose:#E8607A;--lavender:#9B6FD4}

        .card{background:linear-gradient(170deg,#1c0e20 0%,#0f0b16 55%,#16091d 100%);border-radius:28px;border:1px solid rgba(232,96,122,0.13);overflow:hidden;color:#fff;position:relative;box-shadow:0 0 0 1px rgba(255,255,255,0.025) inset}
        .g1,.g2{position:absolute;border-radius:50%;pointer-events:none}
        .g1{width:320px;height:320px;top:-90px;right:-70px;background:radial-gradient(circle,rgba(232,96,122,0.09) 0%,transparent 70%)}
        .g2{width:260px;height:260px;bottom:-80px;left:-70px;background:radial-gradient(circle,rgba(91,200,184,0.06) 0%,transparent 70%)}

        .sbar{display:flex;align-items:center;justify-content:space-between;padding:16px 22px 0;position:relative;z-index:2}
        .sbar-l{display:flex;align-items:center;gap:7px}
        .dot{width:6px;height:6px;border-radius:50%;background:#5BC8B8;box-shadow:0 0 9px #5BC8B8;animation:pulse 2.5s ease-in-out infinite}
        .dot.err{background:#E8607A;box-shadow:0 0 9px #E8607A;animation:none}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        .stxt{font-size:10px;color:rgba(255,255,255,0.28)}
        .spill{display:flex;align-items:center;gap:4px;background:rgba(91,200,184,0.09);border:1px solid rgba(91,200,184,0.18);border-radius:99px;padding:3px 10px;font-size:9px;color:#5BC8B8}

        .topbar{padding:10px 22px 0;position:relative;z-index:2}
        .brand{font-family:'Playfair Display',serif;font-size:20px}
        .brand em{color:#E8607A;font-style:italic}
        .sub{font-size:10px;color:rgba(255,255,255,0.22);letter-spacing:.7px;text-transform:uppercase;margin-top:2px}

        .ph{margin:14px 16px 0;border-radius:22px;padding:18px 20px;position:relative;z-index:2;transition:background .6s,border-color .6s;border:1px solid transparent}
        .ph-tag{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.32);margin-bottom:5px}
        .ph-name{font-family:'Playfair Display',serif;font-size:27px;line-height:1.05;color:#fff}
        .ph-desc{font-size:12px;color:rgba(255,255,255,0.48);line-height:1.65;margin-top:7px;max-width:215px}
        .day-orb{position:absolute;top:16px;right:16px;width:56px;height:56px;border-radius:50%;background:rgba(0,0,0,0.30);border:1px solid rgba(255,255,255,0.09);display:flex;flex-direction:column;align-items:center;justify-content:center}
        .dn{font-family:'Playfair Display',serif;font-size:22px;line-height:1;color:#fff}
        .dl{font-size:8px;color:rgba(255,255,255,0.26);text-transform:uppercase;letter-spacing:.6px}

        .az{padding:9px 16px 0;position:relative;z-index:2}
        .ab{display:flex;align-items:center;gap:10px;border-radius:13px;padding:10px 14px;font-size:11.5px;line-height:1.5}
        .ab.h{display:none}
        .ab.warn{background:rgba(232,96,122,0.09);border:1px solid rgba(232,96,122,0.20);color:rgba(255,255,255,.68)}
        .ab.info{background:rgba(77,200,240,0.09);border:1px solid rgba(77,200,240,0.22);color:rgba(255,255,255,.68)}
        .ab strong{color:#fff}

        .mr{display:flex;align-items:center;gap:12px;padding:14px 16px 0;position:relative;z-index:2}
        .rbg{fill:none;stroke:rgba(255,255,255,0.04);stroke-width:8}
        .rtr{fill:none;stroke-width:8;stroke-linecap:round;transform:rotate(-90deg);transform-origin:50% 50%;stroke:url(#rg);transition:stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)}
        .rct{text-anchor:middle;dominant-baseline:middle}
        .msc{flex:1;display:flex;flex-direction:column;gap:7px}
        .ms{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.055);border-radius:12px;padding:9px 12px;display:flex;align-items:center;gap:9px}
        .mi{font-size:14px;flex-shrink:0}
        .mv{font-size:14px;font-weight:600;color:#fff;line-height:1}
        .ml{font-size:9px;color:rgba(255,255,255,0.26);margin-top:1px}

        .frt{padding:13px 16px 0;position:relative;z-index:2}
        .sl2{font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,0.23);margin-bottom:8px}
        .fb{height:7px;background:rgba(255,255,255,0.04);border-radius:99px;overflow:hidden;margin-bottom:5px}
        .ff{height:100%;border-radius:99px;background:linear-gradient(90deg,#5BC8B8,#F0C060);transition:width 1.5s cubic-bezier(.4,0,.2,1)}
        .fl{display:flex;justify-content:space-between;font-size:9px;color:rgba(255,255,255,0.20)}

        .cal{padding:13px 16px 0;position:relative;z-index:2}
        .cg{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
        .ch{font-size:8px;color:rgba(255,255,255,0.16);text-align:center;text-transform:uppercase;padding-bottom:3px}
        .cd{aspect-ratio:1;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:9.5px;cursor:default}
        .cd.em{background:transparent}
        .cd.normal   {background:rgba(255,255,255,0.028);color:rgba(255,255,255,0.26)}
        .cd.period   {background:rgba(232,96,122,0.28);color:#FFAABB;font-weight:600}
        .cd.fert-low {background:rgba(155,111,212,0.28);color:#C4A0F0;font-weight:500}
        .cd.fert-high{background:rgba(107,143,232,0.32);color:#A8C4FF;font-weight:600}
        .cd.peak     {background:rgba(77,200,240,0.34);color:#7EE8FF;font-weight:700;border:1px solid rgba(77,200,240,0.45);box-shadow:0 0 10px rgba(77,200,240,0.18)}
        .cd.luteal   {background:rgba(255,255,255,0.028);color:rgba(255,255,255,0.26)}
        .cd.today    {box-shadow:0 0 0 2px #E8607A}
        .cd.peak.today{box-shadow:0 0 0 2px #E8607A,0 0 10px rgba(77,200,240,0.18)}

        /* Calendar nav */
        .cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
        .cal-nav-btn{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);border-radius:8px;color:rgba(255,255,255,0.5);font-size:14px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
        .cal-nav-btn:hover{background:rgba(232,96,122,0.18);color:#fff;border-color:rgba(232,96,122,0.3)}
        .cal-month{font-size:11px;font-weight:600;color:rgba(255,255,255,0.55)}
        .cal-today-btn{background:rgba(91,200,184,0.10);border:1px solid rgba(91,200,184,0.20);border-radius:99px;padding:2px 9px;font-size:9px;color:var(--teal,#5BC8B8);cursor:pointer;font-family:'Nunito',sans-serif;transition:all .2s}
        .cal-today-btn:hover{background:rgba(91,200,184,0.22)}

        /* Badge zi ciclu — colț dreapta sus, mai vizibil */
        .cd{position:relative;overflow:hidden}
        .cd-badge{position:absolute;top:2px;right:3px;font-size:7.5px;font-weight:700;line-height:1;pointer-events:none;opacity:0.75}
        .cd.period .cd-badge{color:rgba(255,180,190,0.9)}
        .cd.fert-low .cd-badge{color:rgba(196,160,240,0.9)}
        .cd.fert-high .cd-badge{color:rgba(168,196,255,0.9)}
        .cd.peak .cd-badge{color:rgba(126,232,255,0.95)}
        .cd.normal .cd-badge{color:rgba(255,255,255,0.40)}
        .cd-date{pointer-events:none}

        /* Modal */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(10px);z-index:9999;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .28s}
        .modal-overlay.open{opacity:1;pointer-events:all}
        .modal{background:linear-gradient(160deg,#1e0f26 0%,#12091a 100%);border:1px solid rgba(255,255,255,0.07);border-bottom:none;border-radius:32px 32px 0 0;width:100%;max-width:430px;padding:0 0 36px;transform:translateY(32px);transition:transform .35s cubic-bezier(.34,1.1,.64,1)}
        .modal-overlay.open .modal{transform:translateY(0)}
        .modal-handle{width:40px;height:4px;background:rgba(255,255,255,0.10);border-radius:99px;margin:14px auto 0}
        .modal-hero{position:relative;padding:20px 20px 0;display:flex;align-items:flex-start;gap:14px}
        .modal-sticker{width:64px;height:64px;border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0;border:1px solid transparent;transition:background .4s}
        .modal-hero-text{flex:1;min-width:0}
        .modal-date{font-size:9.5px;letter-spacing:1.3px;text-transform:uppercase;color:rgba(255,255,255,0.28);margin-bottom:3px}
        .modal-title{font-family:'Playfair Display',serif;font-size:21px;color:#fff;line-height:1.1}
        .modal-phase-pill{display:inline-flex;align-items:center;gap:5px;border-radius:99px;padding:3px 10px;font-size:10px;font-weight:600;margin-top:6px;border:1px solid transparent}
        .modal-close{position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.055);border:1px solid rgba(255,255,255,0.07);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;color:rgba(255,255,255,0.35);transition:all .2s}
        .modal-close:hover{background:rgba(232,96,122,0.20);color:#fff}
        .modal-chips{display:flex;gap:7px;padding:14px 20px 0;flex-wrap:wrap}
        .mchip{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:9px 12px;display:flex;align-items:center;gap:8px;flex:1;min-width:80px}
        .fert-chip{flex:2}
        .mchip-ico{font-size:15px;flex-shrink:0}
        .mchip-val{font-size:13px;font-weight:600;color:#fff;line-height:1}
        .mchip-lbl{font-size:8.5px;color:rgba(255,255,255,0.25);margin-top:2px}
        .mchip-txt{flex:1;min-width:0}
        .mfert-bar{height:4px;background:rgba(255,255,255,0.07);border-radius:99px;margin-top:5px;overflow:hidden}
        .mfert-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#5BC8B8,#F0C060);transition:width 1s cubic-bezier(.4,0,.2,1)}
        .modal-sections{display:flex;flex-direction:column;gap:8px;padding:10px 20px 0}
        .msec{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.055);border-radius:16px;padding:13px;display:flex;gap:11px;align-items:flex-start}
        .msec-icon{font-size:18px;flex-shrink:0;margin-top:1px}
        .msec-title{font-size:10px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px}
        .msec-text{font-size:11.5px;color:rgba(255,255,255,0.60);line-height:1.65}

        .leg{display:flex;gap:7px;flex-wrap:wrap;padding:9px 16px 0;position:relative;z-index:2}
        .li{display:flex;align-items:center;gap:4px;font-size:8.5px;color:rgba(255,255,255,0.32)}
        .ld{width:8px;height:8px;border-radius:50%}

        .src{margin:8px 16px 0;display:inline-flex;align-items:center;gap:5px;background:rgba(77,200,240,0.06);border:1px solid rgba(77,200,240,0.13);border-radius:99px;padding:3px 10px;font-size:8.5px;color:rgba(77,200,240,0.55);position:relative;z-index:2}

        .rcs{padding:13px 16px;position:relative;z-index:2}
        .rc{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.045);border-radius:13px;padding:11px 13px;margin-bottom:7px;display:flex;gap:10px;align-items:flex-start}
        .rc:last-child{margin-bottom:0}
        .ri{font-size:16px;flex-shrink:0}
        .rt{font-size:11px;color:rgba(255,255,255,0.50);line-height:1.6}
        .rt strong{color:rgba(255,255,255,0.82);font-weight:600}

        .ins{padding:0 16px 16px;position:relative;z-index:2}
        .ins-hd{font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(91,200,184,0.55);margin-bottom:8px}
        .ib{background:rgba(91,200,184,0.05);border:1px solid rgba(91,200,184,0.12);border-radius:13px;padding:11px 13px;margin-bottom:7px;font-size:11px;color:rgba(255,255,255,0.55);line-height:1.6}
        .ib:last-child{margin-bottom:0}
        .ib strong{color:rgba(91,200,184,0.88);font-weight:600}
        .ib.wi{background:rgba(240,192,96,0.06);border-color:rgba(240,192,96,0.16)}
        .ib.wi strong{color:rgba(240,192,96,0.9)}
        .ie{font-size:11px;color:rgba(255,255,255,0.22);text-align:center;padding:6px 0}

        /* ── Insights Carousel ── */
        .icar{padding:0 16px 4px;position:relative;z-index:2}
        .icar-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
        .icar-dots{display:flex;gap:6px;align-items:center}
        .idot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15);cursor:pointer;transition:all .3s}
        .idot.active{width:18px;border-radius:99px;background:var(--teal,#5BC8B8)}

        .icar-wrap{position:relative;border-radius:16px}
        .islide{display:none;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.055);border-radius:16px;padding:14px;box-sizing:border-box;width:100%}
        .islide.active{display:block}
        .isl-title{font-size:11px;font-weight:700;color:rgba(255,255,255,0.70);margin-bottom:3px}
        .isl-sub{font-size:10px;color:rgba(255,255,255,0.30);margin-bottom:10px;line-height:1.5}
        .isl-avg{font-size:13px;font-weight:700;color:var(--teal,#5BC8B8);margin-bottom:12px}

        /* Trend chart SVG */
        .isl-chart{width:100%;height:90px;position:relative;margin-bottom:6px}
        .isl-chart svg{width:100%;height:100%}
        .isl-legend{font-size:8.5px;color:rgba(255,255,255,0.22);display:flex;align-items:center;gap:5px;flex-wrap:wrap}
        .isl-dot{width:7px;height:7px;border-radius:50%;display:inline-block;flex-shrink:0}

        /* Bars (Cycle Length) */
        .isl-bars{display:flex;flex-direction:column;gap:7px;max-height:160px;overflow-y:auto}
        .ibar-row{display:flex;align-items:center;gap:8px}
        .ibar-lbl{font-size:9px;color:rgba(255,255,255,0.35);width:68px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ibar-track{flex:1;height:8px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;position:relative}
        .ibar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#E8607A,#F0A060);transition:width .9s cubic-bezier(.4,0,.2,1)}
        .ibar-fill.cur{background:linear-gradient(90deg,#5BC8B8,#6B8FE8)}
        .ibar-val{font-size:9px;color:rgba(255,255,255,0.45);width:32px;text-align:right;flex-shrink:0}
        .ibar-avg-line{position:absolute;top:0;height:100%;width:2px;background:rgba(255,255,255,0.30);border-radius:99px}

        /* Symptoms */
        .isl-sym-list{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;max-height:120px;overflow-y:auto}
        .sym-row{display:flex;align-items:center;gap:7px;padding:6px 9px;background:rgba(255,255,255,0.025);border-radius:10px;border:1px solid rgba(255,255,255,0.045)}
        .sym-row-date{font-size:9px;color:rgba(255,255,255,0.35);width:60px;flex-shrink:0}
        .sym-chips{display:flex;gap:4px;flex-wrap:wrap;flex:1}
        .sym-chip{font-size:9px;padding:2px 7px;border-radius:99px;background:rgba(155,111,212,0.18);color:rgba(200,170,255,0.85);border:1px solid rgba(155,111,212,0.22)}
        .sym-chip.crampe{background:rgba(232,96,122,0.18);color:rgba(255,160,180,0.85);border-color:rgba(232,96,122,0.22)}
        .sym-chip.oboseala{background:rgba(107,143,232,0.18);color:rgba(170,200,255,0.85);border-color:rgba(107,143,232,0.22)}
        .sym-chip.cap{background:rgba(240,192,96,0.15);color:rgba(255,220,130,0.85);border-color:rgba(240,192,96,0.22)}
        .sym-chip.mood{background:rgba(155,111,212,0.18);color:rgba(200,170,255,0.85);border-color:rgba(155,111,212,0.22)}
        .isl-sym-log{border-top:1px solid rgba(255,255,255,0.05);padding-top:10px}
        .sym-btns{display:flex;gap:6px;flex-wrap:wrap}
        .sym-btn{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:99px;padding:5px 10px;color:rgba(255,255,255,0.40);font-size:10px;font-family:'Nunito',sans-serif;cursor:pointer;transition:all .2s}
        .sym-btn:hover{border-color:rgba(155,111,212,0.40);color:rgba(255,255,255,0.75)}
        .sym-btn.active{background:rgba(155,111,212,0.22);border-color:rgba(155,111,212,0.45);color:#fff}
        .sym-no{font-size:10px;color:rgba(255,255,255,0.20);text-align:center;padding:8px 0}

        div.dv{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent);margin:0 16px 12px}

        .htog{width:100%;background:none;border:none;padding:11px 18px;display:flex;justify-content:space-between;align-items:center;color:rgba(255,255,255,0.35);font-size:11px;font-family:'Nunito',sans-serif;cursor:pointer;transition:color .2s;position:relative;z-index:2}
        .htog:hover{color:rgba(255,255,255,.62)}
        .ha{transition:transform .3s;display:inline-block}
        .ha.open{transform:rotate(180deg)}
        .hbody{display:none;padding:0 16px 14px;position:relative;z-index:2}
        .hbody.open{display:block}
        .hr{display:flex;align-items:center;justify-content:space-between;padding:7px 11px;border-radius:10px;margin-bottom:4px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.045);font-size:11px}
        .hrd{color:rgba(255,255,255,0.52)}
        .hrl{padding:2px 7px;border-radius:99px;font-size:9.5px;font-weight:600;background:rgba(91,200,184,0.14);color:#5BC8B8}
        .hdl{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,0.05);border:none;color:rgba(255,255,255,0.25);cursor:pointer;font-size:9px;display:flex;align-items:center;justify-content:center;transition:all .2s}
        .hdl:hover{background:rgba(232,96,122,0.20);color:#E8607A}
        .nh{font-size:11px;color:rgba(255,255,255,0.22);text-align:center;padding:6px 0}

        .ip{margin:0 16px 22px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:18px;overflow:hidden;position:relative;z-index:2}
        .iptog{width:100%;background:none;border:none;padding:13px 16px;display:flex;justify-content:space-between;align-items:center;color:rgba(255,255,255,0.42);font-size:12px;font-family:'Nunito',sans-serif;cursor:pointer;transition:color .2s}
        .iptog:hover{color:#fff}
        .ia{transition:transform .3s;display:inline-block}
        .ia.open{transform:rotate(180deg)}
        .ipbody{display:none;padding:0 16px 16px}
        .ipbody.open{display:block}
        .inp-info{font-size:10.5px;color:rgba(255,255,255,0.35);line-height:1.6;margin-bottom:10px;padding:9px 11px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.05)}
        .lbl{font-size:10px;color:rgba(255,255,255,0.32);margin-bottom:4px;margin-top:10px}
        .inp{width:100%;background:rgba(255,255,255,0.055);border:1px solid rgba(255,255,255,0.08);border-radius:11px;padding:9px 13px;font-size:13px;color:#fff;font-family:'Nunito',sans-serif;outline:none;transition:border-color .2s}
        .inp:focus{border-color:rgba(232,96,122,.42)}
        .inp::-webkit-calendar-picker-indicator{filter:invert(1) opacity(.3)}
        .sbtn{width:100%;margin-top:12px;background:linear-gradient(135deg,#E8607A,#9B4D6E);border:none;border-radius:12px;padding:11px;color:#fff;font-size:13px;font-weight:600;font-family:'Nunito',sans-serif;cursor:pointer;transition:opacity .2s}
        .dur-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:9px;padding:6px 10px;color:rgba(255,255,255,0.40);font-size:12px;font-family:'Nunito',sans-serif;cursor:pointer;transition:all .2s}
        .dur-btn.active{background:rgba(232,96,122,0.20);border-color:rgba(232,96,122,0.45);color:#fff;font-weight:600}
        .flux-btn{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:7px 10px;color:rgba(255,255,255,0.35);font-size:10px;font-family:'Nunito',sans-serif;cursor:pointer;transition:all .2s;flex:1}
        .flux-btn.active{background:rgba(232,96,122,0.18);border-color:rgba(232,96,122,0.42);color:#fff;font-weight:600}

        .toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(14px);background:rgba(18,10,22,.96);border:1px solid rgba(91,200,184,.28);border-radius:11px;padding:8px 18px;font-size:12px;color:#fff;opacity:0;transition:all .3s;pointer-events:none;z-index:9999}
        .toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
      </style>

      <div class="card">
        <div class="g1"></div><div class="g2"></div>

        <div class="sbar">
          <div class="sbar-l">
            <div class="dot" id="dot"></div>
            <div class="stxt" id="stxt">Se încarcă…</div>
          </div>
          <div class="spill">✦ Smart</div>
        </div>

        <div class="topbar">
          <div class="brand">Ciclul <em>meu</em></div>
          <div class="sub">Monitorizare · Fertilitate · Recomandări</div>
        </div>

        <div class="ph" id="phHero">
          <div class="ph-tag">Faza curentă</div>
          <div class="ph-name" id="phN">—</div>
          <div class="ph-desc" id="phD">Se caută senzorii integrării…</div>
          <div class="day-orb"><div class="dn" id="dayN">—</div><div class="dl">ziua</div></div>
        </div>

        <div class="az"><div class="ab h" id="alertB"><span id="aIco"></span><span id="aTxt"></span></div></div>

        <div class="mr">
          <svg width="114" height="114" viewBox="0 0 114 114" style="overflow:visible;flex-shrink:0">
            <defs>
              <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#E8607A"/>
                <stop offset="50%" stop-color="#9B6FD4"/>
                <stop offset="100%" stop-color="#4DC8F0"/>
              </linearGradient>
            </defs>
            <circle class="rbg" cx="57" cy="57" r="48"/>
            <circle class="rtr" id="ringC" cx="57" cy="57" r="48" stroke-dasharray="301.6" stroke-dashoffset="301.6"/>
            <text class="rct" x="57" y="48" font-size="9" fill="rgba(255,255,255,0.26)">Progres</text>
            <text class="rct" x="57" y="62" font-family="Playfair Display,serif" font-size="20" fill="#fff" id="rPct">—</text>
            <text class="rct" x="57" y="75" font-size="9" fill="rgba(255,255,255,0.24)" id="rLeft">—</text>
          </svg>
          <div class="msc">
            <div class="ms"><div class="mi">📅</div><div><div class="mv" id="sCLen">—</div><div class="ml">zile/ciclu</div></div></div>
            <div class="ms"><div class="mi">🥚</div><div><div class="mv" id="sOvul">—</div><div class="ml">data ovulației</div></div></div>
            <div class="ms"><div class="mi">🔜</div><div><div class="mv" id="sNext">—</div><div class="ml">urm. perioadă</div></div></div>
          </div>
        </div>

        <div class="frt">
          <div class="sl2">Nivelul de fertilitate estimat</div>
          <div class="fb"><div class="ff" id="ffill" style="width:0%"></div></div>
          <div class="fl"><span>Scăzut</span><span>Moderat</span><span>Maxim</span></div>
        </div>

        <div class="cal">
          <div class="sl2">Calendar</div>
          <div class="cal-nav">
            <button class="cal-nav-btn" id="calPrev">‹</button>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="cal-month" id="calMonth">—</span>
              <button class="cal-today-btn" id="calTodayBtn">azi</button>
            </div>
            <button class="cal-nav-btn" id="calNext">›</button>
          </div>
          <div class="cg" id="calG"></div>
        </div>

        <div class="leg">
          <div class="li"><div class="ld" style="background:#E8607A"></div>Menstruație</div>
          <div class="li"><div class="ld" style="background:#9B6FD4"></div>Fertilă</div>
          <div class="li"><div class="ld" style="background:#6B8FE8"></div>Foarte fertilă</div>
          <div class="li"><div class="ld" style="background:#4DC8F0"></div>Ovulație</div>
          <div class="li"><div class="ld" style="background:#E8607A;box-shadow:0 0 0 2px rgba(232,96,122,.5)"></div>Azi</div>
          <div class="li"><span style="font-size:8px">🩷</span>= ziua ciclului</div>
        </div>

        <div class="dv" style="margin-top:13px"></div>

        <div class="rcs">
          <div class="sl2" style="margin-bottom:8px">Recomandări pentru azi</div>
          <div id="recL"></div>
        </div>

        <div class="dv"></div>

        <!-- ══ INSIGHTS CAROUSEL ══ -->
        <div class="icar">
          <div class="icar-hd">
            <span class="ins-hd">✦ Insights</span>
            <div class="icar-dots" id="iDots">
              <span class="idot active" data-idx="0"></span>
              <span class="idot" data-idx="1"></span>
              <span class="idot" data-idx="2"></span>
            </div>
          </div>

          <div class="icar-wrap" id="iWrap">
            <!-- Slide 0: Cycle Trends -->
            <div class="islide" id="iSlide0">
              <div class="isl-title">📈 Tendința ciclurilor</div>
              <div class="isl-sub" id="iTrendSub">—</div>
              <div class="isl-chart" id="iTrendChart"></div>
              <div class="isl-legend">
                <span class="isl-dot" style="background:#5BC8B8"></span>durata ciclului
                <span style="margin-left:10px;color:rgba(255,255,255,0.22)">zona gri = normal (21–35 zile)</span>
              </div>
            </div>

            <!-- Slide 1: Cycle Length bars -->
            <div class="islide" id="iSlide1">
              <div class="isl-title">📏 Durata ciclurilor</div>
              <div class="isl-avg" id="iAvgLbl">Medie: — zile</div>
              <div class="isl-bars" id="iBars"></div>
            </div>

            <!-- Slide 2: Symptoms -->
            <div class="islide" id="iSlide2">
              <div class="isl-title">🩺 Simptome</div>
              <div class="isl-sym-list" id="iSymList"></div>
              <div class="isl-sym-log">
                <div class="isl-sub" style="margin-bottom:6px">Adaugă simptome pentru ciclul curent:</div>
                <div class="sym-btns" id="symBtns">
                  <button class="sym-btn" data-sym="crampe">😣 Crampe</button>
                  <button class="sym-btn" data-sym="oboseala">😴 Oboseală</button>
                  <button class="sym-btn" data-sym="cap">🤕 Cap</button>
                  <button class="sym-btn" data-sym="mood">😢 Mood</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="dv"></div>

        <button class="htog" id="htog">
          <span>📋 Istoricul ciclurilor (<span id="hCnt">0</span>)</span>
          <span class="ha" id="hArr">▼</span>
        </button>
        <div class="hbody" id="hBody"><div id="hList"></div></div>

        <div class="ip">
          <button class="iptog" id="iptog">
            <span>⚙️ Ciclu curent</span>
            <span class="ia" id="iArr">▼</span>
          </button>
          <div class="ipbody" id="iBody">
            <div class="inp-info">Selectează prima zi a ciclului curent. Durata și fluxul se preiau din setări.</div>
            <div class="lbl">Prima zi a menstruației</div>
            <input type="date" class="inp" id="inD"/>
            <button class="sbtn" id="saveBtn">💾 Salvează în Home Assistant</button>
          </div>
        </div>

        <div class="ip" style="margin-top:8px">
          <button class="iptog" id="pastTog">
            <span>📅 Adaugă ciclu din trecut</span>
            <span class="ia" id="pastArr">▼</span>
          </button>
          <div class="ipbody" id="pastBody">
            <div class="inp-info">Introdu cicluri anterioare pentru a îmbunătăți precizia predicțiilor și media personalizată.</div>
            <div class="lbl">Prima zi a menstruației (trecut)</div>
            <input type="date" class="inp" id="pastDate"/>
            <div class="lbl" style="margin-top:10px">Durata menstruației (zile)</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px">
              ${[2,3,4,5,6,7,8].map(n=>`<button class="dur-btn${n===5?' active':''}" data-val="${n}">${n}${n===8?'+':''}</button>`).join('')}
            </div>
            <div class="lbl" style="margin-top:10px">Intensitate flux</div>
            <div style="display:flex;gap:6px;margin-top:5px">
              <button class="flux-btn" data-val="ușor">🩸 Ușor</button>
              <button class="flux-btn active" data-val="mediu">🩸🩸 Mediu</button>
              <button class="flux-btn" data-val="abundent">🩸🩸🩸 Abundent</button>
            </div>
            <button class="sbtn" id="pastSaveBtn" style="margin-top:12px">➕ Adaugă în istoric</button>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="modalOverlay">
        <div class="modal">
          <div class="modal-handle"></div>
          <div class="modal-hero">
            <div class="modal-sticker" id="mSticker">🌹</div>
            <div class="modal-hero-text">
              <div class="modal-date" id="mDate">—</div>
              <div class="modal-title" id="mTitle">—</div>
              <div class="modal-phase-pill" id="mPill">—</div>
            </div>
            <div class="modal-close" id="mClose">✕</div>
          </div>
          <div class="modal-chips">
            <div class="mchip">
              <div class="mchip-ico">📅</div>
              <div class="mchip-txt">
                <div class="mchip-val" id="mCycleDay">—</div>
                <div class="mchip-lbl">ziua ciclului</div>
              </div>
            </div>
            <div class="mchip">
              <div class="mchip-ico" id="mPhaseIco">🌿</div>
              <div class="mchip-txt">
                <div class="mchip-val" id="mPhase">—</div>
                <div class="mchip-lbl">faza</div>
              </div>
            </div>
            <div class="mchip fert-chip">
              <div class="mchip-ico">🌡️</div>
              <div class="mchip-txt" style="flex:1">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div class="mchip-val" id="mFertLbl">—</div>
                  <div style="font-size:10px;color:rgba(255,255,255,0.35)" id="mFertPct">—</div>
                </div>
                <div class="mchip-lbl">fertilitate</div>
                <div class="mfert-bar"><div class="mfert-fill" id="mFertBar" style="width:0%"></div></div>
              </div>
            </div>
          </div>
          <div class="modal-sections">
            <div class="msec">
              <div class="msec-icon">🧬</div>
              <div class="msec-body">
                <div class="msec-title">Ce se întâmplă hormonal</div>
                <div class="msec-text" id="mHormonal">—</div>
              </div>
            </div>
            <div class="msec">
              <div class="msec-icon" id="mRecIco">💡</div>
              <div class="msec-body">
                <div class="msec-title">Recomandare pentru azi</div>
                <div class="msec-text" id="mRec">—</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="toast" id="toast"></div>
    `;

    this.shadowRoot.getElementById('htog').addEventListener('click', () => this._toggleH());
    this.shadowRoot.getElementById('iptog').addEventListener('click', () => this._toggleI());
    this.shadowRoot.getElementById('saveBtn').addEventListener('click', () => this._saveCycle());
    this.shadowRoot.getElementById('pastTog').addEventListener('click', () => this._togglePast());
    this.shadowRoot.getElementById('pastSaveBtn').addEventListener('click', () => this._savePastCycle());
    this.shadowRoot.querySelectorAll('.dur-btn').forEach(b => b.addEventListener('click', () => {
      this.shadowRoot.querySelectorAll('.dur-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
    }));
    this.shadowRoot.querySelectorAll('.flux-btn').forEach(b => b.addEventListener('click', () => {
      this.shadowRoot.querySelectorAll('.flux-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
    }));
    this.shadowRoot.getElementById('inD').value = new Date().toISOString().split('T')[0];

    // Modal listeners
    const overlay = this.shadowRoot.getElementById('modalOverlay');
    overlay.addEventListener('click', e => { if(e.target===overlay) this._closeModal(); });
    this.shadowRoot.getElementById('mClose').addEventListener('click', () => this._closeModal());

    // Calendar nav
    this._calOffset = 0;
    this.shadowRoot.getElementById('calPrev').addEventListener('click', () => { this._calOffset--; this._buildCal(this._lastSensors, this._calPLen||5, this._calOvDay||14, this._calDay||1, this._calHasData||false, this._calCLen||28); });
    this.shadowRoot.getElementById('calNext').addEventListener('click', () => { this._calOffset++; this._buildCal(this._lastSensors, this._calPLen||5, this._calOvDay||14, this._calDay||1, this._calHasData||false, this._calCLen||28); });
    this.shadowRoot.getElementById('calTodayBtn').addEventListener('click', () => { this._calOffset=0; this._buildCal(this._lastSensors, this._calPLen||5, this._calOvDay||14, this._calDay||1, this._calHasData||false, this._calCLen||28); });

    // Init: primul slide activ
    setTimeout(() => {
      const slides = this.shadowRoot.querySelectorAll('.islide');
      slides.forEach((s, i) => s.classList.toggle('active', i === 0));
    }, 0);
  }

  _updateFromHass() {
    if (!this._hass) return;
    const states = this._hass.states;
    const cycleDay = Object.keys(states).find(k => k.startsWith('sensor.') && k.endsWith('_cycle_day'));
    if (!cycleDay) {
      this._setStatus(false, 'Integrarea Cycle Tracker nu a fost găsită');
      this._render(null);
      return;
    }
    this._prefix = cycleDay.replace('sensor.', '').replace('cycle_day', '');
    const get = name => states[`sensor.${this._prefix}${name}`];
    const sensors = {
      cycle_day:         get('cycle_day'),
      cycle_phase:       get('cycle_phase'),
      fertility_level:   get('fertility_level'),
      days_until_period: get('days_until_period'),
      next_period_date:  get('next_period_date'),
      ovulation_date:    get('ovulation_date'),
      cycle_progress:    get('cycle_progress'),
      cycle_history:     get('cycle_history'),
    };
    this._lastSensors = sensors;
    this._setStatus(true, 'Home Assistant · conectat');
    this._render(sensors);
    if (!this._entryId) this._findEntryId();
  }

  async _findEntryId() {
    try {
      const entries = await this._hass.callApi('GET', 'config/config_entries/entry');
      const e = entries.find(x => x.domain === 'cycle_tracker');
      if (e) this._entryId = e.entry_id;
    } catch {}
  }

  _setStatus(ok, msg) {
    const dot = this.shadowRoot.getElementById('dot');
    const stxt = this.shadowRoot.getElementById('stxt');
    if (!dot || !stxt) return;
    dot.className = ok ? 'dot' : 'dot err';
    stxt.textContent = msg;
  }

  _render(sensors) {
    const $ = id => this.shadowRoot.getElementById(id);
    if (!$('phN')) return;

    // Istoricul vine din senzorul HA sensor.*_cycle_history
    const haHistory = this._parseHAHistory(sensors);

    const haPhase = sensors?.cycle_phase?.state      || 'foliculara';
    const haDay   = parseInt(sensors?.cycle_day?.state || 1);
    const haFert  = sensors?.fertility_level?.state   || 'scazut';
    const haDL    = parseInt(sensors?.days_until_period?.state ?? 27);
    const haProg  = parseInt(sensors?.cycle_progress?.state    || 0);
    const haNext  = sensors?.next_period_date?.state;
    const haOvul  = sensors?.ovulation_date?.state;
    const attrs   = sensors?.cycle_day?.attributes || {};
    const histAttrs = sensors?.cycle_history?.attributes || {};
    const cLen    = histAttrs.avg_cycle_length || attrs.cycle_length  || 28;
    const pLen    = attrs.period_length || 5;
    const ovDay   = cLen - 14;  // calculat din cLen, nu din atribut senzor
    const hasData = !!sensors?.cycle_day;
    const ph = PHASES[haPhase] || PHASES.foliculara;
    const fp = FERT_PCT[haFert] || 5;

    const hero = $('phHero');
    if (hero) { hero.style.background = hasData ? ph.bg : 'rgba(255,255,255,0.04)'; hero.style.borderColor = hasData ? ph.br : 'rgba(255,255,255,0.08)'; }
    $('phN').textContent  = hasData ? ph.name : '—';
    $('phD').textContent  = hasData ? ph.desc : 'Adaugă ciclul din panoul ⚙️ de mai jos.';
    $('dayN').textContent = hasData ? haDay   : '—';

    const ab = $('alertB');
    if (ab) {
      if (hasData && haDL <= 3) {
        ab.className = 'ab warn'; $('aIco').textContent = '🔔';
        $('aTxt').innerHTML = haDL===0 ? '<strong>Menstruația poate începe azi!</strong>' : `Menstruația în <strong>${haDL} ${haDL===1?'zi':'zile'}</strong>.`;
      } else if (hasData && haPhase === 'ovulatie') {
        ab.className = 'ab info'; $('aIco').textContent = '🩵';
        $('aTxt').innerHTML = '<strong>Vârf LH → Ovulație!</strong> Fertilitate maximă.';
      } else { ab.className = 'ab h'; }
    }

    setTimeout(() => {
      const ring = $('ringC');
      if (ring) ring.style.strokeDashoffset = 301.6 - (haProg/100)*301.6;
      if ($('rPct'))  $('rPct').textContent  = hasData ? haProg+'%' : '—';
      if ($('rLeft')) $('rLeft').textContent = hasData ? haDL+' zile rămase' : '—';
    }, 80);

    $('sCLen').textContent = hasData ? cLen : '—';
    $('sOvul').textContent = haOvul ? fmtDate(new Date(haOvul)) : '—';
    $('sNext').textContent = haNext  ? fmtDate(new Date(haNext)) : '—';

    setTimeout(() => { const ff=$('ffill'); if(ff) ff.style.width = hasData ? fp+'%' : '0%'; }, 100);

    this._buildCal(sensors, pLen, ovDay, haDay, hasData, cLen);
    $('recL').innerHTML = hasData
      ? getRecsForDay(haPhase, haDay).map(r=>`<div class="rc"><div class="ri">${r.i}</div><div class="rt">${r.t}</div></div>`).join('')
      : '<div class="rc"><div class="rt" style="color:rgba(255,255,255,0.28)">Adaugă ciclul din panoul ⚙️ de mai jos.</div></div>';
    this._renderInsights(sensors, haHistory);
    this._renderHistory(haHistory);
    if($('hCnt')) $('hCnt').textContent = haHistory.length;
  }

  _parseHAHistory(sensors) {
    try {
      const raw = sensors?.cycle_history?.attributes?.history;
      if (!raw) return [];
      return typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    } catch { return []; }
  }

  _buildCal(sensors, pLen, ovDay, currentDay, hasData, cLen) {
    const $ = id => this.shadowRoot.getElementById(id);
    if (!this._calOffset) this._calOffset = 0;
    // Store for nav buttons
    this._calPLen = pLen; this._calOvDay = ovDay; this._calDay = currentDay;
    this._calHasData = hasData; this._calCLen = cLen;

    const heads = ['Lu','Ma','Mi','Jo','Vi','Sâ','Du'];
    let html = heads.map(d=>`<div class="ch">${d}</div>`).join('');

    const today = new Date(); today.setHours(0,0,0,0);
    const dispDate = new Date(today.getFullYear(), today.getMonth() + this._calOffset, 1);
    const year = dispDate.getFullYear(), month = dispDate.getMonth();

    // Update month label
    const monthEl = $('calMonth');
    if (monthEl) monthEl.textContent = `${ML[month]} ${year}`;

    const fom = new Date(year, month, 1);
    let sw = fom.getDay(); sw = sw===0 ? 6 : sw-1;
    for (let i=0; i<sw; i++) html += `<div class="cd em"></div>`;

    const dim = new Date(year, month+1, 0).getDate();
    const cycleStart = new Date(today); cycleStart.setDate(today.getDate() - currentDay + 1);
    const cycleEnd = new Date(cycleStart); cycleEnd.setDate(cycleStart.getDate() + cLen - 1);

    const getDayType = (dic) => {
      if (dic >= 1 && dic <= pLen)            return 'period';
      if (dic === ovDay || dic === ovDay-1)   return 'peak';
      if (dic === ovDay-2)                    return 'fert-high';
      if (dic >= ovDay-5 && dic <= ovDay-3)   return 'fert-low';
      if (dic > ovDay)                        return 'luteal';
      return 'foliculara';
    };

    for (let d=1; d<=dim; d++) {
      const date = new Date(year, month, d);
      const isToday = (this._calOffset===0 && d===today.getDate());
      const diff = Math.floor((date - cycleStart) / 86400000);
      const norm = ((diff % cLen) + cLen) % cLen;
      const dic = norm + 1;
      let dayType = hasData ? getDayType(dic) : 'normal';
      let cls = (dayType==='foliculara'||dayType==='luteal') ? 'normal' : dayType;
      if (isToday) cls += ' today';

      const inCurrentCycle = hasData && date >= cycleStart && date <= cycleEnd;
      const badge = inCurrentCycle
        ? `<span class="cd-badge">🩷${dic}</span>`
        : '';

      const dateStr = date.toISOString().split('T')[0];
      html += `<div class="cd ${cls}" data-date="${dateStr}" data-dic="${dic}" data-type="${dayType}" data-incycle="${inCurrentCycle}" data-clen="${cLen}">
        <span class="cd-date">${d}</span>${badge}
      </div>`;
    }

    if ($('calG')) {
      $('calG').innerHTML = html;
      $('calG').querySelectorAll('.cd:not(.em)').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => this._openModal(el));
      });
    }
  }

  _openModal(el) {
    const $ = id => this.shadowRoot.getElementById(id);
    const dateStr = el.dataset.date;
    const dic = parseInt(el.dataset.dic);
    const type = el.dataset.type;
    const inCycle = el.dataset.incycle === 'true';
    const cLen = parseInt(el.dataset.clen) || 28;

    const date = new Date(dateStr);
    const det = DAY_DETAILS[type] || DAY_DETAILS.normal;

    const sticker = $('mSticker');
    sticker.textContent = det.sticker;
    sticker.style.background = det.color;
    sticker.style.borderColor = det.border;

    $('mDate').textContent = fmtDateFull(date);
    $('mTitle').textContent = inCycle ? `Ziua ${dic} din ciclu` : 'Zi în afara ciclului curent';

    const pill = $('mPill');
    pill.textContent = `${det.emoji} ${det.label}`;
    pill.style.background = det.color;
    pill.style.borderColor = det.border;
    pill.style.color = 'rgba(255,255,255,0.82)';

    $('mCycleDay').textContent = inCycle ? `z${dic} / ${cLen}` : '—';
    $('mPhaseIco').textContent = det.phaseIco || '🌿';
    $('mPhase').textContent = det.label;
    $('mFertLbl').textContent = det.fertLbl;
    $('mFertPct').textContent = det.fert + '%';
    setTimeout(() => { $('mFertBar').style.width = det.fert + '%'; }, 80);
    $('mHormonal').textContent = det.hormonal;
    $('mRecIco').textContent = det.recIco || '💡';
    $('mRec').textContent = det.rec;

    $('modalOverlay').classList.add('open');
  }

  _closeModal() {
    const overlay = this.shadowRoot.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  _renderInsights(sensors, history) {
    this._renderTrendSlide(sensors, history);
    this._renderBarsSlide(sensors, history);
    this._renderSymptomsSlide(sensors);
    if (!this._carouselInit) this._initCarousel();
  }

  _initCarousel() {
    this._carouselInit = true;
    this._carIdx = 0;
    const wrap = this.shadowRoot.getElementById('iWrap');
    const dots = this.shadowRoot.querySelectorAll('.idot');

    // Touch/swipe
    let tx = 0;
    wrap.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, {passive:true});
    wrap.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) this._goSlide(this._carIdx + (dx < 0 ? 1 : -1));
    }, {passive:true});

    // Dot clicks
    dots.forEach(d => d.addEventListener('click', () => this._goSlide(parseInt(d.dataset.idx))));
  }

  _goSlide(idx) {
    idx = Math.max(0, Math.min(2, idx));
    this._carIdx = idx;
    this.shadowRoot.querySelectorAll('.islide').forEach((s, i) => {
      s.classList.toggle('active', i === idx);
    });
    this.shadowRoot.querySelectorAll('.idot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });
  }

  _renderTrendSlide(sensors, history) {
    const sub = this.shadowRoot.getElementById('iTrendSub');
    const chartEl = this.shadowRoot.getElementById('iTrendChart');
    if (!sub || !chartEl) return;

    const histAttrs = sensors?.cycle_history?.attributes || {};
    const count = histAttrs.history_count || history.length || 0;
    const avg = histAttrs.avg_cycle_length || 28;
    const irreg = histAttrs.is_irregular || false;
    const trend = histAttrs.trend || 'stable';

    if (count < 2) {
      sub.textContent = 'Adaugă cel puțin 2 cicluri pentru grafic.';
      chartEl.innerHTML = '<svg><text x="50%" y="50%" text-anchor="middle" fill="rgba(255,255,255,0.18)" font-size="10" font-family=\'Nunito\'>Date insuficiente</text></svg>';
      return;
    }

    const trendMsg = irreg ? '⚠️ Ciclu neregulat detectat' :
      trend === 'longer' ? '↗ Ciclurile devin mai lungi recent' :
      trend === 'shorter' ? '↘ Ciclurile devin mai scurte recent' :
      `✓ Ciclu regulat · medie ${avg} zile`;
    sub.textContent = trendMsg;

    // Calculează lungimile din history
    const sorted = [...history].sort((a,b) => new Date(a.date||a) - new Date(b.date||b));
    const lens = [];
    for (let i = 1; i < sorted.length; i++) {
      const d1 = new Date((sorted[i-1].date||sorted[i-1]));
      const d2 = new Date((sorted[i].date||sorted[i]));
      const diff = Math.round((d2-d1)/86400000);
      if (diff >= 15 && diff <= 50) lens.push({ len: diff, date: sorted[i-1].date||sorted[i-1] });
    }
    if (!lens.length) { chartEl.innerHTML = ''; return; }

    const W = 260, H = 88;
    const minV = Math.min(15, ...lens.map(x=>x.len));
    const maxV = Math.max(40, ...lens.map(x=>x.len));
    const pad = 18;
    const xStep = lens.length > 1 ? (W - pad*2) / (lens.length - 1) : W - pad*2;

    const toY = v => H - pad - ((v - minV) / (maxV - minV)) * (H - pad*2);
    const toX = i => pad + i * xStep;

    // Normal zone (21-35)
    const y1 = toY(35), y2 = toY(21);

    let path = '', area = '';
    lens.forEach((p, i) => {
      const x = toX(i), y = toY(p.len);
      path += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
      area += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
    });
    const firstX = toX(0), lastX = toX(lens.length-1);
    area += ` L${lastX},${H} L${firstX},${H} Z`;

    const points = lens.map((p,i)=>{
      const mo = new Date(p.date).toLocaleString('ro',{month:'short'});
      return `<circle cx="${toX(i)}" cy="${toY(p.len)}" r="3.5" fill="#5BC8B8" stroke="rgba(18,10,22,.8)" stroke-width="1.5"/>
              <text x="${toX(i)}" y="${toY(p.len)-7}" text-anchor="middle" fill="rgba(255,255,255,0.55)" font-size="8" font-family="Nunito">${p.len}</text>`;
    }).join('');

    const moLabels = lens.filter((_,i)=> lens.length<=6 || i%(Math.ceil(lens.length/4))===0)
      .map(p => {
        const i = lens.indexOf(p);
        const mo = new Date(p.date).toLocaleString('ro',{month:'short'});
        return `<text x="${toX(i)}" y="${H+2}" text-anchor="middle" fill="rgba(255,255,255,0.20)" font-size="7.5" font-family="Nunito">${mo}</text>`;
      }).join('');

    chartEl.innerHTML = `<svg viewBox="0 0 ${W} ${H+10}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#5BC8B8" stop-opacity=".18"/>
          <stop offset="100%" stop-color="#5BC8B8" stop-opacity=".02"/>
        </linearGradient>
      </defs>
      <rect x="${pad}" y="${y1}" width="${W-pad*2}" height="${y2-y1}" fill="rgba(255,255,255,0.04)" rx="3"/>
      <path d="${area}" fill="url(#areaGrad)"/>
      <path d="${path}" fill="none" stroke="#5BC8B8" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${points}
      ${moLabels}
    </svg>`;
  }

  _renderBarsSlide(sensors, history) {
    const barsEl = this.shadowRoot.getElementById('iBars');
    const avgEl  = this.shadowRoot.getElementById('iAvgLbl');
    if (!barsEl) return;

    const histAttrs = sensors?.cycle_history?.attributes || {};
    const avg = histAttrs.avg_cycle_length || 28;
    if (avgEl) avgEl.textContent = `Medie: ${avg} zile`;

    if (!history.length) {
      barsEl.innerHTML = '<div class="sym-no">Adaugă cicluri din panoul ⚙️ pentru statistici.</div>';
      return;
    }

    const allSorted = [...history].sort((a,b) => new Date(a.date||a) - new Date(b.date||b));
    const rows = [];

    // Cicluri trecute — diferența dintre date consecutive
    for (let i = 1; i < allSorted.length; i++) {
      const d1 = new Date(allSorted[i-1].date || allSorted[i-1]);
      const d2 = new Date(allSorted[i].date   || allSorted[i]);
      const diff = Math.round((d2 - d1) / 86400000);
      const mo = d1.toLocaleString('ro', {month:'short', year:'2-digit'});
      rows.push({ label: mo, len: diff, isCur: false });
    }

    // Ciclul curent (de la ultima dată până azi)
    const lastEntry = allSorted[allSorted.length - 1];
    const lastDate = new Date(lastEntry.date || lastEntry);
    const today = new Date(); today.setHours(0,0,0,0);
    const curLen = Math.round((today - lastDate) / 86400000) + 1;
    if (curLen >= 1 && curLen <= 60) {
      rows.unshift({ label: 'Curent', len: curLen, isCur: true });
    }

    if (!rows.length) {
      barsEl.innerHTML = '<div class="sym-no">Un singur ciclu înregistrat — mai adaugă pentru comparație.</div>';
      return;
    }

    const maxLen = Math.max(...rows.map(x => x.len), avg + 4, 35);
    const avgPct = Math.min((avg / maxLen * 100), 98).toFixed(1);

    barsEl.innerHTML = rows.slice(0, 8).map(row => {
      const pct = Math.min((row.len / maxLen * 100), 100).toFixed(1);
      const valStr = row.isCur ? `${row.len}z…` : `${row.len} z`;
      const warning = !row.isCur && (row.len < 21 || row.len > 35)
        ? ' style="color:rgba(240,192,96,0.8)"' : '';
      return `<div class="ibar-row">
        <div class="ibar-lbl">${row.label}</div>
        <div class="ibar-track">
          <div class="ibar-fill ${row.isCur?'cur':''}" style="width:${pct}%"></div>
          <div class="ibar-avg-line" style="left:${avgPct}%"></div>
        </div>
        <div class="ibar-val"${warning}>${valStr}</div>
      </div>`;
    }).join('');
  }

  _renderSymptomsSlide(sensors) {
    const listEl = this.shadowRoot.getElementById('iSymList');
    const btnsEl = this.shadowRoot.getElementById('symBtns');
    if (!listEl) return;

    // Citește simptomele din localStorage (sunt per card, nu în HA senzori)
    const SYM_KEY = 'ct_symptoms_v1';
    let symData = {};
    try { symData = JSON.parse(localStorage.getItem(SYM_KEY)||'{}'); } catch {}

    const history = this._parseHAHistory(sensors);
    const sorted = [...history].sort((a,b) => new Date(b.date||b)-new Date(a.date||a)).slice(0,6);

    const symNames = { crampe:'😣 Crampe', oboseala:'😴 Oboseală', cap:'🤕 Cap', mood:'😢 Mood' };

    if (!sorted.length) {
      listEl.innerHTML = '<div class="sym-no">Adaugă cicluri pentru a loga simptome.</div>';
    } else {
      listEl.innerHTML = sorted.map(entry => {
        const dateKey = entry.date||entry;
        const syms = symData[dateKey] || [];
        const dateStr = new Date(dateKey).toLocaleString('ro',{day:'numeric',month:'short'});
        const chips = syms.length
          ? syms.map(s=>`<span class="sym-chip ${s}">${symNames[s]||s}</span>`).join('')
          : '<span style="font-size:9px;color:rgba(255,255,255,0.18)">—</span>';
        return `<div class="sym-row"><div class="sym-row-date">${dateStr}</div><div class="sym-chips">${chips}</div></div>`;
      }).join('');
    }

    // Butonele de logare pentru ciclul curent
    if (!btnsEl) return;
    const allSorted = [...history].sort((a,b)=>new Date(b.date||b)-new Date(a.date||a));
    const curDate = allSorted[0]?.date || allSorted[0];
    if (!curDate) return;
    const curSyms = symData[curDate] || [];

    btnsEl.querySelectorAll('.sym-btn').forEach(btn => {
      btn.classList.toggle('active', curSyms.includes(btn.dataset.sym));
      btn.onclick = () => {
        let data = {};
        try { data = JSON.parse(localStorage.getItem(SYM_KEY)||'{}'); } catch {}
        const arr = data[curDate] || [];
        const sym = btn.dataset.sym;
        const idx = arr.indexOf(sym);
        if (idx >= 0) arr.splice(idx,1); else arr.push(sym);
        data[curDate] = arr;
        try { localStorage.setItem(SYM_KEY, JSON.stringify(data)); } catch {}
        btn.classList.toggle('active', arr.includes(sym));
        this._renderSymptomsSlide(this._lastSensors);
        this._showToast(arr.includes(sym) ? `✓ ${symNames[sym]} adăugat` : `Șters`);
      };
    });
  }

  _renderHistory(history) {
    const el=this.shadowRoot.getElementById('hList');
    if(!el) return;
    if(!history.length){ el.innerHTML='<div class="nh">Niciun ciclu înregistrat încă.</div>'; return; }
    const sorted=[...history].sort((a,b)=>new Date(a.date)-new Date(b.date));
    const fluxIco={ușor:'🩸',mediu:'🩸🩸',abundent:'🩸🩸🩸'};
    el.innerHTML=[...sorted].reverse().map((entry)=>{
      const idx=sorted.findIndex(x=>x.date===entry.date);
      let tag='curent';
      if(idx<sorted.length-1){
        const diff=Math.round((new Date(sorted[idx+1].date)-new Date(entry.date))/86400000);
        tag=diff+' zile ciclu';
      }
      const isPast=entry.source==='past';
      return `<div class="hr">
        <span class="hrd">${fmtDateL(new Date(entry.date))}</span>
        <span style="font-size:9px;color:rgba(255,255,255,0.30)">${entry.dur||entry.period_length||5}z mens. ${fluxIco[entry.flux||entry.flow_intensity||'mediu']||'🩸🩸'}</span>
        <span class="hrl">${tag}</span>
        <button class="hdl" data-date="${entry.date}">✕</button>
      </div>`;
    }).join('');
    el.querySelectorAll('.hdl').forEach(btn=>{
      btn.addEventListener('click', () => this._deleteCycle(btn.dataset.date));
    });
  }

  async _deleteCycle(date) {
    if(!this._hass||!this._entryId) return;
    try {
      await this._hass.callService('cycle_tracker','delete_cycle',{ entry_id:this._entryId, date });
      this._showToast('🗑️ Șters din HA');
    } catch(e) { this._showToast('⚠️ Eroare la ștergere'); }
  }

  async _saveCycle() {
    const $=id=>this.shadowRoot.getElementById(id);
    const dv=$('inD').value;
    if(!dv){ this._showToast('⚠️ Selectează o dată'); return; }
    const btn=$('saveBtn');
    btn.disabled=true; btn.textContent='Se salvează…';
    const pLen=this._lastSensors?.cycle_day?.attributes?.period_length||5;
    let saved=false;
    if(this._hass&&this._entryId){
      try{
        await this._hass.callService('cycle_tracker','update_cycle',{
          entry_id:this._entryId,
          cycle_start_date:dv,
          period_length:pLen,
          flow_intensity:'mediu',
        });
        saved=true;
      } catch(e){ console.warn('CycleTracker: callService error',e); }
    }
    btn.disabled=false; btn.textContent='💾 Salvează în Home Assistant';
    this._showToast(saved?'✅ Salvat în Home Assistant!':'⚠️ HA nu a răspuns');
    $('iBody').classList.remove('open'); $('iArr').classList.remove('open'); this._inpOpen=false;
  }

  async _savePastCycle() {
    const $=id=>this.shadowRoot.getElementById(id);
    const dv=$('pastDate').value;
    if(!dv){ this._showToast('⚠️ Selectează o dată'); return; }
    const btn=$('pastSaveBtn');
    btn.disabled=true; btn.textContent='Se salvează…';
    const dur = parseInt(this.shadowRoot.querySelector('.dur-btn.active')?.dataset?.val||5);
    const flux = this.shadowRoot.querySelector('.flux-btn.active')?.dataset?.val||'mediu';
    let saved=false;
    if(this._hass&&this._entryId){
      try{
        await this._hass.callService('cycle_tracker','add_past_cycle',{
          entry_id:this._entryId,
          date:dv,
          period_length:dur,
          flow_intensity:flux,
        });
        saved=true;
      } catch(e){ console.warn('CycleTracker: add_past_cycle error',e); }
    }
    btn.disabled=false; btn.textContent='➕ Adaugă în istoric';
    this._showToast(saved?'➕ Adăugat în HA!':'⚠️ HA nu a răspuns');
    if(saved){ $('pastDate').value=''; }
  }

  _toggleH(){ this._histOpen=!this._histOpen; this.shadowRoot.getElementById('hBody').classList.toggle('open',this._histOpen); this.shadowRoot.getElementById('hArr').classList.toggle('open',this._histOpen); }
  _toggleI(){ this._inpOpen=!this._inpOpen; this.shadowRoot.getElementById('iBody').classList.toggle('open',this._inpOpen); this.shadowRoot.getElementById('iArr').classList.toggle('open',this._inpOpen); }
  _togglePast(){
    const body=this.shadowRoot.getElementById('pastBody');
    const arr=this.shadowRoot.getElementById('pastArr');
    if(body) body.classList.toggle('open');
    if(arr) arr.classList.toggle('open');
  }

  _showToast(msg){ const t=this.shadowRoot.getElementById('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3200); }
}

customElements.define('cycle-tracker-card', CycleTrackerCard);

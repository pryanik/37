/* =====================================================================
   Игра в сваху — интерактивное объяснение задачи о стабильных браках
   и алгоритма Гейла–Шепли (Gale–Shapley, 1962).

   Чистый ванильный JS. Без библиотек, без сборки, без сети.

   Разделы:
     1.  Утилиты (random, shuffle)
     2.  Имена + пулы деталей внешности
     3.  Процедурная генерация персонажа (SVG из случайных деталей)
     4.  Каст: генерация людей + случайных предпочтений
     5.  Стабильность: поиск блокирующих пар
     6.  Алгоритм Гейла–Шепли (пошаговый движок)
     7.  Board — доска: две колонки карточек + SVG-линии + анимации + drag
     8.  Менеджер сцен + навигация
     9.  Сцены 1–9
    10.  Декор и запуск
   ===================================================================== */

'use strict';

/* =====================================================================
   1. УТИЛИТЫ
   ===================================================================== */
const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* =====================================================================
   2. ИМЕНА + ПУЛЫ ДЕТАЛЕЙ
   ===================================================================== */
const NAMES_W = ['Анна','Мария','Елена','Катя','Лиза','Оля','Вера','Соня','Настя','Даша',
                 'Ира','Юля','Женя','Полина','Рита','Тася','Ксюша','Нина','Зоя','Ада'];
const NAMES_M = ['Иван','Пётр','Алексей','Сергей','Дмитрий','Гриша','Костя','Миша','Боря','Лёва',
                 'Гоша','Рома','Стёпа','Федя','Тимур','Ян','Марк','Осип','Захар','Влад'];

const SKINS   = ['#ffd9b8','#f3c49a','#e0a878','#c68a5c','#a06a3e','#ffe0c4'];
const HAIRC   = ['#3a2a1a','#5a3a20','#1d1d24','#7a4a24','#c9a227','#b8b8c0','#a83232','#6d3b8f','#2f6d4a'];
const CLOTHES = ['#8a6bd1','#2d6a8f','#c85a7c','#4f9d69','#d98a3a','#5566a8','#b0525a','#3f8f8a','#8f6f3f','#7a5aa8'];
const NECKC   = ['#ff6b6b','#ffcf4d','#8ed081','#9ec8f0','#cdb4db','#ff8fab','#4f9d69'];

// формы/варианты частей
const HEADS  = ['round','oval','square'];
const EYES   = ['dot','round','almond','wink','sleepy'];
const NOSES  = ['button','long','round'];
const MOUTHS = ['smile','grin','small','open'];
const HAIR_M = ['short','side','bald','curly','mohawk','wavy'];
const HAIR_W = ['bun','ponytail','wavy','curly','long','short'];
const FACIAL = ['none','none','none','mustache','beard','goatee','stubble'];   // none чаще
const GLASSES= ['none','none','round','square','monocle','pince'];
const HAT_M  = ['none','none','tophat','bowler','cap','beret'];
const HAT_W  = ['none','none','flower','tiara','beret','bow'];
const NECK_M = ['none','bowtie','tie','bow'];
const NECK_W = ['none','bow','scarf','bowtie'];

/* Собрать случайную внешность. side: 'M' | 'W'. */
function makeLook(side) {
  return {
    side,
    skin:    pick(SKINS),
    hairColor: pick(HAIRC),
    clothes: pick(CLOTHES),
    neckColor: pick(NECKC),
    head:    pick(HEADS),
    eyes:    pick(EYES),
    nose:    pick(NOSES),
    mouth:   pick(MOUTHS),
    hair:    side === 'M' ? pick(HAIR_M) : pick(HAIR_W),
    facial:  side === 'M' ? pick(FACIAL) : 'none',
    glasses: pick(GLASSES),
    hat:     side === 'M' ? pick(HAT_M) : pick(HAT_W),
    neck:    side === 'M' ? pick(NECK_M) : pick(NECK_W),
    vest:    Math.random() < 0.4,
    suspenders: side === 'M' && Math.random() < 0.25
  };
}

/* =====================================================================
   3. ПРОЦЕДУРНЫЙ ПЕРСОНАЖ (SVG)
   Бюст: плечи + голова + случайные детали. Всё рисуется вручную.
   ===================================================================== */
function personSVG(look, mood = 1) {
  const L = look;
  const shade = darken(L.clothes, 0.15);

  /* --- одежда / плечи --- */
  let body = `<path d="M8 118 Q10 84 30 82 L70 82 Q90 84 92 118 Z" fill="${L.clothes}" stroke="${'#33272a'}" stroke-width="3" stroke-linejoin="round"/>`;
  // рубашка
  body += `<path d="M42 82 L50 104 L58 82 Z" fill="#fff"/>`;
  // жилет
  if (L.vest) body += `<path d="M38 84 L50 100 L62 84 L60 118 L40 118 Z" fill="${shade}" stroke="#33272a" stroke-width="2"/>
                       <circle cx="50" cy="98" r="1.6" fill="#fff"/><circle cx="50" cy="106" r="1.6" fill="#fff"/>`;
  // подтяжки
  if (L.suspenders) body += `<path d="M43 84 L45 118 M57 84 L55 118" stroke="#33272a" stroke-width="3"/>`;

  /* --- шея --- */
  body += `<rect x="44" y="72" width="12" height="14" fill="${L.skin}"/>`;

  /* --- шейный аксессуар --- */
  body += neckSVG(L.neck, L.neckColor);

  /* --- голова --- */
  const head = headSVG(L.head, L.skin);

  /* --- уши --- */
  const ears = `<circle cx="24" cy="46" r="5" fill="${L.skin}" stroke="#33272a" stroke-width="2"/>
                <circle cx="76" cy="46" r="5" fill="${L.skin}" stroke="#33272a" stroke-width="2"/>`;

  /* --- волосы (задний план для длинных) --- */
  const hairBack = hairBackSVG(L.hair, L.hairColor);

  /* --- лицо --- */
  const face = eyesSVG(L.eyes, mood) + browsSVG(mood) + noseSVG(L.nose, L.skin) + mouthSVG(L.mouth, mood);

  /* --- растительность --- */
  const facial = facialSVG(L.facial, L.hairColor);

  /* --- очки --- */
  const glasses = glassesSVG(L.glasses);

  /* --- волосы сверху (если не полностью под шляпой) --- */
  const hairTop = hairTopSVG(L.hair, L.hairColor, L.hat);

  /* --- головной убор --- */
  const hat = hatSVG(L.hat, L.hairColor, L.neckColor, L.clothes);

  /* --- румянец --- */
  const blush = `<circle cx="33" cy="52" r="5" fill="#ff6b8a" opacity="0.28"/>
                 <circle cx="67" cy="52" r="5" fill="#ff6b8a" opacity="0.28"/>`;

  return `<svg viewBox="0 0 100 122" xmlns="http://www.w3.org/2000/svg">
    ${hairBack}${body}${ears}${head}${blush}${face}${facial}${glasses}${hairTop}${hat}</svg>`;
}

/* --- вспомогательные генераторы деталей --- */
function headSVG(shape, skin) {
  const s = 'stroke="#33272a" stroke-width="3"';
  if (shape === 'square') return `<rect x="26" y="20" width="48" height="50" rx="14" fill="${skin}" ${s}/>`;
  if (shape === 'oval')   return `<ellipse cx="50" cy="45" rx="23" ry="27" fill="${skin}" ${s}/>`;
  return `<circle cx="50" cy="45" r="25" fill="${skin}" ${s}/>`;
}
function eyesSVG(kind, mood) {
  if (kind === 'dot')    return `<circle cx="41" cy="44" r="3" fill="#33272a"/><circle cx="59" cy="44" r="3" fill="#33272a"/>`;
  if (kind === 'sleepy') return `<path d="M37 44 q4 3 8 0" stroke="#33272a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M55 44 q4 3 8 0" stroke="#33272a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  if (kind === 'wink')   return `<circle cx="41" cy="44" r="3.4" fill="#33272a"/><path d="M55 45 q4 -3 8 0" stroke="#33272a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  if (kind === 'almond') return `<ellipse cx="41" cy="44" rx="5" ry="3.4" fill="#fff" stroke="#33272a" stroke-width="1.6"/><circle cx="41" cy="44" r="2.4" fill="#33272a"/><ellipse cx="59" cy="44" rx="5" ry="3.4" fill="#fff" stroke="#33272a" stroke-width="1.6"/><circle cx="59" cy="44" r="2.4" fill="#33272a"/>`;
  // round
  return `<circle cx="41" cy="44" r="4.4" fill="#fff" stroke="#33272a" stroke-width="1.6"/><circle cx="41.6" cy="44" r="2.3" fill="#33272a"/><circle cx="59" cy="44" r="4.4" fill="#fff" stroke="#33272a" stroke-width="1.6"/><circle cx="59.6" cy="44" r="2.3" fill="#33272a"/>`;
}
function browsSVG(mood) {
  if (mood === 0) return `<path d="M35 37 l9 3 M65 37 l-9 3" stroke="#33272a" stroke-width="2.4" stroke-linecap="round"/>`;
  if (mood === 2) return `<path d="M35 36 q5 -3 10 0 M55 36 q5 -3 10 0" stroke="#33272a" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
  return `<path d="M35 37 l9 -1 M56 36 l9 1" stroke="#33272a" stroke-width="2.4" stroke-linecap="round"/>`;
}
function noseSVG(kind, skin) {
  if (kind === 'long')  return `<path d="M50 46 l-2 9 l4 0" fill="none" stroke="${darken(skin,0.25)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (kind === 'round') return `<circle cx="50" cy="53" r="3.4" fill="${darken(skin,0.12)}"/>`;
  return `<circle cx="50" cy="52" r="2.2" fill="${darken(skin,0.2)}"/>`; // button
}
function mouthSVG(kind, mood) {
  const m = mood === 0 ? 'sad' : kind;
  if (m === 'sad')   return `<path d="M43 63 q7 -6 14 0" fill="none" stroke="#33272a" stroke-width="2.6" stroke-linecap="round"/>`;
  if (m === 'grin')  return `<path d="M42 59 q8 10 16 0 q-8 5 -16 0 Z" fill="#fff" stroke="#33272a" stroke-width="2.4" stroke-linejoin="round"/>`;
  if (m === 'small') return `<path d="M46 61 h8" stroke="#33272a" stroke-width="2.6" stroke-linecap="round"/>`;
  if (m === 'open')  return `<ellipse cx="50" cy="61" rx="5" ry="4" fill="#a8455a" stroke="#33272a" stroke-width="2"/>`;
  return `<path d="M43 60 q7 7 14 0" fill="none" stroke="#33272a" stroke-width="2.6" stroke-linecap="round"/>`; // smile
}
function facialSVG(kind, color) {
  if (kind === 'mustache') return `<path d="M40 58 Q50 64 60 58 Q50 61 40 58 Z" fill="${color}"/>`;
  if (kind === 'beard')    return `<path d="M28 50 Q30 78 50 80 Q70 78 72 50 Q62 70 50 70 Q38 70 28 50 Z" fill="${color}"/>`;
  if (kind === 'goatee')   return `<path d="M45 64 q5 10 10 0 q-5 5 -10 0 Z" fill="${color}"/>`;
  if (kind === 'stubble')  return `<path d="M30 54 Q50 74 70 54 Q62 68 50 68 Q38 68 30 54 Z" fill="${color}" opacity="0.28"/>`;
  return '';
}
function glassesSVG(kind) {
  const s = 'stroke="#33272a" stroke-width="2.4" fill="rgba(255,255,255,0.35)"';
  if (kind === 'round')  return `<circle cx="41" cy="44" r="7" ${s}/><circle cx="59" cy="44" r="7" ${s}/><path d="M48 44 h4" stroke="#33272a" stroke-width="2.4"/>`;
  if (kind === 'square') return `<rect x="33" y="38" width="15" height="12" rx="2" ${s}/><rect x="52" y="38" width="15" height="12" rx="2" ${s}/><path d="M48 44 h4" stroke="#33272a" stroke-width="2.4"/>`;
  if (kind === 'monocle')return `<circle cx="59" cy="44" r="8" stroke="#33272a" stroke-width="2.4" fill="rgba(255,255,255,0.35)"/><path d="M59 52 q-3 8 -8 12" stroke="#33272a" stroke-width="1.6" fill="none"/>`;
  if (kind === 'pince')  return `<circle cx="43" cy="45" r="6" ${s}/><circle cx="57" cy="45" r="6" ${s}/><path d="M49 45 h2" stroke="#33272a" stroke-width="2"/>`;
  return '';
}
function hairBackSVG(kind, color) {
  if (kind === 'long')     return `<path d="M22 40 Q20 90 34 96 L34 60 Q30 44 50 40 Q70 44 66 60 L66 96 Q80 90 78 40 Z" fill="${color}"/>`;
  if (kind === 'ponytail') return `<path d="M70 34 q22 6 14 34 q-2 -20 -16 -24 Z" fill="${color}"/>`;
  if (kind === 'curly')    return `<circle cx="26" cy="34" r="8" fill="${color}"/><circle cx="74" cy="34" r="8" fill="${color}"/>`;
  return '';
}
function hairTopSVG(kind, color, hat) {
  if (hat === 'tophat' || hat === 'bowler' || hat === 'cap' || hat === 'beret') return ''; // спрятаны
  switch (kind) {
    case 'bald':  return '';
    case 'short': return `<path d="M26 44 Q26 20 50 20 Q74 20 74 44 Q70 32 50 31 Q30 32 26 44 Z" fill="${color}"/>`;
    case 'side':  return `<path d="M26 42 Q28 20 52 20 Q76 20 74 40 Q70 26 44 26 Q34 26 26 42 Z" fill="${color}"/><path d="M44 24 q18 -2 26 8" stroke="${color}" stroke-width="4" fill="none"/>`;
    case 'wavy':  return `<path d="M25 42 Q28 20 50 20 Q72 20 75 42 Q70 30 62 34 Q56 26 50 32 Q44 26 38 34 Q30 30 25 42 Z" fill="${color}"/>`;
    case 'curly': return `<path d="M27 40 Q22 22 34 22 Q36 14 48 20 Q56 12 62 22 Q74 20 73 40 Q68 30 60 32 Q56 26 50 30 Q44 26 40 32 Q32 30 27 40 Z" fill="${color}"/>`;
    case 'mohawk':return `<path d="M44 16 Q50 6 56 16 L54 34 L46 34 Z" fill="${color}"/>`;
    case 'bun':   return `<circle cx="50" cy="17" r="9" fill="${color}"/><path d="M27 42 Q28 22 50 22 Q72 22 73 42 Q68 30 50 30 Q32 30 27 42 Z" fill="${color}"/>`;
    case 'ponytail': return `<path d="M27 42 Q28 21 50 21 Q72 21 73 42 Q68 30 50 30 Q32 30 27 42 Z" fill="${color}"/>`;
    case 'long':  return `<path d="M27 42 Q28 20 50 20 Q72 20 73 42 Q68 30 50 30 Q32 30 27 42 Z" fill="${color}"/>`;
    default:      return `<path d="M26 44 Q26 20 50 20 Q74 20 74 44 Q70 32 50 31 Q30 32 26 44 Z" fill="${color}"/>`;
  }
}
function hatSVG(kind, hairColor, accent, clothes) {
  switch (kind) {
    case 'tophat': return `<ellipse cx="50" cy="24" rx="30" ry="6" fill="#2b2b33"/><rect x="35" y="0" width="30" height="26" rx="2" fill="#2b2b33"/><rect x="35" y="17" width="30" height="5" fill="${accent}"/>`;
    case 'bowler': return `<ellipse cx="50" cy="25" rx="27" ry="5.5" fill="#3a2f2a"/><path d="M32 25 Q32 6 50 6 Q68 6 68 25 Z" fill="#3a2f2a"/>`;
    case 'cap':    return `<path d="M28 26 Q30 10 50 10 Q70 10 72 26 Z" fill="${clothes}" stroke="#33272a" stroke-width="2"/><ellipse cx="66" cy="27" rx="16" ry="4" fill="${clothes}" stroke="#33272a" stroke-width="2"/>`;
    case 'beret':  return `<ellipse cx="50" cy="19" rx="22" ry="11" fill="${accent}" stroke="#33272a" stroke-width="2"/><circle cx="50" cy="9" r="2.5" fill="#33272a"/>`;
    case 'flower': return `<g transform="translate(70,20)"><circle r="4" fill="${accent}"/><circle cx="5" r="4" fill="${accent}"/><circle cx="2.5" cy="4" r="4" fill="${accent}"/><circle cx="2.5" cy="2" r="2.5" fill="#fff"/></g>`;
    case 'tiara':  return `<path d="M34 22 L40 14 L50 20 L60 14 L66 22 Z" fill="${accent}" stroke="#33272a" stroke-width="2" stroke-linejoin="round"/><circle cx="50" cy="17" r="2.5" fill="#fff" stroke="#33272a" stroke-width="1.5"/>`;
    case 'bow':    return `<g transform="translate(50,20)"><path d="M0 0 l-10 -5 v10 z" fill="${accent}" stroke="#33272a" stroke-width="1.5"/><path d="M0 0 l10 -5 v10 z" fill="${accent}" stroke="#33272a" stroke-width="1.5"/><circle r="2.5" fill="${accent}" stroke="#33272a" stroke-width="1.5"/></g>`;
    default: return '';
  }
}
function neckSVG(kind, color) {
  if (kind === 'bowtie') return `<g transform="translate(50,86)"><path d="M0 0 l-9 -5 v10 z" fill="${color}" stroke="#33272a" stroke-width="1.6"/><path d="M0 0 l9 -5 v10 z" fill="${color}" stroke="#33272a" stroke-width="1.6"/><circle r="2.4" fill="${color}" stroke="#33272a" stroke-width="1.4"/></g>`;
  if (kind === 'tie')    return `<path d="M50 84 l-4 5 l4 20 l4 -20 z" fill="${color}" stroke="#33272a" stroke-width="1.6" stroke-linejoin="round"/>`;
  if (kind === 'bow')    return `<g transform="translate(50,88)"><path d="M0 0 l-8 -4 v8 z" fill="${color}"/><path d="M0 0 l8 -4 v8 z" fill="${color}"/><circle r="2" fill="#fff"/></g>`;
  if (kind === 'scarf')  return `<path d="M40 84 Q50 92 60 84 L60 90 Q50 98 40 90 Z" fill="${color}" stroke="#33272a" stroke-width="1.6"/>`;
  return '';
}

/* Затемнить hex-цвет на долю k (0..1). */
function darken(hex, k) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  const d = v => Math.max(0, Math.round(v * (1 - k))).toString(16).padStart(2, '0');
  return `#${d(r)}${d(g)}${d(b)}`;
}

/* =====================================================================
   4. КАСТ: люди + случайные предпочтения
   person: { id, side, name, look, prefs:[ids противоположной стороны] }
   ===================================================================== */
function makeCast(n) {
  const menNames = shuffle(NAMES_M).slice(0, n);
  const womenNames = shuffle(NAMES_W).slice(0, n);
  const men = [], women = [];
  for (let i = 0; i < n; i++) {
    men.push({ id: 'M' + i, side: 'M', name: menNames[i], look: makeLook('M'), prefs: [] });
    women.push({ id: 'W' + i, side: 'W', name: womenNames[i], look: makeLook('W'), prefs: [] });
  }
  // случайные предпочтения (перестановка противоположной стороны)
  men.forEach(m => m.prefs = shuffle(women.map(w => w.id)));
  women.forEach(w => w.prefs = shuffle(men.map(m => m.id)));

  const byId = {};
  [...men, ...women].forEach(p => byId[p.id] = p);
  return { men, women, byId };
}

/** Ранг кандидата в списке person (0 = самый желанный). */
function rankOf(person, otherId) {
  const r = person.prefs.indexOf(otherId);
  return r === -1 ? Infinity : r;
}

/* =====================================================================
   5. СТАБИЛЬНОСТЬ: поиск блокирующих пар
   matchOf: object personId -> partnerId (двусторонний).
   ===================================================================== */
function findBlockingPairs(cast, matchOf) {
  const blocks = [];
  cast.men.forEach(m => {
    const mPartner = matchOf[m.id];
    cast.women.forEach(w => {
      if (matchOf[m.id] === w.id) return; // уже вместе
      const mPrefersW = rankOf(m, w.id) < rankOf(m, mPartner);   // m хочет к w
      const wPrefersM = rankOf(w, m.id) < rankOf(w, matchOf[w.id]); // w хочет к m
      if (mPrefersW && wPrefersM) blocks.push([m.id, w.id]);
    });
  });
  return blocks;
}

/* =====================================================================
   6. АЛГОРИТМ ГЕЙЛА–ШЕПЛИ (пошаговый движок)
   proposers делают предложения, receivers принимают/отвергают.
   ===================================================================== */
class GaleShapley {
  constructor(cast, proposingSide /* 'M' | 'W' */) {
    this.byId = cast.byId;
    this.proposers = proposingSide === 'M' ? cast.men : cast.women;
    this.receivers = proposingSide === 'M' ? cast.women : cast.men;
    this.free = this.proposers.map(p => p.id);   // очередь свободных
    this.next = {}; this.proposers.forEach(p => this.next[p.id] = 0);
    this.engaged = {};                            // receiverId -> proposerId
    this.done = this.free.length === 0;
  }

  /** Один шаг: одно предложение. Возвращает событие для анимации. */
  step() {
    if (this.free.length === 0) { this.done = true; return { type: 'done' }; }
    const pid = this.free[0];
    const p = this.byId[pid];
    if (this.next[pid] >= p.prefs.length) { this.free.shift(); return this.step(); }

    const wid = p.prefs[this.next[pid]++];
    const cur = this.engaged[wid];

    if (cur === undefined) {                       // свободна — принимает
      this.engaged[wid] = pid; this.free.shift();
      return { type: 'accept', proposer: pid, receiver: wid };
    }
    if (rankOf(this.byId[wid], pid) < rankOf(this.byId[wid], cur)) { // новый лучше
      this.engaged[wid] = pid; this.free.shift(); this.free.push(cur);
      return { type: 'swap', proposer: pid, receiver: wid, rejected: cur };
    }
    this.free.shift(); this.free.push(pid);        // отказ — предлагает дальше
    return { type: 'reject', proposer: pid, receiver: wid };
  }

  /** Текущее двустороннее соответствие. */
  matchOf() {
    const m = {};
    for (const wid in this.engaged) { const pid = this.engaged[wid]; m[wid] = pid; m[pid] = wid; }
    return m;
  }
}

/** Прогнать алгоритм до конца и вернуть matchOf. */
function solveStable(cast, side) {
  const gs = new GaleShapley(cast, side);
  let guard = 0;
  while (!gs.done && guard++ < 100000) gs.step();
  return gs.matchOf();
}

/* =====================================================================
   7. BOARD — доска: две колонки + линии + анимации + drag
   ===================================================================== */
class Board {
  constructor(hostEl, cast) {
    this.host = hostEl;
    this.cast = cast;
    this.cards = {};           // id -> element
    this.links = new Map();    // "Mx|Wy" -> path element
    this.match = {};           // текущее отрисованное соответствие
    this.build();
  }

  build() {
    this.host.innerHTML = '';
    // слой линий
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'links');
    this.host.appendChild(this.svg);

    const colM = document.createElement('div'); colM.className = 'board-col men';
    const colW = document.createElement('div'); colW.className = 'board-col women';
    this.cast.men.forEach(p => colM.appendChild(this.makeCard(p)));
    this.cast.women.forEach(p => colW.appendChild(this.makeCard(p)));
    this.host.appendChild(colM);
    this.host.appendChild(colW);

    this.links.clear(); this.match = {};
    // перерисовать линии при ресайзе
    if (!this._resizeBound) { this._resizeBound = () => this.redraw(); window.addEventListener('resize', this._resizeBound); }
  }

  makeCard(p) {
    const card = document.createElement('div');
    card.className = 'person-card';
    card.id = this.host.id + '-' + p.id;
    card.dataset.id = p.id;
    // список симпатий показан всегда, прямо на карточке
    const items = p.prefs.map(oid =>
      `<li data-oid="${oid}">${this.cast.byId[oid].name}</li>`).join('');
    card.innerHTML = `
      <div class="pcard-avatar">${personSVG(p.look, 1)}</div>
      <div class="pcard-body">
        <div class="pcard-name">${p.name}</div>
        <ol class="pcard-prefs-list">${items}</ol>
      </div>
      <span class="pcard-anchor"></span>`;
    this.cards[p.id] = card;
    return card;
  }

  /** Подсветить в списках симпатий текущего партнёра (💞). */
  updatePrefHighlight() {
    Object.entries(this.cards).forEach(([id, card]) => {
      const cur = this.match[id];
      card.querySelectorAll('.pcard-prefs-list li').forEach(li =>
        li.classList.toggle('cur', li.dataset.oid === cur));
    });
  }

  /* --- координаты якоря карточки относительно доски --- */
  anchor(id) {
    const card = this.cards[id];
    const a = card.querySelector('.pcard-anchor').getBoundingClientRect();
    const b = this.host.getBoundingClientRect();
    return { x: a.left + a.width / 2 - b.left, y: a.top + a.height / 2 - b.top };
  }

  pathD(a, b) {
    const dx = (b.x - a.x) * 0.5;
    return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
  }

  key(id1, id2) { const m = id1[0] === 'M' ? id1 : id2, w = id1[0] === 'W' ? id1 : id2; return m + '|' + w; }

  /** Нарисовать соответствие matchOf (со сравнением с текущим — плавно). */
  drawMatches(matchOf, opts = {}) {
    this.match = Object.assign({}, matchOf);
    const wanted = new Set();
    this.cast.men.forEach(m => { const w = matchOf[m.id]; if (w) wanted.add(this.key(m.id, w)); });

    // удалить лишние
    for (const [k, el] of this.links) {
      if (!wanted.has(k)) { el.style.opacity = '0'; const e = el; setTimeout(() => e.remove(), 500); this.links.delete(k); }
    }
    // добавить/обновить
    wanted.forEach(k => {
      const [mId, wId] = k.split('|');
      const d = this.pathD(this.anchor(mId), this.anchor(wId));
      let el = this.links.get(k);
      if (!el) {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        el.setAttribute('class', 'link-path');
        el.style.opacity = '0';
        this.svg.appendChild(el);
        this.links.set(k, el);
        el.setAttribute('d', d);
        requestAnimationFrame(() => { el.style.opacity = '1'; });
      } else {
        el.setAttribute('d', d);
      }
    });

    // подсветка карточек
    this.cast.men.concat(this.cast.women).forEach(p => this.cards[p.id].classList.remove('engaged', 'free', 'blocking'));
    if (opts.highlightEngaged) {
      Object.keys(matchOf).forEach(id => this.cards[id] && this.cards[id].classList.add('engaged'));
    }
    if (opts.freeIds) opts.freeIds.forEach(id => this.cards[id] && this.cards[id].classList.add('free'));

    this.updatePrefHighlight();
  }

  /** Перерисовать линии по текущему match (после ресайза). */
  redraw() { if (this.match) this.drawMatches(this.match, this._lastOpts || {}); }

  /** Нарисовать блокирующие пары (красным пунктиром) + тряска карточек. */
  showBlocking(pairs) {
    pairs.forEach(([mId, wId], i) => {
      setTimeout(() => {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        el.setAttribute('class', 'link-path block');
        el.setAttribute('d', this.pathD(this.anchor(mId), this.anchor(wId)));
        this.svg.appendChild(el);
        this.cards[mId].classList.add('blocking');
        this.cards[wId].classList.add('blocking');
        this.flyHeart(mId, wId, '💔');
        setTimeout(() => { this.cards[mId].classList.remove('blocking'); this.cards[wId].classList.remove('blocking'); }, 700);
      }, i * 650);
    });
  }

  clearBlocking() { this.svg.querySelectorAll('.block').forEach(e => e.remove()); }

  setState(id, cls, on = true) { this.cards[id] && this.cards[id].classList.toggle(cls, on); }
  clearStates(cls) { Object.values(this.cards).forEach(c => c.classList.remove(cls)); }

  bounce(id) { const c = this.cards[id]; if (!c) return; c.classList.remove('happy'); void c.offsetWidth; c.classList.add('happy'); }

  /** Летящее сердечко/эмодзи от карточки к карточке. */
  flyHeart(fromId, toId, emoji = '💖', cb) {
    const a = this.anchor(fromId), b = this.anchor(toId);
    const h = document.createElement('div');
    h.className = 'heart-fly'; h.textContent = emoji;
    h.style.left = a.x + 'px'; h.style.top = a.y + 'px';
    h.style.transform = 'translate(-50%,-50%) scale(0.6)';
    this.host.appendChild(h);
    requestAnimationFrame(() => {
      h.style.transform = `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y}px)) scale(1.2)`;
    });
    const done = () => { h.style.opacity = '0'; setTimeout(() => h.remove(), 300); if (cb) cb(); };
    h.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 900); // подстраховка
  }

  /* --- интерактивное соединение (сцена 2) --- */
  enableMatching(onChange) {
    this.match = {};
    let dragFrom = null, temp = null;
    const move = e => {
      if (!dragFrom) return;
      const pt = this.pointer(e);
      temp.setAttribute('d', this.pathD(this.anchor(dragFrom), pt));
    };
    const up = e => {
      if (!dragFrom) return;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const pt = e.changedTouches ? e.changedTouches[0] : e;
      const target = document.elementFromPoint(pt.clientX, pt.clientY);
      const card = target && target.closest('.person-card');
      if (temp) { temp.remove(); temp = null; }
      if (card && card.dataset.id && card.dataset.id[0] !== dragFrom[0]) {
        this.setPlayerMatch(dragFrom, card.dataset.id);
        if (onChange) onChange(this.match);
      }
      this.cards[dragFrom] && this.cards[dragFrom].classList.remove('selected');
      dragFrom = null;
    };
    Object.entries(this.cards).forEach(([id, card]) => {
      card.addEventListener('pointerdown', e => {
        if (e.target.closest('.pcard-prefs')) return; // не мешать кнопке вкусов
        e.preventDefault();
        dragFrom = id;
        card.classList.add('selected');
        temp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        temp.setAttribute('class', 'link-path temp');
        this.svg.appendChild(temp);
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
      });
    });
  }

  pointer(e) {
    const b = this.host.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - b.left, y: p.clientY - b.top };
  }

  /** Установить пару игрока (1-к-1: рвём старые связи обоих). */
  setPlayerMatch(id1, id2) {
    const a = id1[0] === 'M' ? id1 : id2;
    const b = id1[0] === 'W' ? id1 : id2;
    // снять старых партнёров
    const oldA = this.match[a], oldB = this.match[b];
    if (oldA) delete this.match[oldA];
    if (oldB) delete this.match[oldB];
    delete this.match[a]; delete this.match[b];
    this.match[a] = b; this.match[b] = a;
    this.drawMatches(this.match);
    this.bounce(a); this.bounce(b);
  }
}

/* =====================================================================
   8. МЕНЕДЖЕР СЦЕН + НАВИГАЦИЯ
   ===================================================================== */
const scenes = document.querySelectorAll('.scene');
const navItems = document.querySelectorAll('.nav-item');

function showScene(id) {
  scenes.forEach(s => s.classList.toggle('active', s.id === id));
  navItems.forEach(n => n.classList.toggle('active', n.dataset.scene === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  sceneEnter[id] && sceneEnter[id]();
}
document.querySelectorAll('[data-scene]').forEach(el =>
  el.addEventListener('click', () => showScene(el.dataset.scene)));

/* Общий каст для сцен 2–7 (одни и те же люди → интуиция копится). */
let STORY = makeCast(5);

/* Хуки входа в сцену. */
const sceneEnter = {
  'scene-pair':   () => initPair(),
  'scene-chaos':  () => initChaos(),
  'scene-stable': () => initStableScene(),
  'scene-step':   () => initStep(),
  'scene-auto':   () => initAuto(),
  'scene-verify': () => initVerify(),
  'scene-sandbox':() => initSandbox(),
};

/* =====================================================================
   9. СЦЕНЫ
   ===================================================================== */

/* ---------- Сцена 2: собери пары ---------- */
let board2, playerMatch = {};
function initPair() {
  board2 = new Board(document.getElementById('board2'), STORY);
  playerMatch = {};
  board2.enableMatching(m => {
    playerMatch = Object.assign({}, m);
    const pairs = STORY.men.filter(mn => playerMatch[mn.id]).length;
    document.getElementById('pairCounter').textContent = `Соединено: ${pairs} / ${STORY.men.length}`;
    document.getElementById('btnCheck2').disabled = pairs < STORY.men.length;
  });
  document.getElementById('pairCounter').textContent = `Соединено: 0 / ${STORY.men.length}`;
  document.getElementById('btnCheck2').disabled = true;
}
document.getElementById('btnShuffle2').addEventListener('click', () => { STORY = makeCast(5); initPair(); });
document.getElementById('btnCheck2').addEventListener('click', () => showScene('scene-chaos'));

/* ---------- Сцена 3: хаос ---------- */
let board3;
function initChaos() {
  board3 = new Board(document.getElementById('board3'), STORY);
  // если игрок не собрал пары — сделаем случайное распределение
  if (Object.keys(playerMatch).length < STORY.men.length * 2) {
    const ws = shuffle(STORY.women.map(w => w.id));
    playerMatch = {};
    STORY.men.forEach((m, i) => { playerMatch[m.id] = ws[i]; playerMatch[ws[i]] = m.id; });
    document.getElementById('chaosIntro').textContent = 'Пары собрали случайно. Всё ли спокойно?';
  } else {
    document.getElementById('chaosIntro').textContent = 'Вот пары, которые ты составила. Всё ли спокойно?';
  }
  board3.drawMatches(playerMatch);
  document.getElementById('chaosMsg').textContent = '';
  document.getElementById('btnToStable').hidden = true;
  document.getElementById('btnChaos').disabled = false;
}
document.getElementById('btnChaos').addEventListener('click', () => {
  const blocks = findBlockingPairs(STORY, playerMatch);
  const msg = document.getElementById('chaosMsg');
  document.getElementById('btnChaos').disabled = true;
  if (blocks.length === 0) {
    msg.textContent = '😳 Невероятно — твоё распределение уже стабильно! Так тоже бывает.';
  } else {
    board3.showBlocking(blocks);
    const shown = blocks.slice(0, 6);
    setTimeout(() => {
      msg.innerHTML = `💔 Нашлось нестабильных парочек: <b>${blocks.length}</b>.
        Похоже, случайные свадьбы работают не очень…`;
    }, shown.length * 650 + 200);
  }
  setTimeout(() => { document.getElementById('btnToStable').hidden = false; }, 700);
});

/* ---------- Сцена 4: что такое стабильность ---------- */
let board4;
function initStableScene() {
  board4 = new Board(document.getElementById('board4'), STORY);
  const match = solveStable(STORY, 'M');
  board4.drawMatches(match, { highlightEngaged: true });
  // подсветить конкретный пример: любая «запретная» пара, где кто-то не хочет уходить
  const m = STORY.men[0];
  const notPartner = STORY.women.find(w => match[m.id] !== w.id);
  const ex = document.getElementById('stableExample');
  if (notPartner) {
    const mPartnerName = STORY.byId[match[m.id]].name;
    const better = rankOf(m, notPartner.id) < rankOf(m, match[m.id]);
    if (better) {
      // m хотел бы к notPartner, но она его не хочет
      const wPartnerName = STORY.byId[match[notPartner.id]].name;
      ex.innerHTML = `Пример: ${m.name} был бы не прочь к ${notPartner.name}, но ${notPartner.name}
        предпочитает своего ${wPartnerName}. Значит, сбежать не выйдет — распределение держится. 👍`;
    } else {
      ex.innerHTML = `Пример: ${m.name} и так доволен своей парой (${mPartnerName}) — на других даже не смотрит. 👍`;
    }
  }
}

/* ---------- Сцена 5: по шагам ---------- */
let board5, gs5;
function initStep() {
  board5 = new Board(document.getElementById('board5'), STORY);
  gs5 = new GaleShapley(STORY, 'M');
  board5.drawMatches({}, { freeIds: gs5.free.slice() });
  const log = document.getElementById('log5');
  log.innerHTML = '<div class="log-line">Готов начать. Все мужчины свободны.</div>';
  document.getElementById('btnStep').disabled = false;
  document.getElementById('btnToAuto').hidden = true;
}
function logLine(hostId, html) {
  const log = document.getElementById(hostId);
  const line = document.createElement('div'); line.className = 'log-line'; line.innerHTML = html;
  log.appendChild(line); log.scrollTop = log.scrollHeight;
}
document.getElementById('btnStep').addEventListener('click', () => {
  if (gs5.done) return;
  const ev = gs5.step();
  const B = STORY.byId;
  if (ev.type === 'done') return;
  const pn = B[ev.proposer].name, wn = B[ev.receiver].name;
  if (ev.type === 'accept') {
    board5.flyHeart(ev.proposer, ev.receiver, '💌');
    board5.bounce(ev.receiver);
    logLine('log5', `<span class="em">${pn}</span> делает предложение <span class="em">${wn}</span> → она свободна и <b>соглашается</b> 😊`);
  } else if (ev.type === 'swap') {
    board5.flyHeart(ev.proposer, ev.receiver, '💌');
    board5.bounce(ev.receiver);
    logLine('log5', `<span class="em">${pn}</span> предлагает <span class="em">${wn}</span> → он ей нравится больше, чем ${B[ev.rejected].name}. ${B[ev.rejected].name} снова свободен 💔`);
  } else if (ev.type === 'reject') {
    board5.flyHeart(ev.proposer, ev.receiver, '💔');
    logLine('log5', `<span class="em">${pn}</span> предлагает <span class="em">${wn}</span> → у неё уже есть кто-то получше. <b>Отказ.</b>`);
  }
  board5.drawMatches(gs5.matchOf(), { freeIds: gs5.free.slice() });
  if (gs5.done) {
    document.getElementById('btnStep').disabled = true;
    logLine('log5', `✅ Свободных мужчин не осталось — <b>стабильное распределение готово!</b>`);
    document.getElementById('btnToAuto').hidden = false;
  }
});
document.getElementById('btnResetStep').addEventListener('click', initStep);

/* ---------- Сцена 6: авто-прогон ---------- */
let board6, gs6, auto6Running = false;
function initAuto() {
  board6 = new Board(document.getElementById('board6'), STORY);
  gs6 = new GaleShapley(STORY, 'M');
  board6.drawMatches({}, { freeIds: gs6.free.slice() });
  document.getElementById('result6').hidden = true;
  document.getElementById('btnToVerify').hidden = true;
  document.getElementById('btnAuto').disabled = false;
  auto6Running = false;
}
document.getElementById('btnAuto').addEventListener('click', () => {
  if (auto6Running) return;
  auto6Running = true;
  document.getElementById('btnAuto').disabled = true;
  const tick = () => {
    if (gs6.done) {
      board6.drawMatches(gs6.matchOf(), { highlightEngaged: true });
      const r = document.getElementById('result6');
      r.textContent = '✨ Stable Matching Found — стабильное распределение найдено!';
      r.hidden = false;
      STORY.men.concat(STORY.women).forEach((p, i) => setTimeout(() => board6.bounce(p.id), i * 80));
      document.getElementById('btnToVerify').hidden = false;
      auto6Running = false;
      return;
    }
    const ev = gs6.step();
    if (ev.type !== 'done') {
      board6.flyHeart(ev.proposer, ev.receiver, ev.type === 'reject' ? '💔' : '💌');
      if (ev.type !== 'reject') board6.bounce(ev.receiver);
    }
    board6.drawMatches(gs6.matchOf(), { freeIds: gs6.free.slice() });
    setTimeout(tick, 700);
  };
  tick();
});
document.getElementById('btnResetAuto').addEventListener('click', initAuto);

/* ---------- Сцена 7: проверка ---------- */
let board7, match7, sel7 = { M: null, W: null };
function initVerify() {
  board7 = new Board(document.getElementById('board7'), STORY);
  match7 = solveStable(STORY, 'M');
  board7.drawMatches(match7, { highlightEngaged: true });
  sel7 = { M: null, W: null };
  document.getElementById('verifyBox').textContent = 'Выбери мужчину и женщину…';
  // клики по карточкам
  Object.entries(board7.cards).forEach(([id, card]) => {
    card.addEventListener('click', e => {
      if (e.target.closest('.pcard-prefs')) return;
      const side = id[0];
      if (sel7[side]) board7.setState(sel7[side], 'selected', false);
      sel7[side] = id;
      board7.setState(id, 'selected', true);
      if (sel7.M && sel7.W) explainVerify();
    });
  });
}
function explainVerify() {
  const B = STORY.byId, m = B[sel7.M], w = B[sel7.W];
  const box = document.getElementById('verifyBox');
  if (match7[m.id] === w.id) {
    box.innerHTML = `💞 <b>${m.name}</b> и <b>${w.name}</b> — и так пара. Им и незачем сбегать!`;
    board7.flyHeart(m.id, w.id, '💞');
    return;
  }
  const mPartner = B[match7[m.id]].name, wPartner = B[match7[w.id]].name;
  const mWantsW = rankOf(m, w.id) < rankOf(m, match7[m.id]);
  const wWantsM = rankOf(w, m.id) < rankOf(w, match7[w.id]);
  const reasons = [];
  if (!mWantsW) reasons.push(`<b>${m.name}</b> предпочитает свою пару (${mPartner}): ${w.name} стоит ниже в его списке.`);
  if (!wWantsM) reasons.push(`<b>${w.name}</b> предпочитает свою пару (${wPartner}): ${m.name} лишь №${rankOf(w, m.id) + 1} в её списке.`);
  box.innerHTML = `🚫 Сбежать не получится. ${reasons.join(' И ')} <span class="good">Пара устойчива.</span>`;
  board7.flyHeart(m.id, w.id, '🚫');
}
document.getElementById('btnClearVerify').addEventListener('click', () => {
  if (!board7) return;
  if (sel7.M) board7.setState(sel7.M, 'selected', false);
  if (sel7.W) board7.setState(sel7.W, 'selected', false);
  sel7 = { M: null, W: null };
  document.getElementById('verifyBox').textContent = 'Выбери мужчину и женщину…';
});

/* ---------- Сцена 8: песочница ---------- */
let board8, gs8, sandboxCast, sb8Running = false;
function wireChips(group, cb) {
  group.addEventListener('click', e => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active'); group.dataset.value = chip.dataset.val;
    if (cb) cb(chip.dataset.val);
  });
}
const sbNChips = document.getElementById('sbNChips');
const sbSpeedChips = document.getElementById('sbSpeedChips');
const sbSideChips = document.getElementById('sbSideChips');

function initSandbox() {
  if (!sandboxCast) sandboxCast = makeCast(+sbNChips.dataset.value);
  board8 = new Board(document.getElementById('board8'), sandboxCast);
  board8.drawMatches({});
  document.getElementById('result8').hidden = true;
  document.getElementById('happiness').hidden = true;
}
wireChips(sbNChips, () => { sandboxCast = makeCast(+sbNChips.dataset.value); initSandbox(); });
wireChips(sbSpeedChips);
wireChips(sbSideChips, () => { if (board8) { board8.drawMatches({}); document.getElementById('result8').hidden = true; document.getElementById('happiness').hidden = true; } });
document.getElementById('btnSbRegen').addEventListener('click', () => { sandboxCast = makeCast(+sbNChips.dataset.value); initSandbox(); });

document.getElementById('btnSbRun').addEventListener('click', () => {
  if (sb8Running) return;
  sb8Running = true;
  const side = sbSideChips.dataset.value;
  const speed = +sbSpeedChips.dataset.value;
  gs8 = new GaleShapley(sandboxCast, side);
  document.getElementById('result8').hidden = true;
  document.getElementById('happiness').hidden = true;
  board8.drawMatches({}, { freeIds: gs8.free.slice() });

  const tick = () => {
    if (gs8.done) {
      board8.drawMatches(gs8.matchOf(), { highlightEngaged: true });
      const r = document.getElementById('result8');
      r.textContent = '✨ Стабильное распределение найдено!'; r.hidden = false;
      showHappiness(sandboxCast, gs8.matchOf(), side);
      sb8Running = false;
      return;
    }
    const ev = gs8.step();
    if (ev.type !== 'done' && speed >= 150) {
      board8.flyHeart(ev.proposer, ev.receiver, ev.type === 'reject' ? '💔' : '💌');
    }
    board8.drawMatches(gs8.matchOf(), { freeIds: gs8.free.slice() });
    setTimeout(tick, speed);
  };
  tick();
});

/** Показать «довольство» сторон: средний ранг партнёра (меньше — лучше). */
function showHappiness(cast, matchOf, side) {
  const avg = people => {
    let s = 0; people.forEach(p => s += rankOf(p, matchOf[p.id]) + 1); return s / people.length;
  };
  const avgM = avg(cast.men), avgW = avg(cast.women), n = cast.men.length;
  const box = document.getElementById('happiness'); box.hidden = false;
  document.getElementById('valM').textContent = avgM.toFixed(2);
  document.getElementById('valW').textContent = avgW.toFixed(2);
  // ширина полоски: 1 (идеал) → 100%, n (худшее) → мало
  const w = v => `${Math.max(6, 100 - ((v - 1) / (n - 1 || 1)) * 90)}%`;
  document.getElementById('barM').style.width = w(avgM);
  document.getElementById('barW').style.width = w(avgW);
  const proposers = side === 'M' ? 'мужчины' : 'женщины';
  document.getElementById('surpriseNote').innerHTML =
    `🎁 Предложения делали <b>${proposers}</b> — и у них средний ранг партнёра лучше (меньше).
     Переключи, кто предлагает, и запусти снова: результат изменится! Алгоритм всегда выгоднее той стороне, что предлагает.`;
}

/* =====================================================================
   10. ДЕКОР И ЗАПУСК
   ===================================================================== */
function spawnBackgroundHearts() {
  const host = document.getElementById('bgHearts');
  const emojis = ['💛', '💙', '💚', '💜', '🩷', '🤍', '💌'];
  for (let i = 0; i < 12; i++) {
    const h = document.createElement('div');
    h.className = 'fh'; h.textContent = emojis[i % emojis.length];
    h.style.left = Math.random() * 100 + 'vw';
    h.style.animationDuration = (14 + Math.random() * 16) + 's';
    h.style.animationDelay = (-Math.random() * 20) + 's';
    h.style.fontSize = (18 + Math.random() * 22) + 'px';
    host.appendChild(h);
  }
}

/** Милая парочка для сайдбара/вступления. */
function coupleSVG() {
  return `<svg viewBox="0 0 160 122" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(0,0) scale(0.8)">${personSVG(makeLook('M'), 2)}</g>
    <text x="70" y="66" font-size="26">💘</text>
    <g transform="translate(70,0) scale(0.8)">${personSVG(makeLook('W'), 2)}</g>
  </svg>`;
}

function boot() {
  document.getElementById('helperArt').innerHTML = coupleSVG();
  document.getElementById('introArt').innerHTML = introArtSVG();
  spawnBackgroundHearts();
}

/** Вступительная сценка: 3 мужчины и 3 женщины + сердечки. */
function introArtSVG() {
  const men = [0, 1, 2].map(i => `<g transform="translate(${i * 46},70) scale(0.5)">${personSVG(makeLook('M'), pick([1,2]))}</g>`).join('');
  const women = [0, 1, 2].map(i => `<g transform="translate(${i * 46},0) scale(0.5)">${personSVG(makeLook('W'), pick([1,2]))}</g>`).join('');
  return `<svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg">
    ${men}${women}
    <text x="150" y="70" font-size="30">💞</text>
    <text x="20" y="130" font-size="22">❓</text>
  </svg>`;
}

boot();

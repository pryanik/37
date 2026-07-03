/* =====================================================================
   Привередливая невеста — интерактивное объяснение задачи о секретаре.
   Чистый ванильный JS. Без библиотек, без сборки, без сети.

   Разделы:
     1. Локальные пулы данных
     2. Генерация кандидатов
     3. Отрисовка персонажей (SVG): жених + невеста
     4. Стратегия и симуляции (математика)
     5. Менеджер сцен + навигация
     6. Сцена 2: интерактивная первая попытка
     7. Сцена 3: раскрытие очереди
     8. Сцена 4: стратегия 37% + график на canvas
     9. Сцена 5: иллюстрация «почему 37%»
    10. Сцена 6: песочница
    11. Декор и запуск
   ===================================================================== */

'use strict';

/* =====================================================================
   1. ЛОКАЛЬНЫЕ ПУЛЫ ДАННЫХ
   ===================================================================== */

const NAMES = [
  'Варфоломей', 'Персиваль', 'Гоша', 'Себастьян', 'Руперт', 'Корней',
  'Тимофей', 'Максимилиан', 'Арчибальд', 'Рудольф', 'Модест', 'Аркадий',
  'Дмитрий', 'Лоренцо', 'Казимир', 'Марк', 'Отто', 'Игнатий', 'Эдвард', 'Валентин'
];

const TRAITS = [
  'мечтает открыть маленькую кофейню',
  'умеет по-настоящему слушать',
  'слишком много говорит про крипту',
  'неожиданно пишет приличные стихи',
  'пришёл на встречу с мамой',
  'заявляет, что «эмоционально зрелый» (подозрительно)',
  'держит трёх котов и ни о чём не жалеет',
  'умеет складывать простыню на резинке (якобы)',
  'играет на баяне на всех вечеринках',
  'имеет твёрдое мнение о начинке для пиццы',
  'предлагает «вместе со-регулироваться»',
  'назвал все 14 своих растений по именам',
  'снова готовится к марафону',
  'цитирует фильмы, которых ты не видела',
  'паркуется параллельно с первого раза',
  'уверен, что у его закваски есть душа',
  'подозрительно хорош в барном квизе',
  'отвечает на сообщения за четыре рабочих дня',
  'однажды встретил звезду в аэропорту',
  'считает, что хлопья — это суп'
];

/* палитры для персонажей */
const SKINS  = ['#f3c9a2', '#e7b78a', '#d49c72', '#bd8352', '#9a6438', '#f8dcc0'];
const HAIRS  = ['#3a2a1a', '#5a3a20', '#1d1d24', '#8a5a2a', '#c9a227', '#b8b8c0', '#a83232'];
const SUITS  = ['#4a4e69', '#2d6a4f', '#6a4c93', '#1d3557', '#7f5539', '#495057', '#5a3e85', '#3a5a40'];
const TIES   = ['#ef6f8e', '#e63946', '#ffcf4d', '#7c5cbf', '#2a9d8f', '#e76f51'];
const HATS   = ['top', 'bowler', 'cap', 'none'];
const FACIAL = ['none', 'mustache', 'beard', 'stubble', 'mustache', 'none'];

/* =====================================================================
   2. ГЕНЕРАЦИЯ КАНДИДАТОВ
   Каждый жених: { id, score, name, color, trait, look }.
   score — скрытый абсолютный рейтинг 1..100 (уникальный).
   Игрок не видит score во время выбора — только относительные подсказки.
   ===================================================================== */

/** Перемешать копию массива (Fisher–Yates). */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Детерминированно (по индексу) собрать внешность жениха — чтобы она была
 *  стабильной между перерисовками и НЕ зависела от score (не подсказывает). */
function makeLook(seed) {
  return {
    skin:      SKINS[seed % SKINS.length],
    hairColor: HAIRS[(seed * 3 + 1) % HAIRS.length],
    suit:      SUITS[(seed * 2 + 2) % SUITS.length],
    tie:       TIES[(seed * 5 + 1) % TIES.length],
    hat:       HATS[(seed * 7 + (seed % 3)) % HATS.length],
    facial:    FACIAL[(seed * 11 + (seed % 2)) % FACIAL.length]
  };
}

/** Сгенерировать n женихов с уникальными скрытыми рейтингами 1..100. */
function generateCandidates(n) {
  const pool = [];
  for (let i = 1; i <= 100; i++) pool.push(i);
  const scores = shuffle(pool).slice(0, n);
  const names = shuffle(NAMES);
  const traits = shuffle(TRAITS);

  const candidates = [];
  for (let i = 0; i < n; i++) {
    candidates.push({
      id: i,
      score: scores[i],
      name: names[i % names.length],
      color: SUITS[i % SUITS.length],
      trait: traits[i % traits.length],
      look: makeLook(i + 1)
    });
  }
  return candidates;
}

/* =====================================================================
   3. ОТРИСОВКА ПЕРСОНАЖЕЙ (SVG)
   Всё рисуется вручную, ничего не грузится из сети.
   ===================================================================== */

/**
 * Полнорослый мультяшный жених.
 * @param {object}  look   { skin, hairColor, suit, tie, hat, facial }
 * @param {number}  mood   0 = грустный, 1 = обычный, 2 = радостный
 * @param {boolean} crown  надеть золотую корону (для настоящего лучшего)
 */
function groomSVG(look, mood = 1, crown = false) {
  const { skin, hairColor = '#33271a', suit = '#4a4e69', tie = '#ef6f8e',
          hat = 'top', facial = 'none' } = look;

  const mouths = ['M52 66 q8 -4 16 0', 'M52 65 q8 7 16 0', 'M50 64 q10 11 20 0 q-10 6 -20 0'];
  const mouth = mouths[Math.max(0, Math.min(2, mood))];

  // причёска сверху (не рисуем под цилиндром/котелком)
  let topHair = '';
  if (crown || hat === 'none') {
    topHair = `<path d="M37 46 Q38 26 60 25 Q82 26 83 46 Q79 35 60 34 Q41 35 37 46 Z" fill="${hairColor}"/>`;
  } else if (hat === 'cap') {
    topHair = `<path d="M40 46 Q42 34 60 33 Q78 34 80 46" fill="none" stroke="${hairColor}" stroke-width="5"/>`;
  }
  const sideburns =
    `<path d="M38 52 q-2 8 1 15" stroke="${hairColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
     <path d="M82 52 q2 8 -1 15" stroke="${hairColor}" stroke-width="4" fill="none" stroke-linecap="round"/>`;

  // растительность на лице
  let facialSVG = '';
  if (facial === 'mustache') facialSVG = `<path d="M49 63 Q60 70 71 63 Q60 67 49 63 Z" fill="${hairColor}"/>`;
  else if (facial === 'beard') facialSVG =
    `<path d="M39 56 Q41 86 60 88 Q79 86 81 56 Q72 76 60 76 Q48 76 39 56 Z" fill="${hairColor}"/>`;
  else if (facial === 'stubble') facialSVG =
    `<path d="M42 66 Q60 84 78 66 Q72 78 60 78 Q48 78 42 66 Z" fill="${hairColor}" opacity="0.3"/>`;

  // головной убор
  let hatSVG = '';
  if (!crown) {
    if (hat === 'top') hatSVG =
      `<ellipse cx="60" cy="34" rx="30" ry="6" fill="#2b2b33"/>
       <rect x="45" y="6" width="30" height="29" rx="2" fill="#2b2b33"/>
       <rect x="45" y="24" width="30" height="5" fill="${tie}"/>`;
    else if (hat === 'bowler') hatSVG =
      `<ellipse cx="60" cy="35" rx="27" ry="5.5" fill="#3a2f2a"/>
       <path d="M42 35 Q42 15 60 15 Q78 15 78 35 Z" fill="#3a2f2a"/>`;
    else if (hat === 'cap') hatSVG =
      `<path d="M38 34 Q40 17 60 17 Q80 17 82 34 Z" fill="${suit}"/>
       <ellipse cx="74" cy="35" rx="16" ry="4" fill="${suit}"/>`;
  }

  const crownSVG = crown ?
    `<path d="M40 20 l7 11 l13 -13 l13 13 l7 -11 l-4 18 l-32 0 z"
           fill="#ffcf4d" stroke="#33272a" stroke-width="2" stroke-linejoin="round"/>
     <circle cx="40" cy="20" r="3.5" fill="#ffcf4d" stroke="#33272a" stroke-width="2"/>
     <circle cx="80" cy="20" r="3.5" fill="#ffcf4d" stroke="#33272a" stroke-width="2"/>
     <circle cx="60" cy="18" r="3.5" fill="#ffcf4d" stroke="#33272a" stroke-width="2"/>` : '';

  // брови по настроению
  const brow = mood === 0
    ? `<path d="M46 46 l10 3" stroke="#33272a" stroke-width="2.5" stroke-linecap="round"/>
       <path d="M74 46 l-10 3" stroke="#33272a" stroke-width="2.5" stroke-linecap="round"/>`
    : `<path d="M46 47 l10 -1" stroke="#33272a" stroke-width="2.5" stroke-linecap="round"/>
       <path d="M74 47 l-10 -1" stroke="#33272a" stroke-width="2.5" stroke-linecap="round"/>`;

  return `
  <svg viewBox="0 0 120 178" xmlns="http://www.w3.org/2000/svg">
    <!-- ноги + обувь -->
    <rect x="47" y="150" width="12" height="22" rx="3" fill="#39343f"/>
    <rect x="61" y="150" width="12" height="22" rx="3" fill="#39343f"/>
    <ellipse cx="50" cy="173" rx="10" ry="4.5" fill="#26222b"/>
    <ellipse cx="70" cy="173" rx="10" ry="4.5" fill="#26222b"/>
    <!-- пиджак -->
    <path d="M33 92 Q60 80 87 92 L83 152 L37 152 Z" fill="${suit}" stroke="#33272a" stroke-width="3" stroke-linejoin="round"/>
    <!-- руки -->
    <path d="M35 94 Q24 116 32 140" fill="none" stroke="${suit}" stroke-width="11" stroke-linecap="round"/>
    <path d="M85 94 Q96 116 88 140" fill="none" stroke="${suit}" stroke-width="11" stroke-linecap="round"/>
    <circle cx="31" cy="141" r="6" fill="${skin}"/>
    <circle cx="89" cy="141" r="6" fill="${skin}"/>
    <!-- рубашка + бабочка -->
    <path d="M53 90 L60 112 L67 90 Z" fill="#fff"/>
    <path d="M60 95 l-9 -5 l0 11 z" fill="${tie}"/>
    <path d="M60 95 l9 -5 l0 11 z" fill="${tie}"/>
    <circle cx="60" cy="95.5" r="2.6" fill="${tie}"/>
    <!-- шея + голова -->
    <rect x="54" y="76" width="12" height="12" fill="${skin}"/>
    <circle cx="60" cy="56" r="23" fill="${skin}" stroke="#33272a" stroke-width="3"/>
    <circle cx="37" cy="58" r="4.5" fill="${skin}"/>
    <circle cx="83" cy="58" r="4.5" fill="${skin}"/>
    <!-- румянец -->
    <circle cx="45" cy="63" r="5" fill="#ff6b8a" opacity="0.28"/>
    <circle cx="75" cy="63" r="5" fill="#ff6b8a" opacity="0.28"/>
    ${sideburns}
    ${brow}
    <!-- глаза -->
    <circle cx="51" cy="54" r="3.6" fill="#33272a"/>
    <circle cx="69" cy="54" r="3.6" fill="#33272a"/>
    <circle cx="52.2" cy="52.8" r="1.2" fill="#fff"/>
    <circle cx="70.2" cy="52.8" r="1.2" fill="#fff"/>
    <!-- нос -->
    <path d="M60 56 l-2 7 l4 0" fill="none" stroke="#c98a63" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- рот -->
    <path d="${mouth}" fill="none" stroke="#33272a" stroke-width="2.6" stroke-linecap="round"/>
    ${facialSVG}
    ${topHair}
    ${hatSVG}
    ${crownSVG}
  </svg>`;
}

/** Мультяшная невеста (для сайдбара, вступления и сцены 5). */
function brideSVG() {
  return `
  <svg viewBox="0 0 120 178" xmlns="http://www.w3.org/2000/svg">
    <!-- фата сзади -->
    <path d="M60 30 C34 34 30 120 40 170 L18 170 C10 110 22 40 60 30 Z" fill="#eef0ff" opacity="0.85"/>
    <path d="M60 30 C86 34 90 120 80 170 L102 170 C110 110 98 40 60 30 Z" fill="#eef0ff" opacity="0.85"/>
    <!-- платье -->
    <path d="M46 84 Q60 74 74 84 L92 168 L28 168 Z" fill="#ffffff" stroke="#33272a" stroke-width="3" stroke-linejoin="round"/>
    <!-- руки -->
    <path d="M48 90 Q40 110 48 126" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
    <path d="M72 90 Q80 110 72 126" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
    <circle cx="48" cy="127" r="5.5" fill="#f3c9a2"/>
    <circle cx="72" cy="127" r="5.5" fill="#f3c9a2"/>
    <!-- букет -->
    <g transform="translate(52,124)">
      <circle cx="4" cy="4" r="6" fill="#ef6f8e"/><circle cx="14" cy="2" r="6" fill="#ffcf4d"/>
      <circle cx="9" cy="10" r="6" fill="#7c5cbf"/><circle cx="9" cy="3" r="4" fill="#fff"/>
    </g>
    <!-- шея + голова -->
    <rect x="54" y="74" width="12" height="12" fill="#f3c9a2"/>
    <circle cx="60" cy="54" r="22" fill="#f3c9a2" stroke="#33272a" stroke-width="3"/>
    <!-- волосы -->
    <path d="M38 54 Q36 30 60 30 Q84 30 82 54 Q82 44 74 40 L46 40 Q38 44 38 54 Z" fill="#5a3a20"/>
    <path d="M38 52 q-4 16 0 30" stroke="#5a3a20" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M82 52 q4 16 0 30" stroke="#5a3a20" stroke-width="7" fill="none" stroke-linecap="round"/>
    <!-- фата сверху -->
    <path d="M60 20 C40 20 36 40 36 40 L84 40 C84 40 80 20 60 20 Z" fill="#f6f6ff" stroke="#33272a" stroke-width="2.5"/>
    <circle cx="60" cy="20" r="4" fill="#ef6f8e" stroke="#33272a" stroke-width="2"/>
    <!-- румянец + лицо -->
    <circle cx="47" cy="60" r="4.5" fill="#ff6b8a" opacity="0.3"/>
    <circle cx="73" cy="60" r="4.5" fill="#ff6b8a" opacity="0.3"/>
    <circle cx="52" cy="53" r="3.3" fill="#33272a"/>
    <circle cx="68" cy="53" r="3.3" fill="#33272a"/>
    <circle cx="53" cy="52" r="1.1" fill="#fff"/>
    <circle cx="69" cy="52" r="1.1" fill="#fff"/>
    <path d="M53 62 q7 6 14 0" fill="none" stroke="#33272a" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
}

/** Крошечная голова жениха для «линии из 100» в сцене 5. */
function miniHeadSVG(fill) {
  return `
  <svg viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="16" height="4" fill="#2b2b33"/>
    <rect x="7" y="1" width="10" height="7" rx="1" fill="#2b2b33"/>
    <circle cx="12" cy="17" r="9" fill="${fill}" stroke="#33272a" stroke-width="2"/>
    <circle cx="9" cy="16" r="1.6" fill="#33272a"/>
    <circle cx="15" cy="16" r="1.6" fill="#33272a"/>
    <path d="M9 21 q3 3 6 0" fill="none" stroke="#33272a" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
}

/** Композиция для вступления: невеста + уходящая очередь женихов. */
function heroSVG() {
  const fade = [0.85, 0.6, 0.4, 0.28].map((op, i) =>
    `<g transform="translate(${170 + i * 46},70) scale(0.45)" opacity="${op}">${groomSVG(makeLook(i + 2), 1)}</g>`
  ).join('');
  return `
  <svg viewBox="0 0 460 210" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(20,20) scale(0.9)">${brideSVG()}</g>
    ${fade}
    <text x="368" y="60" font-size="30">…</text>
    <g transform="translate(388,70) scale(0.5)">${groomSVG(makeLook(9), 2)}</g>
    <text x="405" y="40" font-size="26">?</text>
  </svg>`;
}

/* =====================================================================
   4. СТРАТЕГИЯ И СИМУЛЯЦИИ (математика)
   ===================================================================== */

/**
 * Один прогон стратегии «смотри, потом прыгай» по массиву рейтингов.
 *   1. Пропустить первые k = floor(n * threshold) кандидатов (наблюдение).
 *   2. Запомнить лучший рейтинг среди пропущенных.
 *   3. Выбрать первого, кто лучше этого рекорда.
 *   4. Если такого нет: по умолчанию невеста остаётся ни с чем (проигрыш).
 *      Если pickLast = true — выбирает последнего кандидата.
 * @returns {{chosenIndex:number|null, chosenScore:number, isBest:boolean}}
 */
function runStrategyOnce(scores, threshold, pickLast = false) {
  const n = scores.length;
  const k = Math.floor(n * threshold);
  const bestScore = Math.max(...scores);

  let benchmark = -Infinity;
  for (let i = 0; i < k; i++) benchmark = Math.max(benchmark, scores[i]);

  for (let i = k; i < n; i++) {
    if (scores[i] > benchmark) {
      return { chosenIndex: i, chosenScore: scores[i], isBest: scores[i] === bestScore };
    }
  }
  if (pickLast && n > 0) {
    const last = scores[n - 1];
    return { chosenIndex: n - 1, chosenScore: last, isBest: last === bestScore };
  }
  return { chosenIndex: null, chosenScore: 0, isBest: false };
}

/** [1,2,...,n] */
function rankArray(n) {
  const a = new Array(n);
  for (let i = 0; i < n; i++) a[i] = i + 1;
  return a;
}

/**
 * Повторить стратегию trials раз на свежих случайных очередях.
 * @returns {{successRate, aloneCount, avgScoreOf100}}
 */
function simulateStrategy(n, threshold, trials, pickLast = false) {
  let wins = 0, alone = 0, rankSum = 0, picked = 0;
  for (let t = 0; t < trials; t++) {
    const scores = shuffle(rankArray(n)); // важен только относительный порядок
    const res = runStrategyOnce(scores, threshold, pickLast);
    if (res.isBest) wins++;
    if (res.chosenIndex === null) alone++;
    else { rankSum += res.chosenScore; picked++; }
  }
  const avgRank = picked ? rankSum / picked : 0;
  return {
    successRate: wins / trials,
    aloneCount: alone,
    avgScoreOf100: n > 1 ? (avgRank / n) * 100 : (picked ? 100 : 0)
  };
}

/** Пройтись по порогам 0..0.9 и вернуть кривую успеха + лучший порог. */
function sweepThresholds(n, trials, pickLast = false, step = 0.02) {
  const xs = [], ys = [];
  let best = { threshold: 0, rate: -1 };
  for (let th = 0; th <= 0.9 + 1e-9; th += step) {
    const rate = simulateStrategy(n, th, trials, pickLast).successRate;
    xs.push(th); ys.push(rate);
    if (rate > best.rate) best = { threshold: th, rate };
  }
  return { xs, ys, best };
}

/* =====================================================================
   5. МЕНЕДЖЕР СЦЕН + НАВИГАЦИЯ
   ===================================================================== */

const scenes = document.querySelectorAll('.scene');
const navItems = document.querySelectorAll('.nav-item');

/** Показать одну сцену по id, обновить подсветку в сайдбаре. */
function showScene(id) {
  scenes.forEach(s => s.classList.toggle('active', s.id === id));
  navItems.forEach(n => n.classList.toggle('active', n.dataset.scene === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (id === 'scene-play') startPlayRound();
  if (id === 'scene-why')  renderWhyLine();
}

// Любой элемент с data-scene управляет навигацией.
document.querySelectorAll('[data-scene]').forEach(el => {
  el.addEventListener('click', () => showScene(el.dataset.scene));
});

/* =====================================================================
   6. СЦЕНА 2 — ИНТЕРАКТИВНАЯ ПЕРВАЯ ПОПЫТКА
   ===================================================================== */

const PLAY_N = 12;
const play = { candidates: [], index: 0, finished: false, chosenIndex: null };

const suitorStage = document.getElementById('suitorStage');
const playQueue   = document.getElementById('playQueue');
const decisionRow = document.getElementById('decisionRow');
const metList     = document.getElementById('metList');
const metCaption  = document.getElementById('metCaption');
const playCounter = document.getElementById('playCounter');

/** Начать новый раунд из 12 женихов. */
function startPlayRound() {
  play.candidates = generateCandidates(PLAY_N);
  play.index = 0;
  play.finished = false;
  play.chosenIndex = null;
  decisionRow.style.display = 'flex';
  renderQueue();
  renderCurrentSuitor();
}

/** Прогресс-очередь из точек-квадратиков. */
function renderQueue() {
  playQueue.innerHTML = '';
  play.candidates.forEach((c, i) => {
    const slot = document.createElement('div');
    slot.className = 'qslot ' + (i < play.index ? 'seen'
      : (i === play.index && !play.finished) ? 'current' : 'future');
    slot.textContent = i + 1;
    playQueue.appendChild(slot);
  });
}

/** Относительная (честная) подсказка про текущего жениха. */
function relativeHint(current, seenScores) {
  if (seenScores.length === 0)
    return { text: 'Первый! Сравнивать пока не с кем 🤷', cls: 'avg', hearts: 3 };
  const better = seenScores.filter(s => current.score > s).length;
  const frac = better / seenScores.length;
  const isBest = current.score > Math.max(...seenScores);
  const hearts = Math.max(1, Math.round(frac * 4) + 1);
  if (isBest) return { text: 'Ого, он лучше всех предыдущих! ✨', cls: 'best', hearts: 5 };
  if (frac >= 0.5) return { text: 'Средний кандидат, ничего так.', cls: 'avg', hearts };
  return { text: 'Хуже твоего текущего рекордсмена 😕', cls: 'worse', hearts };
}

/** Отрисовать текущего жениха + подсказку. */
function renderCurrentSuitor() {
  const i = play.index;
  const c = play.candidates[i];
  const seen = play.candidates.slice(0, i).map(x => x.score);
  const hint = relativeHint(c, seen);
  const mood = hint.cls === 'best' ? 2 : hint.cls === 'worse' ? 0 : 1;
  const hearts = '❤️'.repeat(hint.hearts) + '🤍'.repeat(5 - hint.hearts);

  playCounter.textContent = `Кандидат ${i + 1} из ${PLAY_N}`;
  suitorStage.innerHTML = `
    <div class="suitor-card">
      <div class="suitor-avatar">${groomSVG(c.look, mood)}</div>
      <div class="suitor-info">
        <div class="suitor-name">${c.name}</div>
        <div class="suitor-trait">«${c.trait}»</div>
        <div class="hearts">${hearts}</div>
        <div class="bubble ${hint.cls}">${hint.text}</div>
      </div>
    </div>`;

  renderQueue();
  renderMetPanel();
}

/** Панель «Кого ты уже встретила». */
function renderMetPanel() {
  const seen = play.candidates.slice(0, play.index);
  metList.innerHTML = '';
  if (seen.length === 0) {
    metList.innerHTML = '<span class="hint-line">Пока никого 🙂</span>';
    metCaption.textContent = '';
    return;
  }
  let recIdx = 0;
  seen.forEach((c, idx) => { if (c.score > seen[recIdx].score) recIdx = idx; });

  seen.forEach((c, idx) => {
    const el = document.createElement('div');
    el.className = 'met-mini' + (idx === recIdx ? ' record' : '');
    el.innerHTML = groomSVG(c.look, idx === recIdx ? 2 : 1);
    metList.appendChild(el);
  });
  metCaption.textContent = `Лучший среди встреченных — №${recIdx + 1}`;
}

/** Игрок выбирает текущего — раунд заканчивается. */
function acceptCurrent() {
  if (play.finished) return;
  play.chosenIndex = play.index;
  play.finished = true;
  revealRound();
}

/** Игрок отпускает — дальше, либо проигрыш в конце очереди. */
function rejectCurrent() {
  if (play.finished) return;
  play.index++;
  if (play.index >= PLAY_N) {
    play.chosenIndex = null;
    play.finished = true;
    revealRound();
  } else {
    renderCurrentSuitor();
  }
}

document.getElementById('btnAccept').addEventListener('click', acceptCurrent);
document.getElementById('btnReject').addEventListener('click', rejectCurrent);

/* =====================================================================
   7. СЦЕНА 3 — РАСКРЫТИЕ ОЧЕРЕДИ
   Заполняем сцену «Что происходит?» и переходим на неё.
   ===================================================================== */

function revealRound() {
  const statsReveal = document.getElementById('statsReveal');
  const statsIntro  = document.getElementById('statsIntro');

  const bestScore = Math.max(...play.candidates.map(c => c.score));
  const bestIndex = play.candidates.findIndex(c => c.score === bestScore);
  const chosen = play.chosenIndex;
  const won = chosen !== null && chosen === bestIndex;

  statsIntro.textContent = `Вот вся очередь! Лучший жених был под номером ${bestIndex + 1}.`;

  let banner;
  if (won) banner =
    `<div class="result-banner win">💖 Ты выбрала самого лучшего жениха! Сказочный финал!</div>`;
  else if (chosen === null) banner =
    `<div class="result-banner lose">🕯️ Ты отпустила всех и осталась одна. Смело, но больно.</div>`;
  else banner =
    `<div class="result-banner lose">💔 Ты выбрала ${play.candidates[chosen].name}, но лучшим тайно
      был №${bestIndex + 1}. Так близко!</div>`;

  const reveal = play.candidates.map((c, i) => {
    const cls = ['reveal-suitor'];
    if (i === bestIndex) cls.push('is-best');
    if (i === chosen) cls.push('is-chosen');
    return `
      <div class="${cls.join(' ')}" style="animation-delay:${i * 0.04}s">
        <div class="mini">${groomSVG(c.look, i === bestIndex ? 2 : 1, i === bestIndex)}</div>
        <div class="sc">${c.score}</div>
        <div class="no">№${i + 1}</div>
      </div>`;
  }).join('');

  statsReveal.innerHTML = `${banner}
    <p class="hint-line">👑 — настоящий лучший, розовая рамка — твой выбор:</p>
    <div class="reveal-queue">${reveal}</div>`;

  showScene('scene-stats');
}

/* =====================================================================
   8. СЦЕНА 4 — СТРАТЕГИЯ 37% + ГРАФИК НА CANVAS
   ===================================================================== */

const STRAT_N = 100;
const stratSlider  = document.getElementById('stratSlider');
const stratPct     = document.getElementById('stratPct');
const stratObserve = document.getElementById('stratObserve');
const stratChoose  = document.getElementById('stratChoose');
const stratWinPct  = document.getElementById('stratWinPct');
const stratChart   = document.getElementById('stratChart');

let lastSweep = null;

function updateStratPhaseBar() {
  const pct = +stratSlider.value;
  stratPct.textContent = pct;
  stratObserve.style.flexBasis = pct + '%';
  stratChoose.style.flexBasis = (100 - pct) + '%';
  stratObserve.style.display = pct === 0 ? 'none' : 'flex';
  if (lastSweep) drawChart(lastSweep, pct / 100);
}
stratSlider.addEventListener('input', updateStratPhaseBar);

document.getElementById('btnRunStrat').addEventListener('click', () => {
  const th = +stratSlider.value / 100;
  const { successRate } = simulateStrategy(STRAT_N, th, 1000, false);
  stratWinPct.textContent = (successRate * 100).toFixed(1);
});

document.getElementById('btnDrawCurve').addEventListener('click', () => {
  const btn = document.getElementById('btnDrawCurve');
  btn.disabled = true;
  btn.textContent = 'Считаю… 🧮';
  setTimeout(() => {
    lastSweep = sweepThresholds(STRAT_N, 3000, false, 0.02);
    drawChart(lastSweep, +stratSlider.value / 100);
    btn.disabled = false;
    btn.textContent = 'Перестроить кривую 📈';
  }, 30);
});

/** Нарисовать кривую «успех vs процент наблюдения» на canvas. */
function drawChart(sweep, markerThreshold) {
  const ctx = stratChart.getContext('2d');
  const W = stratChart.width, H = stratChart.height;
  const padL = 52, padR = 18, padT = 22, padB = 44;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(0, 0, W, H);

  const xToPx = x => padL + (x / 0.9) * plotW;
  const yToPx = y => padT + (1 - y) * plotH;

  ctx.strokeStyle = '#e7ddcb';
  ctx.fillStyle = '#8a7d76';
  ctx.font = '13px system-ui, sans-serif';
  ctx.lineWidth = 1;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let y = 0; y <= 1.0001; y += 0.25) {
    const py = yToPx(y);
    ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(W - padR, py); ctx.stroke();
    ctx.fillText((y * 100) + '%', padL - 8, py);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let x = 0; x <= 0.9001; x += 0.1) ctx.fillText(Math.round(x * 100) + '%', xToPx(x), H - padB + 8);

  // линия 1/e
  const ideal = 1 / Math.E;
  ctx.strokeStyle = '#ffcf4d'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(xToPx(ideal), padT); ctx.lineTo(xToPx(ideal), H - padB); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#c9962a'; ctx.textAlign = 'left';
  ctx.fillText('≈ 37%', xToPx(ideal) + 6, padT + 2);

  // кривая
  ctx.strokeStyle = '#7c5cbf'; ctx.lineWidth = 3; ctx.beginPath();
  sweep.xs.forEach((x, i) => {
    const px = xToPx(x), py = yToPx(sweep.ys[i]);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.lineTo(xToPx(sweep.xs[sweep.xs.length - 1]), yToPx(0));
  ctx.lineTo(xToPx(sweep.xs[0]), yToPx(0)); ctx.closePath();
  ctx.fillStyle = 'rgba(124,92,191,0.15)'; ctx.fill();

  // пик
  const bx = xToPx(sweep.best.threshold), by = yToPx(sweep.best.rate);
  ctx.fillStyle = '#ffcf4d'; ctx.strokeStyle = '#33272a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#33272a'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(`пик ≈ ${(sweep.best.rate * 100).toFixed(0)}%`, bx, by - 12);

  // маркер текущего ползунка
  if (markerThreshold != null) {
    let nearest = 0, dist = Infinity;
    sweep.xs.forEach((x, i) => { const d = Math.abs(x - markerThreshold); if (d < dist) { dist = d; nearest = i; } });
    const mx = xToPx(markerThreshold), my = yToPx(sweep.ys[nearest]);
    ctx.strokeStyle = '#ef6f8e'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(mx, H - padB); ctx.lineTo(mx, my); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ef6f8e'; ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#33272a'; ctx.stroke();
  }

  ctx.fillStyle = '#33272a'; ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('процент наблюдения →', padL + plotW / 2, H - 18);
}

/* =====================================================================
   9. СЦЕНА 5 — ЛИНИЯ «ПОЧЕМУ 37%»
   ===================================================================== */

function renderWhyLine() {
  const whyLine = document.getElementById('whyLine');
  if (whyLine.childElementCount) return; // строим один раз
  const total = 40;
  const cut = Math.round(total / Math.E);
  for (let i = 0; i < total; i++) {
    const wrap = document.createElement('div');
    wrap.style.animationDelay = (i * 0.02) + 's';
    wrap.innerHTML = miniHeadSVG(i < cut ? '#9fd0e8' : '#ffd8e2');
    whyLine.appendChild(wrap.firstElementChild);
  }
  document.getElementById('whyBride').innerHTML = brideSVG();
}

/* =====================================================================
   10. СЦЕНА 6 — ПЕСОЧНИЦА
   ===================================================================== */

const sbSlider   = document.getElementById('sbSlider');
const sbPct      = document.getElementById('sbPct');
const sbPickLast = document.getElementById('sbPickLast');
const sbNChips     = document.getElementById('sbNChips');
const sbTrialsChips = document.getElementById('sbTrialsChips');

sbSlider.addEventListener('input', () => { sbPct.textContent = sbSlider.value; });

/** Группа чипов-переключателей: клик выбирает одно значение. */
function wireChips(group) {
  group.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    group.dataset.value = chip.dataset.val;
  });
}
wireChips(sbNChips);
wireChips(sbTrialsChips);

document.getElementById('btnSimulate').addEventListener('click', () => {
  const n = +sbNChips.dataset.value;
  const trials = +sbTrialsChips.dataset.value;
  const th = +sbSlider.value / 100;
  const pickLast = sbPickLast.checked;

  const res = simulateStrategy(n, th, trials, pickLast);
  const sweep = sweepThresholds(n, Math.min(trials, 1500), pickLast, 0.02);

  document.getElementById('sbBestPct').textContent = (res.successRate * 100).toFixed(1) + '%';
  document.getElementById('sbAvgScore').textContent = res.avgScoreOf100.toFixed(0);
  document.getElementById('sbAlone').textContent = res.aloneCount + ' / ' + trials;
  document.getElementById('sbOptimal').textContent = Math.round(sweep.best.threshold * 100) + '%';
});

/* =====================================================================
   11. ДЕКОР И ЗАПУСК
   ===================================================================== */

function spawnBackgroundHearts() {
  const host = document.getElementById('bgHearts');
  const emojis = ['💛', '💙', '💚', '💜', '🩷', '🤍'];
  for (let i = 0; i < 12; i++) {
    const h = document.createElement('div');
    h.className = 'fh';
    h.textContent = emojis[i % emojis.length];
    h.style.left = Math.random() * 100 + 'vw';
    h.style.animationDuration = (14 + Math.random() * 16) + 's';
    h.style.animationDelay = (-Math.random() * 20) + 's';
    h.style.fontSize = (18 + Math.random() * 22) + 'px';
    host.appendChild(h);
  }
}

function boot() {
  document.getElementById('heroArt').innerHTML = heroSVG();
  document.getElementById('helperArt').innerHTML = brideSVG();
  updateStratPhaseBar();
  spawnBackgroundHearts();
}

boot();

// Above the Treeline: leadership notes by Paul Draper.
// Security notes: every piece of user or content text is inserted with
// textContent / createTextNode (never innerHTML), so it can't run as code.
'use strict';

/* ---------- tiny DOM helper (text only, never HTML) ---------- */
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}
const SVGNS = 'http://www.w3.org/2000/svg';
// Static, in-house SVG markup only (no user data ever goes through here).
function svg(markup, cls) {
  const t = document.createElementNS(SVGNS, 'svg');
  t.setAttribute('aria-hidden', 'true'); if (cls) t.setAttribute('class', cls);
  const doc = new DOMParser().parseFromString(`<svg xmlns="${SVGNS}">${markup}</svg>`, 'image/svg+xml');
  for (const n of [...doc.documentElement.childNodes]) t.append(document.importNode(n, true));
  return t;
}
const ICON = {
  prev: '<path d="M11 4 5 9l6 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  next: '<path d="m7 4 6 5-6 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  pause: '<rect x="5" y="4" width="3" height="10" rx="1" fill="currentColor"/><rect x="10" y="4" width="3" height="10" rx="1" fill="currentColor"/>',
  play: '<path d="M6 4v10l8-5z" fill="currentColor"/>',
  audio: '<path d="M2 5v2M4.5 3v6M7 1v10M9.5 3v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>',
  text: '<path d="M2 2h8M2 5h8M2 8h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>',
};
const icon = (name, vb = '0 0 18 18') => { const s = svg(ICON[name]); s.setAttribute('viewBox', vb); return s; };

/* ---------- Verified quotes (each checked against a source) ---------- */
const QUOTES = [
  { t: 'Leadership is not about being in charge. Leadership is about taking care of those in your charge.', a: 'Simon Sinek', s: 'Simon Sinek, Leaders Eat Last', u: 'https://www.facebook.com/simonsinek/posts/10153502909091499/' },
  { t: 'Coaching is unlocking a person\u2019s potential to maximise their own performance. It is helping them to learn rather than teaching them.', a: 'Sir John Whitmore', s: 'Coaching for Performance (1992)', u: 'https://openaccess.city.ac.uk/id/eprint/31601/' },
  { t: 'Before you are a leader, success is all about growing yourself. When you become a leader, success is all about growing others.', a: 'Jack Welch', s: 'Winning (2005)', u: 'https://www.goodreads.com/work/quotes/856917-winning' },
  { t: 'The first responsibility of a leader is to define reality. The last is to say thank you.', a: 'Max De Pree', s: 'Leadership Is an Art (1987)', u: 'https://wist.info/du-pree-max/5004/' },
  { t: 'Clear is kind. Unclear is unkind.', a: 'Bren\u00e9 Brown', s: 'Dare to Lead (2018)', u: 'https://brenebrown.com/articles/2018/10/15/clear-is-kind-unclear-is-unkind/' },
  { t: 'A coach is someone who can give correction without causing resentment.', a: 'John Wooden', s: 'Quoted in the Los Angeles Times, 2010', u: 'https://www.latimes.com/archives/blogs/sports-now/story/2010-06-04/john-wooden-quotes-some-of-coach-john-woodens-favorite-maxims-woodenisms' },
  { t: 'Leadership and learning are indispensable to each other.', a: 'John F. Kennedy', s: 'Remarks prepared for the Dallas Trade Mart, 1963', u: 'https://www.jfklibrary.org/archives/other-resources/john-f-kennedy-speeches/dallas-tx-trade-mart-undelivered-19631122' },
  { t: 'The function of leadership is to produce more leaders, not more followers.', a: 'Ralph Nader', s: 'TIME Leadership Conference, 1976', u: 'https://time.com/archive/6852254/special-report-leadership-the-biggest-issue/' },
  { t: 'A leader is one who knows the way, goes the way, and shows the way.', a: 'John C. Maxwell', s: 'The 21 Irrefutable Laws of Leadership', u: 'https://en.wikiquote.org/wiki/John_C._Maxwell' },
  { t: 'Managers are people who do things right and leaders are people who do the right thing.', a: 'Warren Bennis & Burt Nanus', s: 'Leaders: The Strategies for Taking Charge (1985)', u: 'https://quoteinvestigator.com/2021/04/09/doing-right/' },
  { t: 'Our chief want in life is somebody who shall make us do what we can.', a: 'Ralph Waldo Emerson', s: 'The Conduct of Life (1860)', u: 'https://emersoncentral.com/texts/the-conduct-of-life/considerations/' },
  { t: 'A leader takes people where they want to go. A great leader takes people where they don\u2019t necessarily want to go, but ought to be.', a: 'Rosalynn Carter', s: 'Cited on Wikiquote', u: 'https://en.wikiquote.org/wiki/Rosalynn_Carter' },
];

/* ---------- Content loading & validation ---------- */
const CATS = { business: 'Leadership in Business', kids: 'Coaching Children', life: 'Life & Relationships' };
const PATH_RE = /^content\/(posts|audio|story|video)\/[a-z0-9][a-z0-9-]*\.(md|txt|mp3|m4a|ogg|wav|mp4|webm|jpg|png|webp)$/;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NEW_DAYS = 14;
const TYPE_LABEL = { written: 'Read', audio: 'Audio', video: 'Video' };
let POSTS = null;

export function cleanPosts(list) {
  return (Array.isArray(list) ? list : []).filter(p =>
    p && ID_RE.test(p.id) && typeof p.title === 'string' && CATS[p.category] &&
    (p.type === 'written' || p.type === 'audio' || p.type === 'video') && DATE_RE.test(p.date) &&
    (!p.body || PATH_RE.test(p.body)) && (p.type !== 'audio' || PATH_RE.test(p.audio || '')) &&
    (p.type !== 'video' || (PATH_RE.test(p.video || '') && (!p.poster || PATH_RE.test(p.poster))))
  );
}
// Newest first, always. Ties break by title so order is stable.
export function sortNewest(list) {
  return [...list].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}
async function loadPosts() {
  if (POSTS) return POSTS;
  const res = await fetch('content/posts.json', { cache: 'no-cache' });
  const data = await res.json();
  POSTS = sortNewest(cleanPosts(data.posts));
  return POSTS;
}
const isNew = p => (Date.now() - Date.parse(p.date + 'T00:00:00')) / 864e5 <= NEW_DAYS;

/* ---------- Story + Leader of the Moment content ---------- */
let STORY = null;
export function cleanStory(list) {
  return (Array.isArray(list) ? list : []).filter(e => e && ID_RE.test(e.id) && typeof e.title === 'string' && DATE_RE.test(e.date) && PATH_RE.test(e.body || ''));
}
async function loadStory() {
  if (STORY) return STORY;
  const data = await (await fetch('content/story.json', { cache: 'no-cache' })).json();
  STORY = sortNewest(cleanStory(data.entries)); return STORY;
}
const HTTPS_RE = /^https:\/\/[^\s]+$/;
function cleanLeader(l) {
  if (!l || typeof l.name !== 'string' || !Array.isArray(l.quotes)) return null;
  const quotes = l.quotes.filter(q => q && typeof q.text === 'string' && typeof q.source === 'string' && HTTPS_RE.test(q.url || '')).slice(0, 3);
  return quotes.length ? { ...l, quotes, monogram: String(l.monogram || l.name).replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() } : null;
}
async function loadLeader() {
  const data = await (await fetch('content/leader.json', { cache: 'no-cache' })).json();
  return { current: cleanLeader(data.current), archive: (Array.isArray(data.archive) ? data.archive : []).map(cleanLeader).filter(Boolean) };
}
const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

/* ---------- Safe mini-markdown → DOM (no HTML passthrough) ---------- */
function inline(text) {
  const frag = document.createDocumentFragment();
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) frag.append(text.slice(last, m.index));
    const bold = m[0].startsWith('**');
    frag.append(h(bold ? 'strong' : 'em', {}, m[0].slice(bold ? 2 : 1, bold ? -2 : -1)));
    last = m.index + m[0].length;
  }
  frag.append(text.slice(last));
  return frag;
}
function renderMarkdown(src) {
  const out = h('div', { class: 'prose' }); let list = null, para = [];
  const flushP = () => { if (para.length) { out.append(h('p', {}, inline(para.join(' ')))); para = []; } };
  for (const raw of src.replace(/\r/g, '').split('\n')) {
    const line = raw.trim(); let m;
    if (!line) { flushP(); list = null; continue; }
    if ((m = line.match(/^(#{2,3})\s+(.*)/))) { flushP(); list = null; out.append(h(m[1].length === 2 ? 'h2' : 'h3', {}, inline(m[2]))); }
    else if ((m = line.match(/^>\s?(.*)/))) { flushP(); list = null; out.append(h('blockquote', {}, h('p', {}, inline(m[1])))); }
    else if ((m = line.match(/^(-|\d+\.)\s+(.*)/))) { flushP(); const tag = m[1] === '-' ? 'ul' : 'ol'; if (!list || list.tagName.toLowerCase() !== tag) { list = h(tag); out.append(list); } list.append(h('li', {}, inline(m[2]))); }
    else { list = null; para.push(line); }
  }
  flushP(); return out;
}

/* ---------- Art ---------- */
const HERO_ART = `
<path d="M0 120 L90 70 L150 95 L250 40 L330 85 L430 55 L520 90 L640 30 L760 80 L860 50 L980 95 L1090 45 L1200 85 L1310 60 L1440 90 V200 H0Z" fill="var(--ridge-back)"/>
<path d="M250 40 L232 62 L244 58 L252 66 L262 56 L270 60Z M640 30 L620 55 L634 50 L642 58 L652 48 L662 54Z M1090 45 L1072 66 L1084 62 L1092 69 L1102 60 L1110 64Z" fill="var(--snow-cap)"/>
<path d="M0 150 L120 105 L220 130 L360 90 L470 125 L600 100 L720 135 L860 95 L990 128 L1120 100 L1260 130 L1440 105 V200 H0Z" fill="var(--ridge-mid)"/>
<g fill="var(--gold)"><ellipse cx="180" cy="150" rx="9" ry="16"/><ellipse cx="200" cy="146" rx="8" ry="14"/><ellipse cx="1180" cy="148" rx="9" ry="16"/><ellipse cx="1200" cy="152" rx="8" ry="13"/><ellipse cx="1216" cy="146" rx="7" ry="12"/></g>
<g stroke="#F4F1E8" stroke-width="2"><path d="M180 160v20M200 156v22M1180 158v22M1200 160v18M1216 154v24"/></g>
<g fill="var(--ridge-front)"><path d="M60 180 l14 -46 l14 46z M95 182 l11 -36 l11 36z M1330 180 l14 -48 l14 48z M1365 182 l11 -34 l11 34z"/></g>
<path d="M0 175 C200 160 360 185 560 170 C760 155 900 182 1100 168 C1260 158 1360 172 1440 165 V200 H0Z" fill="var(--rock)" opacity=".9"/>
<path d="M0 190 C240 180 480 196 720 186 C960 176 1200 194 1440 184 V200 H0Z" fill="var(--snow)"/>`;
const HERO_VIDEO = 'content/video/hero.mp4', HERO_POSTER = 'content/video/hero-poster.jpg';
function heroVideo() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = matchMedia('(max-width: 719px)').matches;
  // Muted, decorative, no audio track. Phones and reduced-motion users get the still poster only.
  const v = h('video', { class: 'hero-video', muted: true, loop: true, playsinline: true, preload: phone || reduce ? 'none' : 'auto', poster: HERO_POSTER, 'aria-hidden': 'true', tabindex: '-1', disablepictureinpicture: true });
  v.muted = true; v.defaultMuted = true; v.setAttribute('playsinline', '');
  const kids = [v, h('div', { class: 'hero-veil', 'aria-hidden': 'true' })];
  if (!phone && !reduce) {
    v.src = HERO_VIDEO; v.autoplay = true;
    const btn = h('button', { class: 'icon-btn video-toggle', type: 'button', 'aria-label': 'Pause background video', 'aria-pressed': 'false' }, icon('pause'));
    btn.addEventListener('click', () => {
      if (v.paused) { v.play().catch(() => {}); } else v.pause();
    });
    const sync = () => { const p = v.paused; btn.replaceChildren(icon(p ? 'play' : 'pause')); btn.setAttribute('aria-label', p ? 'Play background video' : 'Pause background video'); btn.setAttribute('aria-pressed', String(p)); };
    v.addEventListener('play', sync); v.addEventListener('pause', sync);
    v.play?.()?.catch?.(() => sync());
    kids.push(btn);
  }
  return kids;
}
function hero() {
  const art = svg(HERO_ART, 'hero-art'); art.setAttribute('viewBox', '0 0 1440 200'); art.setAttribute('preserveAspectRatio', 'none');
  return h('section', { class: 'hero hero-has-video' },
    ...heroVideo(),
    h('div', { class: 'wrap hero-in' },
      h('p', { class: 'eyebrow' }, 'Business \u00b7 Coaching kids \u00b7 Life'),
      h('h1', {}, 'Lead from above the treeline.'),
      h('p', { class: 'lede' }, 'Hi, I\u2019m Paul. [Placeholder intro \u2014 Paul will write this in his own words.] This is where I share what I\u2019ve learned about leading people at work, coaching kids, and showing up for the people in my life. Pull up a chair by the fire and leave a thought.'),
      h('div', { class: 'btn-row' },
        h('a', { class: 'btn btn-primary', href: '#/library' }, 'Explore the library'),
        h('a', { class: 'btn btn-ghost', href: '#/story' }, 'Read my story'))),
    art);
}
function divider() {
  const d = svg('<path d="M0 30 L80 14 L140 24 L220 4 L300 22 L380 10 L460 26 L540 8 L620 20 L700 12 L800 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>', 'divider');
  d.setAttribute('viewBox', '0 0 800 40'); d.setAttribute('preserveAspectRatio', 'none'); return d;
}

/* ---------- Quote rotator ---------- */
let rotTimer = null;
function quoteRotator() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = Math.floor(Date.now() / 864e5) % QUOTES.length, userPaused = false, hover = false;
  const text = h('p', { class: 'quote-text' }), by = h('p', { class: 'quote-by' });
  const body = h('div', { class: 'quote-body', 'aria-live': 'off' }, text, by);
  const dots = h('div', { class: 'dots', 'aria-hidden': 'true' }, QUOTES.map(() => h('span')));
  const tag = h('span', { class: 'paused-tag' });
  const pauseBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Pause quotes' }, icon('pause'));
  const show = (n, animate = true) => {
    i = (n + QUOTES.length) % QUOTES.length; const q = QUOTES[i];
    const paint = () => {
      text.textContent = q.t; by.textContent = '';
      by.append('\u2014 ', h('b', {}, q.a), ', ', q.s, ' ', h('a', { href: q.u, target: '_blank', rel: 'noopener noreferrer' }, 'source'));
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
      body.classList.remove('fade');
    };
    if (animate && !reduce) { body.classList.add('fade'); setTimeout(paint, 600); } else paint();
  };
  const paused = () => userPaused || hover;
  const sync = () => {
    tag.textContent = paused() ? 'Paused' : '';
    pauseBtn.replaceChildren(icon(userPaused ? 'play' : 'pause'));
    pauseBtn.setAttribute('aria-label', userPaused ? 'Play quotes' : 'Pause quotes');
    body.setAttribute('aria-live', userPaused ? 'polite' : 'off');
  };
  clearInterval(rotTimer);
  rotTimer = setInterval(() => { if (!paused() && !document.hidden) show(i + 1); }, reduce ? 12000 : 8000);
  pauseBtn.addEventListener('click', () => { userPaused = !userPaused; sync(); });
  const card = h('figure', { class: 'quote-card', 'aria-roledescription': 'carousel', 'aria-label': 'Leadership quotes', style: null },
    body,
    h('div', { class: 'quote-ctrls' }, dots,
      h('div', { class: 'btn-row' }, tag,
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Previous quote', onclick: () => show(i - 1) }, icon('prev')),
        pauseBtn,
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Next quote', onclick: () => show(i + 1) }, icon('next')))));
  card.addEventListener('mouseenter', () => { hover = true; sync(); });
  card.addEventListener('mouseleave', () => { hover = false; sync(); });
  card.addEventListener('focusin', () => { hover = true; sync(); });
  card.addEventListener('focusout', () => { hover = false; sync(); });
  // Tap on the quote text (touch) toggles pause.
  body.addEventListener('click', e => { if (e.target.tagName !== 'A') { userPaused = !userPaused; sync(); } });
  show(i, false); sync();
  return card;
}

/* ---------- Leader of the Moment ---------- */
function leaderBlock(l, compact = false) {
  return h('article', { class: 'leader' + (compact ? ' leader-past' : ''), 'data-leader': l.id || '' },
    h('div', { class: 'leader-head' },
      h('div', { class: 'monogram', 'aria-hidden': 'true' }, l.monogram),
      h('div', {},
        h('p', { class: 'eyebrow' }, compact ? 'Past leader' : 'Leader of the moment', l.sample ? ' \u00b7 SAMPLE' : ''),
        h('h3', {}, l.name),
        h('p', { class: 'leader-who' }, l.who || ''))),
    h('ul', { class: 'leader-quotes' }, l.quotes.map(q => h('li', {},
      h('blockquote', {}, h('p', {}, `\u201c${q.text}\u201d`)),
      h('p', { class: 'quote-by' }, '\u2014 ', q.source, ' ', h('a', { href: q.url, target: '_blank', rel: 'noopener noreferrer' }, 'source'))))),
    h('div', { class: 'leader-take' }, h('h4', {}, 'Paul\u2019s take'), h('p', {}, l.take || '')));
}
async function leaderSection() {
  let data; try { data = await loadLeader(); } catch { return null; }
  if (!data.current) return null;
  const past = data.archive.length ? h('details', { class: 'leader-archive' }, h('summary', {}, `Past leaders (${data.archive.length})`), data.archive.map(l => leaderBlock(l, true))) : null;
  return h('section', { class: 'section leader-sec', id: 'leader' }, h('div', { class: 'wrap' }, leaderBlock(data.current), past));
}

/* ---------- Cards ---------- */
function postCard(p) {
  return h('a', { class: 'card', href: `#/post/${p.id}`, 'data-id': p.id, 'data-cat': p.category, 'data-date': p.date },
    h('div', { class: 'meta' },
      h('span', { class: `chip chip-${p.category}` }, CATS[p.category]),
      h('span', { class: 'chip chip-type' }, icon(p.type === 'written' ? 'text' : 'audio', '0 0 12 12'), TYPE_LABEL[p.type]),
      isNew(p) && h('span', { class: 'chip chip-new' }, 'New')),
    h('h3', {}, p.title),
    h('p', {}, p.summary || ''),
    h('div', { class: 'meta' }, h('time', { datetime: p.date }, fmtDate(p.date)), p.duration && `\u00b7 ${p.duration}`));
}

/* ---------- Views ---------- */
const main = () => document.getElementById('main');
async function viewHome() {
  const posts = await loadPosts();
  main().replaceChildren(
    hero(),
    h('section', { class: 'quote-sec' }, h('div', { class: 'wrap' }, h('h2', { class: 'sr-only' }, 'Quote of the moment'), quoteRotator())),
    await leaderSection(),
    h('div', { class: 'wrap' }, divider()),
    h('section', { class: 'section' }, h('div', { class: 'wrap' },
      h('div', { class: 'sec-head' }, h('div', {}, h('h2', {}, 'Latest from the trail'), h('p', {}, 'Newest posts land on top, automatically.')),
        h('a', { href: '#/library', class: 'btn btn-ghost' }, 'See all')),
      h('div', { class: 'grid' }, posts.slice(0, 4).map(postCard)))));
}
async function viewLibrary(params) {
  const posts = await loadPosts();
  let cat = CATS[params.get('cat')] ? params.get('cat') : 'all';
  const grid = h('div', { class: 'grid', id: 'post-grid', 'aria-live': 'polite' });
  const btns = [['all', 'All'], ...Object.entries(CATS)].map(([k, label]) =>
    h('button', { type: 'button', 'data-cat': k, 'aria-pressed': String(k === cat), onclick: () => { cat = k; history.replaceState(null, '', k === 'all' ? '#/library' : `#/library?cat=${k}`); paint(); } }, label));
  function paint() {
    btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
    const list = posts.filter(p => cat === 'all' || p.category === cat);
    grid.replaceChildren(...(list.length ? list.map(postCard) : [h('p', { class: 'empty' }, 'No posts here yet. Check back soon.')]));
  }
  main().replaceChildren(h('section', { class: 'section' }, h('div', { class: 'wrap' },
    h('div', { class: 'sec-head' }, h('div', {}, h('h1', {}, 'The library'), h('p', {}, 'Written and audio notes on business, coaching kids, and life. Newest first.')),
      h('div', { class: 'filters', role: 'group', 'aria-label': 'Filter by topic' }, btns)),
    grid)));
  paint();
}
async function viewPost(id) {
  const posts = await loadPosts();
  const p = posts.find(x => x.id === id);
  if (!p) { main().replaceChildren(h('div', { class: 'post' }, h('h1', {}, 'Post not found'), h('a', { href: '#/library' }, 'Back to the library'))); return; }
  document.title = `${p.title} \u00b7 Above the Treeline`;
  const art = h('article', { class: 'post' },
    h('a', { class: 'back', href: '#/library' }, '\u2190 Library'),
    h('h1', {}, p.title),
    h('div', { class: 'meta' },
      h('span', { class: `chip chip-${p.category}` }, CATS[p.category]),
      h('span', { class: 'chip chip-type' }, TYPE_LABEL[p.type]),
      isNew(p) && h('span', { class: 'chip chip-new' }, 'New'),
      h('time', { datetime: p.date }, fmtDate(p.date))),
    p.type === 'audio' && h('div', { class: 'audio-box' }, h('p', {}, 'Listen'), h('audio', { controls: true, preload: 'metadata', src: p.audio }, 'Your browser does not support audio.')),
    p.type === 'video' && h('div', { class: 'video-box' }, h('video', { controls: true, playsinline: true, preload: 'metadata', src: p.video, poster: p.poster || null }, 'Your browser does not support video.')));
  main().replaceChildren(art);
  if (p.body) {
    try { const r = await fetch(p.body, { cache: 'no-cache' }); art.append(renderMarkdown(await r.text())); }
    catch { art.append(h('p', {}, 'Could not load this post.')); }
  }
  art.append(commentsSection('posts', p.id));
}

/* ---------- My Story ---------- */
function storyCard(e, n) {
  return h('a', { class: 'card story-card', href: `#/story/${e.id}`, 'data-id': e.id, 'data-date': e.date },
    h('div', { class: 'meta' }, h('span', { class: 'chip chip-story' }, `Chapter ${n}`), isNew(e) && h('span', { class: 'chip chip-new' }, 'New')),
    h('h3', {}, e.title), h('p', {}, e.summary || ''),
    h('div', { class: 'meta' }, h('time', { datetime: e.date }, fmtDate(e.date))));
}
async function viewStory(params) {
  const entries = await loadStory(); // newest first
  let order = params.get('order') === 'oldest' ? 'oldest' : 'newest';
  const list = h('div', { class: 'story-list', id: 'story-list', 'aria-live': 'polite' });
  const btns = [['newest', 'Newest first'], ['oldest', 'Read from the beginning']].map(([k, label]) =>
    h('button', { type: 'button', 'data-order': k, 'aria-pressed': String(k === order), onclick: () => { order = k; history.replaceState(null, '', k === 'newest' ? '#/story' : '#/story?order=oldest'); paint(); } }, label));
  function paint() {
    btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.order === order)));
    const chrono = [...entries].reverse();
    const shown = order === 'oldest' ? chrono : entries;
    list.replaceChildren(...(shown.length ? shown.map(e => storyCard(e, chrono.indexOf(e) + 1)) : [h('p', { class: 'empty' }, 'No chapters yet.')]));
  }
  main().replaceChildren(h('section', { class: 'section' }, h('div', { class: 'wrap narrow' },
    h('div', { class: 'sec-head' }, h('div', {}, h('h1', {}, 'My Story'), h('p', {}, 'A life told one chapter at a time.')),
      h('div', { class: 'filters', role: 'group', 'aria-label': 'Reading order' }, btns)),
    h('div', { class: 'coming-soon' }, h('h2', {}, 'Paul\u2019s story is coming soon'),
      h('p', {}, 'From the high country to the sidelines, there\u2019s a lot to tell. New chapters will appear here as Paul writes them. The entry below is a sample that shows the format.')),
    list)));
  paint();
}
async function viewStoryEntry(id) {
  const entries = await loadStory();
  const e = entries.find(x => x.id === id);
  if (!e) { main().replaceChildren(h('div', { class: 'post' }, h('h1', {}, 'Chapter not found'), h('a', { href: '#/story' }, 'Back to My Story'))); return; }
  document.title = `${e.title} \u00b7 Paul Draper`;
  const chrono = [...entries].reverse(), k = chrono.indexOf(e);
  const art = h('article', { class: 'post' },
    h('a', { class: 'back', href: '#/story' }, '\u2190 My Story'),
    h('h1', {}, e.title),
    h('div', { class: 'meta' }, h('span', { class: 'chip chip-story' }, `Chapter ${k + 1}`), h('time', { datetime: e.date }, fmtDate(e.date))));
  main().replaceChildren(art);
  try { const r = await fetch(e.body, { cache: 'no-cache' }); art.append(renderMarkdown(await r.text())); }
  catch { art.append(h('p', {}, 'Could not load this chapter.')); }
  art.append(h('nav', { class: 'chap-nav', 'aria-label': 'Chapters' },
    k > 0 ? h('a', { href: `#/story/${chrono[k - 1].id}` }, '\u2190 Previous chapter') : h('span'),
    k < chrono.length - 1 ? h('a', { href: `#/story/${chrono[k + 1].id}` }, 'Next chapter \u2192') : h('span')));
  art.append(commentsSection('stories', e.id));
}

/* ---------- Comments ---------- */
export const LIMITS = { name: 40, text: 1000, minGapMs: 30000, windowMs: 600000, maxPerWindow: 5 };
const cfg = () => window.LP_FIREBASE_CONFIG || {};
const demoMode = () => !cfg().apiKey || cfg().apiKey === 'YOUR_API_KEY';
const commentStatus = () => (window.LP_COMMENT_STATUS === 'pending' ? 'pending' : 'approved');
// Strip control chars (keep newlines), collapse runs of blank lines, trim.
export function cleanText(s, max) {
  return String(s ?? '').normalize('NFC').replace(/[\u0000-\u0009\u000B-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}
function rateCheck() {
  const now = Date.now();
  const log = (JSON.parse(localStorage.getItem('lp_rate') || '[]')).filter(t => typeof t === 'number' && now - t < LIMITS.windowMs);
  if (log.length && now - log[log.length - 1] < LIMITS.minGapMs) return `Easy, trail runner. Please wait ${Math.ceil((LIMITS.minGapMs - (now - log[log.length - 1])) / 1000)}s before commenting again.`;
  if (log.length >= LIMITS.maxPerWindow) return 'You\u2019ve posted a lot in the last few minutes. Take a breather and try again soon.';
  return null;
}
function rateRecord() {
  const now = Date.now();
  const log = (JSON.parse(localStorage.getItem('lp_rate') || '[]')).filter(t => now - t < LIMITS.windowMs);
  log.push(now); localStorage.setItem('lp_rate', JSON.stringify(log));
}

const KINDS = ['posts', 'stories'];
const localStore = {
  key: (kind, id) => kind === 'posts' ? `lp_comments_${id}` : `lp_comments_${kind}_${id}`,
  async list(kind, id) { try { return JSON.parse(localStorage.getItem(this.key(kind, id)) || '[]').filter(c => c.status === 'approved'); } catch { return []; } },
  async add(kind, id, c) { const all = JSON.parse(localStorage.getItem(this.key(kind, id)) || '[]'); all.push({ ...c, createdAt: Date.now() }); localStorage.setItem(this.key(kind, id), JSON.stringify(all)); },
};
let fsPromise = null;
function cloudStore() {
  const V = '10.12.2';
  fsPromise ||= Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]).then(([app, fs]) => ({ fs, db: fs.getFirestore(app.initializeApp(cfg())) }));
  return {
    async list(kind, id) {
      const { fs, db } = await fsPromise;
      const q = fs.query(fs.collection(db, kind, id, 'comments'), fs.where('status', '==', 'approved'), fs.orderBy('createdAt', 'desc'), fs.limit(100));
      const snap = await fs.getDocs(q);
      return snap.docs.map(d => { const x = d.data(); return { name: x.name, text: x.text, status: x.status, createdAt: x.createdAt?.toMillis?.() || 0 }; });
    },
    async add(kind, id, c) {
      const { fs, db } = await fsPromise;
      await fs.addDoc(fs.collection(db, kind, id, 'comments'), { name: c.name, text: c.text, status: c.status, createdAt: fs.serverTimestamp() });
    },
  };
}
const store = () => (demoMode() ? localStore : cloudStore());

function commentsSection(kind, postId) {
  if (!KINDS.includes(kind) || !ID_RE.test(postId)) return h('p', {}, 'Comments unavailable.');
  const list = h('ul', { class: 'clist', id: 'comment-list', 'aria-live': 'polite' });
  const status = h('p', { class: 'status', role: 'status' });
  const name = h('input', { id: 'c-name', name: 'name', maxlength: LIMITS.name, autocomplete: 'nickname', required: true });
  const text = h('textarea', { id: 'c-text', name: 'text', maxlength: LIMITS.text, required: true });
  const hp = h('input', { name: 'website', tabindex: '-1', autocomplete: 'off', class: 'hp', 'aria-hidden': 'true' });
  const count = h('span', { class: 'count', id: 'c-count' }, `0 / ${LIMITS.text}`);
  const send = h('button', { class: 'btn btn-primary', type: 'submit', id: 'c-send' }, 'Post comment');
  text.addEventListener('input', () => { count.textContent = `${text.value.length} / ${LIMITS.text}`; });
  async function refresh() {
    try {
      const items = (await store().list(kind, postId)).sort((a, b) => b.createdAt - a.createdAt); // newest on top
      list.replaceChildren(...(items.length ? items.map(c => h('li', {},
        h('div', { class: 'c-head' }, h('b', {}, c.name), h('time', {}, c.createdAt ? new Date(c.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'just now')),
        h('p', { class: 'c-text' }, c.text))) : [h('li', { class: 'empty' }, 'No comments yet. Be the first.')]));
    } catch { list.replaceChildren(h('li', { class: 'empty' }, 'Comments are unavailable right now.')); }
  }
  const form = h('form', { class: 'cform', novalidate: true },
    h('label', { for: 'c-name' }, 'Name'), name,
    h('label', { for: 'c-text' }, 'Your thoughts'), text, hp,
    h('div', { class: 'row' }, count, send), status);
  form.addEventListener('submit', async e => {
    e.preventDefault(); status.className = 'status';
    if (hp.value) return; // bot honeypot: silently ignore
    const n = cleanText(name.value, LIMITS.name), t = cleanText(text.value, LIMITS.text);
    if (!n || !t) { status.className = 'status err'; status.textContent = 'Please add your name and a comment.'; return; }
    const limited = rateCheck(); if (limited) { status.className = 'status err'; status.textContent = limited; return; }
    send.disabled = true;
    try {
      const st = commentStatus();
      await store().add(kind, postId, { name: n, text: t, status: st });
      rateRecord(); text.value = ''; count.textContent = `0 / ${LIMITS.text}`;
      status.textContent = st === 'pending' ? 'Thanks! Your comment will appear after review.' : 'Thanks for sharing!';
      await refresh();
    } catch { status.className = 'status err'; status.textContent = 'Could not post right now. Please try again later.'; }
    finally { send.disabled = false; }
  });
  refresh();
  return h('section', { class: 'comments', 'aria-labelledby': 'c-title' }, h('h2', { id: 'c-title' }, 'Comments'), form, list);
}

/* ---------- Router ---------- */
async function route() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const params = new URLSearchParams(qs || '');
  document.title = 'Above the Treeline \u00b7 Paul Draper on leadership, coaching & life';
  clearInterval(rotTimer);
  const navKey = path.startsWith('/story') ? 'story' : path.startsWith('/library') || path.startsWith('/post') ? 'library' : 'home';
  document.querySelectorAll('[data-nav]').forEach(a => { if (a.dataset.nav === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  try {
    if (path.startsWith('/post/')) await viewPost(decodeURIComponent(path.slice(6)));
    else if (path.startsWith('/story/')) await viewStoryEntry(decodeURIComponent(path.slice(7)));
    else if (path.startsWith('/story')) await viewStory(params);
    else if (path.startsWith('/library')) await viewLibrary(params);
    else await viewHome();
  } catch { main().replaceChildren(h('div', { class: 'post' }, h('p', {}, 'Something went wrong loading this page.'))); }
  window.scrollTo(0, 0);
}
document.getElementById('demo-note').hidden = !demoMode();
addEventListener('hashchange', route);
route();

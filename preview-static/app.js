const PAGE_SIZE = 20;
let songs = [];
let query = '';
let page = 1;

const $ = (s) => document.querySelector(s);
const rows = $('#rows');
const pages = $('#pages');
const count = $('#count');
const pageLabel = $('#pageLabel');
const notice = $('#notice');

function norm(v = '') {
  return String(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();
}

function esc(v = '') {
  return String(v).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

function filtered() {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return songs;
  return songs.filter((s) => {
    const haystack = norm([
      s.titulo,
      s.artista,
      s.marca,
      s.variante,
      s.anio,
      s.mes,
      s.id
    ].join(' '));
    return terms.every((t) => haystack.includes(t));
  });
}

function syncUrl() {
  const u = new URL(location.href);
  if (query) u.searchParams.set('q', query);
  else u.searchParams.delete('q');
  if (page > 1) u.searchParams.set('page', page);
  else u.searchParams.delete('page');
  history.replaceState({}, '', u);
}

function addPage(label, p, active = false) {
  const b = document.createElement('button');
  b.textContent = label;
  b.className = active ? 'active' : '';
  b.onclick = () => {
    page = p;
    render();
    const main = document.querySelector('.main');
    if (main) scrollTo({ top: main.offsetTop - 10, behavior: 'smooth' });
  };
  pages.appendChild(b);
}

function render() {
  const list = filtered();
  const total = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (page > total) page = total;

  const visible = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  count.textContent = `${list.length.toLocaleString('es-PE')} karaokes`;
  pageLabel.textContent = `Página ${page} de ${total}`;
  rows.className = '';

  rows.innerHTML = visible.length
    ? visible.map((s) => `
      <div class="row">
        <div><button class="play" data-id="${esc(s.id)}" title="Ver demo">▶</button></div>
        <div>
          <div class="title">${esc(s.titulo)}</div>
          <div class="sub">${esc(s.id)}${s.variante ? ` · ${esc(s.variante)}` : ''}</div>
        </div>
        <div class="artistCell artist">${esc(s.artista)}</div>
        <div class="priceCell price">—</div>
        <div class="addCell"><button class="add" title="Se activará cuando aprobemos precios en Medusa">AGREGAR</button></div>
      </div>`).join('')
    : '<div class="empty">No encontramos resultados.</div>';

  pages.innerHTML = '';
  const start = Math.max(1, Math.min(page - 2, total - 4));
  const end = Math.min(total, start + 4);
  if (page > 1) addPage('←', page - 1);
  for (let p = Math.max(1, start); p <= end; p += 1) addPage(String(p), p, p === page);
  if (page < total) addPage('→', page + 1);

  document.querySelectorAll('.play').forEach((b) => {
    b.onclick = () => openDemo(songs.find((x) => String(x.id) === b.dataset.id));
  });

  syncUrl();
}

function msg(text) {
  notice.textContent = text;
  notice.style.display = 'block';
}

function clearMsg() {
  notice.style.display = 'none';
  notice.textContent = '';
}

async function openDemo(song) {
  if (!song) return;
  clearMsg();
  const btn = document.querySelector(`.play[data-id="${CSS.escape(String(song.id))}"]`);
  const old = btn && btn.textContent;
  if (btn) {
    btn.textContent = '…';
    btn.disabled = true;
  }

  try {
    const r = await fetch('/api/store/demo/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_cancion: song.id })
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);

    const s = await r.json();
    const audio = s.player && s.player.audioUrl;
    const cdg = s.player && s.player.cdgUrl;
    if (!audio || !cdg) throw new Error('sin audio/cdg');

    const u = new URL('/top-peru-player/', location.origin);
    u.searchParams.set('audio', new URL(audio, location.origin).toString());
    u.searchParams.set('cdg', new URL(cdg, location.origin).toString());
    u.searchParams.set('title', `${song.artista} - ${song.titulo}`);
    u.searchParams.set('duration', String((s.player && s.player.duration) || s.duration || 60));
    u.searchParams.set('start', String((s.player && s.player.start) || 0));
    u.searchParams.set('autoplay', (s.player && s.player.autoplay === false) ? '0' : '1');

    $('#modalTitle').textContent = `${song.artista} — ${song.titulo}`;
    $('#player').src = u.toString();
    $('#modal').classList.add('open');
  } catch (e) {
    msg(`No se pudo abrir el demo: ${e.message}`);
  } finally {
    if (btn) {
      btn.textContent = old;
      btn.disabled = false;
    }
  }
}

function closeModal() {
  $('#modal').classList.remove('open');
  $('#player').src = 'about:blank';
}

$('#close').onclick = closeModal;
$('#modal').onclick = (e) => {
  if (e.target.id === 'modal') closeModal();
};
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

const initial = new URLSearchParams(location.search);
query = initial.get('q') || '';
page = Math.max(1, Number(initial.get('page') || 1) || 1);
$('#q').value = query;
$('#q').oninput = (e) => {
  query = e.target.value;
  page = 1;
  render();
};

(async () => {
  try {
    const r = await fetch('/top-peru-preview/data/catalogo-karaoke.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    songs = Array.isArray(d.items) ? d.items : [];
    render();
  } catch (e) {
    rows.className = 'empty';
    rows.textContent = 'No se pudo cargar el catálogo TOP PERÚ.';
    msg(e && e.message ? e.message : String(e));
  }
})();

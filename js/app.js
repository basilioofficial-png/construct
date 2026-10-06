/*
 * ЛОГИКА КОНСТРУКТОРА
 * -------------------
 * Устроено просто:
 *   1. Всё, что выбрал клиент, лежит в одном объекте state.
 *   2. Любое действие меняет state и вызывает render().
 *   3. render() перерисовывает превью, шаги, текущий экран и цену.
 */

const STEPS = [
  { id: 'product', title: 'Изделие' },
  { id: 'color',   title: 'Цвет' },
  { id: 'design',  title: 'Картинка' },
  { id: 'confirm', title: 'Проверка' },
  { id: 'qty',     title: 'Количество' },
  { id: 'contact', title: 'Контакты' },
];

const state = {
  step: 0,
  maxStep: 0,            // самый дальний шаг, до которого дошёл клиент
  productId: null,
  colorId: null,
  image: null,           // { src, w, h, name, size }
  place: { scale: 0.8, dx: 0, dy: 0 }, // масштаб и смещение картинки
  confirmed: false,
  qty: {},               // { 'M': 2, 'L': 1 }
  contact: { name: '', phone: '', email: '', city: '', address: '', comment: '', consent: false },
  order: null,           // заполняется после оформления
};

/* ---------- Короткие помощники ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const fmt = (n) => Math.round(n).toLocaleString('ru-RU') + ' ' + SETTINGS.currency;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const product = () => PRODUCTS.find((p) => p.id === state.productId) || null;
const color = () => (state.colorId ? COLORS[state.colorId] : null);
const shape = () => (state.productId ? SHAPES[state.productId] : null);

function shadeHex(hex, amount) {
  // amount < 0 — темнее, > 0 — светлее
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amount)));
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function isLight(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function totalQty() {
  return Object.values(state.qty).reduce((a, b) => a + b, 0);
}

function discountFor(qty) {
  const d = SETTINGS.discounts.find((x) => qty >= x.qty);
  return d ? d.percent : 0;
}

function priceInfo() {
  const p = product();
  if (!p) return null;
  const qty = totalQty();
  const percent = discountFor(qty);
  const unit = p.price * (1 - percent / 100);
  return { qty, percent, unit, total: unit * qty, base: p.price };
}

/* ---------- Геометрия картинки на изделии ---------- */

function imageBox() {
  const s = shape();
  const img = state.image;
  if (!s || !img) return null;
  const p = s.print;
  const aspect = img.w / img.h;
  // «вписываем» картинку в зону печати, затем применяем масштаб
  let w = p.w, h = p.w / aspect;
  if (h > p.h) { h = p.h; w = p.h * aspect; }
  w *= state.place.scale;
  h *= state.place.scale;
  const x = p.x + p.w / 2 + state.place.dx - w / 2;
  const y = p.y + p.h / 2 + state.place.dy - h / 2;
  return { x, y, w, h };
}

// Реальный размер отпечатка в сантиметрах и качество (DPI)
function printStats() {
  const s = shape();
  const box = imageBox();
  if (!s || !box) return null;
  const cmPerUnit = s.printCm.w / s.print.w;
  // учитываем только видимую часть (то, что внутри зоны печати)
  const visW = Math.max(0, Math.min(box.x + box.w, s.print.x + s.print.w) - Math.max(box.x, s.print.x));
  const visH = Math.max(0, Math.min(box.y + box.h, s.print.y + s.print.h) - Math.max(box.y, s.print.y));
  const wCm = visW * cmPerUnit;
  const hCm = visH * cmPerUnit;
  const dpi = state.image.w / ((box.w * cmPerUnit) / 2.54);
  return { wCm, hCm, dpi: Math.round(dpi) };
}

/* ---------- Превью (SVG-макет) ---------- */

const svg = $('#mockup');
const designImg = $('#designImg');

function renderMockup() {
  const s = shape();
  const c = color() || { hex: '#F2F2F2', name: '' };
  $('#previewEmpty').hidden = !!s;
  svg.style.visibility = s ? 'visible' : 'hidden';
  if (!s) { $('#previewCaption').textContent = ''; return; }

  const fill = c.hex;
  const dark = shadeHex(fill, isLight(fill) ? -0.06 : -0.05);
  const line = isLight(fill) ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.14)';
  const sub = (str) => str.replace(/\{fill\}/g, fill).replace(/\{dark\}/g, dark).replace(/\{line\}/g, line);

  $('#garment').innerHTML =
    (s.back ? sub(s.back) : '') +
    `<path d="${s.body}" fill="${fill}" stroke="rgba(0,0,0,.18)" stroke-width="1.5" stroke-linejoin="round"/>` +
    s.details.map(sub).join('');

  // лёгкие тени поверх ткани и картинки — так принт выглядит «напечатанным»
  $('#garmentOverlay').innerHTML =
    `<path d="${s.body}" fill="url(#shade)"/>` +
    `<path d="${s.body}" fill="url(#shadeV)"/>`;

  const p = s.print;
  for (const el of [$('#printClipRect'), $('#printArea')]) {
    el.setAttribute('x', p.x); el.setAttribute('y', p.y);
    el.setAttribute('width', p.w); el.setAttribute('height', p.h);
  }
  $('#printArea').style.display = STEPS[state.step].id === 'design' ? '' : 'none';
  $('#printArea').style.stroke = isLight(fill) ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.55)';

  const box = imageBox();
  if (box) {
    designImg.setAttribute('href', state.image.src);
    designImg.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', state.image.src);
    designImg.setAttribute('x', box.x); designImg.setAttribute('y', box.y);
    designImg.setAttribute('width', box.w); designImg.setAttribute('height', box.h);
    designImg.setAttribute('visibility', 'visible');
    designImg.classList.toggle('draggable', STEPS[state.step].id === 'design');
  } else {
    designImg.setAttribute('visibility', 'hidden');
  }

  const pr = product();
  $('#previewCaption').textContent = [pr.name, color() ? color().name : null].filter(Boolean).join(' · ');
}

// Перетаскивание картинки мышью или пальцем
(function setupDrag() {
  let start = null;
  const toSvg = (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };
  designImg.addEventListener('pointerdown', (e) => {
    if (STEPS[state.step].id !== 'design') return;
    e.preventDefault();
    designImg.setPointerCapture(e.pointerId);
    const p = toSvg(e);
    start = { x: p.x, y: p.y, dx: state.place.dx, dy: state.place.dy };
  });
  designImg.addEventListener('pointermove', (e) => {
    if (!start) return;
    const p = toSvg(e);
    state.place.dx = start.dx + (p.x - start.x);
    state.place.dy = start.dy + (p.y - start.y);
    renderMockup();
  });
  const end = () => { if (start) { start = null; render(); } };
  designImg.addEventListener('pointerup', end);
  designImg.addEventListener('pointercancel', end);
})();

/* ---------- Шапка с шагами ---------- */

function renderStepper() {
  $('#stepper').innerHTML = STEPS.map((s, i) => {
    const done = i !== state.step && i <= state.maxStep && canProceed(i);
    const cls = i === state.step ? 'is-active' : done ? 'is-done' : '';
    const can = i <= state.maxStep && !state.order;
    return `<li class="${cls}"><button type="button" data-step="${i}" ${can ? '' : 'disabled'}>
      <span class="stepper__num">${i + 1}</span><span class="stepper__title">${s.title}</span></button></li>`;
  }).join('');
}

$('#stepper').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-step]');
  if (b) goTo(Number(b.dataset.step));
});

/* ---------- Экраны шагов ---------- */

const views = {
  product() {
    return `<h1 class="h1">Выберите изделие</h1>
      <p class="lead">На чём будем печатать ваш дизайн?</p>
      <div class="cards">${PRODUCTS.map((p) => `
        <button type="button" class="card ${p.id === state.productId ? 'is-selected' : ''}" data-product="${p.id}">
          <svg viewBox="0 0 400 460" class="card__pic" aria-hidden="true">
            ${SHAPES[p.id].back ? SHAPES[p.id].back.replace(/\{fill\}/g, '#fff').replace(/\{dark\}|\{line\}/g, '#cfcfd4') : ''}
            <path d="${SHAPES[p.id].body}" fill="#fff" stroke="#9a9aa2" stroke-width="5"/>
          </svg>
          <span class="card__name">${p.name}</span>
          <span class="card__desc">${p.desc}</span>
          <span class="card__price">от ${fmt(p.price)}</span>
        </button>`).join('')}
      </div>`;
  },

  color() {
    const p = product();
    return `<h1 class="h1">Цвет изделия</h1>
      <p class="lead">${p.name}: в наличии ${p.colors.length} ${plural(p.colors.length, 'цвет', 'цвета', 'цветов')}</p>
      <div class="swatches">${p.colors.map((id) => `
        <button type="button" class="swatch ${id === state.colorId ? 'is-selected' : ''}" data-color="${id}" title="${COLORS[id].name}">
          <span class="swatch__dot" style="background:${COLORS[id].hex}"></span>
          <span class="swatch__name">${COLORS[id].name}</span>
        </button>`).join('')}
      </div>`;
  },

  design() {
    if (!state.image) {
      return `<h1 class="h1">Загрузите картинку</h1>
        <p class="lead">PNG, JPG, WEBP или SVG до ${SETTINGS.maxFileMb} МБ. Лучше всего — PNG с прозрачным фоном.</p>
        <label class="drop" id="drop">
          <input type="file" id="fileInput" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>
          <span class="drop__icon">⬆</span>
          <span class="drop__title">Перетащите файл сюда</span>
          <span class="drop__hint">или нажмите, чтобы выбрать</span>
        </label>
        <p class="error" id="fileError" hidden></p>`;
    }
    const st = printStats();
    const lowQ = st && st.dpi < SETTINGS.minDpi;
    return `<h1 class="h1">Расположите картинку</h1>
      <p class="lead">Перетащите картинку на превью. Пунктир — зона печати.</p>
      <div class="file">
        <img src="${state.image.src}" alt="" class="file__thumb">
        <div class="file__info">
          <div class="file__name">${esc(state.image.name)}</div>
          <div class="file__meta">${state.image.w}×${state.image.h} px</div>
        </div>
        <button type="button" class="link" data-action="remove">Заменить</button>
      </div>
      <label class="field">
        <span class="field__label">Размер <b id="scaleVal">${Math.round(state.place.scale * 100)}%</b></span>
        <input type="range" id="scale" min="20" max="150" step="1" value="${Math.round(state.place.scale * 100)}">
      </label>
      <div class="chips">
        <button type="button" class="chip" data-action="center">По центру</button>
        <button type="button" class="chip" data-action="top">Выше</button>
        <button type="button" class="chip" data-action="fit">Во всю зону</button>
        <button type="button" class="chip" data-action="reset">Сбросить</button>
      </div>
      ${st ? `<p class="note ${lowQ ? 'note--warn' : ''}" id="printNote">
        Размер печати ≈ ${st.wCm.toFixed(0)} × ${st.hCm.toFixed(0)} см · качество ${st.dpi} dpi
        ${lowQ ? '<br>Картинка маловата — на отпечатке может быть нечёткой. Уменьшите размер или загрузите файл побольше.' : ''}</p>` : ''}`;
  },

  confirm() {
    const p = product();
    const st = printStats();
    return `<h1 class="h1">Проверьте дизайн</h1>
      <p class="lead">Так будет выглядеть ваше изделие. Если что-то не так — вернитесь на нужный шаг.</p>
      <dl class="summary">
        <div><dt>Изделие</dt><dd>${p.name} <button type="button" class="link" data-goto="0">изменить</button></dd></div>
        <div><dt>Цвет</dt><dd><span class="dot" style="background:${color().hex}"></span>${color().name} <button type="button" class="link" data-goto="1">изменить</button></dd></div>
        <div><dt>Файл</dt><dd>${esc(state.image.name)} <button type="button" class="link" data-goto="2">изменить</button></dd></div>
        <div><dt>Размер печати</dt><dd>≈ ${st.wCm.toFixed(0)} × ${st.hCm.toFixed(0)} см</dd></div>
        <div><dt>Качество</dt><dd>${st.dpi} dpi ${st.dpi < SETTINGS.minDpi ? '<span class="tag tag--warn">низкое</span>' : '<span class="tag">хорошее</span>'}</dd></div>
      </dl>
      <label class="check">
        <input type="checkbox" id="confirmBox" ${state.confirmed ? 'checked' : ''}>
        <span>Я проверил(а) макет: цвет изделия, расположение и размер картинки. Печать будет выполнена по этому макету.</span>
      </label>`;
  },

  qty() {
    const p = product();
    const pi = priceInfo();
    const next = SETTINGS.discounts.slice().reverse().find((d) => d.qty > pi.qty);
    return `<h1 class="h1">Количество</h1>
      <p class="lead">${p.sizes.length > 1 ? 'Укажите, сколько штук каждого размера нужно.' : 'Сколько штук нужно?'}</p>
      <div class="qty">${p.sizes.map((size) => `
        <div class="qty__row">
          <span class="qty__size">${size}</span>
          <div class="stepper-input">
            <button type="button" data-qty="${size}" data-delta="-1" aria-label="Меньше">−</button>
            <input type="number" min="0" max="9999" inputmode="numeric" data-size="${size}" value="${state.qty[size] || 0}">
            <button type="button" data-qty="${size}" data-delta="1" aria-label="Больше">+</button>
          </div>
        </div>`).join('')}
      </div>
      <div class="totals" id="qtyTotals">${qtyTotals(pi, next)}</div>
      <p class="hint">Скидки: ${SETTINGS.discounts.slice().reverse().map((d) => `от ${d.qty} шт — ${d.percent}%`).join(', ')}</p>`;
  },

  contact() {
    const c = state.contact;
    const f = (name, label, type = 'text', extra = '') => `
      <label class="field">
        <span class="field__label">${label}</span>
        <input class="input" type="${type}" name="${name}" value="${esc(c[name])}" ${extra}>
        <span class="field__error" data-error="${name}"></span>
      </label>`;
    return `<h1 class="h1">Контактные данные</h1>
      <p class="lead">Менеджер свяжется с вами, чтобы подтвердить заказ и доставку.</p>
      <form class="form" id="contactForm" novalidate>
        ${f('name', 'Имя и фамилия *', 'text', 'autocomplete="name" required')}
        <div class="form__row">
          ${f('phone', 'Телефон *', 'tel', 'autocomplete="tel" placeholder="+7 900 000-00-00" required')}
          ${f('email', 'E-mail *', 'email', 'autocomplete="email" required')}
        </div>
        ${f('city', 'Город *', 'text', 'autocomplete="address-level2" required')}
        ${f('address', 'Адрес доставки или «самовывоз»', 'text', 'autocomplete="street-address"')}
        <label class="field">
          <span class="field__label">Комментарий к заказу</span>
          <textarea class="input" name="comment" rows="3">${esc(c.comment)}</textarea>
        </label>
        <label class="check">
          <input type="checkbox" name="consent" ${c.consent ? 'checked' : ''}>
          <span>Согласен(на) на обработку персональных данных *</span>
        </label>
        <span class="field__error" data-error="consent"></span>
      </form>`;
  },

  done() {
    const o = state.order;
    return `<div class="done">
        <div class="done__icon">✓</div>
        <h1 class="h1">Заказ №${o.id} оформлен</h1>
        <p class="lead">Спасибо, ${esc(o.contact.name.split(' ')[0])}! Мы отправим подтверждение на ${esc(o.contact.email)} и позвоним по номеру ${esc(o.contact.phone)}.</p>
        <dl class="summary">
          <div><dt>Изделие</dt><dd>${o.product}, ${o.color}</dd></div>
          <div><dt>Размеры</dt><dd>${Object.entries(o.sizes).map(([s, n]) => `${s} × ${n}`).join(', ')}</dd></div>
          <div><dt>Всего</dt><dd>${o.qty} шт · ${fmt(o.total)}${o.discount ? ` (скидка ${o.discount}%)` : ''}</dd></div>
        </dl>
        ${o.sendError ? `<p class="note note--warn">Не удалось отправить заказ на сервер: ${esc(o.sendError)}. Скачайте макет и свяжитесь с нами.</p>` : ''}
        <div class="done__actions">
          <button type="button" class="btn btn--primary" data-action="downloadPdf">Скачать PDF</button>
          <button type="button" class="btn btn--ghost" data-action="download">Скачать макет PNG</button>
          <button type="button" class="btn btn--ghost" data-action="restart">Создать новый дизайн</button>
        </div>
      </div>`;
  },
};

function qtyTotals(pi, next) {
  return `<div><span>Всего</span><b>${pi.qty} шт</b></div>
    <div><span>Цена за шт</span><b>${fmt(pi.unit)}${pi.percent ? ` <s>${fmt(pi.base)}</s>` : ''}</b></div>
    ${next ? `<div class="totals__hint">Ещё ${next.qty - pi.qty} шт — и скидка ${next.percent}%</div>` : ''}`;
}

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/* ---------- Проверка, можно ли идти дальше ---------- */

function canProceed(i = state.step) {
  switch (STEPS[i].id) {
    case 'product': return !!state.productId;
    case 'color':   return !!state.colorId;
    case 'design':  return !!state.image;
    case 'confirm': return state.confirmed;
    case 'qty':     return totalQty() > 0;
    case 'contact': return true; // поля проверяются при отправке
  }
  return false;
}

function goTo(i) {
  if (i < 0 || i >= STEPS.length) return;
  // нельзя перепрыгнуть через незаполненный шаг
  for (let k = 0; k < i; k++) if (!canProceed(k)) i = Math.min(i, k);
  state.step = i;
  state.maxStep = Math.max(state.maxStep, i);
  render();
  // наверх страницы, чтобы превью изделия было видно (важно на телефоне)
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Главная функция перерисовки ---------- */

function render() {
  renderMockup();
  renderStepper();

  const body = $('#stepBody');
  body.innerHTML = state.order ? views.done() : views[STEPS[state.step].id]();
  bindStep();

  const pi = priceInfo();
  $('#totalPrice').textContent = !pi ? '—' : pi.qty ? fmt(pi.total) : `от ${fmt(pi.base)} / шт`;

  const last = state.step === STEPS.length - 1;
  $('#btnBack').style.visibility = state.step > 0 && !state.order ? 'visible' : 'hidden';
  $('#btnNext').hidden = !!state.order;
  $('#btnNext').textContent = last ? 'Оформить заказ' : 'Далее';
  $('#btnNext').disabled = !canProceed();
  document.querySelector('.panel__footer').hidden = !!state.order;
}

/* ---------- Обработчики на экранах ---------- */

function bindStep() {
  const body = $('#stepBody');

  body.querySelectorAll('[data-product]').forEach((b) => b.addEventListener('click', () => {
    state.productId = b.dataset.product;
    const p = product();
    if (!p.colors.includes(state.colorId)) state.colorId = null;
    state.qty = {};
    state.place = { scale: 0.8, dx: 0, dy: 0 };
    state.confirmed = false;
    render();
  }));

  body.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
    state.colorId = b.dataset.color;
    state.confirmed = false;
    render();
  }));

  body.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.goto))));

  // загрузка файла
  const input = $('#fileInput');
  if (input) {
    const drop = $('#drop');
    input.addEventListener('change', () => input.files[0] && loadFile(input.files[0]));
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (e) => e.dataTransfer.files[0] && loadFile(e.dataTransfer.files[0]));
  }

  const scale = $('#scale');
  if (scale) scale.addEventListener('input', () => {
    state.place.scale = scale.value / 100;
    $('#scaleVal').textContent = scale.value + '%';
    renderMockup();
    updatePrintNote();
  });

  body.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => actions[b.dataset.action]()));

  const box = $('#confirmBox');
  if (box) box.addEventListener('change', () => { state.confirmed = box.checked; render(); });

  // количество
  body.querySelectorAll('[data-qty]').forEach((b) => b.addEventListener('click', () => {
    const size = b.dataset.qty;
    setQty(size, (state.qty[size] || 0) + Number(b.dataset.delta));
    body.querySelector(`input[data-size="${size}"]`).value = state.qty[size] || 0;
  }));
  body.querySelectorAll('input[data-size]').forEach((inp) => inp.addEventListener('input', () => setQty(inp.dataset.size, parseInt(inp.value, 10) || 0)));

  // форма контактов: сохраняем ввод сразу, чтобы не потерять при переходах
  const form = $('#contactForm');
  if (form) form.addEventListener('input', (e) => {
    const el = e.target;
    state.contact[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    const err = form.querySelector(`[data-error="${el.name}"]`);
    if (err) err.textContent = '';
  });
}

function setQty(size, n) {
  state.qty[size] = Math.max(0, Math.min(9999, n));
  if (!state.qty[size]) delete state.qty[size];
  const pi = priceInfo();
  const next = SETTINGS.discounts.slice().reverse().find((d) => d.qty > pi.qty);
  $('#qtyTotals').innerHTML = qtyTotals(pi, next);
  $('#totalPrice').textContent = pi.qty ? fmt(pi.total) : `от ${fmt(pi.base)} / шт`;
  $('#btnNext').disabled = !canProceed();
}

function updatePrintNote() {
  // при движении ползунка обновляем только подсказку, а не весь экран
  const note = $('#printNote');
  const st = printStats();
  if (!note || !st) return;
  const lowQ = st.dpi < SETTINGS.minDpi;
  note.classList.toggle('note--warn', lowQ);
  note.innerHTML = `Размер печати ≈ ${st.wCm.toFixed(0)} × ${st.hCm.toFixed(0)} см · качество ${st.dpi} dpi` +
    (lowQ ? '<br>Картинка маловата — на отпечатке может быть нечёткой. Уменьшите размер или загрузите файл побольше.' : '');
}

const actions = {
  remove() { state.image = null; state.confirmed = false; render(); },
  center() { state.place.dx = 0; state.place.dy = 0; render(); },
  top() {
    const s = shape(), box = imageBox();
    state.place.dx = 0;
    state.place.dy = -(s.print.h - box.h) / 2;
    render();
  },
  fit() { state.place = { scale: 1, dx: 0, dy: 0 }; render(); },
  reset() { state.place = { scale: 0.8, dx: 0, dy: 0 }; render(); },
  download() { downloadPng(); },
  downloadPdf() { downloadPdf(); },
  restart() {
    Object.assign(state, {
      step: 0, maxStep: 0, productId: null, colorId: null, image: null,
      place: { scale: 0.8, dx: 0, dy: 0 }, confirmed: false, qty: {}, order: null,
    });
    render();
  },
};

function loadFile(file) {
  const err = $('#fileError');
  const fail = (msg) => { err.textContent = msg; err.hidden = false; };
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return fail('Этот формат не подходит. Загрузите PNG, JPG, WEBP или SVG.');
  if (file.size > SETTINGS.maxFileMb * 1024 * 1024) return fail(`Файл больше ${SETTINGS.maxFileMb} МБ.`);

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // у некоторых SVG нет размеров — тогда считаем их 1000×1000
      const w = img.naturalWidth || 1000, h = img.naturalHeight || 1000;
      state.image = { src: reader.result, w, h, name: file.name, size: file.size };
      state.place = { scale: 0.8, dx: 0, dy: 0 };
      state.confirmed = false;
      render();
    };
    img.onerror = () => fail('Не получилось открыть картинку. Попробуйте другой файл.');
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

/* ---------- Оформление заказа ---------- */

function validateContact() {
  const c = state.contact;
  const errors = {};
  if (c.name.trim().length < 2) errors.name = 'Укажите имя';
  if (c.phone.replace(/\D/g, '').length < 10) errors.phone = 'Проверьте номер телефона';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) errors.email = 'Проверьте e-mail';
  if (!c.city.trim()) errors.city = 'Укажите город';
  if (!c.consent) errors.consent = 'Нужно согласие, чтобы оформить заказ';
  document.querySelectorAll('[data-error]').forEach((el) => { el.textContent = errors[el.dataset.error] || ''; });
  const first = Object.keys(errors)[0];
  if (first) {
    const el = document.querySelector(`[name="${first}"]`);
    if (el) el.focus();
  }
  return !first;
}

async function submitOrder() {
  if (!validateContact()) return;
  const btn = $('#btnNext');
  btn.disabled = true;
  btn.textContent = 'Отправляем…';

  const p = product();
  const pi = priceInfo();
  const st = printStats();
  const order = {
    id: String(Date.now()).slice(-6),
    createdAt: new Date().toISOString(),
    product: p.name,
    productId: p.id,
    color: color().name,
    colorHex: color().hex,
    sizes: { ...state.qty },
    qty: pi.qty,
    unitPrice: Math.round(pi.unit),
    discount: pi.percent,
    total: Math.round(pi.total),
    print: { widthCm: +st.wCm.toFixed(1), heightCm: +st.hCm.toFixed(1), dpi: st.dpi, placement: { ...state.place } },
    file: { name: state.image.name, width: state.image.w, height: state.image.h },
    contact: { ...state.contact },
  };

  if (SETTINGS.orderEndpoint) {
    try {
      const preview = await mockupPng();
      const res = await fetch(SETTINGS.orderEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...order, image: state.image.src, preview }),
      });
      if (!res.ok) throw new Error('ошибка ' + res.status);
    } catch (e) {
      order.sendError = e.message;
    }
  }

  // копия заказа (без картинки) остаётся в браузере
  try {
    const saved = JSON.parse(localStorage.getItem('pinhead_orders') || '[]');
    saved.push(order);
    localStorage.setItem('pinhead_orders', JSON.stringify(saved));
  } catch (e) { /* хранилище недоступно — не страшно */ }

  state.order = order;
  render();
}

/* ---------- Экспорт макета в PNG ---------- */

function mockupPng(width = 1200) {
  return new Promise((resolve, reject) => {
    const clone = svg.cloneNode(true);
    clone.querySelector('#printArea').remove();
    clone.setAttribute('width', width);
    clone.setAttribute('height', Math.round(width * 460 / 400));
    clone.style.visibility = 'visible';
    const data = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = Math.round(width * 460 / 400);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#F4F4F2';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
  });
}

async function downloadPng() {
  try {
    const url = await mockupPng();
    const a = document.createElement('a');
    a.href = url;
    a.download = `maket-${state.order ? state.order.id : 'design'}.png`;
    a.click();
  } catch (e) {
    alert('Не удалось сохранить макет в этом браузере.');
  }
}

async function downloadPdf() {
  const btn = document.querySelector('[data-action="downloadPdf"]');
  btn.disabled = true;
  btn.textContent = 'Готовим PDF…';
  try {
    const blob = await buildOrderPdf({ order: state.order, mockupSrc: await mockupPng(), designSrc: state.image.src });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pinhead-zakaz-${state.order.id}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    alert('Не удалось сформировать PDF в этом браузере.');
  }
  btn.disabled = false;
  btn.textContent = 'Скачать PDF';
}

/* ---------- Кнопки «Назад» / «Далее» ---------- */

$('#btnBack').addEventListener('click', () => goTo(state.step - 1));
$('#btnNext').addEventListener('click', () => {
  if (!canProceed()) return;
  if (state.step === STEPS.length - 1) submitOrder();
  else goTo(state.step + 1);
});

render();

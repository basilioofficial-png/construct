/*
 * ПРИЁМ ЗАЯВОК С САЙТА → СДЕЛКИ В БИТРИКС24
 * -----------------------------------------
 * Серверная функция Vercel: сайт отправляет сюда заявку, а функция с секретным
 * ключом (вебхуком) создаёт в Битриксе контакт и сделку в воронке «Студия».
 * Ключ хранится только в настройках Vercel и в браузер не попадает.
 *
 * Настройки (Vercel → Settings → Environment Variables):
 *   BITRIX_WEBHOOK      — обязательно. Адрес входящего вебхука,
 *                         например https://pinhead.bitrix24.ru/rest/1/abc123/
 *   BITRIX_CATEGORY_ID  — ID воронки, по умолчанию 52 («Студия»)
 *   BITRIX_STAGE_ID     — стадия; если пусто, сделка попадёт в первую стадию воронки
 *   BITRIX_ASSIGNED_ID  — ID ответственного сотрудника; если пусто — автор вебхука
 *   BITRIX_SOURCE_ID    — источник сделки, по умолчанию WEB («Веб-сайт»)
 *   BITRIX_FOLDER_ID    — ID папки на Диске для файлов; если пусто, функция сама
 *                         создаст папку «Заказы с сайта» в общем Диске компании
 *
 * Пока BITRIX_WEBHOOK не задан, функция работает в тестовом режиме: ничего
 * не отправляет и возвращает то, что ушло бы в Битрикс.
 *
 * Действия (поле action в запросе):
 *   upload-url — выдать одноразовый адрес для загрузки файла прямо на Диск
 *   find       — найти на Диске файл, загруженный напрямую (если браузер не смог
 *                прочитать ответ Битрикса)
 *   upload     — загрузить небольшой файл (до ~3 МБ) через функцию
 *   lead       — создать контакт и сделку
 */

const CONFIG = {
  webhook: (process.env.BITRIX_WEBHOOK || '').replace(/\/?$/, '/'),
  categoryId: Number(process.env.BITRIX_CATEGORY_ID || 52),
  stageId: process.env.BITRIX_STAGE_ID || '',
  assignedId: Number(process.env.BITRIX_ASSIGNED_ID || 0),
  sourceId: process.env.BITRIX_SOURCE_ID || 'WEB',
  folderId: Number(process.env.BITRIX_FOLDER_ID || 0),
  folderName: 'Заказы с сайта',
};
const DRY_RUN = !process.env.BITRIX_WEBHOOK;

/* ---------- Вызов REST API Битрикса ---------- */

async function bx(method, params) {
  const res = await fetch(CONFIG.webhook + method + '.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(`${method}: ${data.error_description || data.error || res.status}`);
  }
  return data.result;
}

/* ---------- Папка на Диске для файлов ---------- */

let folderPromise = null;
function getFolderId() {
  if (CONFIG.folderId) return Promise.resolve(CONFIG.folderId);
  if (!folderPromise) {
    folderPromise = (async () => {
      // общий Диск компании
      const storages = await bx('disk.storage.getlist', { filter: { ENTITY_TYPE: 'common' } });
      if (!storages || !storages.length) throw new Error('не найден общий Диск компании');
      const rootId = storages[0].ROOT_OBJECT_ID;
      const children = await bx('disk.folder.getchildren', { id: rootId, filter: { NAME: CONFIG.folderName } });
      const found = (children || []).find((c) => c.TYPE === 'folder' && c.NAME === CONFIG.folderName);
      if (found) return Number(found.ID);
      const created = await bx('disk.folder.addsubfolder', { id: rootId, data: { NAME: CONFIG.folderName } });
      return Number(created.ID);
    })().catch((e) => { folderPromise = null; throw e; });
  }
  return folderPromise;
}

/* ---------- Помощники ---------- */

const clean = (v, max = 500) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const esc = (s) => clean(s, 5000).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// +7 (900) 123-45-67 → +79001234567; 8900… → +7900…
function normPhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
  if (d.length === 10) d = '7' + d;
  return d ? '+' + d : '';
}

const safeName = (n) => clean(n, 120).replace(/[\\/:*?"<>|]+/g, '_') || 'file';

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

/* ---------- Контакт и сделка ---------- */

async function findOrCreateContact(c) {
  const phone = normPhone(c.phone);
  if (phone) {
    const dup = await bx('crm.duplicate.findbycomm', { type: 'PHONE', values: [phone], entity_type: 'CONTACT' });
    const ids = dup && dup.CONTACT;
    if (ids && ids.length) return Number(ids[0]);
  }
  const fields = {
    NAME: clean(c.name, 100) || 'Без имени',
    SOURCE_ID: CONFIG.sourceId,
    OPENED: 'Y',
  };
  if (phone) fields.PHONE = [{ VALUE: phone, VALUE_TYPE: 'WORK' }];
  if (c.email) fields.EMAIL = [{ VALUE: clean(c.email, 100), VALUE_TYPE: 'WORK' }];
  if (CONFIG.assignedId) fields.ASSIGNED_BY_ID = CONFIG.assignedId;
  return Number(await bx('crm.contact.add', { fields }));
}

const rub = (n) => Math.round(Number(n) || 0).toLocaleString('ru-RU') + ' ₽';

// Текст сделки (в Битриксе комментарий поддерживает простой HTML)
function buildDeal(p) {
  const c = p.contact || {};
  const lines = [];
  const row = (k, v) => { if (clean(v)) lines.push(`<b>${esc(k)}:</b> ${esc(v)}`); };
  let title, amount = 0, products = [];

  if (p.type === 'order') {
    const o = p.order || {};
    title = `Конструктор №${clean(o.id, 20)}: ${clean(o.product, 80)}, ${clean(o.qty, 6)} шт — ${clean(c.name, 60)}`;
    amount = Number(o.total) || 0;
    row('Изделие', o.product);
    row('Цвет', o.color);
    row('Размеры', Object.entries(o.sizes || {}).map(([s, n]) => `${s} × ${n}`).join(', '));
    row('Количество', `${o.qty} шт`);
    row('Место нанесения', o.print && o.print.placementName);
    row('Размер печати', o.print && `≈ ${Math.round(o.print.widthCm)} × ${Math.round(o.print.heightCm)} см`);
    row('Печать', o.print && `DTF, ${o.print.format}${o.personal ? ', персонализация ×1,5' : ''}`);
    row('Качество файла', o.print && `${o.print.dpi} dpi`);
    row('Цена изделия', rub(o.garmentPrice));
    row('Цена печати', rub(o.printPrice));
    row('Цена за шт', rub(o.unitPrice));
    row('Итого', rub(o.total));
    row('Файл клиента', o.file && `${o.file.name} (${o.file.width}×${o.file.height} px)`);
    products = [{
      PRODUCT_NAME: clean(`${o.product}, ${o.color}, печать DTF ${o.print ? o.print.format : ''} (${o.print ? o.print.placementName : ''})`, 250),
      PRICE: Number(o.unitPrice) || 0,
      QUANTITY: Number(o.qty) || 1,
    }];
  } else if (p.type === 'tirage') {
    const t = p.tirage || {};
    title = `Тираж: ${clean(t.qty, 8)} шт — ${clean(c.name, 60)}`;
    row('Заявка', 'Тираж (форма на главной)');
    row('Количество изделий', `${t.qty} шт`);
    row('Есть макет', t.layout);
  } else {
    title = `Консультация — ${clean(c.name, 60)}`;
    row('Заявка', 'Консультация (форма на главной)');
  }

  row('Имя', c.name);
  row('Телефон', c.phone);
  row('E-mail', c.email);
  row('Город', c.city);
  row('Адрес', c.address);
  row('Комментарий клиента', c.comment);

  const files = (p.files || []).filter((f) => f && f.url);
  if (files.length) {
    lines.push('<b>Файлы на Диске:</b>');
    for (const f of files) lines.push(`— <a href="${esc(f.url)}">${esc(f.title || f.name)}</a>`);
  }
  if (p.page) row('Страница', p.page);
  return { title: clean(title, 250), comments: lines.join('<br>'), amount, products };
}

async function createDeal(p) {
  const deal = buildDeal(p);
  const utm = p.utm || {};
  const fields = {
    TITLE: deal.title,
    CATEGORY_ID: CONFIG.categoryId,
    OPPORTUNITY: deal.amount,
    CURRENCY_ID: 'RUB',
    SOURCE_ID: CONFIG.sourceId,
    SOURCE_DESCRIPTION: 'Сайт студии PINHEAD',
    COMMENTS: deal.comments,
    OPENED: 'Y',
  };
  if (CONFIG.stageId) fields.STAGE_ID = CONFIG.stageId;
  if (CONFIG.assignedId) fields.ASSIGNED_BY_ID = CONFIG.assignedId;
  for (const k of ['source', 'medium', 'campaign', 'content', 'term']) {
    if (utm[k]) fields['UTM_' + k.toUpperCase()] = clean(utm[k], 200);
  }

  if (DRY_RUN) return { dryRun: true, contact: p.contact, deal: fields, products: deal.products };

  fields.CONTACT_ID = await findOrCreateContact(p.contact || {});
  const dealId = Number(await bx('crm.deal.add', { fields, params: { REGISTER_SONET_EVENT: 'Y' } }));
  if (deal.products.length) {
    await bx('crm.deal.productrows.set', { id: dealId, rows: deal.products }).catch(() => {});
  }
  return { dealId, contactId: fields.CONTACT_ID };
}

/* ---------- Обработчик запроса ---------- */

module.exports = async (req, res) => {
  const send = (code, obj) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
  };
  if (req.method !== 'POST') return send(405, { ok: false, error: 'Нужен POST-запрос' });

  let p;
  try { p = await readBody(req); } catch (e) { return send(400, { ok: false, error: 'Неверный формат данных' }); }

  // ловушка для ботов: скрытое поле, которое человек не заполняет
  if (p.website) return send(200, { ok: true });

  try {
    if (p.action === 'upload-url') {
      if (DRY_RUN) return send(200, { ok: true, dryRun: true });
      const folderId = await getFolderId();
      const r = await bx('disk.folder.uploadfile', { id: folderId, generateUniqueName: true });
      return send(200, { ok: true, uploadUrl: r.uploadUrl, field: r.field, name: safeName(p.name) });
    }

    if (p.action === 'find') {
      // файл, загруженный напрямую, ищем на Диске по имени
      if (DRY_RUN) return send(200, { ok: true, dryRun: true });
      const folderId = await getFolderId();
      const list = await bx('disk.folder.getchildren', { id: folderId, filter: { NAME: safeName(p.name) } });
      const f = (list || []).find((x) => x.TYPE === 'file');
      return send(200, { ok: true, file: f ? { id: f.ID, name: f.NAME, url: f.DETAIL_URL } : null });
    }

    if (p.action === 'upload') {
      const b64 = String(p.base64 || '');
      if (!b64 || b64.length > 4.4e6) return send(413, { ok: false, error: 'Файл слишком большой' });
      if (DRY_RUN) return send(200, { ok: true, dryRun: true, file: { name: safeName(p.name), url: '' } });
      const folderId = await getFolderId();
      const f = await bx('disk.folder.uploadfile', {
        id: folderId,
        data: { NAME: safeName(p.name) },
        fileContent: [safeName(p.name), b64],
        generateUniqueName: true,
      });
      return send(200, { ok: true, file: { id: f.ID, name: f.NAME, url: f.DETAIL_URL } });
    }

    if (p.action === 'lead') {
      if (!['order', 'tirage', 'consult'].includes(p.type)) return send(400, { ok: false, error: 'Неизвестный тип заявки' });
      const c = p.contact || {};
      if (!clean(c.name) || normPhone(c.phone).length < 12) return send(400, { ok: false, error: 'Нужны имя и телефон' });
      const result = await createDeal(p);
      return send(200, { ok: true, ...result });
    }

    return send(400, { ok: false, error: 'Неизвестное действие' });
  } catch (e) {
    console.error('[lead]', e);
    return send(502, { ok: false, error: 'Битрикс не принял заявку: ' + e.message });
  }
};

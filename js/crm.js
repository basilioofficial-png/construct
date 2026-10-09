/*
 * ОТПРАВКА ЗАЯВОК В БИТРИКС24 (через серверную функцию /api/lead)
 * ------------------------------------------------------------------
 *   sendLead(данные)        — создать сделку в воронке «Студия»
 *   uploadFile(файл, имя)   — загрузить файл на Диск Битрикса,
 *                             вернёт { name, url } или null
 */
const LEAD_API = '/api/lead';

// UTM-метки запоминаем при первом заходе, чтобы они не терялись,
// когда клиент переходит с главной в конструктор
function getUtm() {
  const keys = ['source', 'medium', 'campaign', 'content', 'term'];
  let utm = {};
  try { utm = JSON.parse(sessionStorage.getItem('pinhead_utm') || '{}'); } catch (e) { /* нет доступа */ }
  const q = new URLSearchParams(location.search);
  if (keys.some((k) => q.get('utm_' + k))) {
    utm = {};
    keys.forEach((k) => { if (q.get('utm_' + k)) utm[k] = q.get('utm_' + k); });
    try { sessionStorage.setItem('pinhead_utm', JSON.stringify(utm)); } catch (e) { /* нет доступа */ }
  }
  return utm;
}
getUtm();

async function postApi(body) {
  const res = await fetch(LEAD_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'ошибка ' + res.status);
  return data;
}

function sendLead(payload) {
  return postApi({ action: 'lead', ...payload, utm: getUtm(), page: location.href.split('?')[0] });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

const SERVER_UPLOAD_MAX = 3.2 * 1024 * 1024; // Vercel принимает ~4,5 МБ, base64 раздувает файл на треть

async function uploadViaServer(blob, name) {
  const r = await postApi({ action: 'upload', name, base64: await blobToBase64(blob) });
  return r.file;
}

// Прямая загрузка на Диск Битрикса: функция выдаёт одноразовый адрес,
// а файл идёт напрямую, минуя Vercel. Если браузеру не дали прочитать ответ
// Битрикса, файл всё равно загружен — находим его на Диске по имени.
async function uploadDirect(blob, name) {
  const u = await postApi({ action: 'upload-url', name });
  if (u.dryRun) return { name, url: '' };
  const fd = new FormData();
  fd.append(u.field, blob, u.name);
  let res = null;
  try { res = await fetch(u.uploadUrl, { method: 'POST', body: fd }); } catch (e) { /* ответ закрыт для чтения */ }
  if (res) {
    const data = await res.json().catch(() => ({}));
    if (data.result && data.result.ID) return { name: data.result.NAME, url: data.result.DETAIL_URL };
  }
  const found = await postApi({ action: 'find', name: u.name });
  if (found.file) return found.file;
  throw new Error('файл не найден на Диске');
}

async function uploadFile(blob, name) {
  const order = blob.size <= SERVER_UPLOAD_MAX ? [uploadViaServer, uploadDirect] : [uploadDirect];
  for (const fn of order) {
    try {
      return await fn(blob, name);
    } catch (e) {
      console.warn(`Загрузка ${name} (${fn.name}) не удалась:`, e.message);
    }
  }
  return null;
}

function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',');
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

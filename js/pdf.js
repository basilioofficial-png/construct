/*
 * PDF С ИТОГОВЫМ ЗАКАЗОМ
 * ----------------------
 * Без внешних библиотек:
 *   1. Рисуем страницу A4 на canvas (макет, данные заказа, контакты).
 *   2. Превращаем canvas в JPEG.
 *   3. Упаковываем JPEG в минимальный PDF-файл (одна страница A4).
 */

const PDF_PAGE = { w: 595.28, h: 841.89 }; // A4 в пунктах PDF
const PDF_PX = 1654;                       // ширина страницы в пикселях (~200 dpi)

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Пишет текст с переносом по словам, возвращает y после последней строки
function wrapText(ctx, text, x, y, maxW, lineH) {
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineH;
}

async function renderOrderPage({ order, mockupSrc, designSrc }) {
  const W = PDF_PX, H = Math.round(PDF_PX * PDF_PAGE.h / PDF_PAGE.w);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const font = (size, weight = 500) => `${weight} ${size}px Manrope, system-ui, sans-serif`;
  const M = 110; // поля страницы
  const text = '#16161a', muted = '#6b6b73', line = '#e4e4e7', accent = '#0b6b3a';

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  // Шапка
  ctx.fillStyle = text;
  ctx.font = font(52, 800);
  ctx.fillText('PINHEAD', M, M + 40);
  ctx.textAlign = 'right';
  ctx.font = font(34, 700);
  ctx.fillText(`Заказ №${order.id}`, W - M, M + 22);
  ctx.font = font(26);
  ctx.fillStyle = muted;
  ctx.fillText(new Date(order.createdAt).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' }), W - M, M + 62);
  ctx.textAlign = 'left';
  ctx.fillStyle = line;
  ctx.fillRect(M, M + 95, W - 2 * M, 2);

  // Макет изделия слева
  const top = M + 150;
  const mockW = 760, mockH = Math.round(mockW * 460 / 400);
  ctx.fillStyle = '#f4f4f2';
  ctx.fillRect(M, top, mockW, mockH);
  ctx.drawImage(await loadImg(mockupSrc), M, top, mockW, mockH);

  // Данные заказа справа
  const cx = M + mockW + 70, cw = W - M - cx;
  let y = top + 30;
  ctx.fillStyle = text;
  ctx.font = font(36, 800);
  ctx.fillText('Детали заказа', cx, y);
  y += 60;
  const rows = [
    ['Изделие', order.product],
    ['Цвет', order.color],
    ['Размеры', Object.entries(order.sizes).map(([s, n]) => `${s} × ${n}`).join(', ')],
    ['Количество', `${order.qty} шт`],
    ['Цена за шт', fmt(order.unitPrice)],
    ['Скидка', order.discount ? `${order.discount}%` : '—'],
    ['Размер печати', `≈ ${Math.round(order.print.widthCm)} × ${Math.round(order.print.heightCm)} см`],
    ['Качество', `${order.print.dpi} dpi`],
    ['Файл', order.file.name],
  ];
  for (const [k, v] of rows) {
    ctx.fillStyle = muted;
    ctx.font = font(24);
    ctx.fillText(k, cx, y);
    ctx.fillStyle = text;
    ctx.font = font(28, 700);
    y = wrapText(ctx, v, cx, y + 38, cw, 36) + 14;
  }
  ctx.fillStyle = line;
  ctx.fillRect(cx, y, cw, 2);
  y += 60;
  ctx.fillStyle = muted;
  ctx.font = font(26);
  ctx.fillText('Итого', cx, y);
  ctx.fillStyle = accent;
  ctx.font = font(52, 800);
  ctx.fillText(fmt(order.total), cx, y + 64);
  const detailsEnd = y + 64;

  // Нижний блок: исходная картинка и контакты (ниже макета и деталей)
  y = Math.max(top + mockH, detailsEnd) + 110;
  ctx.fillStyle = line;
  ctx.fillRect(M, y - 40, W - 2 * M, 2);

  const boxW = 520, boxH = 520;
  ctx.fillStyle = text;
  ctx.font = font(32, 800);
  ctx.fillText('Файл для печати', M, y + 10);
  // шахматный фон показывает прозрачные участки
  const by = y + 40, cell = 20;
  for (let i = 0; i < boxW / cell; i++) {
    for (let j = 0; j < boxH / cell; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#ededed' : '#fafafa';
      ctx.fillRect(M + i * cell, by + j * cell, cell, cell);
    }
  }
  const design = await loadImg(designSrc);
  const dw = order.file.width, dh = order.file.height;
  const k = Math.min((boxW - 40) / dw, (boxH - 40) / dh);
  ctx.drawImage(design, M + (boxW - dw * k) / 2, by + (boxH - dh * k) / 2, dw * k, dh * k);
  ctx.fillStyle = muted;
  ctx.font = font(22);
  ctx.fillText(`${dw}×${dh} px`, M, by + boxH + 36);

  const kx = M + boxW + 90, kw = W - M - kx;
  let ky = y + 10;
  ctx.fillStyle = text;
  ctx.font = font(32, 800);
  ctx.fillText('Контакты', kx, ky);
  ky += 60;
  const c = order.contact;
  const contacts = [
    ['Имя', c.name], ['Телефон', c.phone], ['E-mail', c.email], ['Город', c.city],
    ['Адрес', c.address || '—'], ['Комментарий', c.comment || '—'],
  ];
  for (const [label, v] of contacts) {
    ctx.fillStyle = muted;
    ctx.font = font(22);
    ctx.fillText(label, kx, ky);
    ctx.fillStyle = text;
    ctx.font = font(26, 600);
    ky = wrapText(ctx, v, kx, ky + 34, kw, 34) + 10;
  }

  // Подвал
  ctx.fillStyle = muted;
  ctx.font = font(22);
  ctx.fillText('Документ сформирован в конструкторе PINHEAD. Печать выполняется по этому макету.', M, H - M + 30);

  return canvas;
}

// Собирает PDF-файл из одной JPEG-картинки на всю страницу A4
function jpegToPdf(jpegBytes, imgW, imgH) {
  const enc = new TextEncoder();
  const parts = [];
  const offsets = [];
  let length = 0;
  const push = (chunk) => {
    const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const obj = (n, body) => { offsets[n] = length; push(`${n} 0 obj\n${body}\nendobj\n`); };

  const content = `q ${PDF_PAGE.w} 0 0 ${PDF_PAGE.h} 0 0 cm /Im0 Do Q`;
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE.w} ${PDF_PAGE.h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = length;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  push(jpegBytes);
  push('\nendstream\nendobj\n');
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  const xref = length;
  let table = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) table += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  push(table + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}

async function buildOrderPdf(data) {
  const canvas = await renderOrderPage(data);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return jpegToPdf(bytes, canvas.width, canvas.height);
}

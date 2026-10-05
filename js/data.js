/*
 * БАЗА ДАННЫХ КОНСТРУКТОРА
 * ------------------------
 * Здесь хранится всё, что меняется без программирования:
 *   - COLORS   — палитра цветов, которые есть на складе;
 *   - PRODUCTS — изделия: название, цена, доступные цвета, размеры,
 *                форма (SVG-контур) и зона печати;
 *   - SETTINGS — скидки, лимиты загрузки и адрес для отправки заказов.
 *
 * Чтобы добавить цвет: допишите строку в COLORS и укажите его id
 * в массиве colors нужного изделия.
 */

const COLORS = {
  white:     { name: 'Белый',          hex: '#FFFFFF' },
  black:     { name: 'Чёрный',         hex: '#1C1C1E' },
  grey:      { name: 'Серый меланж',   hex: '#B9BCC0' },
  graphite:  { name: 'Графит',         hex: '#4A4D52' },
  navy:      { name: 'Тёмно-синий',    hex: '#1F2A44' },
  sky:       { name: 'Небесный',       hex: '#9CC3E6' },
  red:       { name: 'Красный',        hex: '#C8102E' },
  burgundy:  { name: 'Бордовый',       hex: '#6D1F2F' },
  green:     { name: 'Бутылочный',     hex: '#1E4D3A' },
  olive:     { name: 'Оливковый',      hex: '#6B6B3A' },
  sand:      { name: 'Песочный',       hex: '#D8C7A9' },
  pink:      { name: 'Пудровый',       hex: '#F2C4CE' },
  lilac:     { name: 'Лавандовый',     hex: '#B9A7D6' },
  mustard:   { name: 'Горчичный',      hex: '#D9A520' },
  natural:   { name: 'Натуральный',    hex: '#EFE6D2' },
};

/*
 * Форма изделия описана SVG-путями в системе координат 400×460.
 * В строках details можно использовать подстановки:
 *   {fill} — выбранный цвет, {dark} — чуть темнее (манжеты, капюшон),
 *   {line} — цвет швов.
 * print — прямоугольник, внутри которого печатается картинка;
 *   printCm — реальный размер этой зоны на изделии в сантиметрах.
 */
const SHAPES = {
  tshirt: {
    body: 'M120,40 C140,56 170,62 200,62 C230,62 260,56 280,40 L350,70 L392,152 L336,178 L320,152 L320,432 L80,432 L80,152 L64,178 L8,152 L50,70 Z',
    details: [
      '<path d="M120,40 C140,56 170,62 200,62 C230,62 260,56 280,40 C262,78 238,90 200,90 C162,90 138,78 120,40 Z" fill="{dark}"/>',
      '<path d="M128,44 C150,74 172,82 200,82 C228,82 250,74 272,44" fill="none" stroke="{line}" stroke-width="2"/>',
      '<path d="M80,152 L80,190 M320,152 L320,190" stroke="{line}" stroke-width="1.5"/>',
    ],
    print: { x: 130, y: 115, w: 140, h: 190 },
    printCm: { w: 30, h: 40 },
  },
  longsleeve: {
    body: 'M120,40 C140,56 170,62 200,62 C230,62 260,56 280,40 L340,62 L386,332 L345,342 L320,182 L320,432 L80,432 L80,182 L55,342 L14,332 L60,62 Z',
    details: [
      '<path d="M120,40 C140,56 170,62 200,62 C230,62 260,56 280,40 C262,78 238,90 200,90 C162,90 138,78 120,40 Z" fill="{dark}"/>',
      '<path d="M128,44 C150,74 172,82 200,82 C228,82 250,74 272,44" fill="none" stroke="{line}" stroke-width="2"/>',
      '<path d="M19,305 L59,317 M381,305 L341,317" stroke="{line}" stroke-width="2"/>',
    ],
    print: { x: 130, y: 115, w: 140, h: 190 },
    printCm: { w: 30, h: 40 },
  },
  sweatshirt: {
    body: 'M118,42 C140,58 170,64 200,64 C230,64 260,58 282,42 L342,64 L386,332 L345,342 L320,182 L320,432 L80,432 L80,182 L55,342 L14,332 L58,64 Z',
    details: [
      '<path d="M118,42 C140,58 170,64 200,64 C230,64 260,58 282,42 C264,84 238,96 200,96 C162,96 136,84 118,42 Z" fill="{dark}"/>',
      '<path d="M132,50 C152,80 174,86 200,86 C226,86 248,80 268,50" fill="none" stroke="{line}" stroke-width="2"/>',
      '<path d="M19,305 L59,317 L55,342 L14,332 Z M381,305 L341,317 L345,342 L386,332 Z" fill="{dark}"/>',
      '<rect x="80" y="404" width="240" height="28" fill="{dark}"/>',
    ],
    print: { x: 130, y: 120, w: 140, h: 190 },
    printCm: { w: 30, h: 40 },
  },
  hoodie: {
    body: 'M118,42 C140,58 170,64 200,64 C230,64 260,58 282,42 L342,64 L386,332 L345,342 L320,182 L320,432 L80,432 L80,182 L55,342 L14,332 L58,64 Z',
    back: '<path d="M122,72 C112,22 156,2 200,2 C244,2 288,22 278,72 Z" fill="{dark}"/>',
    details: [
      '<path d="M140,40 C150,18 176,10 200,10 C224,10 250,18 260,40 C254,88 232,104 200,104 C168,104 146,88 140,40 Z" fill="{fill}" stroke="{line}" stroke-width="1.5"/>',
      '<path d="M156,46 C166,30 182,24 200,24 C218,24 234,30 244,46 C236,78 222,90 200,90 C178,90 164,78 156,46 Z" fill="{dark}"/>',
      '<path d="M186,96 C185,116 184,130 182,148 M214,96 C215,116 216,130 218,148" fill="none" stroke="{line}" stroke-width="3" stroke-linecap="round"/>',
      '<path d="M19,305 L59,317 L55,342 L14,332 Z M381,305 L341,317 L345,342 L386,332 Z" fill="{dark}"/>',
      '<rect x="80" y="404" width="240" height="28" fill="{dark}"/>',
      '<path d="M132,322 L268,322 L290,398 L110,398 Z" fill="none" stroke="{line}" stroke-width="2"/>',
    ],
    print: { x: 135, y: 155, w: 130, h: 155 },
    printCm: { w: 28, h: 33 },
  },
  shopper: {
    body: 'M92,150 L308,150 L308,442 L92,442 Z',
    back: '<path d="M140,154 C138,40 262,40 260,154" fill="none" stroke="{line}" stroke-width="18" stroke-linecap="round"/><path d="M140,154 C138,40 262,40 260,154" fill="none" stroke="{fill}" stroke-width="13" stroke-linecap="round"/>',
    details: [
      '<path d="M92,166 L308,166" stroke="{line}" stroke-width="1.5" stroke-dasharray="4 3"/>',
    ],
    print: { x: 115, y: 190, w: 170, h: 220 },
    printCm: { w: 30, h: 38 },
  },
};

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

const PRODUCTS = [
  {
    id: 'tshirt',
    name: 'Футболка',
    desc: 'Хлопок 100%, 180 г/м²',
    price: 1490,
    colors: ['white', 'black', 'grey', 'navy', 'sky', 'red', 'green', 'sand', 'pink', 'mustard'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'hoodie',
    name: 'Худи',
    desc: 'Футер с начёсом, 320 г/м²',
    price: 3290,
    colors: ['white', 'black', 'grey', 'graphite', 'navy', 'burgundy', 'green', 'sand', 'lilac'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'longsleeve',
    name: 'Лонгслив',
    desc: 'Хлопок 100%, 200 г/м²',
    price: 1890,
    colors: ['white', 'black', 'grey', 'navy', 'olive', 'sand'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'sweatshirt',
    name: 'Свитшот',
    desc: 'Футер 3-нитка, 300 г/м²',
    price: 2690,
    colors: ['white', 'black', 'grey', 'graphite', 'navy', 'burgundy', 'olive', 'sand', 'pink', 'lilac'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'shopper',
    name: 'Шоппер',
    desc: 'Плотный хлопок, 38×42 см',
    price: 990,
    colors: ['natural', 'black', 'white', 'navy', 'green'],
    sizes: ['Один размер'],
  },
];

const SETTINGS = {
  currency: '₽',
  maxFileMb: 15,
  // Если у картинки на отпечатке меньше точек на дюйм — предупреждаем
  // клиента, что печать может получиться нечёткой
  minDpi: 150,
  // Оптовые скидки: от qty штук — percent %
  discounts: [
    { qty: 50, percent: 15 },
    { qty: 20, percent: 10 },
    { qty: 10, percent: 5 },
  ],
  // Адрес, куда отправлять заказ (POST JSON). Пусто — заказ только
  // сохраняется в браузере и показывается экран «Спасибо».
  orderEndpoint: '',
};

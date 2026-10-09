/*
 * БАЗА ДАННЫХ КОНСТРУКТОРА
 * ------------------------
 * Здесь хранится всё, что меняется без программирования:
 *   - COLORS   — палитра цветов, которые есть на складе;
 *   - PRODUCTS — изделия: название, цена, доступные цвета, размеры,
 *                фото и зона печати;
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
};

/*
 * Фото изделий лежат в img/products/ (их готовит tools/prepare_blanks.py).
 * Фото серое: сайт окрашивает его в выбранный цвет, сохраняя складки и швы.
 * Координаты — в системе 400×460 (так размечено превью).
 *
 * places — места нанесения (на груди, на спине, на рукаве). У каждого:
 *   print   — прямоугольник, внутри которого печатается картинка;
 *   printCm — реальный размер этой зоны на изделии в сантиметрах;
 *   img     — (необязательно) своё фото для этого места, например вид сзади.
 *             Пока его нет, показывается фото спереди.
 *
 * Как добавить фото спины:
 *   1. python3 tools/prepare_blanks.py "Футболка спина.png" tshirt_back
 *   2. в places.back нужного изделия допишите  img: 'img/products/tshirt_back.png',
 *   3. поправьте print под новое фото (пунктир на шаге «Картинка»).
 */
const PLACEMENTS = [
  { id: 'chest',  name: 'На груди' },
  { id: 'back',   name: 'На спине' },
  { id: 'sleeve', name: 'На рукаве' },
];

const SHAPES = {
  tshirt: {
    img: 'img/products/tshirt.png',
    thumb: 'img/products/tshirt-thumb.jpg',
    places: {
      chest:  { print: { x: 125, y: 105, w: 150, h: 200 }, printCm: { w: 30, h: 40 } },
      back:   { print: { x: 125, y: 105, w: 150, h: 200 }, printCm: { w: 30, h: 40 } },
      sleeve: { print: { x: 50, y: 150, w: 36, h: 45 }, printCm: { w: 8, h: 10 } },
    },
  },
  hoodie: {
    img: 'img/products/hoodie.png',
    thumb: 'img/products/hoodie-thumb.jpg',
    places: {
      chest:  { print: { x: 125, y: 135, w: 150, h: 180 }, printCm: { w: 28, h: 34 } },
      back:   { print: { x: 120, y: 120, w: 160, h: 200 }, printCm: { w: 32, h: 40 } },
      sleeve: { print: { x: 68, y: 160, w: 36, h: 45 }, printCm: { w: 8, h: 10 } },
    },
  },
  sweatshirt: {
    img: 'img/products/sweatshirt.png',
    thumb: 'img/products/sweatshirt-thumb.jpg',
    places: {
      chest:  { print: { x: 125, y: 115, w: 150, h: 200 }, printCm: { w: 30, h: 40 } },
      back:   { print: { x: 125, y: 115, w: 150, h: 200 }, printCm: { w: 30, h: 40 } },
      sleeve: { print: { x: 70, y: 160, w: 34, h: 43 }, printCm: { w: 8, h: 10 } },
    },
  },
  polo: {
    img: 'img/products/polo.png',
    thumb: 'img/products/polo-thumb.jpg',
    places: {
      chest:  { print: { x: 120, y: 175, w: 160, h: 170 }, printCm: { w: 28, h: 30 } },
      back:   { print: { x: 120, y: 120, w: 160, h: 200 }, printCm: { w: 30, h: 38 } },
      sleeve: { print: { x: 47, y: 163, w: 34, h: 42 }, printCm: { w: 8, h: 10 } },
    },
  },
};

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

const PRODUCTS = [
  {
    id: 'tshirt',
    name: 'Футболка Regular',
    desc: 'Хлопок 100%, 180 г/м²',
    price: 1490,
    colors: ['white', 'black', 'grey', 'navy', 'sky', 'red', 'green', 'sand', 'pink', 'mustard'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'hoodie',
    name: 'Худи Free Fit',
    desc: 'Футер с начёсом, 320 г/м²',
    price: 3290,
    colors: ['white', 'black', 'grey', 'graphite', 'navy', 'burgundy', 'green', 'sand', 'lilac'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'sweatshirt',
    name: 'Свитшот Classic',
    desc: 'Футер 3-нитка, 300 г/м²',
    price: 2690,
    colors: ['white', 'black', 'grey', 'graphite', 'navy', 'burgundy', 'olive', 'sand', 'pink', 'lilac'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'polo',
    name: 'Поло Regular',
    desc: 'Пике, хлопок 100%, 200 г/м²',
    price: 2190,
    colors: ['white', 'black', 'grey', 'navy', 'sky', 'red', 'green', 'sand'],
    sizes: APPAREL_SIZES,
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

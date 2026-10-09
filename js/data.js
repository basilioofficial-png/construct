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

// hex-коды подобраны на глаз по названию цвета — сверьте с образцами ткани
const COLORS = {
  white:        { name: 'Белый',                 hex: '#FFFFFF' },
  butter:       { name: 'Сливочное масло',       hex: '#F3E5AB' },
  lemon:        { name: 'Лимонный',              hex: '#F4EC7A' },
  yellow:       { name: 'Ярко-жёлтый',           hex: '#FFD400' },
  beige:        { name: 'Бежевый',               hex: '#D9C4A3' },
  burgundy:     { name: 'Бордовый',              hex: '#6D1F2F' },
  greyBlue:     { name: 'Серо-голубой',          hex: '#8FA3B5' },
  eggplant:     { name: 'Баклажан',              hex: '#4B2C43' },
  fume:         { name: 'Фюме',                  hex: '#77706B' },
  black:        { name: 'Чёрный',                hex: '#1C1C1E' },
  red:          { name: 'Красный',               hex: '#C8102E' },
  olive:        { name: 'Оливка',                hex: '#6B6B3A' },
  mocha:        { name: 'Мокко',                 hex: '#7B5B47' },
  lavender:     { name: 'Лаванда',               hex: '#B9A7D6' },
  khaki:        { name: 'Хаки',                  hex: '#7D7550' },
  grey:         { name: 'Серый',                 hex: '#8A8C8F' },
  lightMelange: { name: 'Светло-серый меланж',   hex: '#C9CBCD' },
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

// Зоны печати для фото, которые уже есть (см. img/products/)
const PLACES_TSHIRT = {
  chest:  { print: { x: 125, y: 105, w: 150, h: 200 }, printCm: { w: 30, h: 40 } },
  back:   { print: { x: 125, y: 105, w: 150, h: 200 }, printCm: { w: 30, h: 40 } },
  sleeve: { print: { x: 50, y: 150, w: 36, h: 45 }, printCm: { w: 8, h: 10 } },
};
const PLACES_SWEATSHIRT = {
  chest:  { print: { x: 125, y: 115, w: 150, h: 200 }, printCm: { w: 30, h: 40 } },
  back:   { print: { x: 125, y: 115, w: 150, h: 200 }, printCm: { w: 30, h: 40 } },
  sleeve: { print: { x: 70, y: 160, w: 34, h: 43 }, printCm: { w: 8, h: 10 } },
};
const PLACES_HOODIE = {
  chest:  { print: { x: 125, y: 135, w: 150, h: 180 }, printCm: { w: 28, h: 34 } },
  back:   { print: { x: 120, y: 120, w: 160, h: 200 }, printCm: { w: 32, h: 40 } },
  sleeve: { print: { x: 68, y: 160, w: 36, h: 45 }, printCm: { w: 8, h: 10 } },
};

const TSHIRT_IMG     = { img: 'img/products/tshirt.png',     thumb: 'img/products/tshirt-thumb.jpg' };
const SWEATSHIRT_IMG = { img: 'img/products/sweatshirt.png', thumb: 'img/products/sweatshirt-thumb.jpg' };
const HOODIE_IMG     = { img: 'img/products/hoodie.png',     thumb: 'img/products/hoodie-thumb.jpg' };

/*
 * Фото и зоны печати каждого изделия (ключ — id изделия из PRODUCTS).
 * Пока у лонгсливов стоит фото свитшота, у зип-худи — фото худи,
 * у оверсайз-футболки — фото обычной. Чтобы поставить своё фото:
 *   python3 tools/prepare_blanks.py "Лонгслив.png" longsleeve_regular
 * и замените строку на
 *   longsleeve_regular: { img: 'img/products/longsleeve_regular.png',
 *                         thumb: 'img/products/longsleeve_regular-thumb.jpg', places: ... },
 */
const SHAPES = {
  tshirt_regular:      { ...TSHIRT_IMG,     places: PLACES_TSHIRT },
  tshirt_oversize:     { ...TSHIRT_IMG,     places: PLACES_TSHIRT },
  longsleeve_regular:  { ...SWEATSHIRT_IMG, places: PLACES_SWEATSHIRT },
  longsleeve_freefit:  { ...SWEATSHIRT_IMG, places: PLACES_SWEATSHIRT },
  longsleeve_oversize: { ...SWEATSHIRT_IMG, places: PLACES_SWEATSHIRT },
  sweatshirt_regular:  { ...SWEATSHIRT_IMG, places: PLACES_SWEATSHIRT },
  hoodie_7030:         { ...HOODIE_IMG,     places: PLACES_HOODIE },
  hoodie_cotton:       { ...HOODIE_IMG,     places: PLACES_HOODIE },
  hoodie_8020:         { ...HOODIE_IMG,     places: PLACES_HOODIE },
  // на груди у зип-худи молния, поэтому печать — небольшая, слева на груди
  ziphoodie:           { ...HOODIE_IMG,     places: {
    ...PLACES_HOODIE,
    chest: { print: { x: 215, y: 150, w: 50, h: 50 }, printCm: { w: 10, h: 10 } },
  } },
};

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

const PRODUCTS = [
  {
    id: 'tshirt_regular',
    name: 'Футболка Regular',
    desc: 'Кулирка, 92% хлопок / 8% лайкра',
    price: 1200,
    colors: ['white', 'butter', 'lemon', 'yellow', 'beige', 'burgundy', 'greyBlue', 'eggplant', 'fume', 'black'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'tshirt_oversize',
    name: 'Футболка Oversize',
    desc: '100% хлопок',
    price: 2000,
    colors: ['white', 'red', 'olive', 'mocha', 'black'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'longsleeve_regular',
    name: 'Лонгслив Regular',
    desc: '100% хлопок',
    price: 2800,
    colors: ['black', 'white'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'longsleeve_freefit',
    name: 'Лонгслив Free Fit',
    desc: '100% хлопок',
    price: 2800,
    colors: ['greyBlue', 'white'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'longsleeve_oversize',
    name: 'Лонгслив Oversize',
    desc: 'Состав 95/5',
    price: 2800,
    colors: ['lavender'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'sweatshirt_regular',
    name: 'Свитшот Regular',
    desc: 'Состав 70/30',
    price: 2800,
    colors: ['white', 'black'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'hoodie_7030',
    name: 'Худи Regular 70/30',
    desc: 'Футер 3-нитка, 70/30',
    price: 3700,
    colors: ['black', 'white', 'khaki', 'greyBlue'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'hoodie_cotton',
    name: 'Худи Regular 100% хлопок',
    desc: '100% хлопок',
    price: 3700,
    colors: ['grey', 'white', 'black'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'hoodie_8020',
    name: 'Худи Regular 80/20',
    desc: 'Состав 80/20',
    price: 3700,
    colors: ['lightMelange', 'grey', 'black'],
    sizes: APPAREL_SIZES,
  },
  {
    id: 'ziphoodie',
    name: 'Зип-худи на молнии',
    desc: 'Состав 70/30',
    price: 4700,
    colors: ['black', 'grey'],
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

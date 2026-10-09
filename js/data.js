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
 * Как поменять фото:
 *   1. python3 tools/prepare_blanks.py "Футболка спина.png" tshirt_regular_back
 *   2. пропишите путь в img нужного изделия или места (ниже, в SHAPE_…);
 *   3. поправьте print под новое фото (пунктир на шаге «Картинка»).
 */
const PLACEMENTS = [
  { id: 'chest',  name: 'На груди' },
  { id: 'back',   name: 'На спине' },
  { id: 'sleeve', name: 'На рукаве' },
];

// Фото: перед (img) и спина (places.back.img). Рукав печатается на виде спереди.
// Верх зоны на груди и спине — на 2 см ниже нижнего края ворота (≈10 единиц координат).
const IMG = (name) => `img/products/${name}.png`;
const THUMB = (name) => `img/products/${name}-thumb.jpg`;

const SHAPE_TSHIRT_REGULAR = {
  img: IMG('tshirt_regular'), thumb: THUMB('tshirt_regular'),
  places: {
    chest:  { print: { x: 125, y: 112, w: 150, h: 200 }, printCm: { w: 30, h: 40 } },
    back:   { img: IMG('tshirt_regular_back'), print: { x: 125, y: 90, w: 150, h: 200 }, printCm: { w: 30, h: 40 } },
    sleeve: { print: { x: 52, y: 140, w: 34, h: 43 }, printCm: { w: 8, h: 10 } },
  },
};
const SHAPE_TSHIRT_OVERSIZE = {
  img: IMG('tshirt_oversize'), thumb: THUMB('tshirt_oversize'),
  places: {
    chest:  { print: { x: 125, y: 126, w: 150, h: 200 }, printCm: { w: 30, h: 40 } },
    back:   { img: IMG('tshirt_oversize_back'), print: { x: 125, y: 82, w: 150, h: 200 }, printCm: { w: 30, h: 40 } },
    sleeve: { print: { x: 55, y: 150, w: 34, h: 43 }, printCm: { w: 8, h: 10 } },
  },
};
const SHAPE_LONGSLEEVE = {
  img: IMG('longsleeve'), thumb: THUMB('longsleeve'),
  places: {
    chest:  { print: { x: 130, y: 107, w: 140, h: 190 }, printCm: { w: 28, h: 38 } },
    back:   { img: IMG('longsleeve_back'), print: { x: 130, y: 84, w: 140, h: 190 }, printCm: { w: 28, h: 38 } },
    sleeve: { print: { x: 84, y: 125, w: 22, h: 44 }, printCm: { w: 6, h: 12 } },
  },
};
const SHAPE_SWEATSHIRT = {
  img: IMG('sweatshirt'), thumb: THUMB('sweatshirt'),
  places: {
    chest:  { print: { x: 125, y: 121, w: 150, h: 200 }, printCm: { w: 30, h: 40 } },
    back:   { img: IMG('sweatshirt_back'), print: { x: 125, y: 92, w: 150, h: 200 }, printCm: { w: 30, h: 40 } },
    sleeve: { print: { x: 70, y: 160, w: 34, h: 43 }, printCm: { w: 8, h: 10 } },
  },
};
const SHAPE_HOODIE = {
  img: IMG('hoodie'), thumb: THUMB('hoodie'),
  places: {
    // между капюшоном и карманом-кенгуру
    chest:  { print: { x: 130, y: 143, w: 140, h: 92 }, printCm: { w: 28, h: 18 } },
    back:   { img: IMG('hoodie_back'), print: { x: 120, y: 170, w: 160, h: 180 }, printCm: { w: 32, h: 36 } },
    sleeve: { print: { x: 80, y: 165, w: 28, h: 35 }, printCm: { w: 8, h: 10 } },
  },
};
const SHAPE_ZIPHOODIE = {
  img: IMG('ziphoodie'), thumb: THUMB('ziphoodie'),
  places: {
    // на груди молния, поэтому печать небольшая — слева на груди
    chest:  { print: { x: 218, y: 145, w: 50, h: 50 }, printCm: { w: 10, h: 10 } },
    back:   SHAPE_HOODIE.places.back,
    sleeve: { print: { x: 80, y: 165, w: 28, h: 35 }, printCm: { w: 8, h: 10 } },
  },
};

/*
 * Какое фото у какого изделия (ключ — id изделия из PRODUCTS).
 * Отдельных фото нет у лонгслива Free Fit и Oversize (стоит Regular)
 * и у худи 100% хлопок и 80/20 (стоит худи 70/30).
 * Новое фото готовится так:  python3 tools/prepare_blanks.py "Фото.png" имя
 */
const SHAPES = {
  tshirt_regular:      SHAPE_TSHIRT_REGULAR,
  tshirt_oversize:     SHAPE_TSHIRT_OVERSIZE,
  longsleeve_regular:  SHAPE_LONGSLEEVE,
  longsleeve_freefit:  SHAPE_LONGSLEEVE,
  longsleeve_oversize: SHAPE_LONGSLEEVE,
  sweatshirt_regular:  SHAPE_SWEATSHIRT,
  hoodie_7030:         SHAPE_HOODIE,
  hoodie_cotton:       SHAPE_HOODIE,
  hoodie_8020:         SHAPE_HOODIE,
  ziphoodie:           SHAPE_ZIPHOODIE,
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
  // Прайс DTF-печати: цена за один принт вместе с прижимом.
  // tiers — от скольких штук действует цена; prices — цены по этим ступеням.
  // Формат выбирается автоматически: самый маленький, в который влезает картинка.
  dtf: {
    tiers: [1, 10, 20, 35, 50, 80, 100],
    formats: [
      { name: 'Mini', w: 8,  h: 8,  prices: [400, 300, 250, 200, 180, 160, 150] },
      { name: 'A6',   w: 10, h: 15, prices: [450, 350, 300, 270, 250, 230, 200] },
      { name: 'A5',   w: 15, h: 20, prices: [550, 450, 400, 350, 320, 290, 260] },
      { name: 'A4',   w: 20, h: 30, prices: [700, 620, 550, 500, 420, 400, 380] },
      { name: 'A3',   w: 30, h: 42, prices: [850, 800, 750, 720, 690, 660, 600] },
      { name: 'A3+',  w: 40, h: 45, prices: [1050, 1000, 900, 860, 830, 800, 750] },
    ],
    // персонализированная печать (разные имена/номера на каждом изделии)
    personalCoef: 1.5,
  },
  // Адрес, куда отправлять заказ (POST JSON). Пусто — заказ только
  // сохраняется в браузере и показывается экран «Спасибо».
  orderEndpoint: '',
};

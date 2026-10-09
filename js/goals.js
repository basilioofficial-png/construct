/*
 * ЦЕЛИ ЯНДЕКС МЕТРИКИ
 * -------------------
 * goal('имя') отправляет в Метрику событие «цель». Чтобы цели появились
 * в отчётах, их нужно один раз создать в интерфейсе Метрики:
 * Настройки → Цели → Добавить цель → «JavaScript-событие»,
 * идентификатор — имя цели из списка в README.md.
 *
 * Если Метрика не загрузилась (блокировщик рекламы, нет сети),
 * функция просто ничего не делает — сайт работает как обычно.
 */
const METRIKA_ID = 86217584;

function goal(name, params) {
  try {
    if (typeof ym === 'function') ym(METRIKA_ID, 'reachGoal', name, params);
  } catch (e) { /* аналитика не должна ломать сайт */ }
}

// Клики по ссылкам: определяем цель по адресу ссылки
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (href.includes('t.me/')) goal('telegram_click');
  else if (href.startsWith('tel:')) goal('phone_click');
  else if (href.startsWith('mailto:')) goal('email_click');
  else if (href.includes('constructor.html')) goal('constructor_click');
  else if (href.includes('pnhd.ru')) goal('wholesale_click');
  else if (href.includes('teamatika.com')) goal('gifts_click');
}, true);

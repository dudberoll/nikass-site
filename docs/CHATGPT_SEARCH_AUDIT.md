# Аудит nikass.ru для ChatGPT Search

23 ноября 2026 года. На публичном сайте проверены 59 URL из sitemap, 19 карточек, 53 ссылки на SKU и 40 основных товарных изображений. В 34 ссылках на SKU исходный HTML показывал другой вариант. После исправления локальная сборка на публичных данных каталога отдала правильный вариант по всем 53 адресам. Изменения подготовлены в рабочей копии и ожидают публикации.

## Доступ робота, sitemap и индексация

| URL | Что показала проверка nikass.ru | Исправление и повторная проверка |
| --- | --- | --- |
| [robots.txt](https://nikass.ru/robots.txt) | HTTP 200, общая группа разрешала обход, ссылка на sitemap корректна. | Добавлена явная группа `OAI-SearchBot` с `Allow: /`. Локальный файл проверен. |
| [sitemap.xml](https://nikass.ru/sitemap.xml) | 59 уникальных URL. У всех HTTP 200, canonical совпадает с URL, есть title и description, `noindex` отсутствует. | В sitemap остаются канонические адреса. Локальная сборка прошла те же проверки по всем 59 URL. |
| [Каталог](https://nikass.ru/catalog) и 8 страниц категорий | Все 19 товарных карточек обнаруживаются по обычным ссылкам из исходного HTML. | На групповых карточках выбор вариантов стал ссылками. Локально все 53 адреса SKU обнаруживаются в HTML. |
| [Главная](https://nikass.ru/) | `Organization` уже присутствовала. | Добавлены стабильный идентификатор и публичные контакты. Наличие JSON-LD и файла логотипа подтверждено в сборке. |
| [Корзина](https://nikass.ru/cart), [оформление](https://nikass.ru/checkout), [редактор](https://nikass.ru/catalog-editor) и демо-страницы | HTTP 200 и `noindex,follow`. В sitemap отсутствуют. | Исключение из индексации подтверждено на действующем сайте. |
| [HTTP](http://nikass.ru/catalog), [www](https://www.nikass.ru/catalog), [несуществующий товар](https://nikass.ru/catalog/seo-invalid-page-404) | HTTP и www возвращают 301 на HTTPS-адрес без www. Несуществующий товар возвращает 404. | Публичные ответы проверены напрямую. |

DNS указывает непосредственно на VPS Beget. В доступной конфигурации Nginx для публичного домена правил фильтрации по IP или блокировки краулера не найдено. Запросы с User-Agent `OAI-SearchBot` получили 200 с проверочного IP. [Официальный список OpenAI](https://openai.com/searchbot.json) содержит 39 диапазонов. Для подтверждения реального обхода нужны записи access log с IP из этого списка и соответствующими HTTP-статусами. Журнал Nginx и правила сетевой фильтрации Beget недоступны текущему пользователю. [Требования OpenAI к доступу краулера](https://developers.openai.com/api/docs/bots).

Публичный поиск вернул 10 из 19 точных канонических товарных URL, а по NS-93 — ссылку с параметром `variant`. В таблице отмечены наблюдаемые результаты поиска. Полный статус индексации по каждому URL и обход именно OAI-SearchBot остаются неподтверждёнными.

## Карточки товаров

У всех 19 карточек публичные canonical, title, description и `BreadcrumbList` корректно читаются. У групп существовал `ProductGroup` с дочерними `Product`, но ссылки в JSON-LD открывали нужный вариант только после запуска JavaScript. В сборке каждый сгруппированный SKU получил путь `/catalog/<slug>/sku-<SKU>`. Общая карточка остаётся canonical. Например, путь NS-31-300 — `/catalog/portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-2/sku-NS-31-300`. Старый `?variant=NS-31-300` по-прежнему выбирает вариант в браузере после запуска JavaScript.

На повторной проверке 53 из 53 адресов отдали HTTP 200 и правильный SKU, характеристики, цену или статус «Цена уточняется», наличие и фото в HTML. Цена и наличие совпали с публичными данными каталога и API наличия. Основное изображение, `og:image` и изображение `Product` совпали для каждого SKU. У всех 40 уникальных основных фото HTTP 200 и MIME-тип изображения на действующем сайте и в сборке. В JSON-LD добавлены характеристики и комплектация там, где каталог её содержит. Проверено 25 предложений `Offer` с публичной ценой в RUB. Для 28 SKU без публичной цены сохранён статус предзаказа, `Offer` отсутствует.

В таблице «Неверные SKU до правки» означает, что публичный URL с `?variant=…` показывал первый вариант в исходном HTML. «Локально» — число проверенных адресов после исправления. Символ «—» в колонке комплектации означает, что источник содержит комплектацию по всем SKU строки.

| Канонический URL | Неверные SKU до правки | Исправление | Локально | SKU без комплектации в WooCommerce | Наблюдение в поиске |
| --- | --- | --- | --- | --- | --- |
| [Автомобильный инвертор — чистая синусоида](https://nikass.ru/catalog/invertor-avtomobilnyy-800) | WJF-1300GST, WJF-1800GST, WJF-2500GST, WJF-3000GST, WJF-3500GST | Прямые ссылки и JSON-LD, номинальная мощность в названии варианта | 6/6 | WJF-800GST, WJF-1300GST, WJF-1800GST, WJF-2500GST, WJF-3000GST, WJF-3500GST | Найден canonical |
| [Автомобильный инвертор — модифицированная синусоида](https://nikass.ru/catalog/invertor-avtomobilnyy-600) | WJF-1200MX, WJF-1600MX, WJF-2300MX | Прямые ссылки и JSON-LD, номинальная мощность в названии варианта | 4/4 | WJF-600MX, WJF-1200MX, WJF-1600MX, WJF-2300MX | Найден canonical |
| [Портативная солнечная панель](https://nikass.ru/catalog/portativnaya-solnechnaya-panel-30w-18-v) | SP-50, SP-100, SP-450 | Прямые ссылки и JSON-LD | 4/4 | SP-30, SP-50, SP-100, SP-450 | Найден canonical |
| [Гибкая солнечная панель](https://nikass.ru/catalog/gibkaya-solnechnaya-panel-30w-18v) | FSP-50, FSP-100, FSP-210 | Прямые ссылки и JSON-LD | 4/4 | FSP-30, FSP-50, FSP-100, FSP-210 | Найден canonical |
| [Система хранения энергии ESS](https://nikass.ru/catalog/sistema-hraneniya-energii-ess-10-240-vt-ch-6-2-kvt) | YG5-6.2, YG10-6.2 | Прямые ссылки и JSON-LD | 3/3 | — | Найден canonical |
| [Источники бесперебойного питания UPS](https://nikass.ru/catalog/sistema-hraneniya-energii-ess-1-280-vt-ch-600-vt) | YG2.5-1200 | Прямые ссылки и JSON-LD | 2/2 | — | Найден canonical |
| [Портативная зарядная станция NS-69](https://nikass.ru/catalog/portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah) | NS-69-300, NS-69-500 | Прямые ссылки и JSON-LD | 3/3 | — | Точный URL не встретился |
| [Портативная зарядная станция NS-63](https://nikass.ru/catalog/portativnaya-elektrostantsiya-168000-mah-600w) | NS-63-800 | Прямые ссылки и JSON-LD | 2/2 | — | Точный URL не встретился |
| [Портативная зарядная станция NS-93](https://nikass.ru/catalog/portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-153-6wh) | NS-93-300, NS-93-500 | Прямые ссылки и JSON-LD | 3/3 | — | Найден `?variant=NS-93-500` |
| [Источник бесперебойного питания 320000 mAh 1000W](https://nikass.ru/catalog/portativnaya-elektrostantsiya-320000-mah-1000w-1024wh) | — | Канонический URL в JSON-LD | 1/1 | — | Точный URL не встретился |
| [Портативная зарядная станция NS-31](https://nikass.ru/catalog/portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-2) | NS-31-300 | Прямые ссылки и JSON-LD | 2/2 | — | Точный URL не встретился |
| [Портативная электростанция 560000 mAh 2000W 1792Wh](https://nikass.ru/catalog/portativnaya-elektrostantsiya-560000-mah-2000w-1792wh) | — | Канонический URL в JSON-LD | 1/1 | — | Найден canonical |
| [POWERBANK](https://nikass.ru/catalog/vneshniy-akkumulyator-20000-mah-s-bystroy-zaryadkoy) | PB-50, PB-60 | Прямые ссылки и JSON-LD | 3/3 | PB-20, PB-50, PB-60 | Найден canonical |
| [AGM аккумулятор 12 В](https://nikass.ru/catalog/svintsovo-kislotnyy-germetichnyy-akkumulyator-65ah-12v) | AGM7012, AGM9012, AGM10012, AGM20012 | Прямые ссылки и JSON-LD | 5/5 | — | Точный URL не встретился |
| [Портативная зарядная станция NS-54 с радио и Bluetooth 150 Вт 153.6 Вт·ч](https://nikass.ru/catalog/portativnaya-zaryadnaya-stantsiya-sl-54-s-radio-i-bluetooth-150-vt-153-6-vt-ch) | — | Канонический URL в JSON-LD | 1/1 | — | Точный URL не встретился |
| [Гибридный инвертор ИБП](https://nikass.ru/catalog/avtonomnyy-gibridnyy-invertor-ibp-1-2-kvt) | NS/APS3600-24, NS/APS6500-48, NS/APS12000-48EMI | Прямые ссылки и JSON-LD | 4/4 | NS/APS1200-12, NS/APS3600-24, NS/APS6500-48, NS/APS12000-48EMI | Найден canonical |
| [Литий-железо-фосфатный аккумулятор NSW 51.2 В 100 А·ч](https://nikass.ru/catalog/litiy-zhelezo-fosfatnyy-akkumulyator-nsw-51-2-v-100-a-ch) | — | Канонический URL в JSON-LD | 1/1 | NSW51-100 | Точный URL не встретился |
| [LiFePO4 аккумулятор NSR 51,2 В](https://nikass.ru/catalog/litiy-zhelezo-fosfatnyy-akkumulyator-nsr-51-2-v-100-a-ch) | NSR51-200 | Прямые ссылки и JSON-LD | 2/2 | NSR51-100, NSR51-200 | Найден canonical |
| [LiFePO4 аккумулятор NSLFP 12,8 В](https://nikass.ru/catalog/litiy-zhelezo-fosfatnyy-akkumulyator-nslfp-12-8-v-100-a-ch) | NSLFP12-200 | Прямые ссылки и JSON-LD | 2/2 | — | Точный URL не встретился |

У автомобильных инверторов подпись варианта брала пиковую мощность из текста. Теперь она берёт явно указанную номинальную выходную мощность из характеристики SKU. Например, у [WJF-800GST](https://nikass.ru/catalog/invertor-avtomobilnyy-800?variant=WJF-800GST) это 800 Вт, при этом 1 600 Вт остаётся в таблице как пиковая мощность.

Для 25 SKU с заполненной комплектацией сведения доступны в HTML и JSON-LD. Для остальных 28 SKU в HTML остаётся «Комплектация пока не указана», в JSON-LD комплектация отсутствует. Для заполнения нужны подтверждённые данные в WooCommerce.

## Проверки перед выпуском

- Локальная статическая сборка на публичном снимке каталога завершилась успешно после повторной загрузки оригиналов через curl. При обычной загрузке с проверочной машины несколько запросов Node к оригиналам WordPress завершились таймаутом соединения.
- Автоматическая сверка HTML, ссылок, JSON-LD, статусов и изображений прошла по всем 53 SKU. Формат `ProductGroup` проверен по [Schema.org](https://schema.org/ProductGroup) и [документации разметки вариантов](https://developers.google.com/search/docs/appearance/structured-data/product-variants).
- 10 проверок Playwright прошли на компьютере и телефоне. Проверены переход по ссылке SKU без JavaScript, смена варианта с JavaScript, история браузера, фото, корзина и оформление через менеджера.
- `astro check` прошёл без ошибок. В тестах витрины 55 проверок прошли. Один прежний тест кнопки «Подобрать решение» ожидает текст непосредственно в ссылке, хотя текст уже на исходной ветке находится внутри `span`.
- После публикации повторить HTTP-проверку `robots.txt` и новых URL SKU на основном домене, затем подтвердить ответы настоящему OAI-SearchBot по серверному журналу. Для оценки индексации всех URL нужны данные панелей вебмастера.

import { useEffect, useMemo, useState } from "react";

import { ALL_PRODUCTS_LABEL, DISCOUNTED_PRODUCTS_LABEL, DISCOUNTED_PRODUCTS_PATH, HERO_CATEGORIES, type Product } from "../data/catalog";
import ProductCard from "./ProductCard";

type CatalogCategory = (typeof HERO_CATEGORIES)[number];

const CATEGORY_GUIDES: Record<CatalogCategory["category"], Array<{ title: string; text: string }>> = {
  "Портативные зарядные станции": [
    { title: "Мощность", text: "Сложите мощность приборов, которые будут работать одновременно." },
    { title: "Запас энергии", text: "Чем дольше нужно питание, тем больше нужна ёмкость станции в Вт·ч." },
    { title: "Разъёмы", text: "Проверьте, подходят ли выходы станции вашим устройствам." },
    { title: "Зарядка", text: "Если нужна зарядка от панели или автомобиля, проверьте поддержку и параметры входа." },
  ],
  "AGM аккумуляторы": [
    { title: "Напряжение", text: "Оно должно совпадать с инвертором или другой подключённой системой." },
    { title: "Ёмкость", text: "Чем больше ёмкость в А·ч, тем дольше аккумулятор сможет питать нагрузку." },
    { title: "Ток разряда", text: "Сверьте допустимый ток аккумулятора с потребностями инвертора." },
    { title: "Зарядка", text: "Используйте зарядное устройство с режимом AGM и настройками производителя." },
  ],
  "LiFePO₄ аккумуляторы": [
    { title: "Совместимость", text: "Сверьте напряжение и тип батареи с инвертором." },
    { title: "Ёмкость и ток", text: "Ёмкость задаёт запас энергии, а токи заряда и разряда — допустимую нагрузку." },
    { title: "BMS", text: "Проверьте, что система защиты батареи рассчитана на ток вашей системы." },
    { title: "Подключение", text: "Добавляйте батареи только способом, разрешённым производителем." },
  ],
  "Инверторы напряжения": [
    { title: "Напряжение", text: "Выберите вход 12 или 24 В под аккумулятор и бортовую сеть автомобиля." },
    { title: "Мощность", text: "Сравните постоянную мощность с нагрузкой и оставьте запас для запуска приборов." },
    { title: "Форма сигнала", text: "Для чувствительной техники и электродвигателей проверьте требования к синусоиде." },
    { title: "Подключение", text: "Для мощной модели заранее проверьте способ подключения и ограничения автомобиля." },
  ],
  "Гибридные инверторы": [
    { title: "Мощность и фазы", text: "Подберите мощность и число фаз под сеть и приборы, которые будут работать вместе." },
    { title: "Солнечные панели", text: "Сверьте допустимые напряжение и ток панелей с параметрами солнечных входов." },
    { title: "Аккумулятор", text: "Совместимость зависит от напряжения, типа батареи и поддерживаемых настроек." },
    { title: "Резерв", text: "Проверьте, какие приборы инвертор сможет питать при отключении сети." },
  ],
  "Системы хранения энергии": [
    { title: "Запас энергии", text: "Ёмкость в кВт·ч выбирают по расходу и нужному времени автономной работы." },
    { title: "Мощность", text: "Проверьте, какие приборы смогут работать одновременно." },
    { title: "Комплект", text: "Уточните, входят ли в систему инвертор, батарея и соединительные кабели." },
    { title: "Расширение", text: "Если планируете увеличить запас энергии, проверьте совместимость дополнительных батарей." },
  ],
  "Солнечные панели": [
    { title: "Мощность", text: "Выработка зависит от солнца, угла установки и затенения." },
    { title: "Совместимость", text: "Сверьте напряжение и ток панели с входом станции, инвертора или контроллера." },
    { title: "Формат", text: "Складную панель удобно брать с собой, жёсткую — устанавливать стационарно." },
    { title: "Подключение", text: "Перед покупкой проверьте разъёмы и необходимость отдельного контроллера." },
  ],
  POWERBANK: [
    { title: "Ёмкость", text: "Больший запас даст больше зарядок; фактическое число зависит от устройства." },
    { title: "Мощность", text: "Для быстрой зарядки телефона или ноутбука проверьте поддерживаемые ватты." },
    { title: "Разъёмы", text: "Убедитесь, что есть нужные порты и кабели, особенно для нескольких устройств." },
    { title: "Размер", text: "Сравните ёмкость с весом и габаритами, которые удобно носить с собой." },
  ],
};

export default function CatalogExplorer({ products, categories, discounted = false }: { products: Product[]; categories: ReadonlyArray<CatalogCategory>; discounted?: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("default");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get("q") ?? "");
    const requestedCategory = params.get("category") ?? "";
    const requested = categories.find((item) => item.title === requestedCategory || item.label === requestedCategory || item.category === requestedCategory
      || (item.category === "Инверторы напряжения" && ["Инвертора напряжения", "ИНВЕРТОРА НАПРЯЖЕНИЯ", "Инвертор напряжения", "Автомобильные инверторы", "АВТОМОБИЛЬНЫЕ ИНВЕРТОРЫ"].includes(requestedCategory))
      || (item.category === "Системы хранения энергии" && ["Системы хранения энергии ESS", "СИСТЕМЫ ХРАНЕНИЯ ЭНЕРГИИ ESS"].includes(requestedCategory))
      || (item.category === "LiFePO₄ аккумуляторы" && requestedCategory === "LiFePO4 аккумуляторы"));
    setCategory(discounted ? "" : requested?.title ?? "");
  }, [categories, products, discounted]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru-RU");
    const selectedCategory = categories.find((item) => item.title === category);
    return products.filter((product) => (!selectedCategory || product.category === selectedCategory.category)
      && (!normalized || [product.name, product.sku, product.category, product.characteristics].join(" ").toLocaleLowerCase("ru-RU").includes(normalized)))
      .sort((left, right) => sort === "price-asc" ? left.price - right.price
        : sort === "price-desc" ? right.price - left.price
      : sort === "name" ? left.name.localeCompare(right.name, "ru-RU") : products.indexOf(left) - products.indexOf(right));
  }, [categories, category, products, query, sort]);
  const searchSuggestions = [...new Set(products.flatMap(({ name, sku, category }) => [name, sku, category]))];
  const selectedCategory = categories.find((item) => item.title === category);
  const guide = selectedCategory ? CATEGORY_GUIDES[selectedCategory.category] : undefined;

  return <div data-catalog-hydrated={hydrated}>
    {!discounted && <nav className="catalog-category-buttons" aria-label="Категории товаров">
      <button className={category === "" ? "is-active" : ""} type="button" aria-pressed={category === ""} onClick={() => setCategory("")}>{ALL_PRODUCTS_LABEL}</button>
      {categories.map((item) => <button className={category === item.title ? "is-active" : ""} type="button" aria-pressed={category === item.title} onClick={() => setCategory(category === item.title ? "" : item.title)} key={item.title}>{item.label}</button>)}
      <a href={DISCOUNTED_PRODUCTS_PATH}>{DISCOUNTED_PRODUCTS_LABEL}</a>
    </nav>}
    <section className="catalog-toolbar" aria-label="Фильтры каталога">
      <label className="catalog-search"><input type="search" aria-label="Поиск по каталогу" list="catalog-search-suggestions" placeholder="Поиск" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <datalist id="catalog-search-suggestions">{searchSuggestions.map((suggestion) => <option value={suggestion} key={suggestion} />)}</datalist>
      <label><select aria-label="Сортировка товаров" value={sort} onChange={(event) => setSort(event.target.value)}><option value="default">Хиты продаж</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="name">По названию</option></select></label>
    </section>
    <section className="store-product-grid" aria-label="Товары">
      {visible.map((product) => {
        return <ProductCard product={product} key={product.slug} />;
      })}
    </section>
    {visible.length === 0 && <p className="catalog-no-results">{discounted && products.length === 0 ? "Уценённых товаров пока нет. Новые предложения появятся здесь." : "По вашему запросу ничего не найдено."}</p>}
    {guide && selectedCategory && <section className="catalog-guide" aria-labelledby="catalog-guide-title">
      <h2 id="catalog-guide-title">Как выбрать: {selectedCategory.label}</h2>
      <ol className="catalog-guide-grid">
        {guide.map(({ title, text }, index) => <li key={title}>
          <span aria-hidden="true">{index + 1}</span>
          <div><h3>{title}</h3><p>{text}</p></div>
        </li>)}
      </ol>
      <a className="orbea-button orbea-button-dark catalog-guide-cta" href="/?chat=open#custom">Подобрать решение за 1 минуту</a>
    </section>}
  </div>;
}

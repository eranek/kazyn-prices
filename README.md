# kazyn-prices

Акции магазинов для Kazyn Menu. Только данные о скидках — кода приложения и рецептов здесь нет.

- `tools/promos.mjs` — забирает скидки Magnum и сохраняет подходящие продукты в `promos.json`.
- GitHub Actions запускает его каждый день в 05:00 по Алматы (вкладка **Actions → Акции магазинов**, вручную — **Run workflow**).
- Приложение читает `https://raw.githubusercontent.com/eranek/kazyn-prices/main/promos.json`; если файл недоступен — использует свою копию.

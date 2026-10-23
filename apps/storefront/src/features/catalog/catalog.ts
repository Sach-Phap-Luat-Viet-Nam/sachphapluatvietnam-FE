import { DEMO_BOOKS } from "./demo-books";

export type CatalogParams = Record<string, string | string[] | undefined>;
export function param(params: CatalogParams, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

export function getDemoCatalog(params: CatalogParams) {
  const q = param(params, "q").trim().toLocaleLowerCase("vi");
  const category = param(params, "category");
  const type = param(params, "type");
  const cover = param(params, "cover");
  const minPrice = Math.max(0, Number(param(params, "minPrice")) || 0);
  const maxPrice = param(params, "maxPrice") ? Number(param(params, "maxPrice")) : Infinity;
  const sort = param(params, "sort");
  const items = DEMO_BOOKS.filter(
    (book) =>
      (!q || book.title.toLocaleLowerCase("vi").includes(q)) &&
      (!category || book.category === category) &&
      (!type || book.bookType === type) &&
      (!cover || book.coverType === cover) &&
      book.salePrice >= minPrice &&
      book.salePrice <= maxPrice,
  );
  items.sort((a, b) =>
    sort === "price_asc"
      ? a.salePrice - b.salePrice
      : sort === "price_desc"
        ? b.salePrice - a.salePrice
        : b.publishYear - a.publishYear,
  );
  const pageCount = Math.max(1, Math.ceil(items.length / 8));
  const requestedPage = Number(param(params, "page"));
  const page = Number.isFinite(requestedPage) ? Math.min(pageCount, Math.max(1, Math.floor(requestedPage))) : 1;
  return { items: items.slice((page - 1) * 8, page * 8), total: items.length, page, pageCount };
}

export function catalogHref(params: CatalogParams, changes: Record<string, string>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (typeof value === "string" && value) query.set(key, value);
  for (const [key, value] of Object.entries(changes)) {
    if (value) query.set(key, value);
    else query.delete(key);
  }
  return `/sach${query.size ? `?${query.toString()}` : ""}`;
}

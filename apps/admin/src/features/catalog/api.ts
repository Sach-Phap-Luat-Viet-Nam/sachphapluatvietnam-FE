import { z } from "zod";
import { unwrap } from "@slvn/api-client";
import { browserApi } from "@slvn/auth";
import type { BookBody, EditionBody, SkuCreateBody } from "./forms";
import type { toAuthorBody, toCategoryBody, toLegalDocumentBody, toSkuPriceBody } from "./forms";
import {
  adminBookSchema,
  adminBookSummarySchema,
  authorSchema,
  categorySchema,
  legalDocumentSchema,
  pageSchema,
} from "./schemas";
import type { AdminBook, AdminBookSummary, Author, Category, LegalDocument, Page } from "./schemas";

// API "Admin — Catalog" (docs/api_reference.md), quyền `super_admin`, `product_manager`. Gọi qua proxy `/api/v1`.
// Các API sửa đầu sách/ấn bản/SKU trả lại toàn bộ đầu sách: nơi gọi thay dữ liệu màn chi tiết bằng response.
// OpenAPI sinh enum thành `number` nên các field enum trong body cần `@ts-expect-error`: backend nhận chuỗi snake_case.

export const BOOKS_PAGE_SIZE = 20;
/** Số mục tối đa backend trả một lần, dùng cho danh sách chọn (tác giả, văn bản). */
export const MAX_PAGE_SIZE = 100;

const bookPageSchema = pageSchema(adminBookSummarySchema);
const authorPageSchema = pageSchema(authorSchema);
const legalDocumentPageSchema = pageSchema(legalDocumentSchema);

export interface BookListQuery {
  q: string;
  status: string;
  page: number;
}

/** Danh sách đầu sách mọi trạng thái, mới sửa trước. `q` khớp tên chứa chuỗi, đúng slug hoặc đúng ISBN. */
export async function fetchBooks({ q, status, page }: BookListQuery): Promise<Page<AdminBookSummary>> {
  const data = await unwrap(
    browserApi().GET("/api/v1/admin/books", {
      params: { query: { Q: q || undefined, Status: status || undefined, Page: page, Limit: BOOKS_PAGE_SIZE } },
    }),
  );
  return bookPageSchema.parse(data);
}

export async function fetchBook(id: number): Promise<AdminBook> {
  return adminBookSchema.parse(
    await unwrap(browserApi().GET("/api/v1/admin/books/{id}", { params: { path: { id } } })),
  );
}

export async function createBook(body: BookBody): Promise<AdminBook> {
  const data = await unwrap(
    browserApi().POST("/api/v1/admin/books", {
      body: {
        ...body,
        // @ts-expect-error OpenAPI sinh enum `BookType` thành number; backend nhận chuỗi snake_case.
        bookType: body.bookType,
        // @ts-expect-error OpenAPI sinh enum `BookStatus` thành number; backend nhận chuỗi snake_case.
        status: body.status,
        // @ts-expect-error OpenAPI sinh enum `TargetAudience` thành number; backend nhận chuỗi snake_case.
        targetAudiences: body.targetAudiences,
      },
    }),
  );
  return adminBookSchema.parse(data);
}

/** `PUT` thay thế toàn bộ: danh mục/tác giả bỏ trống sẽ bị xóa hết. */
export async function updateBook(id: number, body: BookBody): Promise<AdminBook> {
  const data = await unwrap(
    browserApi().PUT("/api/v1/admin/books/{id}", {
      params: { path: { id } },
      body: {
        ...body,
        // @ts-expect-error OpenAPI sinh enum `BookType` thành number; backend nhận chuỗi snake_case.
        bookType: body.bookType,
        // @ts-expect-error OpenAPI sinh enum `BookStatus` thành number; backend nhận chuỗi snake_case.
        status: body.status,
        // @ts-expect-error OpenAPI sinh enum `TargetAudience` thành number; backend nhận chuỗi snake_case.
        targetAudiences: body.targetAudiences,
      },
    }),
  );
  return adminBookSchema.parse(data);
}

/** Thêm ấn bản; ấn bản đầu tiên của đầu sách tự thành ấn bản mới nhất. */
export async function addEdition(bookId: number, body: EditionBody): Promise<AdminBook> {
  const data = await unwrap(
    browserApi().POST("/api/v1/admin/books/{id}/editions", {
      params: { path: { id: bookId } },
      // @ts-expect-error OpenAPI sinh enum `EditionStatus` thành number; backend nhận chuỗi snake_case.
      body,
    }),
  );
  return adminBookSchema.parse(data);
}

export async function updateEdition(editionId: number, body: EditionBody): Promise<AdminBook> {
  const data = await unwrap(
    browserApi().PUT("/api/v1/admin/editions/{id}", {
      params: { path: { id: editionId } },
      // @ts-expect-error OpenAPI sinh enum `EditionStatus` thành number; backend nhận chuỗi snake_case.
      body,
    }),
  );
  return adminBookSchema.parse(data);
}

/** Đổi ấn bản mới nhất (BR-02: mỗi đầu sách đúng một ấn bản mới nhất). */
export async function setLatestEdition(editionId: number): Promise<AdminBook> {
  const data = await unwrap(
    browserApi().POST("/api/v1/admin/editions/{id}/set-latest", { params: { path: { id: editionId } } }),
  );
  return adminBookSchema.parse(data);
}

export async function addSku(editionId: number, body: SkuCreateBody): Promise<AdminBook> {
  const data = await unwrap(
    browserApi().POST("/api/v1/admin/editions/{id}/skus", {
      params: { path: { id: editionId } },
      // @ts-expect-error OpenAPI sinh enum `CoverType` thành number; backend nhận chuỗi snake_case.
      body,
    }),
  );
  return adminBookSchema.parse(data);
}

export async function updateSku(skuId: number, body: ReturnType<typeof toSkuPriceBody>): Promise<AdminBook> {
  const data = await unwrap(browserApi().PUT("/api/v1/admin/skus/{id}", { params: { path: { id: skuId } }, body }));
  return adminBookSchema.parse(data);
}

// Danh mục: trả mảng phẳng, FE tự dựng cây theo `parentId`.

export async function fetchCategories(): Promise<Category[]> {
  return z.array(categorySchema).parse(await unwrap(browserApi().GET("/api/v1/admin/categories")));
}

type CategoryBody = ReturnType<typeof toCategoryBody>;

export async function createCategory(body: CategoryBody): Promise<Category> {
  return categorySchema.parse(await unwrap(browserApi().POST("/api/v1/admin/categories", { body })));
}

export async function updateCategory(id: number, body: CategoryBody): Promise<Category> {
  const data = await unwrap(browserApi().PUT("/api/v1/admin/categories/{id}", { params: { path: { id } }, body }));
  return categorySchema.parse(data);
}

/** Xóa mềm; còn danh mục con thì backend trả `CATEGORY_HAS_CHILDREN`. */
export async function deleteCategory(id: number): Promise<void> {
  await unwrap(browserApi().DELETE("/api/v1/admin/categories/{id}", { params: { path: { id } } }));
}

// Tác giả

export interface ReferenceQuery {
  q: string;
  page: number;
  limit: number;
}

export async function fetchAuthors({ q, page, limit }: ReferenceQuery): Promise<Page<Author>> {
  const data = await unwrap(
    browserApi().GET("/api/v1/admin/authors", { params: { query: { Q: q || undefined, Page: page, Limit: limit } } }),
  );
  return authorPageSchema.parse(data);
}

type AuthorBody = ReturnType<typeof toAuthorBody>;

export async function createAuthor(body: AuthorBody): Promise<Author> {
  return authorSchema.parse(await unwrap(browserApi().POST("/api/v1/admin/authors", { body })));
}

export async function updateAuthor(id: number, body: AuthorBody): Promise<Author> {
  const data = await unwrap(browserApi().PUT("/api/v1/admin/authors/{id}", { params: { path: { id } }, body }));
  return authorSchema.parse(data);
}

export async function deleteAuthor(id: number): Promise<void> {
  await unwrap(browserApi().DELETE("/api/v1/admin/authors/{id}", { params: { path: { id } } }));
}

// Văn bản pháp luật: `q` tìm theo số hiệu hoặc trích yếu.

export async function fetchLegalDocuments({ q, page, limit }: ReferenceQuery): Promise<Page<LegalDocument>> {
  const data = await unwrap(
    browserApi().GET("/api/v1/admin/legal-documents", {
      params: { query: { Q: q || undefined, Page: page, Limit: limit } },
    }),
  );
  return legalDocumentPageSchema.parse(data);
}

type LegalDocumentBody = ReturnType<typeof toLegalDocumentBody>;

export async function createLegalDocument(body: LegalDocumentBody): Promise<LegalDocument> {
  const data = await unwrap(
    browserApi().POST("/api/v1/admin/legal-documents", {
      // @ts-expect-error OpenAPI sinh enum `LegalDocumentType` thành number; backend nhận chuỗi snake_case.
      body,
    }),
  );
  return legalDocumentSchema.parse(data);
}

export async function updateLegalDocument(id: number, body: LegalDocumentBody): Promise<LegalDocument> {
  const data = await unwrap(
    browserApi().PUT("/api/v1/admin/legal-documents/{id}", {
      params: { path: { id } },
      // @ts-expect-error OpenAPI sinh enum `LegalDocumentType` thành number; backend nhận chuỗi snake_case.
      body,
    }),
  );
  return legalDocumentSchema.parse(data);
}

export async function deleteLegalDocument(id: number): Promise<void> {
  await unwrap(browserApi().DELETE("/api/v1/admin/legal-documents/{id}", { params: { path: { id } } }));
}

/** Khóa TanStack Query của Catalog; sửa xong thì invalidate theo tiền tố. */
export const catalogKeys = {
  all: ["catalog"] as const,
  books: (query: BookListQuery) => ["catalog", "books", query] as const,
  bookLists: ["catalog", "books"] as const,
  book: (id: number) => ["catalog", "book", id] as const,
  categories: ["catalog", "categories"] as const,
  authors: (query: ReferenceQuery) => ["catalog", "authors", query] as const,
  authorLists: ["catalog", "authors"] as const,
  legalDocuments: (query: ReferenceQuery) => ["catalog", "legal-documents", query] as const,
  legalDocumentLists: ["catalog", "legal-documents"] as const,
};

export interface DemoBook {
  id: number;
  title: string;
  category: string;
  bookType: string;
  coverType: string;
  salePrice: number;
  listPrice: number;
  publishYear: number;
  updatedToText: string;
  cover: string;
}

export const CATEGORIES = [
  { slug: "dan-su", name: "Dân sự" },
  { slug: "hinh-su", name: "Hình sự" },
  { slug: "kinh-te", name: "Kinh tế & Doanh nghiệp" },
  { slug: "lao-dong", name: "Lao động & Bảo hiểm" },
  { slug: "dat-dai", name: "Đất đai & Nhà ở" },
  { slug: "hanh-chinh", name: "Hành chính" },
];

export const DEMO_BOOKS: DemoBook[] = [
  {
    id: 1,
    title: "Bộ luật Dân sự",
    category: "dan-su",
    bookType: "code",
    coverType: "hardcover",
    salePrice: 156000,
    listPrice: 195000,
    publishYear: 2026,
    updatedToText: "Bản minh họa · Tái bản 2026",
    cover: "navy",
  },
  {
    id: 2,
    title: "Bộ luật Hình sự",
    category: "hinh-su",
    bookType: "code",
    coverType: "hardcover",
    salePrice: 144000,
    listPrice: 180000,
    publishYear: 2026,
    updatedToText: "Bản minh họa · Tái bản 2026",
    cover: "red",
  },
  {
    id: 3,
    title: "Luật Đất đai và văn bản hướng dẫn thi hành",
    category: "dat-dai",
    bookType: "consolidated",
    coverType: "paperback",
    salePrice: 216000,
    listPrice: 270000,
    publishYear: 2026,
    updatedToText: "Bản minh họa · Tuyển tập văn bản",
    cover: "green",
  },
  {
    id: 4,
    title: "Luật Doanh nghiệp và văn bản hướng dẫn",
    category: "kinh-te",
    bookType: "consolidated",
    coverType: "paperback",
    salePrice: 128000,
    listPrice: 160000,
    publishYear: 2026,
    updatedToText: "Bản minh họa · Tuyển tập văn bản",
    cover: "sand",
  },
  {
    id: 5,
    title: "Bộ luật Lao động",
    category: "lao-dong",
    bookType: "code",
    coverType: "paperback",
    salePrice: 96000,
    listPrice: 120000,
    publishYear: 2025,
    updatedToText: "Bản minh họa · Tái bản 2025",
    cover: "green",
  },
  {
    id: 6,
    title: "Bình luận khoa học Bộ luật Dân sự",
    category: "dan-su",
    bookType: "commentary",
    coverType: "hardcover",
    salePrice: 360000,
    listPrice: 450000,
    publishYear: 2025,
    updatedToText: "Bản minh họa · Sách chuyên sâu",
    cover: "navy",
  },
  {
    id: 7,
    title: "Giáo trình Luật Hành chính Việt Nam",
    category: "hanh-chinh",
    bookType: "textbook",
    coverType: "paperback",
    salePrice: 136000,
    listPrice: 170000,
    publishYear: 2025,
    updatedToText: "Bản minh họa · Giáo trình",
    cover: "red",
  },
  {
    id: 8,
    title: "Hỏi đáp pháp luật về hợp đồng",
    category: "dan-su",
    bookType: "qna",
    coverType: "paperback",
    salePrice: 112000,
    listPrice: 140000,
    publishYear: 2025,
    updatedToText: "Bản minh họa · Hỏi đáp",
    cover: "sand",
  },
  {
    id: 9,
    title: "Giáo trình Luật Hình sự Việt Nam",
    category: "hinh-su",
    bookType: "textbook",
    coverType: "paperback",
    salePrice: 168000,
    listPrice: 210000,
    publishYear: 2024,
    updatedToText: "Bản minh họa · Giáo trình",
    cover: "navy",
  },
  {
    id: 10,
    title: "Pháp luật kinh doanh thương mại",
    category: "kinh-te",
    bookType: "monograph",
    coverType: "paperback",
    salePrice: 184000,
    listPrice: 230000,
    publishYear: 2024,
    updatedToText: "Bản minh họa · Chuyên khảo",
    cover: "green",
  },
];

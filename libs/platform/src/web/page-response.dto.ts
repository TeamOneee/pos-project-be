export class PageResponseDto<T> {
  readonly content: T[];
  readonly page: number;
  readonly size: number;
  readonly total_elements: number;
  readonly total_pages: number;

  private constructor(
    content: T[],
    page: number,
    size: number,
    totalElements: number,
    totalPages: number,
  ) {
    this.content = content;
    this.page = page;
    this.size = size;
    this.total_elements = totalElements;
    this.total_pages = totalPages;
  }

  static from<T>(
    content: T[],
    page: number,
    size: number,
    totalElements: number,
  ): PageResponseDto<T> {
    const totalPages = Math.ceil(totalElements / Math.max(size, 1));
    return new PageResponseDto(content, page, size, totalElements, totalPages);
  }
}

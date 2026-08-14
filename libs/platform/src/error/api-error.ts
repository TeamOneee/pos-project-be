import { ERROR_HTTP_STATUS, ErrorCode } from './error-code';

export interface ApiErrorDetail {
  field?: string;
  reason?: string;
}

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get statusCode(): number {
    return ERROR_HTTP_STATUS[this.code];
  }

  static validation(
    message = 'Input tidak valid.',
    details?: ApiErrorDetail[],
  ): ApiError {
    return new ApiError(ErrorCode.VALIDATION_ERROR, message, details);
  }

  static unauthenticated(message = 'Autentikasi dibutuhkan.'): ApiError {
    return new ApiError(ErrorCode.UNAUTHENTICATED, message);
  }

  static forbidden(message = 'Role/tenant tidak berhak.'): ApiError {
    return new ApiError(ErrorCode.FORBIDDEN, message);
  }

  static notFound(message = 'Resource tidak ditemukan.'): ApiError {
    return new ApiError(ErrorCode.NOT_FOUND, message);
  }

  static conflict(
    code: ErrorCode,
    message: string,
    details?: ApiErrorDetail[],
  ): ApiError {
    return new ApiError(code, message, details);
  }

  static rateLimited(message = 'Terlalu banyak percobaan.'): ApiError {
    return new ApiError(ErrorCode.RATE_LIMITED, message);
  }

  static dependencyUnavailable(
    message = 'Dependency inti tidak sehat.',
  ): ApiError {
    return new ApiError(ErrorCode.DEPENDENCY_UNAVAILABLE, message);
  }

  static internal(message = 'Terjadi kesalahan internal.'): ApiError {
    return new ApiError(ErrorCode.INTERNAL_ERROR, message);
  }
}

import { ApiError } from './api-error';
import { ErrorCode, ERROR_HTTP_STATUS } from './error-code';

describe('ApiError', () => {
  it('memiliki name ApiError', () => {
    const error = ApiError.notFound();
    expect(error.name).toBe('ApiError');
  });

  it('statusCode dari ERROR_HTTP_STATUS mapping', () => {
    const error = ApiError.notFound('not found');
    expect(error.statusCode).toBe(ERROR_HTTP_STATUS[ErrorCode.NOT_FOUND]);
  });

  it('details disimpan dengan benar', () => {
    const details = [{ field: 'email', reason: 'invalid' }];
    const error = ApiError.validation('bad', details);
    expect(error.details).toEqual(details);
  });

  it('validation factory menghasilkan VALIDATION_ERROR', () => {
    const error = ApiError.validation('Input tidak valid', [
      { field: 'name', reason: 'wajib' },
    ]);
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.message).toBe('Input tidak valid');
    expect(error.details).toHaveLength(1);
  });

  it('validation default message', () => {
    const error = ApiError.validation();
    expect(error.message).toBe('Input tidak valid.');
  });

  it('unauthenticated factory menghasilkan UNAUTHENTICATED', () => {
    const error = ApiError.unauthenticated();
    expect(error.code).toBe(ErrorCode.UNAUTHENTICATED);
    expect(error.statusCode).toBe(401);
  });

  it('unauthenticated custom message', () => {
    const error = ApiError.unauthenticated('Token expired');
    expect(error.message).toBe('Token expired');
  });

  it('forbidden factory menghasilkan FORBIDDEN', () => {
    const error = ApiError.forbidden();
    expect(error.code).toBe(ErrorCode.FORBIDDEN);
    expect(error.statusCode).toBe(403);
  });

  it('notFound factory menghasilkan NOT_FOUND', () => {
    const error = ApiError.notFound();
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
    expect(error.statusCode).toBe(404);
  });

  it('conflict factory menghasilkan error dengan code tertentu', () => {
    const error = ApiError.conflict(
      ErrorCode.EMAIL_ALREADY_REGISTERED,
      'Email duplikat',
    );
    expect(error.code).toBe(ErrorCode.EMAIL_ALREADY_REGISTERED);
    expect(error.message).toBe('Email duplikat');
    expect(error.statusCode).toBe(409);
  });

  it('rateLimited factory menghasilkan RATE_LIMITED', () => {
    const error = ApiError.rateLimited();
    expect(error.code).toBe(ErrorCode.RATE_LIMITED);
    expect(error.statusCode).toBe(429);
  });

  it('dependencyUnavailable factory menghasilkan DEPENDENCY_UNAVAILABLE', () => {
    const error = ApiError.dependencyUnavailable();
    expect(error.code).toBe(ErrorCode.DEPENDENCY_UNAVAILABLE);
    expect(error.statusCode).toBe(503);
  });

  it('internal factory menghasilkan INTERNAL_ERROR', () => {
    const error = ApiError.internal();
    expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(error.statusCode).toBe(500);
  });

  it('ApiError adalah instanceof Error', () => {
    expect(ApiError.notFound()).toBeInstanceOf(Error);
    expect(ApiError.notFound()).toBeInstanceOf(ApiError);
  });
});

// memverifikasi pemetaan exception ke status HTTP dan body error pada AllExceptionsFilter.
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ClsService } from 'nestjs-cls';
import type { Request, Response } from 'express';
import { ApiError } from './api-error';
import { ErrorCode } from './error-code';
import { AllExceptionsFilter, ErrorBody } from './all-exceptions.filter';

function makeMockCls(overrides: Record<string, unknown> = {}) {
  return { get: jest.fn().mockImplementation((k: string) => overrides[k]) } as unknown as ClsService;
}

interface MockHostResult {
  host: ArgumentsHost;
  responseJson: jest.Mock;
  responseSetHeader: jest.Mock;
  responseStatus: jest.Mock;
}

function makeMockHost(
  overrides: { correlationIdHeader?: string } = {},
): MockHostResult {
  const headers: Record<string, string> = {};
  if (overrides.correlationIdHeader) {
    headers['x-correlation-id'] = overrides.correlationIdHeader;
  }

  const responseJson = jest.fn();
  const responseSetHeader = jest.fn();
  const responseStatus = jest.fn().mockReturnValue({ json: responseJson });

  const request = {
    method: 'GET',
    originalUrl: '/api/v1/test',
    url: '/api/v1/test',
    headers,
  } as unknown as Request;

  const response = {
    status: responseStatus,
    setHeader: responseSetHeader,
  } as unknown as Response;

  const host = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
      getResponse: jest.fn().mockReturnValue(response),
    }),
  };

  return { host: host as unknown as ArgumentsHost, responseJson, responseSetHeader, responseStatus };
}

describe('AllExceptionsFilter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ApiError memetakan ke status code dan body yang sesuai (FR-000)', () => {
    const error = ApiError.notFound('Produk tidak ditemukan');
    const cls = makeMockCls();
    const { host, responseJson, responseSetHeader, responseStatus } = makeMockHost();
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);

    expect(responseSetHeader).toHaveBeenCalledWith('X-Correlation-Id', expect.any(String));
    expect(responseStatus).toHaveBeenCalledWith(404);
    expect(responseJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: 'Produk tidak ditemukan',
      }),
    );
  });

  it('ApiError VALIDATION_ERROR menghasilkan 400', () => {
    const error = ApiError.validation('Input tidak valid', [{ field: 'name', reason: 'wajib' }]);
    const cls = makeMockCls();
    const { host, responseJson, responseStatus } = makeMockHost();
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);

    expect(responseStatus).toHaveBeenCalledWith(400);
    const body = responseJson.mock.calls[0][0] as ErrorBody;
    expect(body.errors).toEqual([{ field: 'name', message: 'wajib' }]);
  });

  it('ApiError UNAUTHENTICATED menghasilkan 401', () => {
    const error = ApiError.unauthenticated();
    const cls = makeMockCls();
    const { host, responseStatus } = makeMockHost();
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);
    expect(responseStatus).toHaveBeenCalledWith(401);
  });

  it('ApiError FORBIDDEN menghasilkan 403', () => {
    const error = ApiError.forbidden();
    const cls = makeMockCls();
    const { host, responseStatus } = makeMockHost();
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);
    expect(responseStatus).toHaveBeenCalledWith(403);
  });

  it('ApiError dengan multiple details memetakan semua field', () => {
    const error = ApiError.validation('Gagal', [
      { field: 'email', reason: 'sudah terdaftar' },
      { field: 'phone', reason: 'format salah' },
    ]);
    const cls = makeMockCls();
    const { host, responseJson } = makeMockHost();
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);

    const body = responseJson.mock.calls[0][0] as ErrorBody;
    expect(body.errors).toHaveLength(2);
    expect(body.errors![0]).toEqual({ field: 'email', message: 'sudah terdaftar' });
    expect(body.errors![1]).toEqual({ field: 'phone', message: 'format salah' });
  });

  it('ThrottlerException menghasilkan 429', () => {
    const error = new ThrottlerException('Too many requests');
    const cls = makeMockCls();
    const { host, responseStatus, responseJson } = makeMockHost();
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);

    expect(responseStatus).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    const body = responseJson.mock.calls[0][0] as ErrorBody;
    expect(body.message).toBe('Terlalu banyak permintaan');
  });

  it('HttpException (string) menghasilkan status yang benar', () => {
    const error = new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);
    const cls = makeMockCls();
    const { host, responseStatus, responseJson } = makeMockHost();
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);

    expect(responseStatus).toHaveBeenCalledWith(403);
    const body = responseJson.mock.calls[0][0] as ErrorBody;
    expect(body.message).toBe('Forbidden resource');
  });

  it('HttpException (object) menghasilkan body dengan errors jika ada array message', () => {
    const error = new HttpException(
      { message: ['wajib diisi', 'format salah'] },
      HttpStatus.BAD_REQUEST,
    );
    const cls = makeMockCls();
    const { host, responseStatus, responseJson } = makeMockHost();
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);

    expect(responseStatus).toHaveBeenCalledWith(400);
    const body = responseJson.mock.calls[0][0] as ErrorBody;
    expect(body.message).toBe('Input tidak valid.');
    expect(body.errors).toHaveLength(2);
  });

  it('Exception tidak dikenal menghasilkan 500 (FR-013)', () => {
    const error = new Error('db connection timeout');
    const cls = makeMockCls();
    const { host, responseStatus, responseJson } = makeMockHost();
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);

    expect(responseStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = responseJson.mock.calls[0][0] as ErrorBody;
    expect(body.message).toBe('Terjadi kesalahan internal');
  });

  it('X-Correlation-Id diambil dari cls service jika tersedia', () => {
    const error = ApiError.notFound();
    const cls = makeMockCls({ correlationId: 'cls-corr-123' });
    const { host, responseSetHeader } = makeMockHost();
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);

    expect(responseSetHeader).toHaveBeenCalledWith('X-Correlation-Id', 'cls-corr-123');
  });

  it('X-Correlation-Id diambil dari header jika cls kosong', () => {
    const error = ApiError.notFound();
    const cls = makeMockCls();
    const { host, responseSetHeader } = makeMockHost({ correlationIdHeader: 'hdr-456' });
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);

    expect(responseSetHeader).toHaveBeenCalledWith('X-Correlation-Id', 'hdr-456');
  });

  it('X-Correlation-Id di-generate otomatis jika cls dan header kosong', () => {
    const error = ApiError.notFound();
    const cls = makeMockCls();
    const { host, responseSetHeader } = makeMockHost();
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);

    const call = responseSetHeader.mock.calls.find((c: unknown[]) => c[0] === 'X-Correlation-Id');
    expect(call![1]).toMatch(/^c-[a-f0-9]{8}$/);
  });

  it('X-Correlation-Id dari header dipotong maks 64 karakter', () => {
    const longId = 'a'.repeat(100);
    const error = ApiError.notFound();
    const cls = makeMockCls();
    const { host, responseSetHeader } = makeMockHost({ correlationIdHeader: longId });
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);

    expect(responseSetHeader).toHaveBeenCalledWith('X-Correlation-Id', 'a'.repeat(64));
  });

  it('ApiError RATE_LIMITED menghasilkan 429', () => {
    const error = new ApiError(ErrorCode.RATE_LIMITED, 'Rate limit exceeded');
    const cls = makeMockCls();
    const { host, responseStatus } = makeMockHost();
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);
    expect(responseStatus).toHaveBeenCalledWith(429);
  });

  it('ApiError DEPENDENCY_UNAVAILABLE menghasilkan 503', () => {
    const error = ApiError.dependencyUnavailable();
    const cls = makeMockCls();
    const { host, responseStatus } = makeMockHost();
    const filter = new AllExceptionsFilter(cls);

    filter.catch(error, host);
    expect(responseStatus).toHaveBeenCalledWith(503);
  });
});

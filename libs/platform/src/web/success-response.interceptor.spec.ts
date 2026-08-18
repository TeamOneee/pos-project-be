import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { SuccessResponseInterceptor } from './success-response.interceptor';

function makeContext(
  statusCode: number,
  path = '/api/v1/products',
): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
      getRequest: () => ({ path }),
    }),
  } as unknown as ExecutionContext;
}

// menjaga bentuk response sukses tetap sama pada seluruh endpoint HTTP.
describe('SuccessResponseInterceptor', () => {
  it('membungkus response 2xx dengan status, pesan, dan data', async () => {
    const reflector = { getAllAndOverride: jest.fn(() => 'Produk dibuat.') };
    const interceptor = new SuccessResponseInterceptor(
      reflector as unknown as Reflector,
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(makeContext(201), {
          handle: () => of({ id: 'p-1' }),
        }),
      ),
    ).resolves.toEqual({
      success: true,
      statusCode: 201,
      message: 'Produk dibuat.',
      data: { id: 'p-1' },
    });
  });

  it('mempertahankan 204 tanpa body', async () => {
    const reflector = { getAllAndOverride: jest.fn() };
    const interceptor = new SuccessResponseInterceptor(
      reflector as unknown as Reflector,
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(makeContext(204), {
          handle: () => of(undefined),
        }),
      ),
    ).resolves.toBeUndefined();
    expect(reflector.getAllAndOverride).not.toHaveBeenCalled();
  });

  it('route /metrics melewati interceptor tanpa wrapping', async () => {
    const reflector = { getAllAndOverride: jest.fn() };
    const interceptor = new SuccessResponseInterceptor(
      reflector as unknown as Reflector,
    );

    const raw = '# HELP http_requests_total total\n';
    await expect(
      lastValueFrom(
        interceptor.intercept(makeContext(200, '/api/v1/metrics'), {
          handle: () => of(raw),
        }),
      ),
    ).resolves.toBe(raw);
  });
});

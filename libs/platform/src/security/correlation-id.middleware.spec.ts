import { CorrelationIdMiddleware } from './correlation-id.middleware';

function makeMocks(options: { incomingHeader?: string } = {}) {
  const headers: Record<string, string> = {};
  if (options.incomingHeader !== undefined) {
    headers['x-correlation-id'] = options.incomingHeader;
  }

  const req = { headers } as never;
  const resSetHeader = jest.fn();
  const res = { setHeader: resSetHeader } as never;
  const next = jest.fn();
  const clsRun = jest.fn((cb: () => void) => cb());
  const clsSet = jest.fn();
  const cls = {
    run: clsRun,
    set: clsSet,
  } as never;

  return { req, res, next, cls, resSetHeader, clsSet };
}

describe('CorrelationIdMiddleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('menggunakan header yang masuk jika ada', () => {
    const { req, res, next, cls, resSetHeader, clsSet } = makeMocks({
      incomingHeader: 'my-trace-id',
    });
    const middleware = new CorrelationIdMiddleware(cls);

    middleware.use(req, res, next);

    expect(resSetHeader).toHaveBeenCalledWith(
      'X-Correlation-Id',
      'my-trace-id',
    );
    expect(clsSet).toHaveBeenCalledWith('correlationId', 'my-trace-id');
    expect(next).toHaveBeenCalled();
  });

  it('menghasilkan ID otomatis jika tidak ada header', () => {
    const { req, res, next, cls, resSetHeader, clsSet } = makeMocks();
    const middleware = new CorrelationIdMiddleware(cls);

    middleware.use(req, res, next);

    const generatedId = clsSet.mock.calls[0][1] as string;
    expect(generatedId).toMatch(/^c-[a-f0-9]{8}$/);
    expect(resSetHeader).toHaveBeenCalledWith('X-Correlation-Id', generatedId);
    expect(next).toHaveBeenCalled();
  });

  it('memotong header yang panjang maksimal 64 karakter', () => {
    const longHeader = 'a'.repeat(100);
    const { req, res, cls, resSetHeader } = makeMocks({
      incomingHeader: longHeader,
    });
    const middleware = new CorrelationIdMiddleware(cls);

    middleware.use(req, res, jest.fn());

    expect(resSetHeader).toHaveBeenCalledWith(
      'X-Correlation-Id',
      'a'.repeat(64),
    );
  });

  it('mengabaikan header kosong atau whitespace', () => {
    const { req, res, next, cls, clsSet } = makeMocks({
      incomingHeader: '   ',
    });
    const middleware = new CorrelationIdMiddleware(cls);

    middleware.use(req, res, next);

    const generatedId = clsSet.mock.calls[0][1] as string;
    expect(generatedId).toMatch(/^c-[a-f0-9]{8}$/);
  });
});

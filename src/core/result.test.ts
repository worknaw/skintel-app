import { failure, success } from './result';

describe('Result', () => {
  it('wraps a successful value', () => {
    expect(success({ id: 'product-1' })).toEqual({
      ok: true,
      value: { id: 'product-1' },
    });
  });

  it('wraps a typed application error', () => {
    expect(
      failure({
        code: 'NETWORK_ERROR',
        message: 'Unable to load products',
        retryable: true,
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Unable to load products',
        retryable: true,
      },
    });
  });
});

import { getAuthRedirectUrl } from './auth-redirect';

describe('getAuthRedirectUrl', () => {
  it('builds the app deep link for auth callbacks', () => {
    expect(getAuthRedirectUrl((path) => `skincycle://${path}`)).toBe('skincycle://auth');
  });
});

import { getPostAuthRoute, getProtectedAuthRoute } from './auth-session';

describe('getPostAuthRoute', () => {
  it('returns a valid in-app intent after authentication', () => {
    expect(getPostAuthRoute('/analysis')).toBe('/analysis');
  });

  it('falls back to home for an external or malformed intent', () => {
    expect(getPostAuthRoute('https://example.com')).toBe('/');
  });
});

describe('getProtectedAuthRoute', () => {
  it('sends a guest to authentication with the requested intent', () => {
    expect(getProtectedAuthRoute('/profile', false)).toEqual({
      pathname: '/auth',
      params: { returnTo: '/profile' },
    });
  });

  it('keeps an authenticated user on the requested route', () => {
    expect(getProtectedAuthRoute('/profile', true)).toBe('/profile');
  });
});

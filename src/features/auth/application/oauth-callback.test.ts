import { extractOAuthSession } from './oauth-callback';

it('returns no session for a malformed callback instead of throwing', () => {
  expect(extractOAuthSession('not a url')).toBeNull();
});

describe('extractOAuthSession', () => {
  it('extracts an implicit-flow session from the callback hash', () => {
    expect(
      extractOAuthSession('skincycle://auth#access_token=access&refresh_token=refresh'),
    ).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
  });

  it('extracts a PKCE authorization code from the callback query', () => {
    expect(extractOAuthSession('skincycle://auth?code=auth-code')).toEqual({ code: 'auth-code' });
  });
});

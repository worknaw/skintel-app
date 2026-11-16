export type OAuthSessionParams =
  | { accessToken: string; refreshToken: string }
  | { code: string }
  | null;

export function extractOAuthSession(url: string): OAuthSessionParams {
  try {
  const [urlWithoutHash, hash = ''] = url.split('#', 2);
  const query = new URL(urlWithoutHash).searchParams;
  const hashParams = new URLSearchParams(hash);
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  const code = query.get('code');

  if (accessToken && refreshToken) return { accessToken, refreshToken };
  if (code) return { code };
  return null;
  } catch {
    return null;
  }
}

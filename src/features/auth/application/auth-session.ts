export type AuthRoute = Readonly<{
  pathname: '/auth';
  params: Readonly<{ returnTo: string }>;
}>;

export function getPostAuthRoute(returnTo: string | undefined): string {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//') || /[\\\\\r\n]/.test(returnTo)) return '/';
  const path = returnTo.split(/[?#]/)[0];
  return /^\/(?:auth|\(tabs\)\/auth)(?:\/|$)/i.test(path) ? '/' : returnTo;
}

export function getProtectedAuthRoute(route: string, hasSession: boolean): string | AuthRoute {
  return hasSession ? route : { pathname: '/auth', params: { returnTo: route } };
}

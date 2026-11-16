export function getAuthRedirectUrl(createUrl: (path: string) => string): string {
  return createUrl('auth');
}

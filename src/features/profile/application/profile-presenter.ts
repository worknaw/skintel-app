export function getProfileDisplayName(displayName: string | null | undefined, email: string | null | undefined): string {
  const trimmedName = displayName?.trim();
  if (trimmedName) return trimmedName;
  return email?.split('@')[0] || 'สมาชิก SkinCycle';
}

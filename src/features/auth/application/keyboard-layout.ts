export function getKeyboardAvoidingBehavior(os: string | undefined): 'padding' | 'height' {
  return os === 'ios' ? 'padding' : 'height';
}

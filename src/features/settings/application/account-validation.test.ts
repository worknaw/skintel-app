import { validateDisplayName, validateEmail, validatePassword, validateSupportRequest } from './account-validation';

describe('account form validation', () => {
  it('accepts English names while rejecting blank, Thai and oversized names', () => {
    expect(validateDisplayName(" Anne O'Neil ")).toBeNull();
    for (const name of ['', '   ', 'บอล', 'A'.repeat(81)]) expect(validateDisplayName(name)).not.toBeNull();
  });
  it('rejects malformed and whitespace-containing addresses', () => {
    expect(validateEmail(' user@example.com ')).toBeNull();
    for (const email of ['x@', 'x y@example.com', 'x@example', '@example.com']) expect(validateEmail(email)).not.toBeNull();
  });
  it('does not silently trim or accept mismatched passwords', () => {
    expect(validatePassword('long-password', 'long-password')).toBeNull();
    expect(validatePassword('1234567', '1234567')).not.toBeNull();
    expect(validatePassword('password ', 'password')).not.toBeNull();
  });
  it('validates report lengths after trimming', () => {
    expect(validateSupportRequest('Issue', 'Steps to reproduce the issue')).toBeNull();
    expect(validateSupportRequest('  ', 'Valid description')).not.toBeNull();
    expect(validateSupportRequest('Issue', 'Too short')).not.toBeNull();
    expect(validateSupportRequest('Issue', 'x'.repeat(4001))).not.toBeNull();
  });
});

import { getProfileDisplayName } from './profile-presenter';

describe('getProfileDisplayName', () => {
  it('uses the profile name and falls back to the email local part', () => {
    expect(getProfileDisplayName('ณิชา', 'nicha@example.com')).toBe('ณิชา');
    expect(getProfileDisplayName(null, 'nicha@example.com')).toBe('nicha');
  });
});

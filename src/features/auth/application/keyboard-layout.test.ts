import { getKeyboardAvoidingBehavior } from './keyboard-layout';

describe('getKeyboardAvoidingBehavior', () => {
  it('uses height on Android so the form can scroll above the keyboard', () => {
    expect(getKeyboardAvoidingBehavior('android')).toBe('height');
  });

  it('uses padding on iOS', () => {
    expect(getKeyboardAvoidingBehavior('ios')).toBe('padding');
  });
});

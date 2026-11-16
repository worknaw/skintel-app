// Avoid loading Expo's native fetch lazily after Jest tears down its environment.
process.env.EXPO_PUBLIC_USE_RN_FETCH = '1';
require('jest/bin/jest');

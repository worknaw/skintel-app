import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { supabase } from '@/core/supabase/client';

import { AuthSessionProvider, useAuthSession } from './auth-session-provider';

jest.mock('@/core/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
  },
}));

function SessionProbe() {
  const { isLoading, session } = useAuthSession();
  return <Text>{isLoading ? 'loading' : session?.user.id ?? 'guest'}</Text>;
}

describe('AuthSessionProvider', () => {
  it('restores the persisted Supabase session before exposing app state', async () => {
    const view = await render(<AuthSessionProvider><SessionProbe /></AuthSessionProvider>);

    expect(view.getByText('user-1')).toBeTruthy();
  });

  it('does not restore an old session after a newer sign-out event', async () => {
    let resolveSession!: (value: unknown) => void;
    let authEvent!: (event: string, session: null) => void;
    (supabase.auth.getSession as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { resolveSession = resolve; }));
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementationOnce((listener) => {
      authEvent = listener;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    const view = await render(<AuthSessionProvider><SessionProbe /></AuthSessionProvider>);
    await act(() => { authEvent('SIGNED_OUT', null); });
    await act(() => { resolveSession({ data: { session: { user: { id: 'old-user' } } }, error: null }); });
    expect(view.getByText('guest')).toBeTruthy();
  });
});

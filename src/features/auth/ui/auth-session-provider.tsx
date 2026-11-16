import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { supabase } from '@/core/supabase/client';

type AuthSessionContextValue = Readonly<{
  isLoading: boolean;
  session: Session | null;
}>;

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let isActive = true;
    let receivedAuthEvent = false;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isActive || receivedAuthEvent) return;
      if (error) throw error;
      setSession(data.session);
      setIsLoading(false);
    }).catch(() => {
      if (!isActive || receivedAuthEvent) return;
      setSession(null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) return;
      receivedAuthEvent = true;
      setSession(nextSession);
      setIsLoading(false);
    });

    const appStateSubscription = Platform.OS !== 'web' ? AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    }) : null;
    if (Platform.OS !== 'web' && AppState.currentState === 'active') supabase.auth.startAutoRefresh();

    return () => {
      isActive = false;
      subscription.unsubscribe();
      appStateSubscription?.remove();
      if (Platform.OS !== 'web') supabase.auth.stopAutoRefresh();
    };
  }, []);

  const value = useMemo(() => ({ isLoading, session }), [isLoading, session]);

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionContextValue {
  const value = useContext(AuthSessionContext);
  if (!value) throw new Error('useAuthSession must be used inside AuthSessionProvider.');
  return value;
}

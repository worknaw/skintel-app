import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import SettingsScreen from '@/app/settings';
import { AppNotificationProvider } from '@/components/ui/app-notification';
import { defaultUserSettings } from '@/features/settings/domain/user-settings';
import { loadUserSettings, saveUserSetting } from '@/features/settings/data/supabase-settings-repository';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), back: jest.fn() }), useFocusEffect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ clear: jest.fn() }) }));
jest.mock('@/core/supabase/client', () => ({ supabase: { auth: { signOut: jest.fn() } } }));
jest.mock('@/features/auth/ui/auth-session-provider', () => ({ useAuthSession: () => ({ isLoading: false, session: { user: { id: 'owner' } } }) }));
jest.mock('@/features/settings/data/supabase-settings-repository', () => ({ loadUserSettings: jest.fn(), saveUserSetting: jest.fn() }));
jest.mock('@/features/settings/application/local-notifications', () => ({
  clearLocalReminderNotifications: jest.fn().mockResolvedValue(undefined),
  isLocalNotificationKey: (key: string) => ['routine_morning', 'routine_evening', 'skin_cycling'].includes(key),
  requestLocalNotificationPermission: jest.fn().mockResolvedValue('granted'),
  synchronizeLocalReminderNotifications: jest.fn().mockResolvedValue('granted'),
}));
jest.mock('@/global.css', () => ({}));

it('merges concurrent preference saves without overwriting another optimistic switch', async () => {
  (loadUserSettings as jest.Mock).mockResolvedValue(defaultUserSettings);
  const responses: ((value: typeof defaultUserSettings | object) => void)[] = [];
  (saveUserSetting as jest.Mock).mockImplementation(() => new Promise((resolve) => responses.push(resolve)));
  const view = await render(<AppNotificationProvider><SettingsScreen /></AppNotificationProvider>);
  await fireEvent.press(view.getByText('เตือนรูทีนตอนเช้า'));
  await fireEvent.press(view.getByText('เตือนรูทีนตอนเย็น'));
  await fireEvent.press(view.getByText('เตือนรูทีนตอนเช้า'));
  await waitFor(() => expect(saveUserSetting).toHaveBeenCalledTimes(2));
  await act(() => { responses[1]({ ...defaultUserSettings, routine_evening: true }); });
  await act(() => { responses[0]({ ...defaultUserSettings, routine_morning: true }); });
  const switches = view.getAllByRole('switch');
  expect(switches[0].props.value).toBe(true);
  expect(switches[1].props.value).toBe(true);
});

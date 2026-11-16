import { accountErrorMessage, changeEmail, changePassword, deleteAccount, exportAccount, saveDisplayName, sendSupportRequest } from './account-repository';
import { supabase } from '@/core/supabase/client';

jest.mock('@/core/supabase/client', () => ({ supabase: {
  auth: { getUser: jest.fn(), updateUser: jest.fn(), signOut: jest.fn() }, from: jest.fn(), rpc: jest.fn(),
} }));

const client = supabase as unknown as {
  auth: { getUser: jest.Mock; updateUser: jest.Mock; signOut: jest.Mock }; from: jest.Mock; rpc: jest.Mock;
};

beforeEach(() => { jest.resetAllMocks(); client.auth.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null }); });

it('writes the profile using the authenticated owner and propagates write failures', async () => {
  const single = jest.fn().mockResolvedValue({ error: { message: 'denied' } });
  const upsert = jest.fn().mockReturnValue({ select: () => ({ single }) });
  client.from.mockReturnValue({ upsert });
  await expect(saveDisplayName(' Alice ')).rejects.toEqual({ message: 'denied' });
  expect(upsert).toHaveBeenCalledWith({ id: 'owner', display_name: 'Alice' });
});

it('does not sign out if server deletion failed', async () => {
  client.rpc.mockResolvedValue({ error: { message: 'failed' } });
  await expect(deleteAccount('DELETE')).rejects.toEqual({ message: 'failed' });
  expect(client.auth.signOut).not.toHaveBeenCalled();
});

it('deletes only through the current-user RPC then removes the local session', async () => {
  client.rpc.mockResolvedValue({ error: null }); client.auth.signOut.mockResolvedValue({ error: null });
  await deleteAccount('DELETE');
  expect(client.rpc).toHaveBeenCalledWith('delete_my_account', { confirmation: 'DELETE' });
  expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
});

it('never returns an export when the backend reports an error', async () => {
  client.rpc.mockResolvedValue({ error: { message: 'offline' }, data: null });
  await expect(exportAccount()).rejects.toEqual({ message: 'offline' });
});

it('explains why an account with retained orders cannot be deleted automatically', () => {
  expect(accountErrorMessage({ message: 'Order history requires store support before account deletion' }))
    .toContain('ประวัติคำสั่งซื้อ');
});

it('uses a mobile callback and passes reauthentication nonce without changing passwords', async () => {
  client.auth.updateUser.mockResolvedValue({ error: null });
  await changeEmail(' Alice@Example.com ');
  expect(client.auth.updateUser).toHaveBeenCalledWith({ email: 'alice@example.com' }, { emailRedirectTo: 'skincycle://auth' });
  await changePassword(' password ', ' 123456 ');
  expect(client.auth.updateUser).toHaveBeenLastCalledWith({ password: ' password ', nonce: '123456' });
});

it('does not submit reports without a verified user', async () => {
  client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  await expect(sendSupportRequest('Issue', 'Description', '1.0.0')).rejects.toThrow();
  expect(client.from).not.toHaveBeenCalled();
});

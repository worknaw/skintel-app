import { supabase } from '@/core/supabase/client';

import { getRoutineCheckin, saveRoutineCheckin } from './routine-checkin-repository';

jest.mock('@/core/supabase/client', () => ({ supabase: { from: jest.fn() } }));

describe('routine check-in repository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads a check-in using the account, date, and period', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { completed_step_ids: ['cleanser'] }, error: null });
    const period = jest.fn(() => ({ maybeSingle }));
    const date = jest.fn(() => ({ eq: period }));
    const owner = jest.fn(() => ({ eq: date }));
    jest.mocked(supabase.from).mockReturnValue({ select: () => ({ eq: owner }) } as never);

    await expect(getRoutineCheckin('owner', '2026-11-05', 'am')).resolves.toEqual({ completedStepIds: ['cleanser'] });
    expect(owner).toHaveBeenCalledWith('user_id', 'owner');
    expect(date).toHaveBeenCalledWith('routine_date', '2026-11-05');
    expect(period).toHaveBeenCalledWith('period', 'am');
  });

  it('deduplicates and caps completion ids before upserting', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    jest.mocked(supabase.from).mockReturnValue({ upsert } as never);
    const ids = Array.from({ length: 14 }, (_, index) => `step-${index}`);

    await saveRoutineCheckin('owner', '2026-11-05', 'pm', ['cleanser', 'cleanser', ...ids]);

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'owner', routine_date: '2026-11-05', period: 'pm',
      completed_step_ids: ['cleanser', ...ids.slice(0, 11)],
    }), { onConflict: 'user_id,routine_date,period' });
  });
});

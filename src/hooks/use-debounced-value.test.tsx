import { act, renderHook } from '@testing-library/react-native';
import { useDebouncedValue } from './use-debounced-value';

it('settles only the final search input and cleans up its timer', async () => {
  jest.useFakeTimers();
  const timeoutSpy = jest.spyOn(globalThis, 'setTimeout');
  const clearSpy = jest.spyOn(globalThis, 'clearTimeout');
  try {
    const view = await renderHook<string, { value: string }>(({ value }) => useDebouncedValue(value), { initialProps: { value: '' } });
    for (const value of ['s', 'sk', 'ski', 'skin']) await view.rerender({ value });
    expect(view.result.current).toBe('');
    await act(() => { jest.advanceTimersByTime(300); });
    expect(view.result.current).toBe('skin');
    await view.rerender({ value: 'new search' });
    const timerIndex = timeoutSpy.mock.calls.findLastIndex((call) => call[1] === 300);
    const timer = timeoutSpy.mock.results[timerIndex].value;
    await view.unmount();
    expect(clearSpy).toHaveBeenCalledWith(timer);
  } finally {
    timeoutSpy.mockRestore();
    clearSpy.mockRestore();
    jest.useRealTimers();
  }
});

import { initialScanSession, scanSessionReducer } from './scan-session-reducer';

describe('scanSessionReducer', () => {
  it('moves through the complete scan flow', () => {
    const scanning = scanSessionReducer(initialScanSession, { type: 'START_SCAN' });
    expect(scanning.stage).toBe('scanning');

    const analyzing = scanSessionReducer(scanning, { type: 'CAPTURED', imageUri: 'mock://face' });
    expect(analyzing).toMatchObject({ stage: 'analyzing', imageUri: 'mock://face', progress: 0 });

    const progressed = scanSessionReducer(analyzing, { type: 'PROGRESS', progress: 72 });
    expect(progressed.progress).toBe(72);

    expect(scanSessionReducer(progressed, { type: 'COMPLETE' })).toBe(progressed);
    const ready = scanSessionReducer(progressed, { type: 'PROGRESS', progress: 100 });
    const completed = scanSessionReducer(ready, { type: 'COMPLETE' });
    expect(completed.stage).toBe('completed');
  });

  it('resets to a clean prepare state', () => {
    const state = scanSessionReducer({ ...initialScanSession, stage: 'failed', error: 'camera' }, { type: 'RESET' });
    expect(state).toEqual(initialScanSession);
  });

  it('ignores late capture and progress events after cancellation', () => {
    expect(scanSessionReducer(initialScanSession, { type: 'CAPTURED', imageUri: 'late://image' })).toBe(initialScanSession);
    expect(scanSessionReducer(initialScanSession, { type: 'TICK' })).toBe(initialScanSession);
    expect(scanSessionReducer(initialScanSession, { type: 'PROGRESS', progress: 50 })).toBe(initialScanSession);
  });

  it('never regresses progress or accepts invalid values', () => {
    const state = { ...initialScanSession, stage: 'analyzing' as const, progress: 60 };
    expect(scanSessionReducer(state, { type: 'PROGRESS', progress: 20 }).progress).toBe(60);
    expect(scanSessionReducer(state, { type: 'PROGRESS', progress: NaN })).toBe(state);
    expect(scanSessionReducer(state, { type: 'TICK' }).progress).toBe(64);
  });
});

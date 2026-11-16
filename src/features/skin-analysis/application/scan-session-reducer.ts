export type ScanStage = 'prepare' | 'scanning' | 'analyzing' | 'completed' | 'failed';

export type ScanSessionState = Readonly<{
  stage: ScanStage;
  imageUri: string | null;
  progress: number;
  error: string | null;
}>;

export type ScanSessionAction =
  | { type: 'START_SCAN' }
  | { type: 'CAPTURED'; imageUri: string }
  | { type: 'PROGRESS'; progress: number }
  | { type: 'TICK' }
  | { type: 'COMPLETE' }
  | { type: 'FAIL'; error: string }
  | { type: 'RESET' };

export const initialScanSession: ScanSessionState = { stage: 'prepare', imageUri: null, progress: 0, error: null };

export function scanSessionReducer(state: ScanSessionState, action: ScanSessionAction): ScanSessionState {
  switch (action.type) {
    case 'START_SCAN': return state.stage === 'prepare' ? { ...initialScanSession, stage: 'scanning' } : state;
    case 'CAPTURED': return state.stage === 'scanning' ? { stage: 'analyzing', imageUri: action.imageUri, progress: 0, error: null } : state;
    case 'TICK': return state.stage === 'analyzing' ? { ...state, progress: Math.min(100, state.progress + 4) } : state;
    case 'PROGRESS': return state.stage === 'analyzing' && Number.isFinite(action.progress) ? { ...state, progress: Math.max(state.progress, Math.min(100, action.progress)) } : state;
    case 'COMPLETE': return state.stage === 'analyzing' && state.progress >= 100 ? { ...state, stage: 'completed', progress: 100 } : state;
    case 'FAIL': return { ...state, stage: 'failed', error: action.error };
    case 'RESET': return initialScanSession;
  }
}

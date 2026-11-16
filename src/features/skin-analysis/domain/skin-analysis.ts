export type SkinAnalysisStatus =
  | 'created'
  | 'uploaded'
  | 'processing'
  | 'completed'
  | 'failed';

export type SkinMetric = Readonly<{
  key: string;
  score: number;
  severity: 'low' | 'medium' | 'high';
  confidence: number | null;
}>;

export type SkinAnalysis = Readonly<{
  id: string;
  userId: string;
  status: SkinAnalysisStatus;
  summary: string | null;
  metrics: readonly SkinMetric[];
  modelVersion: string | null;
  normalizerVersion: string | null;
  createdAt: string;
  completedAt: string | null;
}>;


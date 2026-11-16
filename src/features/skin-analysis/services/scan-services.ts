export type CapturedSkinImage = Readonly<{ uri: string; width?: number; height?: number; capturedAt: string }>;
export type SkinAnalysisRequest = Readonly<{ image: CapturedSkinImage; userId?: string }>;

export interface CameraCaptureService {
  requestPermission(): Promise<boolean>;
  capture(): Promise<CapturedSkinImage>;
  pickFromLibrary(): Promise<CapturedSkinImage | null>;
}

export interface SkinAnalysisGateway {
  analyze(request: SkinAnalysisRequest, onProgress: (progress: number, task: string) => void): Promise<{ analysisId: string }>;
}

export interface ToolDescriptor {
  available: boolean;
  source: "bundled" | "environment" | "system-path" | "missing";
  path: string | null;
}

export interface ToolingStatus {
  ffmpeg: ToolDescriptor;
  ffprobe: ToolDescriptor;
}

export interface MediaFormatInfo {
  path: string;
  container: string;
  durationSeconds: number | null;
  bitRate: number | null;
  sizeBytes: number | null;
}

export interface MediaStream {
  index: number;
  codecType: string;
  codecName: string | null;
  width: number | null;
  height: number | null;
  frameRate: number | null;
  pixelFormat: string | null;
  bitRate: number | null;
  sampleRate: number | null;
  channels: number | null;
}

export interface MediaProbe {
  format: MediaFormatInfo;
  streams: MediaStream[];
}

export interface ConversionResult {
  success: boolean;
  exitCode: number;
  stderr: string;
}

export type ConversionPhase = "idle" | "running" | "completed" | "failed";

export interface ConversionProgress {
  phase: ConversionPhase;
  percent: number | null;
  frame: number | null;
  fps: number | null;
  speed: number | null;
  outputTimeSeconds: number | null;
  totalDurationSeconds: number | null;
  rawLine: string | null;
}

export type SourceFileStatus = "pending" | "running" | "completed" | "failed";

export interface SourceFile {
  id: string;
  inputPath: string;
  outputPath: string;
  probe: MediaProbe | null;
  isProbing: boolean;
  thumbnail: string | null;
  progress: ConversionProgress | null;
  status: SourceFileStatus;
}

export type BatchPhase = "idle" | "running" | "completed" | "cancelled" | "failed";

export interface BatchProgress {
  phase: BatchPhase;
  currentFileIndex: number;
  totalFiles: number;
  overallPercent: number;
}

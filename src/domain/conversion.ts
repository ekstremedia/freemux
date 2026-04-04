export type ResolutionMode = "source" | "custom";

export interface ResolutionSettings {
  mode: ResolutionMode;
  width: number | null;
  height: number | null;
}

export interface VideoSettings {
  codec: string;
  bitrateKbps: number | null;
  crf: number | null;
  preset: string | null;
  frameRate: number | null;
  pixelFormat: string | null;
  resolution: ResolutionSettings;
}

export interface AudioSettings {
  codec: string;
  bitrateKbps: number | null;
  channels: number | null;
  sampleRate: number | null;
}

export interface ConversionProfile {
  id: string;
  name: string;
  container: string;
  video: VideoSettings;
  audio: AudioSettings;
  extraArgs: string[];
  overwriteOutput: boolean;
}

export interface ConversionRunRequest {
  inputPath: string;
  outputPath: string;
  profile: ConversionProfile;
}

export function createDefaultProfile(partial?: Partial<ConversionProfile>): ConversionProfile {
  return {
    id: partial?.id ?? crypto.randomUUID(),
    name: partial?.name ?? "H.264 1080p AAC",
    container: partial?.container ?? "mp4",
    video: {
      codec: partial?.video?.codec ?? "libx264",
      bitrateKbps: partial?.video?.bitrateKbps ?? 4500,
      crf: partial?.video?.crf ?? 21,
      preset: partial?.video?.preset ?? "medium",
      frameRate: partial?.video?.frameRate ?? null,
      pixelFormat: partial?.video?.pixelFormat ?? "yuv420p",
      resolution: {
        mode: partial?.video?.resolution?.mode ?? "source",
        width: partial?.video?.resolution?.width ?? null,
        height: partial?.video?.resolution?.height ?? null,
      },
    },
    audio: {
      codec: partial?.audio?.codec ?? "aac",
      bitrateKbps: partial?.audio?.bitrateKbps ?? 192,
      channels: partial?.audio?.channels ?? 2,
      sampleRate: partial?.audio?.sampleRate ?? 48000,
    },
    extraArgs: partial?.extraArgs ?? [],
    overwriteOutput: partial?.overwriteOutput ?? true,
  };
}

export function createStarterProfiles(): ConversionProfile[] {
  return [
    createDefaultProfile(),
    createDefaultProfile({
      id: crypto.randomUUID(),
      name: "HEVC archive",
      video: {
        codec: "libx265",
        bitrateKbps: 2800,
        crf: 24,
        preset: "slow",
        frameRate: null,
        pixelFormat: "yuv420p",
        resolution: {
          mode: "source",
          width: null,
          height: null,
        },
      },
      audio: {
        codec: "aac",
        bitrateKbps: 160,
        channels: 2,
        sampleRate: 48000,
      },
    }),
    createDefaultProfile({
      id: crypto.randomUUID(),
      name: "Audio extract MP3",
      container: "mp3",
      video: {
        codec: "copy",
        bitrateKbps: null,
        crf: null,
        preset: null,
        frameRate: null,
        pixelFormat: null,
        resolution: {
          mode: "source",
          width: null,
          height: null,
        },
      },
      audio: {
        codec: "mp3",
        bitrateKbps: 192,
        channels: 2,
        sampleRate: 44100,
      },
    }),
  ];
}

export function cloneProfile(profile: ConversionProfile, name?: string): ConversionProfile {
  return {
    ...structuredClone(profile),
    id: crypto.randomUUID(),
    name: name ?? `${profile.name} Copy`,
  };
}

export function upsertProfile(
  profiles: ConversionProfile[],
  nextProfile: ConversionProfile,
): ConversionProfile[] {
  const existingIndex = profiles.findIndex((profile) => profile.id === nextProfile.id);

  if (existingIndex === -1) {
    return [nextProfile, ...profiles];
  }

  return profiles.map((profile) => (profile.id === nextProfile.id ? nextProfile : profile));
}

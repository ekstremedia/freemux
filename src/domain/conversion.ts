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

export const FALLBACK_VIDEO_CODECS = [
  "copy",
  "libx264",
  "libx265",
  "libvpx-vp9",
  "h264_nvenc",
  "hevc_nvenc",
  "h264_qsv",
  "hevc_qsv",
  "h264_vaapi",
  "hevc_vaapi",
  "h264_videotoolbox",
  "hevc_videotoolbox",
  "h264_amf",
  "hevc_amf",
];

export const FALLBACK_AUDIO_CODECS = [
  "aac",
  "mp3",
  "libopus",
  "pcm_s16le",
  "copy",
  "none",
];

export type VideoRateControlMode = "quality" | "bitrate";

export interface VideoCodecBehavior {
  supportsCrf: boolean;
  supportsBitrate: boolean;
  supportsPreset: boolean;
  supportsPixelFormat: boolean;
  supportsFrameRate: boolean;
  supportsResolution: boolean;
  isCopy: boolean;
}

export interface AudioCodecBehavior {
  supportsBitrate: boolean;
  supportsChannels: boolean;
  supportsSampleRate: boolean;
  isCopy: boolean;
  isDisabled: boolean;
}

export function getVideoCodecBehavior(codec: string): VideoCodecBehavior {
  if (codec === "copy") {
    return {
      supportsCrf: false,
      supportsBitrate: false,
      supportsPreset: false,
      supportsPixelFormat: false,
      supportsFrameRate: false,
      supportsResolution: false,
      isCopy: true,
    };
  }

  if (codec === "libx264" || codec === "libx265") {
    return {
      supportsCrf: true,
      supportsBitrate: true,
      supportsPreset: true,
      supportsPixelFormat: true,
      supportsFrameRate: true,
      supportsResolution: true,
      isCopy: false,
    };
  }

  if (codec === "libvpx-vp9") {
    return {
      supportsCrf: true,
      supportsBitrate: true,
      supportsPreset: false,
      supportsPixelFormat: true,
      supportsFrameRate: true,
      supportsResolution: true,
      isCopy: false,
    };
  }

  if (/_nvenc$|_qsv$|_vaapi$|_videotoolbox$|_amf$/.test(codec)) {
    return {
      supportsCrf: false,
      supportsBitrate: true,
      supportsPreset: true,
      supportsPixelFormat: true,
      supportsFrameRate: true,
      supportsResolution: true,
      isCopy: false,
    };
  }

  return {
    supportsCrf: false,
    supportsBitrate: true,
    supportsPreset: false,
    supportsPixelFormat: true,
    supportsFrameRate: true,
    supportsResolution: true,
    isCopy: false,
  };
}

export function getAudioCodecBehavior(codec: string): AudioCodecBehavior {
  if (codec === "copy") {
    return {
      supportsBitrate: false,
      supportsChannels: false,
      supportsSampleRate: false,
      isCopy: true,
      isDisabled: false,
    };
  }

  if (codec === "none") {
    return {
      supportsBitrate: false,
      supportsChannels: false,
      supportsSampleRate: false,
      isCopy: false,
      isDisabled: true,
    };
  }

  if (codec.startsWith("pcm_")) {
    return {
      supportsBitrate: false,
      supportsChannels: true,
      supportsSampleRate: true,
      isCopy: false,
      isDisabled: false,
    };
  }

  return {
    supportsBitrate: true,
    supportsChannels: true,
    supportsSampleRate: true,
    isCopy: false,
    isDisabled: false,
  };
}

export function getVideoRateControlMode(profile: ConversionProfile): VideoRateControlMode {
  return profile.video.crf !== null ? "quality" : "bitrate";
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
    createDefaultProfile({
      name: "Resolve edit MOV (copy video + PCM audio tracks)",
      container: "mov",
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
        codec: "pcm_s16le",
        bitrateKbps: null,
        channels: null,
        sampleRate: null,
      },
    }),
    createDefaultProfile({
      id: crypto.randomUUID(),
      name: "YouTube 1080p H.264 AAC",
      container: "mp4",
      video: {
        codec: "libx264",
        bitrateKbps: null,
        crf: 20,
        preset: "slow",
        frameRate: 30,
        pixelFormat: "yuv420p",
        resolution: {
          mode: "custom",
          width: 1920,
          height: 1080,
        },
      },
      audio: {
        codec: "aac",
        bitrateKbps: 192,
        channels: 2,
        sampleRate: 48000,
      },
    }),
    createDefaultProfile({
      id: crypto.randomUUID(),
      name: "YouTube Shorts 1080x1920 H.264 AAC",
      container: "mp4",
      video: {
        codec: "libx264",
        bitrateKbps: null,
        crf: 20,
        preset: "slow",
        frameRate: 30,
        pixelFormat: "yuv420p",
        resolution: {
          mode: "custom",
          width: 1080,
          height: 1920,
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
      name: "X / Twitter 1080p H.264 AAC",
      container: "mp4",
      video: {
        codec: "libx264",
        bitrateKbps: 8000,
        crf: null,
        preset: "medium",
        frameRate: 30,
        pixelFormat: "yuv420p",
        resolution: {
          mode: "custom",
          width: 1920,
          height: 1080,
        },
      },
      audio: {
        codec: "aac",
        bitrateKbps: 128,
        channels: 2,
        sampleRate: 48000,
      },
    }),
    createDefaultProfile({
      id: crypto.randomUUID(),
      name: "Instagram Reel 1080x1920 H.264 AAC",
      container: "mp4",
      video: {
        codec: "libx264",
        bitrateKbps: 10000,
        crf: null,
        preset: "medium",
        frameRate: 30,
        pixelFormat: "yuv420p",
        resolution: {
          mode: "custom",
          width: 1080,
          height: 1920,
        },
      },
      audio: {
        codec: "aac",
        bitrateKbps: 128,
        channels: 2,
        sampleRate: 48000,
      },
    }),
    createDefaultProfile({
      id: crypto.randomUUID(),
      name: "Instagram Feed 1080x1350 H.264 AAC",
      container: "mp4",
      video: {
        codec: "libx264",
        bitrateKbps: 8000,
        crf: null,
        preset: "medium",
        frameRate: 30,
        pixelFormat: "yuv420p",
        resolution: {
          mode: "custom",
          width: 1080,
          height: 1350,
        },
      },
      audio: {
        codec: "aac",
        bitrateKbps: 128,
        channels: 2,
        sampleRate: 48000,
      },
    }),
    createDefaultProfile({
      id: crypto.randomUUID(),
      name: "Facebook 1080p H.264 AAC",
      container: "mp4",
      video: {
        codec: "libx264",
        bitrateKbps: 8000,
        crf: null,
        preset: "medium",
        frameRate: 30,
        pixelFormat: "yuv420p",
        resolution: {
          mode: "custom",
          width: 1920,
          height: 1080,
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
      name: "H.264 1080p AAC",
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
    ...copyProfile(profile),
    id: crypto.randomUUID(),
    name: name ?? `${profile.name} Copy`,
  };
}

export function copyProfile(profile: ConversionProfile): ConversionProfile {
  return {
    id: profile.id,
    name: profile.name,
    container: profile.container,
    video: {
      codec: profile.video.codec,
      bitrateKbps: profile.video.bitrateKbps,
      crf: profile.video.crf,
      preset: profile.video.preset,
      frameRate: profile.video.frameRate,
      pixelFormat: profile.video.pixelFormat,
      resolution: {
        mode: profile.video.resolution.mode,
        width: profile.video.resolution.width,
        height: profile.video.resolution.height,
      },
    },
    audio: {
      codec: profile.audio.codec,
      bitrateKbps: profile.audio.bitrateKbps,
      channels: profile.audio.channels,
      sampleRate: profile.audio.sampleRate,
    },
    extraArgs: [...profile.extraArgs],
    overwriteOutput: profile.overwriteOutput,
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

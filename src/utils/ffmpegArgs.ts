import type { ConversionProfile } from "@/domain/conversion";

export function buildFfmpegArgs(
  inputPath: string,
  outputPath: string,
  profile: ConversionProfile | null,
): string[] {
  if (!inputPath || !outputPath || !profile) {
    return [];
  }

  const args = [profile.overwriteOutput ? "-y" : "-n", "-i", inputPath];

  if (profile.container === "mp3") {
    args.push("-vn");
  } else if (profile.video.codec === "copy") {
    args.push("-c:v", "copy");
  } else {
    args.push("-c:v", profile.video.codec);

    if (profile.video.bitrateKbps) {
      args.push("-b:v", `${profile.video.bitrateKbps}k`);
    }

    if (profile.video.crf !== null) {
      args.push("-crf", String(profile.video.crf));
    }

    if (profile.video.preset) {
      args.push("-preset", profile.video.preset);
    }

    if (profile.video.frameRate) {
      args.push("-r", String(profile.video.frameRate));
    }

    if (profile.video.pixelFormat) {
      args.push("-pix_fmt", profile.video.pixelFormat);
    }

    if (
      profile.video.resolution.mode === "custom" &&
      profile.video.resolution.width &&
      profile.video.resolution.height
    ) {
      args.push("-vf", `scale=${profile.video.resolution.width}:${profile.video.resolution.height}`);
    }
  }

  if (profile.audio.codec === "none") {
    args.push("-an");
  } else if (profile.audio.codec === "copy") {
    args.push("-c:a", "copy");
  } else {
    args.push("-c:a", profile.audio.codec);

    if (profile.audio.bitrateKbps) {
      args.push("-b:a", `${profile.audio.bitrateKbps}k`);
    }

    if (profile.audio.channels) {
      args.push("-ac", String(profile.audio.channels));
    }

    if (profile.audio.sampleRate) {
      args.push("-ar", String(profile.audio.sampleRate));
    }
  }

  if (profile.extraArgs.length) {
    args.push(...profile.extraArgs);
  }

  args.push(outputPath);
  return args;
}

export function buildFfmpegCommandPreview(
  inputPath: string,
  outputPath: string,
  profile: ConversionProfile | null,
): string {
  const args = buildFfmpegArgs(inputPath, outputPath, profile);
  return args.length ? ["ffmpeg", ...args].map(shellQuote).join(" ") : "Select a file and profile.";
}

function shellQuote(value: string) {
  if (!/\s/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}

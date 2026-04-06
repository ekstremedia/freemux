import { describe, expect, it } from "vitest";
import { createDefaultProfile } from "@/domain/conversion";
import { buildFfmpegArgs } from "@/utils/ffmpegArgs";

describe("buildFfmpegArgs", () => {
  it("builds a standard H.264 conversion command", () => {
    const profile = createDefaultProfile();
    const args = buildFfmpegArgs("/tmp/input.mov", "/tmp/output.mp4", profile);

    expect(args).toContain("-map");
    expect(args).toContain("0:v");
    expect(args).toContain("0:a");
    expect(args).toContain("-c:v");
    expect(args).toContain("libx264");
    expect(args).toContain("-c:a");
    expect(args).toContain("aac");
    expect(args[args.length - 1]).toBe("/tmp/output.mp4");
  });

  it("drops video for mp3 outputs", () => {
    const profile = createDefaultProfile({
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
    });

    const args = buildFfmpegArgs("/tmp/input.mp4", "/tmp/output.mp3", profile);
    expect(args).toContain("0:a");
    expect(args).toContain("-vn");
  });

  it("supports a Resolve-friendly mov profile with copied video and pcm audio", () => {
    const profile = createDefaultProfile({
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
    });

    const args = buildFfmpegArgs("/tmp/input.mkv", "/tmp/output.mov", profile);
    expect(args).toContain("-map");
    expect(args).toContain("0:v");
    expect(args).toContain("0:a");
    expect(args).toContain("-c:v");
    expect(args).toContain("copy");
    expect(args).toContain("-c:a");
    expect(args).toContain("pcm_s16le");
  });

  it("prefers CRF over bitrate for CRF-capable codecs", () => {
    const profile = createDefaultProfile({
      video: {
        codec: "libx264",
        bitrateKbps: 4500,
        crf: 20,
        preset: "medium",
        frameRate: null,
        pixelFormat: "yuv420p",
        resolution: {
          mode: "source",
          width: null,
          height: null,
        },
      },
    });

    const args = buildFfmpegArgs("/tmp/input.mov", "/tmp/output.mp4", profile);
    expect(args).toContain("-crf");
    expect(args).not.toContain("-b:v");
  });
});

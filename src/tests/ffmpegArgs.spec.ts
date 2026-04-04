import { describe, expect, it } from "vitest";
import { createDefaultProfile } from "@/domain/conversion";
import { buildFfmpegArgs } from "@/utils/ffmpegArgs";

describe("buildFfmpegArgs", () => {
  it("builds a standard H.264 conversion command", () => {
    const profile = createDefaultProfile();
    const args = buildFfmpegArgs("/tmp/input.mov", "/tmp/output.mp4", profile);

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
    expect(args).toContain("-vn");
  });
});

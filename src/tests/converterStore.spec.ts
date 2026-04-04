import { describe, expect, it } from "vitest";
import { createDefaultProfile } from "@/domain/conversion";
import { createConverterStore } from "@/stores/useConverterStore";
import type { DesktopClient } from "@/services/desktopClient";
import type { ConversionProgress } from "@/domain/media";

function createClientStub(): DesktopClient {
  const profile = createDefaultProfile();
  let progressHandler: ((progress: ConversionProgress) => void) | null = null;

  return {
    chooseInputFile: async () => "/videos/source.mov",
    chooseOutputFile: async () => "/videos/source.mp4",
    probeMedia: async (inputPath) => ({
      format: {
        path: inputPath,
        container: "mov,mp4,m4a,3gp,3g2,mj2",
        durationSeconds: 42,
        bitRate: 5_000_000,
        sizeBytes: 15_000_000,
      },
      streams: [],
    }),
    getToolingStatus: async () => ({
      ffmpeg: { available: true, source: "system-path", path: "/usr/bin/ffmpeg" },
      ffprobe: { available: true, source: "system-path", path: "/usr/bin/ffprobe" },
    }),
    loadProfiles: async () => [profile],
    saveProfile: async (nextProfile) => nextProfile,
    deleteProfile: async () => undefined,
    runConversion: async () => {
      progressHandler?.({
        phase: "running",
        percent: 42,
        frame: 100,
        fps: 29.97,
        speed: 1.25,
        outputTimeSeconds: 12,
        totalDurationSeconds: 30,
        rawLine: "progress=continue",
      });
      return { success: true, exitCode: 0, stderr: "" };
    },
    subscribeToConversionProgress: async (onProgress) => {
      progressHandler = onProgress;
      return () => {
        progressHandler = null;
      };
    },
  };
}

describe("converter store", () => {
  it("loads startup data and derives an output path when a file is chosen", async () => {
    const store = createConverterStore(createClientStub());

    await store.initialize();
    await store.pickInputFile();

    expect(store.state.profiles).toHaveLength(1);
    expect(store.state.inputPath).toBe("/videos/source.mov");
    expect(store.state.outputPath).toBe("/videos/source.mp4");
    expect(store.state.probe?.format.path).toBe("/videos/source.mov");
  });

  it("stores conversion progress updates", async () => {
    const store = createConverterStore(createClientStub());
    await store.initialize();
    await store.pickInputFile();
    await store.runConversion();

    expect(store.state.conversionProgress?.phase).toBe("completed");
    expect(store.state.conversionProgress?.percent).toBe(100);
  });

  it("duplicates and saves profiles with visible action messages", async () => {
    const store = createConverterStore(createClientStub());
    await store.initialize();

    await store.duplicateCurrentProfile();
    expect(store.state.selectedProfileId).not.toBeNull();
    expect(store.state.profileActionMessage).toContain("Duplicated profile");
    expect(store.state.profiles).toHaveLength(2);

    await store.saveCurrentProfile(true);
    expect(store.state.profileActionMessage).toContain("Saved as new profile");

    await store.saveCurrentProfile(false);
    expect(store.state.profileActionMessage).toContain("Saved profile");
  });
});

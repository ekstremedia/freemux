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
    chooseInputFiles: async () => ["/videos/source.mov"],
    chooseFolder: async () => "/videos",
    chooseOutputFile: async () => "/videos/source.mp4",
    chooseOutputFolder: async () => "/videos/output",
    getThumbnail: async () => "data:image/jpeg;base64,/9j/fake",
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
    cancelConversion: async () => undefined,
    openPath: async () => undefined,
    revealInFolder: async () => undefined,
    subscribeToConversionProgress: async (onProgress) => {
      progressHandler = onProgress;
      return () => {
        progressHandler = null;
      };
    },
  };
}

describe("converter store", () => {
  it("loads startup data and adds files with derived output paths", async () => {
    const store = createConverterStore(createClientStub());

    await store.initialize();
    await store.addFiles(["/videos/source.mov"]);

    expect(store.state.profiles).toHaveLength(1);
    expect(store.state.files).toHaveLength(1);
    expect(store.state.files[0].inputPath).toBe("/videos/source.mov");
    expect(store.state.files[0].outputPath).toBe("/videos/source.mp4");
    expect(store.state.files[0].probe?.format.path).toBe("/videos/source.mov");
    expect(store.state.selectedFileId).toBe(store.state.files[0].id);
  });

  it("supports adding multiple files", async () => {
    const store = createConverterStore(createClientStub());
    await store.initialize();

    await store.addFiles(["/videos/a.mkv", "/videos/b.mov", "/videos/c.mp4"]);

    expect(store.state.files).toHaveLength(3);
    expect(store.state.files[0].inputPath).toBe("/videos/a.mkv");
    expect(store.state.files[1].inputPath).toBe("/videos/b.mov");
    expect(store.state.files[2].inputPath).toBe("/videos/c.mp4");
    // First file auto-selected
    expect(store.state.selectedFileId).toBe(store.state.files[0].id);
  });

  it("removes files and updates selection", async () => {
    const store = createConverterStore(createClientStub());
    await store.initialize();

    await store.addFiles(["/videos/a.mkv", "/videos/b.mov"]);
    const firstId = store.state.files[0].id;
    store.selectFile(firstId);
    store.removeFile(firstId);

    expect(store.state.files).toHaveLength(1);
    expect(store.state.files[0].inputPath).toBe("/videos/b.mov");
    expect(store.state.selectedFileId).toBe(store.state.files[0].id);
  });

  it("clears all files", async () => {
    const store = createConverterStore(createClientStub());
    await store.initialize();

    await store.addFiles(["/videos/a.mkv", "/videos/b.mov"]);
    store.clearFiles();

    expect(store.state.files).toHaveLength(0);
    expect(store.state.selectedFileId).toBeNull();
  });

  it("updates output paths when output folder changes", async () => {
    const store = createConverterStore(createClientStub());
    await store.initialize();

    await store.addFiles(["/videos/a.mkv", "/videos/b.mov"]);
    store.setOutputFolder("/output");

    expect(store.state.files[0].outputPath).toBe("/output/a.mp4");
    expect(store.state.files[1].outputPath).toBe("/output/b.mp4");
  });

  it("allows editing individual file output paths", async () => {
    const store = createConverterStore(createClientStub());
    await store.initialize();

    await store.addFiles(["/videos/a.mkv"]);
    const fileId = store.state.files[0].id;
    store.updateFileOutputPath(fileId, "/custom/output.mp4");

    expect(store.state.files[0].outputPath).toBe("/custom/output.mp4");
  });

  it("runs batch conversion sequentially", async () => {
    const store = createConverterStore(createClientStub());
    await store.initialize();

    await store.addFiles(["/videos/a.mkv", "/videos/b.mov"]);
    await store.runBatchConversion();

    expect(store.state.batchProgress?.phase).toBe("completed");
    expect(store.state.batchProgress?.overallPercent).toBe(100);
    expect(store.state.files[0].status).toBe("completed");
    expect(store.state.files[1].status).toBe("completed");
    expect(store.state.isConverting).toBe(false);
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

  it("re-derives output paths when profile changes", async () => {
    const store = createConverterStore(createClientStub());
    await store.initialize();

    await store.addFiles(["/videos/a.mkv"]);
    expect(store.state.files[0].outputPath).toContain(".mp4");

    // Create a profile with mov container and select it
    await store.createNewProfile();
    const newProfileId = store.state.selectedProfileId!;
    const newProfile = store.state.profiles.find((p) => p.id === newProfileId)!;
    store.updateCurrentProfile({ ...newProfile, container: "mov" });

    expect(store.state.files[0].outputPath).toContain(".mov");
  });
});

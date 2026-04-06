import { describe, expect, it, vi } from "vitest";
import { createDefaultProfile, createStarterProfiles } from "@/domain/conversion";
import { createConverterStore } from "@/stores/useConverterStore";
import type { DesktopClient } from "@/services/desktopClient";
import type { ConversionProgress, ConversionResult, EncoderOption } from "@/domain/media";

function createClientStub(): DesktopClient {
  const profile = createDefaultProfile();
  let progressHandler: ((progress: ConversionProgress) => void) | null = null;
  const encoders: EncoderOption[] = [
    {
      name: "libx264",
      label: "libx264",
      description: null,
      mediaType: "video",
      isHardwareAccelerated: false,
    },
    {
      name: "h264_nvenc",
      label: "h264_nvenc",
      description: null,
      mediaType: "video",
      isHardwareAccelerated: true,
    },
    {
      name: "aac",
      label: "aac",
      description: null,
      mediaType: "audio",
      isHardwareAccelerated: false,
    },
  ];

  return {
    chooseInputFile: async () => "/videos/source.mov",
    chooseInputFiles: async () => ["/videos/source.mov"],
    chooseFolder: async () => "/videos",
    chooseOutputFile: async () => "/videos/source.mp4",
    chooseOutputFolder: async () => "/videos/output",
    chooseProfilesImportFile: async () => "/tmp/import-profiles.json",
    chooseProfilesExportFile: async () => "/tmp/export-profiles.json",
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
    getAvailableEncoders: async () => encoders,
    getFileSize: async () => 10_000_000,
    loadProfiles: async () => [profile],
    saveProfile: async (nextProfile) => nextProfile,
    replaceProfiles: async (profiles) => profiles,
    deleteProfile: async () => undefined,
    importProfiles: async () => [createDefaultProfile({ name: "Imported profile" })],
    exportProfiles: async () => undefined,
    getProfilesFilePath: async () => "/app-data/profiles.json",
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
    expect(store.videoCodecOptions.value.some((codec) => codec.name === "h264_nvenc")).toBe(true);
    expect(store.state.profilesFilePath).toBe("/app-data/profiles.json");
  });

  it("seeds starter profiles into profiles.json when none exist yet", async () => {
    const client = createClientStub();
    client.loadProfiles = async () => [];
    client.replaceProfiles = vi.fn(async (profiles) => profiles);

    const store = createConverterStore(client);
    await store.initialize();

    expect(client.replaceProfiles).toHaveBeenCalledTimes(1);
    expect(client.replaceProfiles).toHaveBeenCalledWith(expect.any(Array));
    expect(store.state.profiles).toHaveLength(createStarterProfiles().length);
    expect(store.state.profiles[0].name).toBe("Resolve edit MOV (copy video + PCM audio tracks)");
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

  it("re-derives output paths when a new profile becomes active", async () => {
    const store = createConverterStore(createClientStub());
    await store.initialize();
    await store.addFiles(["/videos/a.mkv"]);

    expect(store.state.files[0].outputPath).toBe("/videos/a.mp4");

    await store.createNewProfile();
    const newProfileId = store.state.selectedProfileId!;
    const newProfile = store.state.profiles.find((profile) => profile.id === newProfileId)!;
    store.updateCurrentProfile({ ...newProfile, container: "mov" });

    await store.createNewProfile();

    expect(store.state.files[0].outputPath).toBe("/videos/a.mp4");
  });

  it("waits for the active batch to settle before cancel finishes", async () => {
    let finishConversion: (() => void) | null = null;
    const client = createClientStub();
    client.runConversion = () =>
      new Promise<ConversionResult>((resolve) => {
        finishConversion = () => resolve({ success: false, exitCode: 255, stderr: "cancelled" });
      });

    const store = createConverterStore(client);
    await store.initialize();
    await store.addFiles(["/videos/a.mkv"]);

    const batchPromise = store.runBatchConversion();
    expect(store.state.isConverting).toBe(true);

    const cancelPromise = store.cancelConversion();
    await vi.waitFor(() => {
      expect(finishConversion).not.toBeNull();
    });

    let cancelResolved = false;
    void cancelPromise.then(() => {
      cancelResolved = true;
    });

    await Promise.resolve();
    expect(cancelResolved).toBe(false);

    if (finishConversion) {
      (finishConversion as () => void)();
    }
    await cancelPromise;
    await batchPromise;

    expect(store.state.isConverting).toBe(false);
  });

  it("discards unsaved profile edits when switching away and back", async () => {
    const store = createConverterStore(createClientStub());
    await store.initialize();

    const originalProfileId = store.state.selectedProfileId!;
    const originalCodec = store.currentProfile.value!.video.codec;

    await store.duplicateCurrentProfile();
    const duplicateProfileId = store.state.selectedProfileId!;

    store.selectProfile(originalProfileId);
    store.updateCurrentProfile({
      ...store.currentProfile.value!,
      video: {
        ...store.currentProfile.value!.video,
        codec: "h264_nvenc",
      },
    });

    expect(store.currentProfile.value!.video.codec).toBe("h264_nvenc");

    store.selectProfile(duplicateProfileId);
    store.selectProfile(originalProfileId);

    expect(store.currentProfile.value!.video.codec).toBe(originalCodec);
    expect(
      store.state.profiles.find((profile) => profile.id === originalProfileId)?.video.codec,
    ).toBe(originalCodec);
  });

  it("imports and exports profiles through the shared JSON flow", async () => {
    const client = createClientStub();
    client.importProfiles = vi.fn(async () => [
      createDefaultProfile({ id: "imported", name: "Instagram Reel 1080x1920 H.264 AAC" }),
    ]);
    client.exportProfiles = vi.fn(async () => undefined);

    const store = createConverterStore(client);
    await store.initialize();

    await store.importProfiles();
    expect(client.importProfiles).toHaveBeenCalledWith("/tmp/import-profiles.json");
    expect(store.state.profiles[0].name).toBe("Instagram Reel 1080x1920 H.264 AAC");
    expect(store.state.profileActionMessage).toContain("Imported 1 profile");

    await store.exportProfiles();
    expect(client.exportProfiles).toHaveBeenCalledWith("/tmp/export-profiles.json");
    expect(store.state.profileActionMessage).toContain("Exported profiles");
  });
});

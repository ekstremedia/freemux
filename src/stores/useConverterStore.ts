import { computed, reactive } from "vue";
import type { UnlistenFn } from "@tauri-apps/api/event";
import {
  FALLBACK_AUDIO_CODECS,
  FALLBACK_VIDEO_CODECS,
  cloneProfile,
  copyProfile,
  createDefaultProfile,
  createStarterProfiles,
  upsertProfile,
  type ConversionProfile,
} from "@/domain/conversion";
import type {
  BatchProgress,
  EncoderOption,
  SourceFile,
  ToolingStatus,
} from "@/domain/media";
import { tauriDesktopClient, type DesktopClient } from "@/services/desktopClient";
import { buildFfmpegCommandPreview } from "@/utils/ffmpegArgs";
import { dirname, suggestBatchOutputPath, suggestOutputPath } from "@/utils/pathing";

interface ConverterState {
  files: SourceFile[];
  selectedFileId: string | null;
  outputFolder: string;
  profiles: ConversionProfile[];
  selectedProfileId: string | null;
  selectedProfileDraft: ConversionProfile | null;
  profilesFilePath: string | null;
  tooling: ToolingStatus | null;
  availableEncoders: EncoderOption[];
  lastError: string | null;
  isConverting: boolean;
  isBatchRunning: boolean;
  batchProgress: BatchProgress | null;
  profileActionMessage: string | null;
}

export function createConverterStore(client: DesktopClient = tauriDesktopClient) {
  let unsubscribeProgress: UnlistenFn | null = null;
  let activeBatchFileIds: string[] = [];
  let activeBatchStatuses = new Map<string, SourceFile["status"]>();
  let currentBatchCompletion: Promise<void> | null = null;
  let resolveCurrentBatchCompletion: (() => void) | null = null;

  const state = reactive<ConverterState>({
    files: [],
    selectedFileId: null,
    outputFolder: "",
    profiles: [],
    selectedProfileId: null,
    selectedProfileDraft: null,
    profilesFilePath: null,
    tooling: null,
    availableEncoders: [],
    lastError: null,
    isConverting: false,
    isBatchRunning: false,
    batchProgress: null,
    profileActionMessage: null,
  });

  const currentFile = computed(() =>
    state.files.find((file) => file.id === state.selectedFileId) ?? null,
  );

  const currentProfile = computed(() =>
    state.selectedProfileDraft,
  );

  const commandPreview = computed(() => {
    const file = currentFile.value;
    if (!file) {
      return buildFfmpegCommandPreview("", "", currentProfile.value);
    }
    return buildFfmpegCommandPreview(file.inputPath, file.outputPath, currentProfile.value);
  });

  const videoCodecOptions = computed(() =>
    buildCodecOptions("video", state.availableEncoders, state.profiles.map((profile) => profile.video.codec)),
  );

  const audioCodecOptions = computed(() =>
    buildCodecOptions("audio", state.availableEncoders, state.profiles.map((profile) => profile.audio.codec)),
  );

  async function initialize() {
    if (!unsubscribeProgress) {
      unsubscribeProgress = await client.subscribeToConversionProgress((progress) => {
        if (state.batchProgress && state.batchProgress.phase === "running") {
          const fileIndex = state.batchProgress.currentFileIndex;
          const fileId = activeBatchFileIds[fileIndex];
          const file = state.files.find((candidate) => candidate.id === fileId);
          if (file) {
            file.progress = progress;
            const completedCount = activeBatchFileIds.filter(
              (id) => activeBatchStatuses.get(id) === "completed",
            ).length;
            const currentPercent = progress.percent ?? 0;
            state.batchProgress.overallPercent =
              ((completedCount + currentPercent / 100) / state.batchProgress.totalFiles) * 100;
          }
        }
      });
    }

    const [tooling, loadedProfiles, availableEncoders, profilesFilePath] = await Promise.all([
      client.getToolingStatus(),
      client.loadProfiles(),
      client.getAvailableEncoders().catch(() => []),
      client.getProfilesFilePath().catch(() => null),
    ]);
    const profiles = loadedProfiles.length
      ? loadedProfiles
      : await client.replaceProfiles(createStarterProfiles()).catch(() => createStarterProfiles());
    state.tooling = tooling;
    state.profiles = profiles;
    state.availableEncoders = availableEncoders;
    state.profilesFilePath = profilesFilePath;
    applySelectedProfile(state.profiles[0]?.id ?? null);
  }

  // --- File management ---

  function createSourceFile(inputPath: string): SourceFile {
    const container = currentProfile.value?.container ?? "mp4";
    const outputPath = state.outputFolder
      ? suggestBatchOutputPath(inputPath, state.outputFolder, container)
      : suggestOutputPath(inputPath, container);

    return {
      id: crypto.randomUUID(),
      inputPath,
      outputPath,
      probe: null,
      isProbing: false,
      isGeneratingThumbnail: false,
      thumbnail: null,
      progress: null,
      conversionStartedAt: null,
      conversionCompletedAt: null,
      outputSizeBytes: null,
      status: "pending",
    };
  }

  function patchSourceFile(fileId: string, patch: Partial<SourceFile>) {
    const fileIndex = state.files.findIndex((file) => file.id === fileId);
    if (fileIndex === -1) {
      return;
    }

    state.files[fileIndex] = {
      ...state.files[fileIndex],
      ...patch,
    };
  }

  async function probeFile(file: SourceFile) {
    patchSourceFile(file.id, {
      isProbing: true,
      isGeneratingThumbnail: true,
      thumbnail: null,
    });
    try {
      const probe = await client.probeMedia(file.inputPath);
      patchSourceFile(file.id, { probe });
    } catch {
      // Probe failure is non-fatal; file stays in list without probe data
    } finally {
      patchSourceFile(file.id, { isProbing: false });
    }

    // Generate thumbnail in background (non-blocking)
    client.getThumbnail(file.inputPath).then(
      (dataUrl) => {
        patchSourceFile(file.id, {
          thumbnail: dataUrl,
          isGeneratingThumbnail: false,
        });
      },
      () => {
        // Thumbnail generation failure is non-fatal
        patchSourceFile(file.id, { isGeneratingThumbnail: false });
      },
    );
  }

  async function addFiles(paths: string[]) {
    const newFiles = paths.map((path) => createSourceFile(path));
    state.files.push(...newFiles);

    if (!state.selectedFileId && newFiles.length > 0) {
      state.selectedFileId = newFiles[0].id;
    }

    if (!state.outputFolder && newFiles.length > 0) {
      state.outputFolder = dirname(newFiles[0].inputPath);
    }

    const container = currentProfile.value?.container ?? "mp4";
    for (const file of newFiles) {
      file.outputPath = state.outputFolder
        ? suggestBatchOutputPath(file.inputPath, state.outputFolder, container)
        : suggestOutputPath(file.inputPath, container);
    }

    state.lastError = null;
    await Promise.all(newFiles.map((file) => probeFile(file)));
  }

  async function pickInputFiles() {
    const paths = await client.chooseInputFiles();
    if (!paths) {
      return;
    }
    await addFiles(paths);
  }

  async function pickInputFolder() {
    const folder = await client.chooseFolder();
    if (!folder) {
      return;
    }
    // For now, just open the folder dialog — the user will use "Open files" for individual selection
    // In the future we could scan the folder for media files
    // For now this sets the output folder
    state.outputFolder = folder;
    rederiveOutputPaths();
  }

  function removeFile(fileId: string) {
    state.files = state.files.filter((file) => file.id !== fileId);
    if (state.selectedFileId === fileId) {
      state.selectedFileId = state.files[0]?.id ?? null;
    }
  }

  function clearFiles() {
    state.files = [];
    state.selectedFileId = null;
    if (!state.isBatchRunning) {
      state.batchProgress = null;
    }
    state.lastError = null;
  }

  function selectFile(fileId: string) {
    state.selectedFileId = fileId;
  }

  function updateFileOutputPath(fileId: string, outputPath: string) {
    const file = state.files.find((f) => f.id === fileId);
    if (file) {
      file.outputPath = outputPath;
    }
  }

  // --- Output folder ---

  async function pickOutputFolder() {
    const folder = await client.chooseOutputFolder();
    if (folder) {
      state.outputFolder = folder;
      rederiveOutputPaths();
    }
  }

  function setOutputFolder(folder: string) {
    state.outputFolder = folder;
    rederiveOutputPaths();
  }

  function rederiveOutputPaths() {
    const container = currentProfile.value?.container ?? "mp4";
    for (const file of state.files) {
      if (state.outputFolder) {
        file.outputPath = suggestBatchOutputPath(file.inputPath, state.outputFolder, container);
      } else {
        file.outputPath = suggestOutputPath(file.inputPath, container);
      }
    }
  }

  function isBatchCancelled() {
    return state.batchProgress?.phase === "cancelled";
  }

  function applySelectedProfile(profileId: string | null) {
    state.selectedProfileId = profileId;
    state.selectedProfileDraft = profileId
      ? copyProfile(state.profiles.find((profile) => profile.id === profileId) ?? createDefaultProfile())
      : null;
    rederiveOutputPaths();
  }

  // --- Profile management ---

  function selectProfile(profileId: string) {
    applySelectedProfile(profileId);
    state.profileActionMessage = null;
  }

  function updateCurrentProfile(profile: ConversionProfile) {
    state.selectedProfileDraft = copyProfile(profile);
    state.profileActionMessage = null;
    rederiveOutputPaths();
  }

  async function createNewProfile() {
    const profile = createDefaultProfile({
      name: "New profile",
    });
    const saved = await client.saveProfile(profile);
    state.profiles = upsertProfile(state.profiles, saved);
    applySelectedProfile(saved.id);
    state.profileActionMessage = `Created profile "${saved.name}".`;
  }

  async function duplicateCurrentProfile() {
    if (!currentProfile.value) {
      return;
    }

    const copy = cloneProfile(
      currentProfile.value,
      createUniqueProfileName(`${currentProfile.value.name} Copy`, state.profiles),
    );
    const saved = await client.saveProfile(copy);
    state.profiles = upsertProfile(state.profiles, saved);
    applySelectedProfile(saved.id);
    state.profileActionMessage = `Duplicated profile as "${saved.name}".`;
  }

  async function saveCurrentProfile(saveAsNew = false) {
    const profile = currentProfile.value;
    if (!profile) {
      return;
    }

    const profileToSave = saveAsNew
      ? cloneProfile(profile, createUniqueProfileName(`${profile.name} Copy`, state.profiles))
      : profile;
    const saved = await client.saveProfile(profileToSave);
    state.profiles = upsertProfile(state.profiles, saved);
    applySelectedProfile(saved.id);
    state.profileActionMessage = saveAsNew
      ? `Saved as new profile "${saved.name}".`
      : `Saved profile "${saved.name}".`;
  }

  async function deleteProfile(profileId: string) {
    const deletedProfile = state.profiles.find((profile) => profile.id === profileId);
    await client.deleteProfile(profileId);
    state.profiles = state.profiles.filter((profile) => profile.id !== profileId);
    applySelectedProfile(state.profiles[0]?.id ?? null);
    state.profileActionMessage = deletedProfile
      ? `Deleted profile "${deletedProfile.name}".`
      : "Deleted profile.";
  }

  async function importProfiles() {
    const filePath = await client.chooseProfilesImportFile();
    if (!filePath) {
      return;
    }

    const profiles = await client.importProfiles(filePath);
    state.profiles = profiles;
    applySelectedProfile(profiles[0]?.id ?? null);
    state.profileActionMessage = `Imported ${profiles.length} profile${profiles.length === 1 ? "" : "s"} from JSON.`;
  }

  async function exportProfiles() {
    const defaultPath = state.profilesFilePath
      ? state.profilesFilePath.replace(/profiles\.json$/i, "freemux-profiles.json")
      : "freemux-profiles.json";
    const filePath = await client.chooseProfilesExportFile(defaultPath);
    if (!filePath) {
      return;
    }

    await client.exportProfiles(filePath);
    state.profileActionMessage = `Exported profiles to ${filePath}.`;
  }

  async function openProfilesJson() {
    const filePath = state.profilesFilePath ?? await client.getProfilesFilePath().catch(() => null);
    if (!filePath) {
      state.lastError = "Unable to locate profiles.json.";
      return;
    }

    state.profilesFilePath = filePath;
    await client.openPath(filePath);
    state.profileActionMessage = "Opened profiles.json.";
  }

  // --- Conversion ---

  async function runBatchConversion() {
    const profile = currentProfile.value;
    if (!profile || state.files.length === 0 || state.isBatchRunning) {
      return;
    }

    const filesToProcess = state.files.slice();
    activeBatchFileIds = filesToProcess.map((file) => file.id);
    activeBatchStatuses = new Map(filesToProcess.map((file) => [file.id, "pending"]));
    currentBatchCompletion = new Promise<void>((resolve) => {
      resolveCurrentBatchCompletion = resolve;
    });
    state.isConverting = true;
    state.isBatchRunning = true;
    state.lastError = null;
    state.batchProgress = {
      phase: "running",
      currentFileIndex: 0,
      totalFiles: filesToProcess.length,
      overallPercent: 0,
      startedAt: Date.now(),
      completedAt: null,
    };

    // Reset all file statuses
    for (const file of filesToProcess) {
      activeBatchStatuses.set(file.id, "pending");
      file.status = "pending";
      file.progress = null;
      file.conversionStartedAt = null;
      file.conversionCompletedAt = null;
      file.outputSizeBytes = null;
    }

    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        if (isBatchCancelled()) {
          break;
        }

        const file = filesToProcess[i];
        state.batchProgress.currentFileIndex = i;
        activeBatchStatuses.set(file.id, "running");
        file.status = "running";
        file.conversionStartedAt = Date.now();
        file.conversionCompletedAt = null;
        file.outputSizeBytes = null;
        file.progress = {
          phase: "running",
          percent: 0,
          frame: null,
          fps: null,
          speed: null,
          outputTimeSeconds: 0,
          totalDurationSeconds: file.probe?.format.durationSeconds ?? null,
          rawLine: "Starting conversion...",
        };

        try {
          const result = await client.runConversion({
            inputPath: file.inputPath,
            outputPath: file.outputPath,
            profile,
          });

          if (isBatchCancelled()) {
            break;
          }

          if (!result.success) {
            throw new Error(result.stderr || `Conversion failed with exit code ${result.exitCode}`);
          }

          activeBatchStatuses.set(file.id, "completed");
          file.status = "completed";
          file.conversionCompletedAt = Date.now();
          file.outputSizeBytes = await client.getFileSize(file.outputPath).catch(() => null);
          file.progress = {
            ...(file.progress ?? {
              frame: null,
              fps: null,
              speed: null,
              outputTimeSeconds: null,
              totalDurationSeconds: null,
              rawLine: null,
            }),
            phase: "completed",
            percent: 100,
            rawLine: "Conversion completed.",
          };
        } catch (error) {
          if (isBatchCancelled()) {
            break;
          }

          activeBatchStatuses.set(file.id, "failed");
          file.status = "failed";
          file.conversionCompletedAt = Date.now();
          file.progress = {
            ...(file.progress ?? {
              percent: null,
              frame: null,
              fps: null,
              speed: null,
              outputTimeSeconds: null,
              totalDurationSeconds: null,
              rawLine: null,
            }),
            phase: "failed",
            rawLine: error instanceof Error ? error.message : String(error),
          };
          state.lastError = error instanceof Error ? error.message : String(error);
        }

        const completedCount = activeBatchFileIds.filter(
          (id) => activeBatchStatuses.get(id) === "completed",
        ).length;
        state.batchProgress.overallPercent =
          (completedCount / activeBatchFileIds.length) * 100;
      }

      if (state.batchProgress && state.batchProgress.phase !== "cancelled") {
        const anyFailed = activeBatchFileIds.some((id) => activeBatchStatuses.get(id) === "failed");
        state.batchProgress.phase = anyFailed ? "failed" : "completed";
        state.batchProgress.overallPercent = anyFailed
          ? state.batchProgress.overallPercent
          : 100;
        state.batchProgress.completedAt = Date.now();
      }
    } finally {
      if (state.batchProgress && state.batchProgress.completedAt === null) {
        state.batchProgress.completedAt = Date.now();
      }
      state.isConverting = false;
      state.isBatchRunning = false;
      activeBatchFileIds = [];
      activeBatchStatuses = new Map();
      resolveCurrentBatchCompletion?.();
      resolveCurrentBatchCompletion = null;
      currentBatchCompletion = null;
    }
  }

  async function cancelConversion() {
    if (state.batchProgress) {
      state.batchProgress.phase = "cancelled";
    }
    try {
      await client.cancelConversion();
    } catch {
      // Cancel is best-effort
    }
    await currentBatchCompletion;
  }

  async function openOutputFolder() {
    if (state.outputFolder) {
      await client.openPath(state.outputFolder);
    } else if (state.files.length > 0) {
      const firstCompleted = state.files.find((f) => f.status === "completed");
      if (firstCompleted) {
        await client.revealInFolder(firstCompleted.outputPath);
      }
    }
  }

  async function openInPlayer(filePath: string) {
    await client.openPath(filePath);
  }

  async function openOutputFile(fileId: string) {
    const file = state.files.find((f) => f.id === fileId);
    if (file && file.status === "completed") {
      await client.openPath(file.outputPath);
    }
  }

  // --- Backward compatibility (used during transition) ---

  // Single-file convenience for picking one file (legacy flow)
  async function pickInputFile() {
    const path = await client.chooseInputFile();
    if (!path) {
      return;
    }
    await addFiles([path]);
  }

  function dispose() {
    unsubscribeProgress?.();
    unsubscribeProgress = null;
  }

  return {
    state,
    currentFile,
    currentProfile,
    commandPreview,
    videoCodecOptions,
    audioCodecOptions,
    initialize,
    // File management
    addFiles,
    pickInputFiles,
    pickInputFile,
    pickInputFolder,
    removeFile,
    clearFiles,
    selectFile,
    updateFileOutputPath,
    // Output folder
    pickOutputFolder,
    setOutputFolder,
    // Profiles
    selectProfile,
    updateCurrentProfile,
    createNewProfile,
    duplicateCurrentProfile,
    saveCurrentProfile,
    deleteProfile,
    importProfiles,
    exportProfiles,
    openProfilesJson,
    // Conversion
    runBatchConversion,
    cancelConversion,
    openInPlayer,
    openOutputFolder,
    openOutputFile,
    dispose,
  };
}

function buildCodecOptions(
  mediaType: EncoderOption["mediaType"],
  availableEncoders: EncoderOption[],
  activeCodecs: string[],
): EncoderOption[] {
  const fallbackNames = mediaType === "video" ? FALLBACK_VIDEO_CODECS : FALLBACK_AUDIO_CODECS;
  const fallbackOptions = fallbackNames.map((name) => createFallbackEncoderOption(name, mediaType));
  const discoveredOptions = availableEncoders.filter((encoder) => encoder.mediaType === mediaType);
  const currentOptions = activeCodecs
    .filter(Boolean)
    .map((name) => createFallbackEncoderOption(name, mediaType));

  return dedupeCodecOptions([...currentOptions, ...discoveredOptions, ...fallbackOptions]);
}

function createFallbackEncoderOption(
  name: string,
  mediaType: EncoderOption["mediaType"],
): EncoderOption {
  return {
    name,
    label: name,
    description: null,
    mediaType,
    isHardwareAccelerated: /(_nvenc|_qsv|_vaapi|_videotoolbox|_amf)$/.test(name),
  };
}

function dedupeCodecOptions(options: EncoderOption[]): EncoderOption[] {
  const seen = new Set<string>();
  return options
    .filter((option) => {
      if (seen.has(option.name)) {
        return false;
      }
      seen.add(option.name);
      return true;
    })
    .sort((left, right) => {
      if (left.name === "copy") return -1;
      if (right.name === "copy") return 1;
      if (left.name === "none") return 1;
      if (right.name === "none") return -1;
      if (left.isHardwareAccelerated !== right.isHardwareAccelerated) {
        return left.isHardwareAccelerated ? 1 : -1;
      }
      return left.label.localeCompare(right.label);
    });
}

function createUniqueProfileName(baseName: string, profiles: ConversionProfile[]): string {
  const existingNames = new Set(profiles.map((profile) => profile.name));
  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let index = 2;
  let candidate = `${baseName} ${index}`;

  while (existingNames.has(candidate)) {
    index += 1;
    candidate = `${baseName} ${index}`;
  }

  return candidate;
}

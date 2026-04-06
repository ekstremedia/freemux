import { computed, reactive } from "vue";
import type { UnlistenFn } from "@tauri-apps/api/event";
import {
  cloneProfile,
  createDefaultProfile,
  createStarterProfiles,
  upsertProfile,
  type ConversionProfile,
} from "@/domain/conversion";
import type {
  BatchProgress,
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
  tooling: ToolingStatus | null;
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
    tooling: null,
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
    state.profiles.find((profile) => profile.id === state.selectedProfileId) ?? null,
  );

  const commandPreview = computed(() => {
    const file = currentFile.value;
    if (!file) {
      return buildFfmpegCommandPreview("", "", currentProfile.value);
    }
    return buildFfmpegCommandPreview(file.inputPath, file.outputPath, currentProfile.value);
  });

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

    const [tooling, profiles] = await Promise.all([client.getToolingStatus(), client.loadProfiles()]);
    state.tooling = tooling;
    state.profiles = profiles.length ? profiles : createStarterProfiles();
    state.selectedProfileId = state.profiles[0]?.id ?? null;
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
      thumbnail: null,
      progress: null,
      status: "pending",
    };
  }

  async function probeFile(file: SourceFile) {
    file.isProbing = true;
    try {
      file.probe = await client.probeMedia(file.inputPath);
    } catch {
      // Probe failure is non-fatal; file stays in list without probe data
    } finally {
      file.isProbing = false;
    }

    // Generate thumbnail in background (non-blocking)
    client.getThumbnail(file.inputPath).then(
      (dataUrl) => {
        file.thumbnail = dataUrl;
      },
      () => {
        // Thumbnail generation failure is non-fatal
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
    rederiveOutputPaths();
  }

  // --- Profile management ---

  function selectProfile(profileId: string) {
    applySelectedProfile(profileId);
    state.profileActionMessage = null;
  }

  function updateCurrentProfile(profile: ConversionProfile) {
    state.profiles = upsertProfile(state.profiles, profile);
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
    };

    // Reset all file statuses
    for (const file of filesToProcess) {
      activeBatchStatuses.set(file.id, "pending");
      file.status = "pending";
      file.progress = null;
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
      }
    } finally {
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
      await client.revealInFolder(state.outputFolder);
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
    // Conversion
    runBatchConversion,
    cancelConversion,
    openInPlayer,
    openOutputFolder,
    openOutputFile,
    dispose,
  };
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

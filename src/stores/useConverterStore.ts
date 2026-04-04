import { computed, reactive } from "vue";
import type { UnlistenFn } from "@tauri-apps/api/event";
import {
  cloneProfile,
  createDefaultProfile,
  createStarterProfiles,
  upsertProfile,
  type ConversionProfile,
} from "@/domain/conversion";
import type { ConversionProgress, MediaProbe, ToolingStatus } from "@/domain/media";
import { tauriDesktopClient, type DesktopClient } from "@/services/desktopClient";
import { buildFfmpegCommandPreview } from "@/utils/ffmpegArgs";
import { suggestOutputPath } from "@/utils/pathing";

interface ConverterState {
  profiles: ConversionProfile[];
  selectedProfileId: string | null;
  inputPath: string;
  outputPath: string;
  probe: MediaProbe | null;
  tooling: ToolingStatus | null;
  lastError: string | null;
  isProbing: boolean;
  isConverting: boolean;
  conversionProgress: ConversionProgress | null;
}

export function createConverterStore(client: DesktopClient = tauriDesktopClient) {
  let unsubscribeProgress: UnlistenFn | null = null;

  const state = reactive<ConverterState>({
    profiles: [],
    selectedProfileId: null,
    inputPath: "",
    outputPath: "",
    probe: null,
    tooling: null,
    lastError: null,
    isProbing: false,
    isConverting: false,
    conversionProgress: null,
  });

  const currentProfile = computed(() =>
    state.profiles.find((profile) => profile.id === state.selectedProfileId) ?? null,
  );

  const commandPreview = computed(() =>
    buildFfmpegCommandPreview(state.inputPath, state.outputPath, currentProfile.value),
  );

  async function initialize() {
    if (!unsubscribeProgress) {
      unsubscribeProgress = await client.subscribeToConversionProgress((progress) => {
        state.conversionProgress = progress;
      });
    }

    const [tooling, profiles] = await Promise.all([client.getToolingStatus(), client.loadProfiles()]);
    state.tooling = tooling;
    state.profiles = profiles.length ? profiles : createStarterProfiles();
    state.selectedProfileId = state.profiles[0]?.id ?? null;
  }

  async function pickInputFile() {
    const path = await client.chooseInputFile();
    if (!path) {
      return;
    }

    state.inputPath = path;
    state.outputPath = suggestOutputPath(path, currentProfile.value?.container ?? "mp4");
    state.lastError = null;
    await probeInput();
  }

  async function pickOutputFile() {
    const path = await client.chooseOutputFile(
      state.outputPath || suggestOutputPath(state.inputPath, currentProfile.value?.container ?? "mp4"),
    );

    if (path) {
      state.outputPath = path;
    }
  }

  function setOutputPath(outputPath: string) {
    state.outputPath = outputPath;
  }

  async function probeInput() {
    if (!state.inputPath) {
      return;
    }

    state.isProbing = true;
    state.lastError = null;

    try {
      state.probe = await client.probeMedia(state.inputPath);
    } catch (error) {
      state.lastError = error instanceof Error ? error.message : String(error);
    } finally {
      state.isProbing = false;
    }
  }

  function selectProfile(profileId: string) {
    state.selectedProfileId = profileId;
    const profile = state.profiles.find((item) => item.id === profileId);

    if (profile && state.inputPath) {
      state.outputPath = suggestOutputPath(state.inputPath, profile.container);
    }
  }

  function updateCurrentProfile(profile: ConversionProfile) {
    state.profiles = upsertProfile(state.profiles, profile);

    if (state.inputPath) {
      state.outputPath = suggestOutputPath(state.inputPath, profile.container);
    }
  }

  function createNewProfile() {
    const profile = createDefaultProfile({
      name: "New profile",
    });
    state.profiles = upsertProfile(state.profiles, profile);
    state.selectedProfileId = profile.id;
  }

  function duplicateCurrentProfile() {
    if (!currentProfile.value) {
      return;
    }

    const copy = cloneProfile(currentProfile.value);
    state.profiles = upsertProfile(state.profiles, copy);
    state.selectedProfileId = copy.id;
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
    state.selectedProfileId = saved.id;
  }

  async function deleteProfile(profileId: string) {
    await client.deleteProfile(profileId);
    state.profiles = state.profiles.filter((profile) => profile.id !== profileId);
    state.selectedProfileId = state.profiles[0]?.id ?? null;
  }

  async function runConversion() {
    if (!currentProfile.value || !state.inputPath || !state.outputPath) {
      return;
    }

    state.isConverting = true;
    state.lastError = null;
    state.conversionProgress = {
      phase: "running",
      percent: 0,
      frame: null,
      fps: null,
      speed: null,
      outputTimeSeconds: 0,
      totalDurationSeconds: state.probe?.format.durationSeconds ?? null,
      rawLine: "Starting conversion...",
    };

    try {
      const result = await client.runConversion({
        inputPath: state.inputPath,
        outputPath: state.outputPath,
        profile: currentProfile.value,
      });

      if (!result.success) {
        throw new Error(result.stderr || `Conversion failed with exit code ${result.exitCode}`);
      }

      state.conversionProgress = {
        ...(state.conversionProgress ?? {
          frame: null,
          fps: null,
          speed: null,
          outputTimeSeconds: state.probe?.format.durationSeconds ?? null,
          totalDurationSeconds: state.probe?.format.durationSeconds ?? null,
          rawLine: null,
        }),
        phase: "completed",
        percent: 100,
        rawLine: "Conversion completed.",
      };
    } catch (error) {
      state.conversionProgress = {
        ...(state.conversionProgress ?? {
          percent: null,
          frame: null,
          fps: null,
          speed: null,
          outputTimeSeconds: null,
          totalDurationSeconds: state.probe?.format.durationSeconds ?? null,
          rawLine: null,
        }),
        phase: "failed",
        rawLine: error instanceof Error ? error.message : String(error),
      };
      state.lastError = error instanceof Error ? error.message : String(error);
    } finally {
      state.isConverting = false;
    }
  }

  function dispose() {
    unsubscribeProgress?.();
    unsubscribeProgress = null;
  }

  return {
    state,
    currentProfile,
    commandPreview,
    initialize,
    pickInputFile,
    pickOutputFile,
    setOutputPath,
    probeInput,
    selectProfile,
    updateCurrentProfile,
    createNewProfile,
    duplicateCurrentProfile,
    saveCurrentProfile,
    deleteProfile,
    runConversion,
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

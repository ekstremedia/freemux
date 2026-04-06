import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import type { ConversionProfile, ConversionRunRequest } from "@/domain/conversion";
import type {
  ConversionProgress,
  ConversionResult,
  MediaProbe,
  ToolingStatus,
} from "@/domain/media";

export interface DesktopClient {
  chooseInputFile(): Promise<string | null>;
  chooseInputFiles(): Promise<string[] | null>;
  chooseFolder(): Promise<string | null>;
  chooseOutputFile(defaultPath: string | null): Promise<string | null>;
  chooseOutputFolder(): Promise<string | null>;
  probeMedia(inputPath: string): Promise<MediaProbe>;
  getThumbnail(inputPath: string): Promise<string>;
  getToolingStatus(): Promise<ToolingStatus>;
  loadProfiles(): Promise<ConversionProfile[]>;
  saveProfile(profile: ConversionProfile): Promise<ConversionProfile>;
  deleteProfile(profileId: string): Promise<void>;
  runConversion(request: ConversionRunRequest): Promise<ConversionResult>;
  cancelConversion(): Promise<void>;
  openPath(path: string): Promise<void>;
  revealInFolder(path: string): Promise<void>;
  subscribeToConversionProgress(
    onProgress: (progress: ConversionProgress) => void,
  ): Promise<UnlistenFn>;
}

const MEDIA_FILTERS = [
  {
    name: "Media",
    extensions: ["mp4", "mkv", "mov", "avi", "webm", "mp3", "wav", "m4a", "flac", "ogg", "ts", "mts"],
  },
];

export async function chooseDirectory(): Promise<string | null> {
  const result = await open({
    multiple: false,
    directory: true,
  });

  return typeof result === "string" ? result : null;
}

export const tauriDesktopClient: DesktopClient = {
  async chooseInputFile() {
    const result = await open({
      multiple: false,
      directory: false,
      filters: MEDIA_FILTERS,
    });

    return typeof result === "string" ? result : null;
  },

  async chooseInputFiles() {
    const result = await open({
      multiple: true,
      directory: false,
      filters: MEDIA_FILTERS,
    });

    if (Array.isArray(result)) {
      return result.length > 0 ? result : null;
    }

    return typeof result === "string" ? [result] : null;
  },

  async chooseFolder() {
    return chooseDirectory();
  },

  async chooseOutputFile(defaultPath) {
    const result = await save({
      defaultPath: defaultPath ?? undefined,
    });

    return typeof result === "string" ? result : null;
  },

  async chooseOutputFolder() {
    return chooseDirectory();
  },

  probeMedia(inputPath) {
    return invoke<MediaProbe>("probe_media", { inputPath });
  },

  getThumbnail(inputPath) {
    return invoke<string>("get_thumbnail", { inputPath });
  },

  getToolingStatus() {
    return invoke<ToolingStatus>("get_tooling_status");
  },

  loadProfiles() {
    return invoke<ConversionProfile[]>("load_profiles");
  },

  saveProfile(profile) {
    return invoke<ConversionProfile>("save_profile", { profile });
  },

  deleteProfile(profileId) {
    return invoke<void>("delete_profile", { profileId });
  },

  runConversion(request) {
    return invoke<ConversionResult>("run_conversion", { request });
  },

  cancelConversion() {
    return invoke<void>("cancel_conversion");
  },

  async openPath(path) {
    await openPath(path);
  },

  async revealInFolder(path) {
    await revealItemInDir(path);
  },

  subscribeToConversionProgress(onProgress) {
    return listen<ConversionProgress>("conversion-progress", (event) => {
      onProgress(event.payload);
    });
  },
};

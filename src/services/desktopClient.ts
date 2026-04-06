import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import type { ConversionProfile, ConversionRunRequest } from "@/domain/conversion";
import type {
  ConversionProgress,
  ConversionResult,
  EncoderOption,
  MediaProbe,
  ToolingStatus,
} from "@/domain/media";

export interface DesktopClient {
  chooseInputFile(): Promise<string | null>;
  chooseInputFiles(): Promise<string[] | null>;
  chooseFolder(): Promise<string | null>;
  chooseOutputFile(defaultPath: string | null): Promise<string | null>;
  chooseOutputFolder(): Promise<string | null>;
  chooseProfilesImportFile(): Promise<string | null>;
  chooseProfilesExportFile(defaultPath: string | null): Promise<string | null>;
  probeMedia(inputPath: string): Promise<MediaProbe>;
  getThumbnail(inputPath: string): Promise<string>;
  getToolingStatus(): Promise<ToolingStatus>;
  getAvailableEncoders(): Promise<EncoderOption[]>;
  getFileSize(path: string): Promise<number | null>;
  loadProfiles(): Promise<ConversionProfile[]>;
  saveProfile(profile: ConversionProfile): Promise<ConversionProfile>;
  replaceProfiles(profiles: ConversionProfile[]): Promise<ConversionProfile[]>;
  deleteProfile(profileId: string): Promise<void>;
  importProfiles(filePath: string): Promise<ConversionProfile[]>;
  exportProfiles(filePath: string): Promise<void>;
  getProfilesFilePath(): Promise<string>;
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

const PROFILE_FILTERS = [
  {
    name: "JSON",
    extensions: ["json"],
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

  async chooseProfilesImportFile() {
    const result = await open({
      multiple: false,
      directory: false,
      filters: PROFILE_FILTERS,
    });

    return typeof result === "string" ? result : null;
  },

  async chooseProfilesExportFile(defaultPath) {
    const result = await save({
      defaultPath: defaultPath ?? undefined,
      filters: PROFILE_FILTERS,
    });

    return typeof result === "string" ? result : null;
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

  getAvailableEncoders() {
    return invoke<EncoderOption[]>("get_available_encoders");
  },

  getFileSize(path) {
    return invoke<number | null>("get_file_size", { path });
  },

  loadProfiles() {
    return invoke<ConversionProfile[]>("load_profiles");
  },

  saveProfile(profile) {
    return invoke<ConversionProfile>("save_profile", { profile });
  },

  replaceProfiles(profiles) {
    return invoke<ConversionProfile[]>("replace_profiles", { profiles });
  },

  deleteProfile(profileId) {
    return invoke<void>("delete_profile", { profileId });
  },

  importProfiles(filePath) {
    return invoke<ConversionProfile[]>("import_profiles", { filePath });
  },

  exportProfiles(filePath) {
    return invoke<void>("export_profiles", { filePath });
  },

  getProfilesFilePath() {
    return invoke<string>("get_profiles_file_path");
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

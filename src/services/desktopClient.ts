import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { ConversionProfile, ConversionRunRequest } from "@/domain/conversion";
import type {
  ConversionProgress,
  ConversionResult,
  MediaProbe,
  ToolingStatus,
} from "@/domain/media";

export interface DesktopClient {
  chooseInputFile(): Promise<string | null>;
  chooseOutputFile(defaultPath: string | null): Promise<string | null>;
  probeMedia(inputPath: string): Promise<MediaProbe>;
  getToolingStatus(): Promise<ToolingStatus>;
  loadProfiles(): Promise<ConversionProfile[]>;
  saveProfile(profile: ConversionProfile): Promise<ConversionProfile>;
  deleteProfile(profileId: string): Promise<void>;
  runConversion(request: ConversionRunRequest): Promise<ConversionResult>;
  subscribeToConversionProgress(
    onProgress: (progress: ConversionProgress) => void,
  ): Promise<UnlistenFn>;
}

export const tauriDesktopClient: DesktopClient = {
  async chooseInputFile() {
    const result = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: "Media",
          extensions: ["mp4", "mkv", "mov", "avi", "webm", "mp3", "wav", "m4a"],
        },
      ],
    });

    return typeof result === "string" ? result : null;
  },

  async chooseOutputFile(defaultPath) {
    const result = await save({
      defaultPath: defaultPath ?? undefined,
    });

    return typeof result === "string" ? result : null;
  },

  probeMedia(inputPath) {
    return invoke<MediaProbe>("probe_media", { inputPath });
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

  subscribeToConversionProgress(onProgress) {
    return listen<ConversionProgress>("conversion-progress", (event) => {
      onProgress(event.payload);
    });
  },
};

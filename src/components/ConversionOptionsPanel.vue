<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  getAudioCodecBehavior,
  getVideoCodecBehavior,
  getVideoRateControlMode,
  type ConversionProfile,
  type ResolutionMode,
  type VideoRateControlMode,
} from "@/domain/conversion";
import type { EncoderOption } from "@/domain/media";

const props = defineProps<{
  profiles: ConversionProfile[];
  selectedProfileId: string | null;
  profile: ConversionProfile | null;
  profilesFilePath: string | null;
  profileActionMessage: string | null;
  videoCodecOptions: EncoderOption[];
  audioCodecOptions: EncoderOption[];
}>();

const isVideoCodecMenuOpen = ref(false);
const isAudioCodecMenuOpen = ref(false);
const isFrameRateMenuOpen = ref(false);
const isPixelFormatMenuOpen = ref(false);
const videoCodecQuery = ref("");
const audioCodecQuery = ref("");
const frameRateQuery = ref("");
const pixelFormatQuery = ref("");
const isVideoCodecSearching = ref(false);
const isAudioCodecSearching = ref(false);
const isFrameRateSearching = ref(false);
const isPixelFormatSearching = ref(false);

const FRAME_RATE_OPTIONS = ["23.976", "24", "25", "29.97", "30", "50", "59.94", "60"];
const PIXEL_FORMAT_OPTIONS = [
  "yuv420p",
  "yuv422p",
  "yuv444p",
  "yuv420p10le",
  "yuv422p10le",
  "yuv444p10le",
  "nv12",
  "p010le",
];

const emit = defineEmits<{
  selectProfile: [profileId: string];
  createProfile: [];
  saveProfile: [saveAsNew?: boolean];
  deleteProfile: [profileId: string];
  duplicateProfile: [];
  importProfiles: [];
  exportProfiles: [];
  openProfilesJson: [];
  updateProfile: [profile: ConversionProfile];
}>();

const videoCodecBehavior = computed(() =>
  props.profile ? getVideoCodecBehavior(props.profile.video.codec) : null,
);
const audioCodecBehavior = computed(() =>
  props.profile ? getAudioCodecBehavior(props.profile.audio.codec) : null,
);
const videoRateControlMode = computed<VideoRateControlMode>(() =>
  props.profile ? getVideoRateControlMode(props.profile) : "bitrate",
);
const filteredVideoCodecOptions = computed(() =>
  filterCodecOptions(props.videoCodecOptions, isVideoCodecSearching.value ? videoCodecQuery.value : ""),
);
const filteredAudioCodecOptions = computed(() =>
  filterCodecOptions(props.audioCodecOptions, isAudioCodecSearching.value ? audioCodecQuery.value : ""),
);
const filteredFrameRateOptions = computed(() =>
  filterStringOptions(FRAME_RATE_OPTIONS, isFrameRateSearching.value ? frameRateQuery.value : ""),
);
const filteredPixelFormatOptions = computed(() =>
  filterStringOptions(PIXEL_FORMAT_OPTIONS, isPixelFormatSearching.value ? pixelFormatQuery.value : ""),
);

watch(
  () => props.profile?.video.codec ?? "",
  (codec) => {
    if (!isVideoCodecMenuOpen.value) {
      videoCodecQuery.value = codec;
      isVideoCodecSearching.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => props.profile?.audio.codec ?? "",
  (codec) => {
    if (!isAudioCodecMenuOpen.value) {
      audioCodecQuery.value = codec;
      isAudioCodecSearching.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => (props.profile?.video.frameRate != null ? String(props.profile.video.frameRate) : ""),
  (frameRate) => {
    if (!isFrameRateMenuOpen.value) {
      frameRateQuery.value = frameRate;
      isFrameRateSearching.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => props.profile?.video.pixelFormat ?? "",
  (pixelFormat) => {
    if (!isPixelFormatMenuOpen.value) {
      pixelFormatQuery.value = pixelFormat;
      isPixelFormatSearching.value = false;
    }
  },
  { immediate: true },
);

function update<K extends keyof ConversionProfile>(key: K, value: ConversionProfile[K]) {
  if (!props.profile) {
    return;
  }

  emit("updateProfile", {
    ...props.profile,
    [key]: value,
  });
}

function updateVideo<K extends keyof ConversionProfile["video"]>(
  key: K,
  value: ConversionProfile["video"][K],
) {
  if (!props.profile) {
    return;
  }

  emit("updateProfile", {
    ...props.profile,
    video: {
      ...props.profile.video,
      [key]: value,
    },
  });
}

function updateAudio<K extends keyof ConversionProfile["audio"]>(
  key: K,
  value: ConversionProfile["audio"][K],
) {
  if (!props.profile) {
    return;
  }

  emit("updateProfile", {
    ...props.profile,
    audio: {
      ...props.profile.audio,
      [key]: value,
    },
  });
}

function updateResolution<K extends keyof ConversionProfile["video"]["resolution"]>(
  key: K,
  value: ConversionProfile["video"]["resolution"][K],
) {
  if (!props.profile) {
    return;
  }

  emit("updateProfile", {
    ...props.profile,
    video: {
      ...props.profile.video,
      resolution: {
        ...props.profile.video.resolution,
        [key]: value,
      },
    },
  });
}

function selectVideoCodec(codec: string) {
  if (!props.profile) {
    return;
  }

  const behavior = getVideoCodecBehavior(codec);
  emit("updateProfile", {
    ...props.profile,
    video: {
      ...props.profile.video,
      codec,
      bitrateKbps: behavior.supportsBitrate ? props.profile.video.bitrateKbps : null,
      crf: behavior.supportsCrf ? props.profile.video.crf : null,
      preset: behavior.supportsPreset ? props.profile.video.preset : null,
      pixelFormat: behavior.supportsPixelFormat ? props.profile.video.pixelFormat : null,
      frameRate: behavior.supportsFrameRate ? props.profile.video.frameRate : null,
      resolution: behavior.supportsResolution
        ? props.profile.video.resolution
        : {
            mode: "source",
            width: null,
            height: null,
          },
    },
  });
  videoCodecQuery.value = codec;
  isVideoCodecSearching.value = false;
  isVideoCodecMenuOpen.value = false;
}

function selectAudioCodec(codec: string) {
  if (!props.profile) {
    return;
  }

  const behavior = getAudioCodecBehavior(codec);
  emit("updateProfile", {
    ...props.profile,
    audio: {
      ...props.profile.audio,
      codec,
      bitrateKbps: behavior.supportsBitrate ? props.profile.audio.bitrateKbps : null,
      channels: behavior.supportsChannels ? props.profile.audio.channels : null,
      sampleRate: behavior.supportsSampleRate ? props.profile.audio.sampleRate : null,
    },
  });
  audioCodecQuery.value = codec;
  isAudioCodecSearching.value = false;
  isAudioCodecMenuOpen.value = false;
}

function handleVideoCodecInput(codec: string) {
  videoCodecQuery.value = codec;
  isVideoCodecSearching.value = true;
  isVideoCodecMenuOpen.value = true;
  updateVideo("codec", codec);
}

function handleAudioCodecInput(codec: string) {
  audioCodecQuery.value = codec;
  isAudioCodecSearching.value = true;
  isAudioCodecMenuOpen.value = true;
  updateAudio("codec", codec);
}

function setVideoRateControlMode(mode: VideoRateControlMode) {
  if (!props.profile) {
    return;
  }

  emit("updateProfile", {
    ...props.profile,
    video: {
      ...props.profile.video,
      crf: mode === "quality" ? (props.profile.video.crf ?? 21) : null,
      bitrateKbps: mode === "bitrate" ? props.profile.video.bitrateKbps : null,
    },
  });
}

function updateVideoBitrate(value: string) {
  if (!props.profile) {
    return;
  }

  emit("updateProfile", {
    ...props.profile,
    video: {
      ...props.profile.video,
      bitrateKbps: value ? Number(value) : null,
      crf: videoCodecBehavior.value?.supportsCrf ? null : props.profile.video.crf,
    },
  });
}

function updateVideoCrf(value: string) {
  if (!props.profile) {
    return;
  }

  emit("updateProfile", {
    ...props.profile,
    video: {
      ...props.profile.video,
      crf: value ? Number(value) : null,
      bitrateKbps: value ? null : props.profile.video.bitrateKbps,
    },
  });
}

function openFrameRateMenu() {
  frameRateQuery.value = props.profile?.video.frameRate != null ? String(props.profile.video.frameRate) : "";
  isFrameRateSearching.value = false;
  isFrameRateMenuOpen.value = true;
}

function closeFrameRateMenu() {
  isFrameRateMenuOpen.value = false;
  frameRateQuery.value = props.profile?.video.frameRate != null ? String(props.profile.video.frameRate) : "";
  isFrameRateSearching.value = false;
}

function handleFrameRateInput(value: string) {
  frameRateQuery.value = value;
  isFrameRateSearching.value = true;
  updateVideo("frameRate", value ? Number(value) : null);
  isFrameRateMenuOpen.value = true;
}

function selectFrameRate(value: string) {
  frameRateQuery.value = value;
  isFrameRateSearching.value = false;
  updateVideo("frameRate", value ? Number(value) : null);
  isFrameRateMenuOpen.value = false;
}

function openPixelFormatMenu() {
  pixelFormatQuery.value = props.profile?.video.pixelFormat ?? "";
  isPixelFormatSearching.value = false;
  isPixelFormatMenuOpen.value = true;
}

function closePixelFormatMenu() {
  isPixelFormatMenuOpen.value = false;
  pixelFormatQuery.value = props.profile?.video.pixelFormat ?? "";
  isPixelFormatSearching.value = false;
}

function handlePixelFormatInput(value: string) {
  pixelFormatQuery.value = value;
  isPixelFormatSearching.value = true;
  updateVideo("pixelFormat", value || null);
  isPixelFormatMenuOpen.value = true;
}

function selectPixelFormat(value: string) {
  pixelFormatQuery.value = value;
  isPixelFormatSearching.value = false;
  updateVideo("pixelFormat", value || null);
  isPixelFormatMenuOpen.value = false;
}

function openVideoCodecMenu() {
  videoCodecQuery.value = props.profile?.video.codec ?? "";
  isVideoCodecSearching.value = false;
  isVideoCodecMenuOpen.value = true;
}

function openAudioCodecMenu() {
  audioCodecQuery.value = props.profile?.audio.codec ?? "";
  isAudioCodecSearching.value = false;
  isAudioCodecMenuOpen.value = true;
}

function closeVideoCodecMenu() {
  isVideoCodecMenuOpen.value = false;
  videoCodecQuery.value = props.profile?.video.codec ?? "";
  isVideoCodecSearching.value = false;
}

function closeAudioCodecMenu() {
  isAudioCodecMenuOpen.value = false;
  audioCodecQuery.value = props.profile?.audio.codec ?? "";
  isAudioCodecSearching.value = false;
}

function filterCodecOptions(options: EncoderOption[], query: string): EncoderOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => {
    const haystack = [option.name, option.label, option.description ?? ""].join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

function filterStringOptions(options: string[], query: string): string[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => option.toLowerCase().includes(normalizedQuery));
}
</script>

<template>
  <section class="overflow-hidden rounded-[24px] border border-amber-200/15 bg-zinc-900/80 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl">
    <div class="px-5 pt-5">
      <div>
        <h2 class="m-0 text-lg font-semibold text-stone-100">Settings</h2>
        <p class="mt-1 text-sm text-stone-400">Select and configure conversion profiles.</p>
      </div>
    </div>

    <div class="grid gap-4 p-5">
      <div class="grid gap-4 rounded-2xl border border-white/5 bg-white/3 p-4">
        <label class="grid gap-1.5 text-sm text-stone-400">
          Profile
          <select
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            :value="selectedProfileId ?? ''"
            @change="$emit('selectProfile', ($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="item in profiles"
              :key="item.id"
              :value="item.id"
            >
              {{ item.name }}
            </option>
          </select>
        </label>

        <div class="flex flex-wrap gap-2">
          <button type="button" class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-amber-300/20 hover:bg-white/8" @click="$emit('createProfile')">New</button>
          <button type="button" class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-amber-300/20 hover:bg-white/8" @click="$emit('duplicateProfile')">Duplicate</button>
          <button type="button" class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-amber-300/20 hover:bg-white/8" @click="$emit('saveProfile', false)">Save</button>
          <button type="button" class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-amber-300/20 hover:bg-white/8" @click="$emit('saveProfile', true)">Save as new</button>
          <button type="button" class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-amber-300/20 hover:bg-white/8" @click="$emit('importProfiles')">Import JSON</button>
          <button type="button" class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-amber-300/20 hover:bg-white/8" @click="$emit('exportProfiles')">Export JSON</button>
          <button type="button" class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-amber-300/20 hover:bg-white/8" @click="$emit('openProfilesJson')">Open JSON</button>
          <button
            type="button"
            class="rounded-xl border border-rose-300/25 bg-rose-300/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:border-rose-300/35 hover:bg-rose-300/14 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!selectedProfileId"
            @click="selectedProfileId && $emit('deleteProfile', selectedProfileId)"
          >
            Delete
          </button>
        </div>

        <p
          v-if="profileActionMessage"
          role="status"
          aria-live="polite"
          class="m-0 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-200"
        >
          {{ profileActionMessage }}
        </p>

        <p class="m-0 text-sm text-stone-500">
          Profiles are stored in a shared JSON file so you can import, export, and move them between machines.
          <span v-if="profilesFilePath" class="text-stone-400"> Current file: {{ profilesFilePath }}</span>
        </p>
      </div>

      <template v-if="profile">
      <div class="grid gap-4 xl:grid-cols-2">
        <label class="grid gap-1.5 text-sm text-stone-400">
          Profile name
          <input
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            :value="profile.name"
            @input="update('name', ($event.target as HTMLInputElement).value)"
          />
        </label>

        <label class="grid gap-1.5 text-sm text-stone-400">
          Container
          <select
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            :value="profile.container"
            @change="update('container', ($event.target as HTMLSelectElement).value)"
          >
            <option value="mp4">mp4</option>
            <option value="mkv">mkv</option>
            <option value="mov">mov</option>
            <option value="webm">webm</option>
            <option value="mp3">mp3</option>
          </select>
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label class="grid gap-1.5 text-sm text-stone-400">
          Video codec
          <div class="relative">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input
                class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
                :value="videoCodecQuery"
                spellcheck="false"
                @focus="openVideoCodecMenu"
                @keydown.esc="closeVideoCodecMenu"
                @input="handleVideoCodecInput(($event.target as HTMLInputElement).value)"
              />
              <button
                type="button"
                class="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-200 transition hover:border-amber-300/20 hover:bg-white/8"
                :aria-expanded="isVideoCodecMenuOpen"
                @click="isVideoCodecMenuOpen ? closeVideoCodecMenu() : openVideoCodecMenu()"
              >
                Browse
              </button>
            </div>

            <div
              v-if="isVideoCodecMenuOpen"
              class="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/96 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl"
            >
              <button
                v-for="codec in filteredVideoCodecOptions"
                :key="codec.name"
                type="button"
                class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-stone-200 transition hover:bg-white/8"
                @mousedown.prevent
                @click="selectVideoCodec(codec.name)"
              >
                <span>{{ codec.label }}</span>
                <span v-if="codec.isHardwareAccelerated" class="text-xs uppercase tracking-wide text-amber-200">
                  hardware
                </span>
              </button>
              <div
                v-if="filteredVideoCodecOptions.length === 0"
                class="px-3 py-2 text-sm text-stone-500"
              >
                No matching codecs.
              </div>
            </div>
          </div>
        </label>

        <label
          v-if="videoCodecBehavior?.supportsCrf"
          class="grid gap-1.5 text-sm text-stone-400"
        >
          Rate control
          <select
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            :value="videoRateControlMode"
            @change="setVideoRateControlMode(($event.target as HTMLSelectElement).value as VideoRateControlMode)"
          >
            <option value="quality">Quality (CRF)</option>
            <option value="bitrate">Target bitrate</option>
          </select>
        </label>

        <label
          v-if="videoCodecBehavior?.supportsBitrate && (!videoCodecBehavior.supportsCrf || videoRateControlMode === 'bitrate')"
          class="grid gap-1.5 text-sm text-stone-400"
        >
          Video bitrate (kbps)
          <input
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            type="number"
            min="0"
            :value="profile.video.bitrateKbps ?? ''"
            @input="updateVideoBitrate(($event.target as HTMLInputElement).value)"
          />
        </label>

        <label
          v-if="videoCodecBehavior?.supportsCrf && videoRateControlMode === 'quality'"
          class="grid gap-1.5 text-sm text-stone-400"
        >
          CRF
          <input
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            type="number"
            min="0"
            max="51"
            :value="profile.video.crf ?? ''"
            @input="updateVideoCrf(($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label
          v-if="videoCodecBehavior?.supportsPreset"
          class="grid gap-1.5 text-sm text-stone-400"
        >
          Preset
          <select
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            :value="profile.video.preset ?? ''"
            @change="
              updateVideo(
                'preset',
                ($event.target as HTMLSelectElement).value || null,
              )
            "
          >
            <option value="">none</option>
            <option value="ultrafast">ultrafast</option>
            <option value="veryfast">veryfast</option>
            <option value="medium">medium</option>
            <option value="slow">slow</option>
          </select>
        </label>

        <label
          v-if="videoCodecBehavior?.supportsFrameRate"
          class="grid gap-1.5 text-sm text-stone-400"
        >
          Frame rate
          <div class="relative">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input
                class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
                type="text"
                inputmode="decimal"
                :value="frameRateQuery"
                spellcheck="false"
                @focus="openFrameRateMenu"
                @keydown.esc="closeFrameRateMenu"
                @input="handleFrameRateInput(($event.target as HTMLInputElement).value)"
              />
              <button
                type="button"
                class="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-200 transition hover:border-amber-300/20 hover:bg-white/8"
                :aria-expanded="isFrameRateMenuOpen"
                @click="isFrameRateMenuOpen ? closeFrameRateMenu() : openFrameRateMenu()"
              >
                Browse
              </button>
            </div>

            <div
              v-if="isFrameRateMenuOpen"
              class="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/96 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl"
            >
              <button
                v-for="option in filteredFrameRateOptions"
                :key="option"
                type="button"
                class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-stone-200 transition hover:bg-white/8"
                @mousedown.prevent
                @click="selectFrameRate(option)"
              >
                <span>{{ option }}</span>
              </button>
              <div
                v-if="filteredFrameRateOptions.length === 0"
                class="px-3 py-2 text-sm text-stone-500"
              >
                No matching frame rates.
              </div>
            </div>
          </div>
        </label>

        <label
          v-if="videoCodecBehavior?.supportsPixelFormat"
          class="grid gap-1.5 text-sm text-stone-400"
        >
          Pixel format
          <div class="relative">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input
                class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
                :value="pixelFormatQuery"
                spellcheck="false"
                @focus="openPixelFormatMenu"
                @keydown.esc="closePixelFormatMenu"
                @input="handlePixelFormatInput(($event.target as HTMLInputElement).value)"
              />
              <button
                type="button"
                class="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-200 transition hover:border-amber-300/20 hover:bg-white/8"
                :aria-expanded="isPixelFormatMenuOpen"
                @click="isPixelFormatMenuOpen ? closePixelFormatMenu() : openPixelFormatMenu()"
              >
                Browse
              </button>
            </div>

            <div
              v-if="isPixelFormatMenuOpen"
              class="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/96 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl"
            >
              <button
                v-for="option in filteredPixelFormatOptions"
                :key="option"
                type="button"
                class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-stone-200 transition hover:bg-white/8"
                @mousedown.prevent
                @click="selectPixelFormat(option)"
              >
                <span>{{ option }}</span>
              </button>
              <div
                v-if="filteredPixelFormatOptions.length === 0"
                class="px-3 py-2 text-sm text-stone-500"
              >
                No matching pixel formats.
              </div>
            </div>
          </div>
        </label>
      </div>

      <p
        v-if="videoCodecBehavior?.isCopy"
        class="m-0 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100"
      >
        Stream copy bypasses re-encoding, so bitrate, CRF, preset, scaling, pixel format, and frame-rate controls are disabled.
      </p>

      <div
        v-if="videoCodecBehavior?.supportsResolution"
        class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <label class="grid gap-1.5 text-sm text-stone-400">
          Resolution mode
          <select
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            :value="profile.video.resolution.mode"
            @change="
              updateResolution(
                'mode',
                ($event.target as HTMLSelectElement).value as ResolutionMode,
              )
            "
          >
            <option value="source">source</option>
            <option value="custom">custom</option>
          </select>
        </label>

        <label class="grid gap-1.5 text-sm text-stone-400">
          Width
          <input
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            type="number"
            min="0"
            :value="profile.video.resolution.width ?? ''"
            @input="
              updateResolution(
                'width',
                ($event.target as HTMLInputElement).value
                  ? Number(($event.target as HTMLInputElement).value)
                  : null,
              )
            "
          />
        </label>

        <label class="grid gap-1.5 text-sm text-stone-400">
          Height
          <input
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            type="number"
            min="0"
            :value="profile.video.resolution.height ?? ''"
            @input="
              updateResolution(
                'height',
                ($event.target as HTMLInputElement).value
                  ? Number(($event.target as HTMLInputElement).value)
                  : null,
              )
            "
          />
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label class="grid gap-1.5 text-sm text-stone-400">
          Audio codec
          <div class="relative">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input
                class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
                :value="audioCodecQuery"
                spellcheck="false"
                @focus="openAudioCodecMenu"
                @keydown.esc="closeAudioCodecMenu"
                @input="handleAudioCodecInput(($event.target as HTMLInputElement).value)"
              />
              <button
                type="button"
                class="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-200 transition hover:border-amber-300/20 hover:bg-white/8"
                :aria-expanded="isAudioCodecMenuOpen"
                @click="isAudioCodecMenuOpen ? closeAudioCodecMenu() : openAudioCodecMenu()"
              >
                Browse
              </button>
            </div>

            <div
              v-if="isAudioCodecMenuOpen"
              class="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/96 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl"
            >
              <button
                v-for="codec in filteredAudioCodecOptions"
                :key="codec.name"
                type="button"
                class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-stone-200 transition hover:bg-white/8"
                @mousedown.prevent
                @click="selectAudioCodec(codec.name)"
              >
                <span>{{ codec.label }}</span>
              </button>
              <div
                v-if="filteredAudioCodecOptions.length === 0"
                class="px-3 py-2 text-sm text-stone-500"
              >
                No matching codecs.
              </div>
            </div>
          </div>
        </label>

        <label
          v-if="audioCodecBehavior?.supportsBitrate"
          class="grid gap-1.5 text-sm text-stone-400"
        >
          Audio bitrate (kbps)
          <input
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            type="number"
            min="0"
            :value="profile.audio.bitrateKbps ?? ''"
            @input="
              updateAudio(
                'bitrateKbps',
                ($event.target as HTMLInputElement).value
                  ? Number(($event.target as HTMLInputElement).value)
                  : null,
              )
            "
          />
        </label>

        <label
          v-if="audioCodecBehavior?.supportsChannels"
          class="grid gap-1.5 text-sm text-stone-400"
        >
          Channels
          <input
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            type="number"
            min="1"
            max="8"
            :value="profile.audio.channels ?? ''"
            @input="
              updateAudio(
                'channels',
                ($event.target as HTMLInputElement).value
                  ? Number(($event.target as HTMLInputElement).value)
                  : null,
              )
            "
          />
        </label>
      </div>

      <p
        v-if="audioCodecBehavior?.isCopy || audioCodecBehavior?.isDisabled"
        class="m-0 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100"
      >
        {{
          audioCodecBehavior.isDisabled
            ? "Audio is disabled for this profile, so bitrate and channel controls are hidden."
            : "Audio stream copy bypasses re-encoding, so bitrate and channel controls are disabled."
        }}
      </p>

      <div class="grid gap-4 xl:grid-cols-2">
        <label
          v-if="audioCodecBehavior?.supportsSampleRate"
          class="grid gap-1.5 text-sm text-stone-400"
        >
          Sample rate
          <input
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            type="number"
            min="8000"
            step="1000"
            :value="profile.audio.sampleRate ?? ''"
            @input="
              updateAudio(
                'sampleRate',
                ($event.target as HTMLInputElement).value
                  ? Number(($event.target as HTMLInputElement).value)
                  : null,
              )
            "
          />
        </label>

        <label class="grid gap-1.5 text-sm text-stone-400">
          Extra FFmpeg args
          <textarea
            class="min-h-24 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-amber-300/30"
            :value="profile.extraArgs.join(' ')"
            @input="
              update(
                'extraArgs',
                (($event.target as HTMLTextAreaElement).value || '')
                  .split(/\s+/)
                  .filter(Boolean),
              )
            "
          />
        </label>
      </div>

      <label class="flex items-center gap-3 text-sm text-stone-300">
        <input
          class="h-4 w-4 rounded border-white/15 bg-white/5 text-amber-300"
          type="checkbox"
          :checked="profile.overwriteOutput"
          @change="update('overwriteOutput', ($event.target as HTMLInputElement).checked)"
        />
        Overwrite output if it already exists
      </label>
      </template>

      <div v-else class="p-5">
        <div class="rounded-2xl border border-dashed border-amber-200/15 px-4 py-5 text-sm text-stone-400">
          Select or create a profile to start editing conversion options.
        </div>
      </div>
    </div>
  </section>
</template>

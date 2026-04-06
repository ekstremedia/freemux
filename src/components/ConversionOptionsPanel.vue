<script setup lang="ts">
import type { ConversionProfile, ResolutionMode } from "@/domain/conversion";

const props = defineProps<{
  profiles: ConversionProfile[];
  selectedProfileId: string | null;
  profile: ConversionProfile | null;
  profileActionMessage: string | null;
}>();

const emit = defineEmits<{
  selectProfile: [profileId: string];
  createProfile: [];
  saveProfile: [saveAsNew?: boolean];
  deleteProfile: [profileId: string];
  duplicateProfile: [];
  updateProfile: [profile: ConversionProfile];
}>();

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
</script>

<template>
  <section class="overflow-hidden rounded-[24px] border border-amber-200/15 bg-zinc-900/80 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl">
    <div class="px-5 pt-5">
      <div>
        <h2 class="m-0 text-lg font-semibold text-stone-100">Settings</h2>
        <p class="mt-1 text-sm text-stone-400">Select and configure conversion profiles.</p>
      </div>
    </div>

    <div v-if="profile" class="grid gap-4 p-5">
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
          class="m-0 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-200"
        >
          {{ profileActionMessage }}
        </p>
      </div>

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
          <select
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            :value="profile.video.codec"
            @change="updateVideo('codec', ($event.target as HTMLSelectElement).value)"
          >
            <option value="libx264">libx264</option>
            <option value="libx265">libx265</option>
            <option value="libvpx-vp9">libvpx-vp9</option>
            <option value="copy">copy</option>
          </select>
        </label>

        <label class="grid gap-1.5 text-sm text-stone-400">
          Video bitrate (kbps)
          <input
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            type="number"
            min="0"
            :value="profile.video.bitrateKbps ?? ''"
            @input="
              updateVideo(
                'bitrateKbps',
                ($event.target as HTMLInputElement).value
                  ? Number(($event.target as HTMLInputElement).value)
                  : null,
              )
            "
          />
        </label>

        <label class="grid gap-1.5 text-sm text-stone-400">
          CRF
          <input
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            type="number"
            min="0"
            max="51"
            :value="profile.video.crf ?? ''"
            @input="
              updateVideo(
                'crf',
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

        <label class="grid gap-1.5 text-sm text-stone-400">
          Frame rate
          <input
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            type="number"
            min="1"
            step="0.01"
            :value="profile.video.frameRate ?? ''"
            @input="
              updateVideo(
                'frameRate',
                ($event.target as HTMLInputElement).value
                  ? Number(($event.target as HTMLInputElement).value)
                  : null,
              )
            "
          />
        </label>

        <label class="grid gap-1.5 text-sm text-stone-400">
          Pixel format
          <input
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            :value="profile.video.pixelFormat ?? ''"
            @input="
              updateVideo(
                'pixelFormat',
                ($event.target as HTMLInputElement).value || null,
              )
            "
          />
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
          <select
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/30"
            :value="profile.audio.codec"
            @change="updateAudio('codec', ($event.target as HTMLSelectElement).value)"
          >
            <option value="aac">aac</option>
            <option value="libopus">libopus</option>
            <option value="mp3">mp3</option>
            <option value="pcm_s16le">pcm_s16le</option>
            <option value="copy">copy</option>
            <option value="none">none</option>
          </select>
        </label>

        <label class="grid gap-1.5 text-sm text-stone-400">
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

        <label class="grid gap-1.5 text-sm text-stone-400">
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

      <div class="grid gap-4 xl:grid-cols-2">
        <label class="grid gap-1.5 text-sm text-stone-400">
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
    </div>

    <div v-else class="p-5">
      <div class="rounded-2xl border border-dashed border-amber-200/15 px-4 py-5 text-sm text-stone-400">
        Select or create a profile to start editing conversion options.
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ConversionProfile, ResolutionMode } from "@/domain/conversion";

const props = defineProps<{
  profiles: ConversionProfile[];
  selectedProfileId: string | null;
  profile: ConversionProfile | null;
  outputPath: string;
  isConverting: boolean;
}>();

const emit = defineEmits<{
  selectProfile: [profileId: string];
  createProfile: [];
  saveProfile: [saveAsNew?: boolean];
  deleteProfile: [profileId: string];
  duplicateProfile: [];
  pickOutput: [];
  updateOutputPath: [outputPath: string];
  updateProfile: [profile: ConversionProfile];
  convert: [];
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
  <section class="panel">
    <div class="panel__header">
      <div>
        <h2 class="panel__title">Convert</h2>
        <p class="panel__subtitle">Choose a profile, set the output file, then run the conversion.</p>
      </div>
    </div>

    <div v-if="profile" class="panel__body stack">
      <div class="convert-toolbar">
        <div class="grid-2">
          <label>
            Profile
            <select
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

          <label>
            Output file
            <div class="inline-input">
              <input
                :value="outputPath"
                placeholder="/path/to/output.mov"
                @input="$emit('updateOutputPath', ($event.target as HTMLInputElement).value)"
              />
              <button type="button" class="secondary" @click="$emit('pickOutput')">Browse</button>
            </div>
          </label>
        </div>

        <div class="row">
          <button type="button" class="secondary" @click="$emit('createProfile')">New</button>
          <button type="button" class="secondary" @click="$emit('duplicateProfile')">Duplicate</button>
          <button type="button" class="secondary" @click="$emit('saveProfile', false)">Save</button>
          <button type="button" class="secondary" @click="$emit('saveProfile', true)">Save as new</button>
          <button
            type="button"
            class="danger"
            :disabled="!selectedProfileId"
            @click="selectedProfileId && $emit('deleteProfile', selectedProfileId)"
          >
            Delete
          </button>
          <button
            type="button"
            class="convert-button"
            :disabled="!profile || !outputPath || isConverting"
            @click="$emit('convert')"
          >
            {{ isConverting ? "Converting..." : "Convert file" }}
          </button>
        </div>
      </div>

      <div class="grid-2">
        <label>
          Profile name
          <input :value="profile.name" @input="update('name', ($event.target as HTMLInputElement).value)" />
        </label>

        <label>
          Container
          <select :value="profile.container" @change="update('container', ($event.target as HTMLSelectElement).value)">
            <option value="mp4">mp4</option>
            <option value="mkv">mkv</option>
            <option value="mov">mov</option>
            <option value="webm">webm</option>
            <option value="mp3">mp3</option>
          </select>
        </label>
      </div>

      <div class="grid-3">
        <label>
          Video codec
          <select
            :value="profile.video.codec"
            @change="updateVideo('codec', ($event.target as HTMLSelectElement).value)"
          >
            <option value="libx264">libx264</option>
            <option value="libx265">libx265</option>
            <option value="libvpx-vp9">libvpx-vp9</option>
            <option value="copy">copy</option>
          </select>
        </label>

        <label>
          Video bitrate (kbps)
          <input
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

        <label>
          CRF
          <input
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

      <div class="grid-3">
        <label>
          Preset
          <select
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

        <label>
          Frame rate
          <input
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

        <label>
          Pixel format
          <input
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

      <div class="grid-3">
        <label>
          Resolution mode
          <select
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

        <label>
          Width
          <input
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

        <label>
          Height
          <input
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

      <div class="grid-3">
        <label>
          Audio codec
          <select
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

        <label>
          Audio bitrate (kbps)
          <input
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

        <label>
          Channels
          <input
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

      <div class="grid-2">
        <label>
          Sample rate
          <input
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

        <label>
          Extra FFmpeg args
          <textarea
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

      <label>
        <input
          style="width: auto; margin-right: 0.5rem"
          type="checkbox"
          :checked="profile.overwriteOutput"
          @change="update('overwriteOutput', ($event.target as HTMLInputElement).checked)"
        />
        Overwrite output if it already exists
      </label>
    </div>

    <div v-else class="panel__body">
      <div class="empty-state">Select or create a profile to start editing conversion options.</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ConversionProfile } from "@/domain/conversion";
import type { BatchProgress, SourceFile } from "@/domain/media";
import { formatDuration, formatFileSize } from "@/utils/formatters";
import { basename } from "@/utils/pathing";
import CommandPreview from "@/components/CommandPreview.vue";

defineProps<{
  files: SourceFile[];
  outputFolder: string;
  profile: ConversionProfile | null;
  commandPreview: string;
  isConverting: boolean;
  batchProgress: BatchProgress | null;
}>();

defineEmits<{
  pickOutputFolder: [];
  setOutputFolder: [folder: string];
  updateFileOutputPath: [fileId: string, outputPath: string];
  startConversion: [];
  cancelConversion: [];
  openOutputFolder: [];
  openOutputFile: [fileId: string];
}>();

function inputSummary(files: SourceFile[]): string {
  if (files.length === 0) {
    return "No files added";
  }

  const parts: string[] = [`${files.length} file${files.length > 1 ? "s" : ""}`];

  let totalDuration = 0;
  let totalSize = 0;
  let hasDuration = false;
  let hasSize = false;

  for (const file of files) {
    if (file.probe?.format.durationSeconds != null) {
      totalDuration += file.probe.format.durationSeconds;
      hasDuration = true;
    }
    if (file.probe?.format.sizeBytes != null) {
      totalSize += file.probe.format.sizeBytes;
      hasSize = true;
    }
  }

  if (hasDuration) {
    parts.push(formatDuration(totalDuration));
  }
  if (hasSize) {
    parts.push(formatFileSize(totalSize));
  }

  // Gather common codecs
  const videoCodecs = new Set<string>();
  const audioCodecs = new Set<string>();
  for (const file of files) {
    if (!file.probe) continue;
    for (const stream of file.probe.streams) {
      if (stream.codecType === "video" && stream.codecName) {
        videoCodecs.add(stream.codecName);
      }
      if (stream.codecType === "audio" && stream.codecName) {
        audioCodecs.add(stream.codecName);
      }
    }
  }

  const codecs = [...videoCodecs, ...audioCodecs].join("/");
  if (codecs) {
    parts.push(codecs);
  }

  return parts.join(" \u00B7 ");
}

function profileSummary(profile: ConversionProfile): string {
  const parts = [profile.container.toUpperCase()];
  if (profile.video.codec !== "copy") {
    parts.push(profile.video.codec);
  } else {
    parts.push("video copy");
  }
  if (profile.audio.codec !== "copy" && profile.audio.codec !== "none") {
    parts.push(profile.audio.codec);
  } else if (profile.audio.codec === "copy") {
    parts.push("audio copy");
  }
  return parts.join(" \u00B7 ");
}

function fileStatusIcon(file: SourceFile): string {
  switch (file.status) {
    case "completed":
      return "\u2713";
    case "failed":
      return "\u2717";
    case "running":
      return "\u25B6";
    default:
      return "\u25CB";
  }
}

function fileStatusClass(file: SourceFile): string {
  switch (file.status) {
    case "completed":
      return "text-emerald-400";
    case "failed":
      return "text-rose-400";
    case "running":
      return "text-amber-400";
    default:
      return "text-stone-600";
  }
}
</script>

<template>
  <section class="overflow-hidden rounded-[24px] border border-amber-200/15 bg-zinc-900/80 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl">
    <div class="px-5 pt-5">
      <h2 class="m-0 text-lg font-semibold text-stone-100">Output</h2>
      <p class="mt-1 text-sm text-stone-400">Configure output, preview the command, and run conversion.</p>
    </div>

    <div class="grid gap-4 p-5">
      <!-- Input summary -->
      <div class="rounded-2xl border border-white/5 bg-white/3 p-4">
        <span class="text-xs font-medium tracking-wide text-stone-500 uppercase">Input</span>
        <p class="m-0 mt-1 text-sm text-stone-200">{{ inputSummary(files) }}</p>
      </div>

      <!-- Profile summary -->
      <div v-if="profile" class="rounded-2xl border border-white/5 bg-white/3 p-4">
        <span class="text-xs font-medium tracking-wide text-stone-500 uppercase">Profile</span>
        <p class="m-0 mt-1 text-sm text-stone-200">{{ profile.name }}</p>
        <p class="m-0 mt-0.5 text-xs text-stone-500">{{ profileSummary(profile) }}</p>
      </div>

      <!-- Output location -->
      <div class="rounded-2xl border border-white/5 bg-white/3 p-4">
        <label for="output-folder" class="text-xs font-medium tracking-wide text-stone-500 uppercase">
          Output folder
        </label>
        <div class="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <input
            id="output-folder"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-amber-300/30"
            :value="outputFolder"
            :disabled="isConverting"
            placeholder="/path/to/output/folder"
            @input="$emit('setOutputFolder', ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-amber-300/20 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isConverting"
            @click="$emit('pickOutputFolder')"
          >
            Browse
          </button>
        </div>

        <!-- Per-file output names -->
        <div v-if="files.length > 0" class="mt-3 grid gap-1">
          <div
            v-for="file in files"
            :key="file.id"
            class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2"
          >
            <span :class="fileStatusClass(file)" class="w-4 text-center text-xs">{{ fileStatusIcon(file) }}</span>
            <input
              :id="`file-output-${file.id}`"
              class="w-full rounded-lg border border-white/5 bg-white/3 px-2.5 py-1.5 text-xs text-stone-200 outline-none transition placeholder:text-stone-500 focus:border-amber-300/20"
              :aria-label="`Output filename for ${basename(file.inputPath)}`"
              :disabled="isConverting"
              :value="basename(file.outputPath)"
              @input="
                $emit(
                  'updateFileOutputPath',
                  file.id,
                  outputFolder
                    ? outputFolder + (outputFolder.includes('\\\\') ? '\\\\' : '/') + ($event.target as HTMLInputElement).value
                    : ($event.target as HTMLInputElement).value,
                )
              "
            />
          </div>
        </div>
      </div>

      <!-- Command preview -->
      <CommandPreview :command="commandPreview" />

      <!-- Action buttons -->
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="flex-1 rounded-xl border border-amber-300/25 bg-gradient-to-b from-amber-300/25 to-amber-400/10 px-6 py-4 text-base font-semibold text-stone-100 transition hover:border-amber-300/35 hover:from-amber-300/35 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="files.length === 0 || !profile || isConverting"
          @click="$emit('startConversion')"
        >
          {{ isConverting ? "Converting..." : "Start Conversion" }}
        </button>
        <button
          v-if="isConverting"
          type="button"
          class="rounded-xl border border-rose-300/25 bg-rose-300/10 px-5 py-4 text-base font-medium text-rose-200 transition hover:border-rose-300/35 hover:bg-rose-300/14"
          @click="$emit('cancelConversion')"
        >
          Cancel
        </button>
      </div>

      <!-- Batch progress -->
      <div v-if="batchProgress && batchProgress.phase !== 'idle'" class="grid gap-3">
        <!-- Overall progress bar -->
        <div class="rounded-2xl border border-white/5 bg-white/3 p-4">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs font-medium tracking-wide text-stone-500 uppercase">Overall progress</span>
            <span class="text-sm font-medium text-stone-200">
              {{ Math.round(batchProgress.overallPercent) }}%
              <span class="text-stone-500">
                ({{ batchProgress.currentFileIndex + (batchProgress.phase === 'running' ? 1 : 0) }}/{{ batchProgress.totalFiles }} files)
              </span>
            </span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="
                batchProgress.phase === 'completed'
                  ? 'bg-emerald-400'
                  : batchProgress.phase === 'failed'
                    ? 'bg-rose-400'
                    : batchProgress.phase === 'cancelled'
                      ? 'bg-stone-400'
                      : 'bg-amber-400'
              "
              :style="{ width: `${batchProgress.overallPercent}%` }"
            />
          </div>
        </div>

        <!-- Per-file status list -->
        <div class="grid gap-1">
          <div
            v-for="file in files"
            :key="file.id"
            class="flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 px-3 py-2"
          >
            <span :class="fileStatusClass(file)" class="w-4 text-center text-sm font-bold">{{ fileStatusIcon(file) }}</span>
            <span class="min-w-0 flex-1 truncate text-sm text-stone-200">{{ basename(file.outputPath) }}</span>

            <template v-if="file.status === 'running' && file.progress">
              <span class="text-xs text-stone-400">{{ file.progress.percent != null ? `${Math.round(file.progress.percent)}%` : "" }}</span>
              <span v-if="file.progress.fps" class="text-xs text-stone-500">{{ file.progress.fps.toFixed(0) }}fps</span>
              <span v-if="file.progress.speed" class="text-xs text-stone-500">{{ file.progress.speed.toFixed(1) }}x</span>
            </template>

            <template v-else-if="file.status === 'completed'">
              <span class="text-xs text-emerald-400">completed</span>
              <button
                type="button"
                class="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-stone-300 transition hover:border-amber-300/20 hover:bg-white/8"
                @click="$emit('openOutputFile', file.id)"
              >
                Open
              </button>
            </template>

            <template v-else-if="file.status === 'failed'">
              <span class="text-xs text-rose-400">failed</span>
            </template>

            <template v-else>
              <span class="text-xs text-stone-600">pending</span>
            </template>
          </div>
        </div>
      </div>

      <!-- Post-conversion actions -->
      <div
        v-if="batchProgress && (batchProgress.phase === 'completed' || batchProgress.phase === 'failed' || batchProgress.phase === 'cancelled')"
        class="flex flex-wrap gap-2"
      >
        <button
          type="button"
          class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-amber-300/20 hover:bg-white/8"
          @click="$emit('openOutputFolder')"
        >
          Open output folder
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="files.length === 0" class="rounded-2xl border border-dashed border-amber-200/15 px-4 py-5 text-sm text-stone-400">
        Add source files in the Source tab to configure output.
      </div>
    </div>
  </section>
</template>

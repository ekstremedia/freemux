<script setup lang="ts">
import type { SourceFile } from "@/domain/media";
import { formatBitrate, formatDuration, formatFileSize, formatFrameRate } from "@/utils/formatters";
import SourceFileList from "@/components/SourceFileList.vue";
import VideoPreview from "@/components/VideoPreview.vue";

defineProps<{
  files: SourceFile[];
  selectedFileId: string | null;
  selectedFile: SourceFile | null;
  lastError: string | null;
}>();

defineEmits<{
  pickFiles: [];
  pickFolder: [];
  clearFiles: [];
  selectFile: [fileId: string];
  removeFile: [fileId: string];
  openInPlayer: [filePath: string];
}>();
</script>

<template>
  <section class="overflow-hidden rounded-[24px] border border-amber-200/15 bg-zinc-900/80 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl">
    <div class="flex flex-col gap-4 px-5 pt-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 class="m-0 text-lg font-semibold text-stone-100">Source</h2>
        <p class="mt-1 text-sm text-stone-400">Add media files to inspect and convert.</p>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-xl border border-amber-300/25 bg-gradient-to-b from-amber-300/25 to-amber-400/10 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-amber-300/35 hover:from-amber-300/35"
          @click="$emit('pickFiles')"
        >
          Open files
        </button>
        <button
          type="button"
          class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-amber-300/20 hover:bg-white/8"
          @click="$emit('pickFolder')"
        >
          Add folder
        </button>
        <button
          v-if="files.length > 0"
          type="button"
          class="rounded-xl border border-rose-300/25 bg-rose-300/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:border-rose-300/35 hover:bg-rose-300/14"
          @click="$emit('clearFiles')"
        >
          Clear all
        </button>
      </div>
    </div>

    <div class="grid gap-4 p-5">
      <p v-if="lastError" class="m-0 text-sm font-medium text-rose-300">{{ lastError }}</p>

      <div class="grid gap-4 lg:grid-cols-[minmax(240px,0.4fr)_minmax(0,1fr)]">
        <!-- File list -->
        <div class="max-h-[420px] overflow-y-auto">
          <SourceFileList
            :files="files"
            :selected-file-id="selectedFileId"
            @select-file="$emit('selectFile', $event)"
            @remove-file="$emit('removeFile', $event)"
          />
        </div>

        <!-- Video preview -->
        <VideoPreview
          :thumbnail="selectedFile?.thumbnail ?? null"
          :is-generating-thumbnail="selectedFile?.isGeneratingThumbnail ?? false"
          @open-in-player="selectedFile && $emit('openInPlayer', selectedFile.inputPath)"
        />
      </div>

      <!-- Probe details for selected file -->
      <template v-if="selectedFile?.probe">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-2xl border border-white/5 bg-white/4 p-4">
            <div class="text-xs tracking-wide text-stone-500 uppercase">Container</div>
            <div class="mt-1 text-base font-medium text-stone-100">{{ selectedFile.probe.format.container }}</div>
          </div>
          <div class="rounded-2xl border border-white/5 bg-white/4 p-4">
            <div class="text-xs tracking-wide text-stone-500 uppercase">Duration</div>
            <div class="mt-1 text-base font-medium text-stone-100">{{ formatDuration(selectedFile.probe.format.durationSeconds) }}</div>
          </div>
          <div class="rounded-2xl border border-white/5 bg-white/4 p-4">
            <div class="text-xs tracking-wide text-stone-500 uppercase">File size</div>
            <div class="mt-1 text-base font-medium text-stone-100">{{ formatFileSize(selectedFile.probe.format.sizeBytes) }}</div>
          </div>
          <div class="rounded-2xl border border-white/5 bg-white/4 p-4">
            <div class="text-xs tracking-wide text-stone-500 uppercase">Overall bitrate</div>
            <div class="mt-1 text-base font-medium text-stone-100">{{ formatBitrate(selectedFile.probe.format.bitRate) }}</div>
          </div>
        </div>

        <div class="grid gap-3">
          <h3 class="m-0 text-base font-semibold text-stone-100">Streams</h3>

          <div class="grid gap-3">
            <article
              v-for="stream in selectedFile.probe.streams"
              :key="stream.index"
              class="rounded-2xl border border-white/5 bg-white/4 p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <strong>#{{ stream.index }} {{ stream.codecType }}</strong>
                <span class="inline-flex items-center rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-stone-300">
                  {{ stream.codecName || "unknown codec" }}
                </span>
              </div>

              <div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div class="rounded-2xl border border-white/5 bg-black/10 p-4">
                  <div class="text-xs tracking-wide text-stone-500 uppercase">Resolution</div>
                  <div class="mt-1 text-base font-medium text-stone-100">
                    {{ stream.width && stream.height ? `${stream.width}x${stream.height}` : "n/a" }}
                  </div>
                </div>
                <div class="rounded-2xl border border-white/5 bg-black/10 p-4">
                  <div class="text-xs tracking-wide text-stone-500 uppercase">Frame rate</div>
                  <div class="mt-1 text-base font-medium text-stone-100">{{ formatFrameRate(stream.frameRate) }}</div>
                </div>
                <div class="rounded-2xl border border-white/5 bg-black/10 p-4">
                  <div class="text-xs tracking-wide text-stone-500 uppercase">Pixel format</div>
                  <div class="mt-1 text-base font-medium text-stone-100">{{ stream.pixelFormat || "n/a" }}</div>
                </div>
                <div class="rounded-2xl border border-white/5 bg-black/10 p-4">
                  <div class="text-xs tracking-wide text-stone-500 uppercase">Stream bitrate</div>
                  <div class="mt-1 text-base font-medium text-stone-100">{{ formatBitrate(stream.bitRate) }}</div>
                </div>
                <div class="rounded-2xl border border-white/5 bg-black/10 p-4">
                  <div class="text-xs tracking-wide text-stone-500 uppercase">Channels</div>
                  <div class="mt-1 text-base font-medium text-stone-100">{{ stream.channels ?? "n/a" }}</div>
                </div>
                <div class="rounded-2xl border border-white/5 bg-black/10 p-4">
                  <div class="text-xs tracking-wide text-stone-500 uppercase">Sample rate</div>
                  <div class="mt-1 text-base font-medium text-stone-100">{{ stream.sampleRate ?? "n/a" }}</div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </template>

      <div v-else-if="files.length === 0" class="rounded-2xl border border-dashed border-amber-200/15 px-4 py-5 text-sm text-stone-400">
        Open files or add a folder to get started.
      </div>

      <div v-else-if="selectedFile?.isProbing" class="rounded-2xl border border-dashed border-amber-200/15 px-4 py-5 text-sm text-stone-400">
        Probing file...
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ConversionProgress } from "@/domain/media";
import { formatDuration } from "@/utils/formatters";

defineProps<{
  progress: ConversionProgress | null;
  isConverting: boolean;
}>();
</script>

<template>
  <section class="overflow-hidden rounded-[24px] border border-amber-200/15 bg-zinc-900/80 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl">
    <div class="flex items-start justify-between gap-4 px-5 pt-5">
      <div>
        <h2 class="m-0 text-lg font-semibold text-stone-100">Conversion Progress</h2>
        <p class="mt-1 text-sm text-stone-400">Live progress during the active FFmpeg job.</p>
      </div>
      <span
        class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]"
        :class="
          isConverting
            ? 'border-amber-300/25 bg-amber-300/10 text-amber-200'
            : 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
        "
      >
        {{ isConverting ? "Running" : progress?.phase ?? "idle" }}
      </span>
    </div>

    <div class="grid gap-4 p-5">
      <template v-if="progress">
        <div>
          <div class="h-3 w-full overflow-hidden rounded-full border border-white/5 bg-white/8">
            <div
              class="h-full bg-gradient-to-r from-amber-200 via-amber-300 to-orange-400 transition-[width] duration-200 ease-out"
              :style="{ width: `${progress.percent ?? 0}%` }"
            />
          </div>
          <small class="mt-2 block text-sm text-stone-400">
            {{ progress.percent !== null ? `${progress.percent.toFixed(1)}%` : "Estimating progress..." }}
          </small>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div class="rounded-2xl border border-white/5 bg-white/4 p-4">
            <div class="text-xs tracking-wide text-stone-500 uppercase">Encoded time</div>
            <div class="mt-1 text-base font-medium text-stone-100">{{ formatDuration(progress.outputTimeSeconds) }}</div>
          </div>
          <div class="rounded-2xl border border-white/5 bg-white/4 p-4">
            <div class="text-xs tracking-wide text-stone-500 uppercase">Total duration</div>
            <div class="mt-1 text-base font-medium text-stone-100">{{ formatDuration(progress.totalDurationSeconds) }}</div>
          </div>
          <div class="rounded-2xl border border-white/5 bg-white/4 p-4">
            <div class="text-xs tracking-wide text-stone-500 uppercase">Frame</div>
            <div class="mt-1 text-base font-medium text-stone-100">{{ progress.frame ?? "n/a" }}</div>
          </div>
          <div class="rounded-2xl border border-white/5 bg-white/4 p-4">
            <div class="text-xs tracking-wide text-stone-500 uppercase">FPS</div>
            <div class="mt-1 text-base font-medium text-stone-100">{{ progress.fps?.toFixed(2) ?? "n/a" }}</div>
          </div>
          <div class="rounded-2xl border border-white/5 bg-white/4 p-4">
            <div class="text-xs tracking-wide text-stone-500 uppercase">Speed</div>
            <div class="mt-1 text-base font-medium text-stone-100">{{ progress.speed ? `${progress.speed.toFixed(2)}x` : "n/a" }}</div>
          </div>
          <div class="rounded-2xl border border-white/5 bg-white/4 p-4">
            <div class="text-xs tracking-wide text-stone-500 uppercase">Phase</div>
            <div class="mt-1 text-base font-medium capitalize text-stone-100">{{ progress.phase }}</div>
          </div>
        </div>

        <div class="rounded-2xl border border-white/5 bg-white/4 p-4 font-mono text-sm break-words text-stone-300">
          {{ progress.rawLine || "Waiting for FFmpeg output..." }}
        </div>
      </template>

      <div v-else class="rounded-2xl border border-dashed border-amber-200/15 px-4 py-5 text-sm text-stone-400">
        No active conversion yet.
      </div>
    </div>
  </section>
</template>

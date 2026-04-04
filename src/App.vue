<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import AppHeader from "@/components/AppHeader.vue";
import CommandPreview from "@/components/CommandPreview.vue";
import ConversionProgressPanel from "@/components/ConversionProgressPanel.vue";
import ConversionOptionsPanel from "@/components/ConversionOptionsPanel.vue";
import SourceInspector from "@/components/SourceInspector.vue";
import { createConverterStore } from "@/stores/useConverterStore";

type WorkspaceTab = "source" | "convert";

const store = createConverterStore();
const activeTab = ref<WorkspaceTab>("source");

onMounted(() => {
  void store.initialize();
});

onUnmounted(() => {
  store.dispose();
});
</script>

<template>
  <div class="min-h-screen px-5 py-5 text-stone-100">
    <AppHeader />

    <main class="mx-auto max-w-7xl">
      <nav
        class="mb-4 inline-flex w-full max-w-sm gap-2 rounded-2xl border border-amber-200/15 bg-white/5 p-1.5 md:w-auto"
        aria-label="Workspace sections"
      >
        <button
          type="button"
          class="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition md:min-w-[110px] md:flex-none"
          :class="
            activeTab === 'source'
              ? 'border-amber-300/25 bg-amber-300/15 text-stone-100'
              : 'border-transparent bg-transparent text-stone-400 hover:border-amber-300/15 hover:bg-white/5 hover:text-stone-200'
          "
          @click="activeTab = 'source'"
        >
          Source
        </button>
        <button
          type="button"
          class="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition md:min-w-[110px] md:flex-none"
          :class="
            activeTab === 'convert'
              ? 'border-amber-300/25 bg-amber-300/15 text-stone-100'
              : 'border-transparent bg-transparent text-stone-400 hover:border-amber-300/15 hover:bg-white/5 hover:text-stone-200'
          "
          @click="activeTab = 'convert'"
        >
          Convert
        </button>
      </nav>

      <section v-if="activeTab === 'source'">
        <SourceInspector
          :input-path="store.state.inputPath"
          :output-path="store.state.outputPath"
          :probe="store.state.probe"
          :is-probing="store.state.isProbing"
          :last-error="store.state.lastError"
          @pick-input="store.pickInputFile"
          @pick-output="store.pickOutputFile"
          @probe="store.probeInput"
        />
      </section>

      <section v-else class="grid items-start gap-4 xl:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.22fr)]">
        <div class="grid gap-4">
          <ConversionProgressPanel
            :progress="store.state.conversionProgress"
            :is-converting="store.state.isConverting"
          />

          <CommandPreview :command="store.commandPreview.value" />
        </div>

        <div class="grid gap-4">
          <ConversionOptionsPanel
            :profiles="store.state.profiles"
            :selected-profile-id="store.state.selectedProfileId"
            :profile="store.currentProfile.value"
            :is-converting="store.state.isConverting"
            :output-path="store.state.outputPath"
            :profile-action-message="store.state.profileActionMessage"
            @select-profile="store.selectProfile"
            @create-profile="store.createNewProfile"
            @save-profile="store.saveCurrentProfile"
            @delete-profile="store.deleteProfile"
            @duplicate-profile="store.duplicateCurrentProfile"
            @pick-output="store.pickOutputFile"
            @update-output-path="store.setOutputPath"
            @update-profile="store.updateCurrentProfile"
            @convert="store.runConversion"
          />
        </div>
      </section>
    </main>
  </div>
</template>

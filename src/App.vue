<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import AppHeader from "@/components/AppHeader.vue";
import ConversionOptionsPanel from "@/components/ConversionOptionsPanel.vue";
import OutputPanel from "@/components/OutputPanel.vue";
import SourceInspector from "@/components/SourceInspector.vue";
import { createConverterStore } from "@/stores/useConverterStore";

type WorkspaceTab = "source" | "settings" | "output";

const store = createConverterStore();
const activeTab = ref<WorkspaceTab>("source");

const tabs: { id: WorkspaceTab; label: string }[] = [
  { id: "source", label: "Source" },
  { id: "settings", label: "Settings" },
  { id: "output", label: "Output" },
];

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
        class="mb-4 inline-flex w-full max-w-md gap-2 rounded-2xl border border-amber-200/15 bg-white/5 p-1.5 md:w-auto"
        aria-label="Workspace sections"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition md:min-w-[110px] md:flex-none"
          :class="
            activeTab === tab.id
              ? 'border-amber-300/25 bg-amber-300/15 text-stone-100'
              : 'border-transparent bg-transparent text-stone-400 hover:border-amber-300/15 hover:bg-white/5 hover:text-stone-200'
          "
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- Source tab -->
      <section v-if="activeTab === 'source'">
        <SourceInspector
          :files="store.state.files"
          :selected-file-id="store.state.selectedFileId"
          :selected-file="store.currentFile.value"
          :last-error="store.state.lastError"
          @pick-files="store.pickInputFiles"
          @pick-folder="store.pickInputFolder"
          @clear-files="store.clearFiles"
          @select-file="store.selectFile"
          @remove-file="store.removeFile"
          @open-in-player="store.openInPlayer"
        />
      </section>

      <!-- Settings tab -->
      <section v-else-if="activeTab === 'settings'">
        <ConversionOptionsPanel
          :profiles="store.state.profiles"
          :selected-profile-id="store.state.selectedProfileId"
          :profile="store.currentProfile.value"
          :profiles-file-path="store.state.profilesFilePath"
          :profile-action-message="store.state.profileActionMessage"
          :video-codec-options="store.videoCodecOptions.value"
          :audio-codec-options="store.audioCodecOptions.value"
          @select-profile="store.selectProfile"
          @create-profile="store.createNewProfile"
          @save-profile="store.saveCurrentProfile"
          @delete-profile="store.deleteProfile"
          @duplicate-profile="store.duplicateCurrentProfile"
          @import-profiles="store.importProfiles"
          @export-profiles="store.exportProfiles"
          @open-profiles-json="store.openProfilesJson"
          @update-profile="store.updateCurrentProfile"
        />
      </section>

      <!-- Output tab -->
      <section v-else>
        <OutputPanel
          :files="store.state.files"
          :output-folder="store.state.outputFolder"
          :profile="store.currentProfile.value"
          :command-preview="store.commandPreview.value"
          :is-converting="store.state.isConverting"
          :batch-progress="store.state.batchProgress"
          @pick-output-folder="store.pickOutputFolder"
          @set-output-folder="store.setOutputFolder"
          @update-file-output-path="store.updateFileOutputPath"
          @start-conversion="store.runBatchConversion"
          @cancel-conversion="store.cancelConversion"
          @open-output-folder="store.openOutputFolder"
          @open-output-file="store.openOutputFile"
        />
      </section>
    </main>
  </div>
</template>

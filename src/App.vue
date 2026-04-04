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
  <div class="app-shell">
    <AppHeader />

    <main class="workspace">
      <nav class="tab-bar" aria-label="Workspace sections">
        <button
          type="button"
          class="tab-bar__button"
          :class="{ 'is-active': activeTab === 'source' }"
          @click="activeTab = 'source'"
        >
          Source
        </button>
        <button
          type="button"
          class="tab-bar__button"
          :class="{ 'is-active': activeTab === 'convert' }"
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

      <section v-else class="workspace-grid workspace-grid--convert">
        <div class="left-column">
          <ConversionProgressPanel
            :progress="store.state.conversionProgress"
            :is-converting="store.state.isConverting"
          />

          <CommandPreview :command="store.commandPreview.value" />
        </div>

        <div class="right-column">
          <ConversionOptionsPanel
            :profiles="store.state.profiles"
            :selected-profile-id="store.state.selectedProfileId"
            :profile="store.currentProfile.value"
            :is-converting="store.state.isConverting"
            :output-path="store.state.outputPath"
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

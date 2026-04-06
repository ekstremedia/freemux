import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ConversionOptionsPanel from "@/components/ConversionOptionsPanel.vue";
import { createDefaultProfile } from "@/domain/conversion";
import type { EncoderOption } from "@/domain/media";

describe("ConversionOptionsPanel", () => {
  const profile = createDefaultProfile();
  const otherProfile = createDefaultProfile({
    id: "profile-2",
    name: "Resolve edit MOV",
    container: "mov",
  });
  const codecOptions: EncoderOption[] = [
    {
      name: "copy",
      label: "copy",
      description: null,
      mediaType: "video",
      isHardwareAccelerated: false,
    },
    {
      name: "libx264",
      label: "libx264",
      description: null,
      mediaType: "video",
      isHardwareAccelerated: false,
    },
    {
      name: "aac",
      label: "aac",
      description: null,
      mediaType: "audio",
      isHardwareAccelerated: false,
    },
  ];

  function mountPanel() {
    return mount(ConversionOptionsPanel, {
      props: {
        profiles: [profile, otherProfile],
        selectedProfileId: profile.id,
        profile,
        profilesFilePath: "/app-data/profiles.json",
        profileActionMessage: null,
        videoCodecOptions: codecOptions.filter((item) => item.mediaType === "video"),
        audioCodecOptions: codecOptions.filter((item) => item.mediaType === "audio"),
      },
    });
  }

  it("emits selectProfile when the selected profile changes", async () => {
    const wrapper = mountPanel();
    const selects = wrapper.findAll("select");

    await selects[0].setValue(otherProfile.id);

    expect(wrapper.emitted("selectProfile")?.[0]).toEqual([otherProfile.id]);
  });

  it("emits save-as-new action", async () => {
    const wrapper = mountPanel();
    const buttons = wrapper.findAll("button");

    const saveAsNewButton = buttons.find((button) => button.text() === "Save as new");
    expect(saveAsNewButton).toBeTruthy();

    await saveAsNewButton!.trigger("click");
    expect(wrapper.emitted("saveProfile")?.[0]).toEqual([true]);
  });

  it("emits profile actions", async () => {
    const wrapper = mountPanel();
    const buttons = wrapper.findAll("button");

    const saveButton = buttons.find((button) => button.text() === "Save");
    expect(saveButton).toBeTruthy();
    await saveButton!.trigger("click");
    expect(wrapper.emitted("saveProfile")?.[0]).toEqual([false]);

    const duplicateButton = buttons.find((button) => button.text() === "Duplicate");
    expect(duplicateButton).toBeTruthy();
    await duplicateButton!.trigger("click");
    expect(wrapper.emitted("duplicateProfile")).toHaveLength(1);
  });

  it("emits JSON profile file actions", async () => {
    const wrapper = mountPanel();
    const buttons = wrapper.findAll("button");

    const importButton = buttons.find((button) => button.text() === "Import JSON");
    const exportButton = buttons.find((button) => button.text() === "Export JSON");
    const openButton = buttons.find((button) => button.text() === "Open JSON");

    expect(importButton).toBeTruthy();
    expect(exportButton).toBeTruthy();
    expect(openButton).toBeTruthy();

    await importButton!.trigger("click");
    await exportButton!.trigger("click");
    await openButton!.trigger("click");

    expect(wrapper.emitted("importProfiles")).toHaveLength(1);
    expect(wrapper.emitted("exportProfiles")).toHaveLength(1);
    expect(wrapper.emitted("openProfilesJson")).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ConversionOptionsPanel from "@/components/ConversionOptionsPanel.vue";
import { createDefaultProfile } from "@/domain/conversion";

describe("ConversionOptionsPanel", () => {
  const profile = createDefaultProfile();
  const otherProfile = createDefaultProfile({
    id: "profile-2",
    name: "Resolve edit MOV",
    container: "mov",
  });

  function mountPanel() {
    return mount(ConversionOptionsPanel, {
      props: {
        profiles: [profile, otherProfile],
        selectedProfileId: profile.id,
        profile,
        profileActionMessage: null,
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
});

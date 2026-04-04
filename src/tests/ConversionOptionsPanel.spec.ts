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
        outputPath: "/tmp/output.mp4",
        isConverting: false,
      },
    });
  }

  it("emits selectProfile when the selected profile changes", async () => {
    const wrapper = mountPanel();
    const selects = wrapper.findAll("select");

    await selects[0].setValue(otherProfile.id);

    expect(wrapper.emitted("selectProfile")?.[0]).toEqual([otherProfile.id]);
  });

  it("emits output path updates and browse action", async () => {
    const wrapper = mountPanel();
    const outputInput = wrapper.find('input[placeholder="/path/to/output.mov"]');

    await outputInput.setValue("/tmp/render.mov");
    expect(wrapper.emitted("updateOutputPath")?.[0]).toEqual(["/tmp/render.mov"]);

    const browseButton = wrapper.findAll("button").find((button) => button.text() === "Browse");
    expect(browseButton).toBeTruthy();
    await browseButton!.trigger("click");
    expect(wrapper.emitted("pickOutput")).toHaveLength(1);
  });

  it("emits save-as-new and convert actions", async () => {
    const wrapper = mountPanel();
    const buttons = wrapper.findAll("button");

    const saveAsNewButton = buttons.find((button) => button.text() === "Save as new");
    const convertButton = buttons.find((button) => button.text() === "Convert file");

    expect(saveAsNewButton).toBeTruthy();
    expect(convertButton).toBeTruthy();

    await saveAsNewButton!.trigger("click");
    await convertButton!.trigger("click");

    expect(wrapper.emitted("saveProfile")?.[0]).toEqual([true]);
    expect(wrapper.emitted("convert")).toHaveLength(1);
  });
});

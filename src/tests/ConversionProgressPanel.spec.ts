import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ConversionProgressPanel from "@/components/ConversionProgressPanel.vue";

describe("ConversionProgressPanel", () => {
  it("renders running progress details", () => {
    const wrapper = mount(ConversionProgressPanel, {
      props: {
        isConverting: true,
        progress: {
          phase: "running",
          percent: 42.5,
          frame: 1337,
          fps: 60,
          speed: 1.23,
          outputTimeSeconds: 30,
          totalDurationSeconds: 120,
          rawLine: "out_time_us=30000000",
        },
      },
    });

    expect(wrapper.text()).toContain("Conversion Progress");
    expect(wrapper.text()).toContain("42.5%");
    expect(wrapper.text()).toContain("Running");
    expect(wrapper.text()).toContain("1337");
    expect(wrapper.text()).toContain("1.23x");
    expect(wrapper.text()).toContain("out_time_us=30000000");
  });

  it("renders empty state without progress", () => {
    const wrapper = mount(ConversionProgressPanel, {
      props: {
        isConverting: false,
        progress: null,
      },
    });

    expect(wrapper.text()).toContain("No active conversion yet.");
    expect(wrapper.text()).toContain("idle");
  });
});

import { describe, expect, it } from "vitest";
import { basename, dirname, suggestBatchOutputPath, suggestOutputPath } from "@/utils/pathing";

describe("pathing utilities", () => {
  describe("basename", () => {
    it("extracts filename from Unix path", () => {
      expect(basename("/videos/source.mov")).toBe("source.mov");
    });

    it("extracts filename from Windows path", () => {
      expect(basename("C:\\Users\\video\\source.mov")).toBe("source.mov");
    });

    it("returns the input if no separator", () => {
      expect(basename("source.mov")).toBe("source.mov");
    });
  });

  describe("dirname", () => {
    it("extracts directory from Unix path", () => {
      expect(dirname("/videos/source.mov")).toBe("/videos");
    });

    it("extracts directory from Windows path", () => {
      expect(dirname("C:\\Users\\video\\source.mov")).toBe("C:/Users/video");
    });

    it("returns empty string if no separator", () => {
      expect(dirname("source.mov")).toBe("");
    });
  });

  describe("suggestOutputPath", () => {
    it("replaces extension with container", () => {
      expect(suggestOutputPath("/videos/source.mov", "mp4")).toBe("/videos/source.mp4");
    });

    it("handles empty input", () => {
      expect(suggestOutputPath("", "mp4")).toBe("");
    });
  });

  describe("suggestBatchOutputPath", () => {
    it("combines output folder with input filename and new extension", () => {
      expect(suggestBatchOutputPath("/videos/source.mkv", "/output", "mp4")).toBe("/output/source.mp4");
    });

    it("handles Windows paths", () => {
      expect(suggestBatchOutputPath("C:\\Videos\\source.mkv", "C:\\Output", "mov")).toBe("C:\\Output\\source.mov");
    });

    it("strips trailing slashes from output folder", () => {
      expect(suggestBatchOutputPath("/videos/source.mkv", "/output/", "mp4")).toBe("/output/source.mp4");
    });
  });
});

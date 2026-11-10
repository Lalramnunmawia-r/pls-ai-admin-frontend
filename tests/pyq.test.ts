import { describe, expect, it } from "vitest";
import { isPyq, validatePyqFile } from "../src/lib/pyq";

describe("PYQ helpers", () => {
  it("identifies PYQ resources by label", () => {
    expect(isPyq({ label: "pyq" })).toBe(true);
    expect(isPyq({ label: "question_bank" })).toBe(false);
  });

  it("accepts PDF, Word and PowerPoint files", () => {
    for (const name of ["a.pdf", "b.DOC", "c.docx", "d.ppt", "e.pptx"]) {
      expect(validatePyqFile({ name })).toBeNull();
    }
  });

  it("rejects missing files and other formats", () => {
    expect(validatePyqFile(null)).toBe("Choose a file.");
    expect(validatePyqFile({ name: "notes.txt" })).toMatch(/PDF, Word/);
  });
});

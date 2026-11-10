/** PYQ (previous-year question paper) documents: subject-wide uploads with label "pyq". */
export const PYQ_LABEL = "pyq";
export const PYQ_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx";
const PYQ_EXTENSIONS = PYQ_ACCEPT.split(",");

export function isPyq(row: { label: string }): boolean {
  return row.label === PYQ_LABEL;
}

export function validatePyqFile(file: { name: string } | null): string | null {
  if (!file) return "Choose a file.";
  const name = file.name.toLowerCase();
  if (!PYQ_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "Upload a PDF, Word (.doc/.docx) or PowerPoint (.ppt/.pptx) file.";
  }
  return null;
}

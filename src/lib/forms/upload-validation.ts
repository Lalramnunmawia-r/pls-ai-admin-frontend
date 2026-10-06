export function requireText(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required.`;
  return null;
}

export function validatePdfFile(file: File | null): string | null {
  if (!file) return "PDF file is required.";
  if (!file.name.toLowerCase().endsWith(".pdf")) return "Only PDF files are supported.";
  return null;
}

export function validateYear(value: string): string | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1900 || num > 2100) {
    return "Calendar year must be a valid year (1900-2100).";
  }
  return null;
}

export function validateChapterOrSection(chapterId: string, sectionId: string): string | null {
  if (!chapterId && !sectionId) return "Select at least a chapter or section.";
  return null;
}

export function validateHttpUrl(value: string, label: string): string | null {
  const raw = value.trim();
  if (!raw) return `${label} is required.`;
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return `${label} must start with http:// or https://`;
    return null;
  } catch {
    return `${label} is invalid.`;
  }
}


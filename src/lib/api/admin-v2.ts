import { withAuth, withAuthFormData } from "./client";

// ── Types (mirror app/schemas/admin_v2.py in pls-ai-microservice) ──

export type V2Board = { id: string; name: string; code: string };
export type V2Subject = {
  id: string;
  class_id: string;
  name: string;
  code: string;
  sort_order: number;
  is_active: boolean;
  chapter_count: number;
};
export type V2Class = {
  id: string;
  board_id: string | null;
  name: string;
  numeric_value: number;
  sort_order: number;
  is_active: boolean;
  subjects: V2Subject[];
};
export type V2Tree = { boards: V2Board[]; board_id: string | null; classes: V2Class[] };

export type V2Chapter = {
  id: string;
  subject_id: string;
  textbook_id: string;
  textbook_title: string;
  textbook_status: string;
  is_manual: boolean;
  title: string;
  chapter_number: number;
  description: string | null;
  is_active: boolean;
  structure_pending: boolean;
  subtopic_count: number;
};

export type V2Subtopic = {
  id: string;
  chapter_id: string;
  parent_id: string | null;
  title: string;
  section_number: string | null;
  sort_order: number;
  depth: number;
  hidden: boolean;
  children: V2Subtopic[];
};

export type V2ChapterSummary = {
  subtopics: number;
  resources: number;
  quiz_questions: number;
  practice_sets: number;
  helper_sources: number;
};
export type V2SubtopicSummary = { content_blocks: number; resources: number; quiz_questions: number; children: number };

export type V2ContentBlock = {
  id: string;
  block_type: string;
  sort_order: number;
  title: string | null;
  content_text: string | null;
  source_type: string | null;
  source_url: string | null;
  youtube_video_id: string | null;
  original_image_url: string | null;
  ai_image_url: string | null;
  page_number: number | null;
  is_reported: boolean;
};

export type Resource = {
  id: string;
  chapter_id: string;
  section_id: string | null;
  title: string;
  resource_type: string;
  label: string;
  status: string;
  pinecone_vectors: number;
  file_url: string | null;
  thumbnail_url: string | null;
  youtube_url: string | null;
  metadata_text: string | null;
  external_url: string | null;
};

export type QuizQuestion = {
  id: string;
  section_id: string;
  question_text: string;
  question_type: string;
  options: unknown;
  correct_answer: string | null;
  explanation: string | null;
  difficulty: string;
  source: string;
  pool_group: number;
  marks: number;
  is_active: boolean;
};

export type PracticeSet = {
  id: string;
  chapter_id: string;
  label: string;
  pdf_url: string | null;
  status: string;
  error_message: string | null;
  item_count: number;
};
export type PracticeItem = {
  id: string;
  set_id: string;
  sort_order: number;
  question_text: string;
  answer_text: string;
  marks: number | null;
  group_label: string | null;
};
export type HelperSource = {
  id: string;
  chapter_id: string;
  label: string;
  pdf_url: string | null;
  status: string;
  error_message: string | null;
  vector_count: number;
};
export type ContentReport = {
  id: string;
  reporter_name: string | null;
  reporter_email: string | null;
  summary: string | null;
  section_id: string | null;
  content_block_id: string | null;
  practice_item_id: string | null;
  reported_at: string | null;
};
export type Textbook = {
  id: string;
  subject_id: string | null;
  title: string;
  publisher: string | null;
  status: string;
  total_pages: number | null;
  created_at: string;
};

export const MANUAL_TEXTBOOK_PUBLISHER = "__manual_content__";

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body)
});

function form(fields: Record<string, string | Blob | undefined | null>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== "") data.append(key, value);
  }
  return data;
}

const v2 = "/admin/v2";

export const contentApi = {
  // Tree
  tree: (boardId?: string) => withAuth<V2Tree>(`${v2}/tree${boardId ? `?board_id=${boardId}` : ""}`),

  // Classes & subjects
  createClass: (input: { board_id: string; name: string; numeric_value?: number }) =>
    withAuth<V2Class>(`${v2}/classes`, json("POST", input)),
  updateClass: (id: string, input: { name?: string; numeric_value?: number; sort_order?: number }) =>
    withAuth<V2Class>(`${v2}/classes/${id}`, json("PUT", input)),
  deleteClass: (id: string) => withAuth<null>(`${v2}/classes/${id}`, json("DELETE")),
  createSubject: (input: { class_id: string; name: string; code?: string }) =>
    withAuth<V2Subject>(`${v2}/subjects`, json("POST", input)),
  updateSubject: (id: string, input: { name?: string; code?: string; sort_order?: number }) =>
    withAuth<V2Subject>(`${v2}/subjects/${id}`, json("PUT", input)),
  deleteSubject: (id: string) => withAuth<null>(`${v2}/subjects/${id}`, json("DELETE")),

  // Chapters
  chapters: (subjectId: string) => withAuth<V2Chapter[]>(`${v2}/subjects/${subjectId}/chapters`),
  createChapter: (subjectId: string, input: { title: string; description?: string }) =>
    withAuth<V2Chapter>(`${v2}/subjects/${subjectId}/chapters`, json("POST", input)),
  updateChapter: (id: string, input: { title?: string; description?: string; is_active?: boolean }) =>
    withAuth<V2Chapter>(`${v2}/chapters/${id}`, json("PUT", input)),
  reorderChapters: (subjectId: string, ids: string[]) =>
    withAuth<V2Chapter[]>(`${v2}/subjects/${subjectId}/chapters/order`, json("PATCH", { ids })),
  chapterSummary: (id: string) => withAuth<V2ChapterSummary>(`${v2}/chapters/${id}/summary`),

  // Subtopics
  subtopics: (chapterId: string) => withAuth<V2Subtopic[]>(`${v2}/chapters/${chapterId}/subtopics`),
  createSubtopic: (
    chapterId: string,
    input: { title: string; section_number?: string; description?: string; parent_id?: string | null }
  ) => withAuth<V2Subtopic>(`${v2}/chapters/${chapterId}/subtopics`, json("POST", input)),
  updateSubtopic: (id: string, input: { title?: string; section_number?: string; hidden?: boolean }) =>
    withAuth<V2Subtopic>(`${v2}/subtopics/${id}`, json("PUT", input)),
  reorderSubtopics: (chapterId: string, ids: string[], parentId?: string | null) =>
    withAuth<V2Subtopic[]>(
      `${v2}/chapters/${chapterId}/subtopics/order${parentId ? `?parent_id=${parentId}` : ""}`,
      json("PATCH", { ids })
    ),
  subtopicSummary: (id: string) => withAuth<V2SubtopicSummary>(`${v2}/subtopics/${id}/summary`),
  subtopicContent: (id: string) =>
    withAuth<{ subtopic: V2Subtopic; content_blocks: V2ContentBlock[] }>(`${v2}/subtopics/${id}/content`),
  subtopicQuestions: (id: string) => withAuth<QuizQuestion[]>(`${v2}/subtopics/${id}/questions`),

  // Content blocks & quiz questions (legacy endpoints)
  updateBlock: (id: string, input: { title?: string; content_text?: string }) =>
    withAuthFormData<V2ContentBlock>(`/admin/content-blocks/${id}`, form(input), { method: "PUT" }),
  deleteBlock: (id: string) => withAuth<unknown>(`/admin/content-blocks/${id}`, json("DELETE")),
  addBlock: (subtopicId: string, input: { title: string; content_text: string; block_type?: string }) =>
    withAuth<V2ContentBlock>(`${v2}/subtopics/${subtopicId}/blocks`, json("POST", input)),
  updateQuestion: (id: string, input: Partial<Pick<QuizQuestion, "question_text" | "correct_answer" | "explanation" | "is_active">>) =>
    withAuth<QuizQuestion>(`/admin/quiz-questions/${id}`, json("PUT", input)),
  deleteQuestion: (id: string) => withAuth<unknown>(`/admin/quiz-questions/${id}`, json("DELETE")),

  // Resources
  resources: (chapterId: string, subtopicId?: string) =>
    withAuth<Resource[]>(`${v2}/chapters/${chapterId}/resources${subtopicId ? `?subtopic_id=${subtopicId}` : ""}`),
  uploadResourceFile: (input: { chapterId: string; sectionId?: string; title: string; label: string; file: File }) =>
    withAuthFormData<Resource>(
      "/admin/content/resources/upload-file",
      form({
        file: input.file,
        title: input.title,
        label: input.label,
        chapter_id: input.chapterId,
        section_id: input.sectionId
      })
    ),
  addYouTube: (input: { chapterId: string; sectionId?: string; title: string; url: string; notes?: string; label: string }) =>
    withAuth<Resource>(
      "/admin/content/resources/youtube",
      json("POST", {
        chapter_id: input.chapterId,
        section_id: input.sectionId ?? null,
        title: input.title,
        youtube_url: input.url,
        metadata_text: input.notes ?? "",
        label: input.label
      })
    ),
  addLink: (input: { chapterId: string; sectionId?: string; title: string; url: string; label: string }) =>
    withAuth<Resource>(
      "/admin/content/resources/link",
      json("POST", {
        chapter_id: input.chapterId,
        section_id: input.sectionId ?? null,
        title: input.title,
        url: input.url,
        label: input.label
      })
    ),
  deleteResource: (id: string) => withAuth<unknown>(`/admin/content/resources/${id}`, json("DELETE")),
  retryResource: (id: string) => withAuth<Resource>(`/admin/content/resources/${id}/retry-indexing`, json("POST")),

  // Practice sets & helper PDFs (legacy endpoints)
  practiceSets: async (chapterId: string) =>
    (await withAuth<{ sets: PracticeSet[] }>(`/admin/chapters/${chapterId}/practice-sets`)).sets,
  practiceItems: async (setId: string) =>
    (await withAuth<{ items: PracticeItem[] }>(`/admin/practice-sets/${setId}/items`)).items,
  uploadPracticeSet: (chapterId: string, label: string, file: File) =>
    withAuthFormData<PracticeSet>(`/admin/chapters/${chapterId}/practice-sets`, form({ label, file })),
  deletePracticeSet: (id: string) => withAuth<null>(`/admin/practice-sets/${id}`, json("DELETE")),
  helpers: async (chapterId: string) =>
    (await withAuth<{ helpers: HelperSource[] }>(`/admin/chapters/${chapterId}/helper-sources`)).helpers,
  uploadHelper: (chapterId: string, label: string, file: File) =>
    withAuthFormData<HelperSource>(`/admin/chapters/${chapterId}/helper-sources`, form({ label, file })),
  deleteHelper: (id: string) => withAuth<null>(`/admin/chapter-helper-sources/${id}`, json("DELETE")),

  // Reports (learner "report an issue")
  reports: async (chapterId: string, subtopicId?: string) =>
    (
      await withAuth<{ reports: ContentReport[] }>(
        `/chat/${chapterId}/reports${subtopicId ? `?section_id=${subtopicId}` : ""}`
      )
    ).reports,

  // Textbooks (AI extraction from PDF)
  textbooks: async (subjectId: string) =>
    (await withAuth<{ textbooks: Textbook[] }>(`/admin/textbooks?subject_id=${subjectId}&limit=100`)).textbooks,
  uploadTextbook: (subjectId: string, title: string, file: File) =>
    withAuthFormData<Textbook>("/admin/textbooks/upload", form({ subject_id: subjectId, title, file })),
  approveTextbook: (id: string) => withAuth<Textbook>(`/admin/textbooks/${id}/approve`, json("PUT")),
  rejectTextbook: (id: string, feedback = "") =>
    withAuthFormData<Textbook>(`/admin/textbooks/${id}/reject`, form({ feedback }), { method: "PUT" }),
  reExtractTextbook: (id: string) => withAuth<unknown>(`/admin/textbooks/${id}/re-extract`, json("POST"))
};

/** React Query keys, scoped per node so a mutation only refreshes what it touched. */
export const qk = {
  tree: (boardId?: string) => ["v2", "tree", boardId ?? "default"] as const,
  chapters: (subjectId: string) => ["v2", "chapters", subjectId] as const,
  chapterSummary: (chapterId: string) => ["v2", "chapter-summary", chapterId] as const,
  subtopics: (chapterId: string) => ["v2", "subtopics", chapterId] as const,
  subtopicSummary: (id: string) => ["v2", "subtopic-summary", id] as const,
  subtopicContent: (id: string) => ["v2", "subtopic-content", id] as const,
  subtopicQuestions: (id: string) => ["v2", "subtopic-questions", id] as const,
  resources: (chapterId: string, subtopicId?: string) => ["v2", "resources", chapterId, subtopicId ?? "all"] as const,
  practiceSets: (chapterId: string) => ["v2", "practice-sets", chapterId] as const,
  practiceItems: (setId: string) => ["v2", "practice-items", setId] as const,
  helpers: (chapterId: string) => ["v2", "helpers", chapterId] as const,
  reports: (chapterId: string, subtopicId?: string) => ["v2", "reports", chapterId, subtopicId ?? "all"] as const,
  textbooks: (subjectId: string) => ["v2", "textbooks", subjectId] as const
};

/** Depth-first flatten, used for pickers and lookups. */
export function flattenSubtopics(nodes: V2Subtopic[]): V2Subtopic[] {
  return nodes.flatMap((node) => [node, ...flattenSubtopics(node.children)]);
}

/** Move one id up or down within an ordered sibling list; returns null at the edges. */
export function moveId(ids: string[], id: string, direction: -1 | 1): string[] | null {
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

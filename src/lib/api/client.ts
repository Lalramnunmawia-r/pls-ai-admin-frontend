import { getSession } from "../auth/session";
import { setSession, clearSession } from "../auth/session";
import type { AdminRole, SessionUser } from "../types";

const apiBaseUrl = (process.env.NEXT_PUBLIC_LMS_AI_API_URL || "http://localhost:8001/api/v1").replace(
  /\/$/,
  ""
);

type Envelope<T> = { data: T };
type TaxonomySubtopicNode = {
  id: string;
  subtopic_id: string;
  section_id: string;
  chapter_id: string;
  chapter_title: string;
  title: string;
  subtopic_title: string;
  section_number?: string | null;
  sort_order: number;
  depth: number;
  parent_subtopic_id?: string | null;
  children: TaxonomySubtopicNode[];
};
type TaxonomyChapterNode = {
  id: string;
  chapter_id: string;
  title: string;
  chapter_title: string;
  chapter_number: number;
  subject_id: string;
  subtopics: TaxonomySubtopicNode[];
};
type TaxonomySubjectNode = {
  id: string;
  subject_id: string;
  name: string;
  code: string;
  sort_order: number;
  grade_id: string;
  class_id: string;
  grade_name: string;
  class_name: string;
  chapters: TaxonomyChapterNode[];
};
type TaxonomyClassNode = {
  id: string;
  class_id: string;
  grade_id: string;
  name: string;
  class_name: string;
  grade_name: string;
  numeric_value: number;
  sort_order: number;
  subjects: TaxonomySubjectNode[];
};
type TaxonomyBoardNode = {
  id: string;
  board_id: string;
  name: string;
  code: string;
  sort_order: number;
  classes: TaxonomyClassNode[];
};

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { detail: text };
  }
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.sets)) return record.sets;
    if (Array.isArray(record.resources)) return record.resources;
    if (Array.isArray(record.textbooks)) return record.textbooks;
  }
  return [];
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
}

function omitContentType(headers?: HeadersInit): HeadersInit | undefined {
  if (!headers) return undefined;
  const entries = Object.entries(headers as Record<string, string>).filter(
    ([key]) => key.toLowerCase() !== "content-type"
  );
  return Object.fromEntries(entries);
}

async function parseApiError(response: Response): Promise<string> {
  const payload = await readJson(response);
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.detail === "string" && record.detail.trim()) return record.detail;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
  }
  if (response.status === 401) return "Unauthorized";
  if (response.status === 403) return "Forbidden";
  if (response.status === 404) return "Not found";
  return `Request failed (${response.status})`;
}

async function withAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  if (!session) throw new Error("Not authenticated");
  const response = await request(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(init?.headers ?? {})
    }
  });
  if (response.status === 401 && session.refreshToken) {
    const refreshed = await authApi.refresh(session.refreshToken);
    setSession({
      ...session,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken
    });
    return withAuth<T>(path, init);
  }
  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new Error(await parseApiError(response));
  }
  return (await readJson(response)) as T;
}

async function withAuthFormData<T>(path: string, body: FormData, init?: Omit<RequestInit, "body">): Promise<T> {
  const session = getSession();
  if (!session) throw new Error("Not authenticated");
  const response = await request(path, {
    ...init,
    method: init?.method ?? "POST",
    body,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(omitContentType(init?.headers) ?? {})
    }
  });
  if (response.status === 401 && session.refreshToken) {
    const refreshed = await authApi.refresh(session.refreshToken);
    setSession({
      ...session,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken
    });
    return withAuthFormData<T>(path, body, init);
  }
  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new Error(await parseApiError(response));
  }
  return (await readJson(response)) as T;
}

export const authApi = {
  async login(email: string, password: string) {
    const response = await request("/ai-admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      throw new Error("Invalid credentials");
    }
    return (await readJson(response)) as Envelope<{
      accessToken: string;
      refreshToken: string;
      user: SessionUser;
    }>;
  },
  async refresh(refreshToken: string) {
    const response = await request("/ai-admin/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken })
    });
    if (!response.ok) throw new Error("Refresh failed");
    const payload = (await readJson(response)) as Envelope<{ accessToken: string; refreshToken: string }>;
    return payload.data;
  },
  async logout(refreshToken?: string) {
    return withAuth<Envelope<{ message: string }>>("/ai-admin/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken })
    });
  }
};

export const appApi = {
  me: () => withAuth<Envelope<{ user: SessionUser }>>("/ai-admin/auth/me"),
  users: () => withAuth<Envelope<{ items: SessionUser[] }>>("/ai-admin/users"),
  createUser: (input: { email: string; name: string; role: AdminRole; password: string }) =>
    withAuth<Envelope<{ user: SessionUser }>>("/ai-admin/users", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  library: async (query = "") => {
    const raw = await withAuth<unknown>(`/admin/subjects${query}`);
    const items = asArray(raw);
    return { data: { items, count: items.length } };
  },
  ingestion: async (query = "") => {
    const raw = await withAuth<Record<string, unknown>>(`/admin/textbooks${query}`);
    const items = asArray(raw);
    const total = typeof raw?.total === "number" ? raw.total : items.length;
    return { data: { items, total } };
  },
  resources: async (query = "") => {
    const raw = await withAuth<unknown>(`/admin/content/resources${query}`);
    const items = asArray(raw);
    return { data: { items, count: items.length } };
  },
  questions: async (chapterId: string) => {
    const raw = await withAuth<unknown>(`/admin/chapters/${chapterId}/practice-sets`);
    const items = asArray(raw);
    return { data: { items, chapterId } };
  },
  reports: async (chapterIds: string[]) => {
    const settled = await Promise.allSettled(
      chapterIds.map((chapterId) => withAuth<unknown>(`/chat/${chapterId}/reports`))
    );
    const items: Array<{ chapterId: string; payload: unknown }> = [];
    const failedChapterIds: string[] = [];
    settled.forEach((result, index) => {
      const chapterId = chapterIds[index];
      if (result.status === "fulfilled") {
        items.push({ chapterId, payload: result.value });
      } else {
        failedChapterIds.push(chapterId);
      }
    });
    return { data: { items, failedChapterIds } };
  },
  jobs: async () => {
    const [textbooksResult, resourcesResult] = await Promise.allSettled([
      withAuth<unknown>("/admin/textbooks?skip=0&limit=10"),
      withAuth<unknown>("/admin/content/resources")
    ]);
    const textbookPayload = textbooksResult.status === "fulfilled" ? textbooksResult.value : null;
    const resourcePayload = resourcesResult.status === "fulfilled" ? resourcesResult.value : null;
    const textbookRecord =
      textbookPayload && typeof textbookPayload === "object" && !Array.isArray(textbookPayload)
        ? (textbookPayload as Record<string, unknown>)
        : null;
    const textbooks = asArray(textbookPayload);
    const textbookTotal = typeof textbookRecord?.total === "number" ? textbookRecord.total : textbooks.length;
    return {
      data: {
        generatedAt: new Date().toISOString(),
        textbooks,
        textbookTotal,
        resources: asArray(resourcePayload),
        textbookError: textbooksResult.status === "rejected",
        resourceError: resourcesResult.status === "rejected"
      }
    };
  },
  taxonomyTree: (params?: { boardId?: string; classId?: string; subjectId?: string }) => {
    const query = new URLSearchParams();
    if (params?.boardId) query.set("board_id", params.boardId);
    if (params?.classId) query.set("class_id", params.classId);
    if (params?.subjectId) query.set("subject_id", params.subjectId);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return withAuth<{ generated_at: string; boards: TaxonomyBoardNode[] }>(`/admin/taxonomy/tree${suffix}`);
  },
  subjectSubtopics: (subjectId: string) =>
    withAuth<
      Array<{
        id: string;
        subtopic_id: string;
        section_id: string;
        chapter_id: string;
        chapter_title: string;
        title: string;
        subtopic_title: string;
        section_number?: string | null;
        sort_order: number;
        depth: number;
        parent_subtopic_id?: string | null;
        subject_id: string;
        subject_name: string;
        grade_id?: string | null;
        class_id?: string | null;
        grade_name?: string | null;
        class_name?: string | null;
      }>
    >(`/admin/subjects/${subjectId}/subtopics`),
  createSubtopic: (input: {
    chapterId: string;
    title: string;
    sectionNumber?: string;
    description?: string;
    parentSubtopicId?: string;
  }) =>
    withAuth<{
      id: string;
      subtopic_id: string;
      section_id: string;
      chapter_id: string;
      title: string;
      subtopic_title: string;
      section_number?: string | null;
    }>("/admin/subtopics", {
      method: "POST",
      body: JSON.stringify({
        chapter_id: input.chapterId,
        title: input.title,
        section_number: input.sectionNumber ?? "",
        description: input.description ?? "",
        parent_subtopic_id: input.parentSubtopicId ?? null
      })
    }),
  updateSubtopic: (subtopicId: string, input: { title?: string; sectionNumber?: string }) =>
    withAuth<{
      id: string;
      subtopic_id: string;
      section_id: string;
      chapter_id: string;
      title: string;
      subtopic_title: string;
      section_number?: string | null;
    }>(`/admin/subtopics/${subtopicId}`, {
      method: "PUT",
      body: JSON.stringify({
        title: input.title,
        section_number: input.sectionNumber
      })
    }),
  deleteSubtopic: (subtopicId: string) =>
    withAuth<{ message: string; subtopic_id: string; section_id: string }>(`/admin/subtopics/${subtopicId}`, {
      method: "DELETE"
    }),
  examPreps: () =>
    withAuth<
      Array<{
        id: string;
        name: string;
        code: string;
      }>
    >("/admin/exam-preps"),
  examPrepYears: (examPrepId: string) =>
    withAuth<
      Array<{
        id: string;
        exam_prep_id: string;
        calendar_year: number;
      }>
    >(`/admin/exam-preps/${examPrepId}/years`),
  examPrepSubjects: (examPrepId: string) =>
    withAuth<
      Array<{
        id: string;
        name: string;
        exam_prep_id?: string | null;
        exam_prep_year_id?: string | null;
      }>
    >(`/admin/exam-preps/${examPrepId}/subjects`),
  uploadTextbook: async (input: {
    file: File;
    title: string;
    subjectId?: string;
    examPrepYearId?: string;
    publisher?: string;
    edition?: string;
    chapterNumber?: number;
    chapterName?: string;
    calendarYear?: number;
  }) => {
    const body = new FormData();
    body.append("file", input.file);
    body.append("title", input.title);
    if (input.subjectId) body.append("subject_id", input.subjectId);
    if (input.examPrepYearId) body.append("exam_prep_year_id", input.examPrepYearId);
    if (input.publisher) body.append("publisher", input.publisher);
    if (input.edition) body.append("edition", input.edition);
    if (typeof input.chapterNumber === "number") body.append("chapter_number", String(input.chapterNumber));
    if (input.chapterName) body.append("chapter_name", input.chapterName);
    if (typeof input.calendarYear === "number") body.append("calendar_year", String(input.calendarYear));
    return withAuthFormData<unknown>("/admin/textbooks/upload", body);
  },
  uploadExamPrepPaper: async (input: {
    file: File;
    examPrepId: string;
    examPrepYearId: string;
    subjectId: string;
    calendarYear: number;
    title: string;
  }) => {
    const body = new FormData();
    body.append("file", input.file);
    body.append("exam_prep_id", input.examPrepId);
    body.append("exam_prep_year_id", input.examPrepYearId);
    body.append("subject_id", input.subjectId);
    body.append("calendar_year", String(input.calendarYear));
    body.append("title", input.title);
    return withAuthFormData<unknown>("/admin/exam-prep-papers/upload", body);
  },
  uploadResourceFile: async (input: {
    file: File;
    title: string;
    label?: string;
    chapterId?: string;
    sectionId?: string;
  }) => {
    const body = new FormData();
    body.append("file", input.file);
    body.append("title", input.title);
    body.append("label", input.label ?? "reference");
    if (input.chapterId) body.append("chapter_id", input.chapterId);
    if (input.sectionId) body.append("section_id", input.sectionId);
    return withAuthFormData<unknown>("/admin/content/resources/upload-file", body);
  },
  uploadResourceYouTube: (input: {
    title: string;
    youtubeUrl: string;
    metadataText?: string;
    label?: string;
    chapterId?: string;
    sectionId?: string;
  }) =>
    withAuth<unknown>("/admin/content/resources/youtube", {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        youtube_url: input.youtubeUrl,
        metadata_text: input.metadataText ?? "",
        label: input.label ?? "video",
        chapter_id: input.chapterId ?? null,
        section_id: input.sectionId ?? null
      })
    }),
  uploadResourceLink: (input: {
    title: string;
    url: string;
    label?: string;
    chapterId?: string;
    sectionId?: string;
  }) =>
    withAuth<unknown>("/admin/content/resources/link", {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        url: input.url,
        label: input.label ?? "reference",
        chapter_id: input.chapterId ?? null,
        section_id: input.sectionId ?? null
      })
    }),
  deleteResource: (resourceId: string) =>
    withAuth<{ message: string }>(`/admin/content/resources/${resourceId}`, {
      method: "DELETE"
    })
};

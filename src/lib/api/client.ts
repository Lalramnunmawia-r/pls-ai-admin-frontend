import { getSession } from "../auth/session";
import { setSession, clearSession } from "../auth/session";
import type { AdminRole, SessionUser } from "../types";

const apiBaseUrl = (process.env.NEXT_PUBLIC_LMS_AI_API_URL || "http://localhost:8001/api/v1").replace(
  /\/$/,
  ""
);

type Envelope<T> = { data: T };

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
    throw new Error("Request failed");
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
    const [textbooks, resources] = await Promise.allSettled([
      withAuth<unknown>("/admin/textbooks?skip=0&limit=10"),
      withAuth<unknown>("/admin/content/resources")
    ]);
    return {
      data: {
        generatedAt: Date.now(),
        textbooks: textbooks.status === "fulfilled" ? textbooks.value : { detail: "textbook fetch failed" },
        resources: resources.status === "fulfilled" ? resources.value : { detail: "resource fetch failed" }
      }
    };
  }
};

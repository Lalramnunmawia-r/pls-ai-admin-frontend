export type AdminRole = "super_admin" | "content_admin" | "reviewer";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

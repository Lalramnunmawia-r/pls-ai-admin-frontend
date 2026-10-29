"use client";
import { LoginForm } from "../../modules/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <LoginForm />
    </div>
  );
}

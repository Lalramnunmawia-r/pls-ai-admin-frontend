"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authApi } from "@/lib/api/client";
import { setSession } from "@/lib/auth/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type LoginInput = z.infer<typeof schema>;

export function LoginForm() {
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(schema)
  });
  const [error, setError] = useState<string>("");

  const onSubmit = async (data: LoginInput) => {
    try {
      const response = await authApi.login(data.email, data.password);
      setSession({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        user: response.data.user
      });
      window.location.href = "/dashboard";
    } catch {
      setError("Invalid email or password.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">AI Admin Sign In</h1>
      <p className="mt-1 text-sm text-slate-600">Independent login for LMS AI content management.</p>
      <div className="mt-4 space-y-3">
        <input className="w-full rounded border px-3 py-2" placeholder="Email" {...register("email")} />
        <input className="w-full rounded border px-3 py-2" type="password" placeholder="Password" {...register("password")} />
      </div>
      {(formState.errors.email || formState.errors.password || error) && (
        <p className="mt-2 text-sm text-red-600">
          {formState.errors.email?.message ?? formState.errors.password?.message ?? error}
        </p>
      )}
      <button className="mt-4 w-full rounded bg-slate-900 px-4 py-2 text-white" type="submit">
        Sign In
      </button>
    </form>
  );
}

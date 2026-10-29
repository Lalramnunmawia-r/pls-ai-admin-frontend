"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LogIn } from "lucide-react";
import { authApi } from "@/lib/api/client";
import { setSession } from "@/lib/auth/session";
import { Brand } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/form";
import { Notice } from "@/components/ui/layout";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

type LoginInput = z.infer<typeof schema>;

export function LoginForm() {
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(schema)
  });
  const [error, setError] = useState<string>("");

  const onSubmit = async (data: LoginInput) => {
    setError("");
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
    <div className="w-full max-w-md">
      <div className="mb-6 flex justify-center">
        <Brand />
      </div>
      <Card padding="p-6 sm:p-8" elevated>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-ink-muted">Manage classes, subjects, chapters and AI content.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <TextField label="Email" type="email" autoComplete="email" error={formState.errors.email?.message} {...register("email")} />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={formState.errors.password?.message}
            {...register("password")}
          />
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" variant="accent" fullWidth size="lg" loading={formState.isSubmitting} icon={<LogIn size={16} />}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}

"use client";

// Ported from lushaiedu_pls_web/components/ui/Button.tsx (same variants and class strings).
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "accent" | "secondary" | "danger" | "soft-danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white shadow-sm hover:bg-ink/85",
  accent: "bg-accent text-white shadow-sm hover:bg-accent-hover",
  secondary: "border border-line bg-surface text-ink shadow-sm hover:border-line-strong hover:bg-surface-muted",
  danger: "bg-danger text-white shadow-sm hover:bg-danger/90",
  "soft-danger": "bg-danger-soft text-danger hover:bg-danger/15",
  ghost: "bg-transparent text-ink hover:bg-surface-muted"
};

const DISABLED_CLASSES =
  "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-muted disabled:text-ink-subtle disabled:shadow-none";

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 rounded-control px-3 text-xs",
  md: "h-11 gap-2 rounded-control px-4 text-sm",
  lg: "h-[52px] gap-2 rounded-control px-5 text-sm"
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, icon, fullWidth, disabled, className = "", children, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center whitespace-nowrap font-semibold transition-colors ${VARIANT_CLASSES[variant]} ${
        loading ? "cursor-wait opacity-80" : DISABLED_CLASSES
      } ${SIZE_CLASSES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: number;
  label: string;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "ghost", size = 32, label, className = "", children, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`relative flex shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${className}`}
      style={{ height: size, width: size }}
      {...rest}
    >
      {children}
    </button>
  );
});

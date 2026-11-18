import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { Spinner } from "./Spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground font-bold shadow-card hover:bg-accent-hover hover:shadow-glow",
  secondary:
    "bg-surface-raised text-text border border-border hover:border-accent/50 hover:bg-surface-2",
  ghost: "text-muted hover:text-text hover:bg-surface-raised",
  danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-control",
  md: "h-11 px-4 text-sm gap-2 rounded-control",
  lg: "h-12 px-5 text-base gap-2 rounded-panel",
};

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center whitespace-nowrap transition-[color,background-color,border-color,box-shadow,translate] duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

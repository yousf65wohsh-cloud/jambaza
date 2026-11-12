"use client";

import { useId, type ComponentProps } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends ComponentProps<"input"> {
  label: string;
  error?: string | null;
  hint?: string;
}

export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={descriptionId}
        className={cn("field", error && "border-danger/70", className)}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-danger text-xs">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-muted text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

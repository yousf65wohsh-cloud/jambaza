"use client";

import { cn } from "@/lib/utils";

export type MusicCategory = "all" | "music";

const CATEGORIES: { id: MusicCategory; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "music", label: "موسيقى" },
];

/** Client-side category filter for the loaded music list. */
export function CategoryChips({
  value,
  onChange,
}: {
  value: MusicCategory;
  onChange: (value: MusicCategory) => void;
}) {
  return (
    <div
      role="group"
      aria-label="تصفية الموسيقى"
      className="flex flex-wrap items-center gap-2"
    >
      {CATEGORIES.map((category) => {
        const active = value === category.id;

        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(category.id)}
            className={cn(
              "rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground border-accent"
                : "border-border text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}

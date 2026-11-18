"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * The single search entry point, mounted in the desktop side navigation and the
 * mobile bottom navigation. Enter or the search icon opens `/search?q=...`.
 */
export function NavSearch({ className }: { className?: string }) {
  const router = useRouter();
  const inputId = useId();
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = query.trim();

    if (normalized.length === 0) {
      return;
    }

    router.push(`/search?q=${encodeURIComponent(normalized)}`);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={cn("relative", className)}>
      <label htmlFor={inputId} className="sr-only">
        ابحث عن أغنية أو صديق
      </label>

      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحث عن أغنية أو صديق"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        className="field h-10 rounded-full pe-10 ps-4 text-sm"
      />

      <button
        type="submit"
        aria-label="ابحث"
        title="ابحث"
        className="text-muted hover:text-accent hover:bg-accent/10 absolute end-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full transition-colors"
      >
        <SearchIcon className="size-4" />
      </button>
    </form>
  );
}

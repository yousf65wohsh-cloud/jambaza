"use client";

import { useEffect, useId, useState } from "react";

import { SearchIcon } from "@/components/ui/icons";
import { normalizeQuery } from "@/lib/search/query";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;

/**
 * The home page search field. It owns the raw input value and reports the
 * normalized query after a short debounce so typing does not trigger a catalog
 * request on every keystroke.
 */
export function HomeSearch({
  initialQuery = "",
  onQueryChange,
  className,
}: {
  initialQuery?: string;
  onQueryChange: (query: string | null) => void;
  className?: string;
}) {
  const inputId = useId();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onQueryChange(normalizeQuery(value));
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [value, onQueryChange]);

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={inputId} className="sr-only">
        ابحث عن أغنية أو صديق
      </label>

      <SearchIcon
        aria-hidden="true"
        className="text-muted pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2"
      />

      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="ابحث عن أغنية أو صديق"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        className="field h-14 w-full rounded-pill pe-4 ps-12 text-base"
      />
    </div>
  );
}

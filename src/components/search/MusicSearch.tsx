"use client";

import { useEffect, useId, useState } from "react";

import { SearchIcon } from "@/components/ui/icons";
import { normalizeQuery } from "@/lib/search/query";

const DEBOUNCE_MS = 300;

/**
 * Rectangular search field for the music catalog. Like the home search, it
 * reports the normalized query after a short debounce.
 */
export function MusicSearch({
  onQueryChange,
  placeholder = "ابحث في الموسيقى",
}: {
  onQueryChange: (query: string | null) => void;
  placeholder?: string;
}) {
  const inputId = useId();
  const [value, setValue] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onQueryChange(normalizeQuery(value));
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [value, onQueryChange]);

  return (
    <div className="relative w-full">
      <label htmlFor={inputId} className="sr-only">
        ابحث في الموسيقى
      </label>

      <SearchIcon
        aria-hidden="true"
        className="text-muted pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2"
      />

      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        className="field h-11 w-full rounded-control pe-4 ps-11 text-sm"
      />
    </div>
  );
}

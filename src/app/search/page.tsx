import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchResults } from "@/components/search/SearchResults";
import { Spinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "البحث",
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="flex items-center justify-center py-20">
          <Spinner className="size-6" />
        </main>
      }
    >
      <SearchResults />
    </Suspense>
  );
}

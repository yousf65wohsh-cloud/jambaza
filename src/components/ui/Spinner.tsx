import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="جارٍ التحميل"
      className={cn(
        "border-muted/40 border-t-accent inline-block size-4 animate-spin rounded-full border-2",
        className,
      )}
    />
  );
}

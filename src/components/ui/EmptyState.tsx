import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-border/80 bg-surface/50 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="bg-surface-2 text-accent grid size-14 place-items-center rounded-2xl">
          {icon}
        </div>
      ) : null}
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-muted max-w-md text-sm leading-6">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

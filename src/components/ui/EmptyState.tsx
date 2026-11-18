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
        "border-border bg-surface/60 rise shadow-card flex flex-col items-center justify-center gap-3 rounded-panel border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="bg-surface-raised text-accent ring-border grid size-14 place-items-center rounded-panel ring-1">
          {icon}
        </div>
      ) : null}
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <p className="text-muted max-w-md text-sm leading-6">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

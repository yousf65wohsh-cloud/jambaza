import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
}) {
  return (
    <div className="mb-6 space-y-1.5">
      {eyebrow ? <p className="text-accent text-sm font-bold">{eyebrow}</p> : null}
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      {description ? <p className="text-muted text-sm leading-6">{description}</p> : null}
    </div>
  );
}

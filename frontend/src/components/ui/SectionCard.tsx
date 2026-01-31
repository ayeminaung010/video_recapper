import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function SectionCard({
  title,
  description,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

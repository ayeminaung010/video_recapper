interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export default function PageHeader({
  eyebrow,
  title,
  description,
}: PageHeaderProps) {
  return (
    <header className="mb-10 flex flex-col gap-3">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-semibold text-white">{title}</h1>
      <p className="text-sm text-slate-400">{description}</p>
    </header>
  );
}

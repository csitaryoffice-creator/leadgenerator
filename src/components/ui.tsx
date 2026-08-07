import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Stat({
  label,
  value,
  hint
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-normal text-ink/55">{label}</p>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint ? <p className="mt-1 text-sm text-ink/60">{hint}</p> : null}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "red" | "blue" | "amber" }) {
  const tones = {
    neutral: "border-line bg-white text-ink/75",
    green: "border-forest/20 bg-forest/10 text-forest",
    red: "border-clay/20 bg-clay/10 text-clay",
    blue: "border-sky/20 bg-sky/10 text-sky",
    amber: "border-yellow-700/20 bg-yellow-100 text-yellow-900"
  };

  return <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-dashed border-line bg-white p-8 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/65">{body}</p>
    </div>
  );
}

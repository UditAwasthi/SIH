import Link from "next/link";
import type { Job } from "@/lib/api";

export function JobCard({ job, score, why }: { job: Job; score?: number; why?: string[] }) {
  return (
    <article className="rounded-xl border border-line bg-white/90 p-3 transition hover:border-brand/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-brand">
            <Link href={`/jobs/${job.id}`} className="hover:underline">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {job.employer} · {job.location}
          </p>
        </div>
        {typeof score === "number" && (
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
            {score}%
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {job.sector}
        {job.qualification ? ` · ${job.qualification}` : ""}
        {job.minExperience != null ? ` · ${job.minExperience}+ yrs` : ""}
      </p>
      {job.requiredSkills?.length > 0 && (
        <p className="mt-2 text-xs text-foreground/80">{job.requiredSkills.slice(0, 5).join(" · ")}</p>
      )}
      {why && why.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-brand">
          {why.map((item) => (
            <li key={item}>✓ {item}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/jobs/${job.id}`}
          className="rounded-full border border-line px-3 py-1 text-xs font-medium hover:bg-muted"
        >
          Details
        </Link>
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-white hover:opacity-90"
        >
          Apply on PGRKAM
        </a>
      </div>
    </article>
  );
}

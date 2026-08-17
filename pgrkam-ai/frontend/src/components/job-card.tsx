"use client";

import Link from "next/link";
import type { Job } from "@/lib/api";
import { Led } from "@/components/ui/dot-matrix";
import { themeClasses as t } from "@/theme";

export function JobCard({ job, score, why }: { job: Job; score?: number; why?: string[] }) {
  return (
    <article className={t.card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="meta mb-2">
            {job.sector}
            {job.location ? ` / ${job.location}` : ""}
          </p>
          <h3 className="font-display text-lg font-medium text-glyph">
            <Link href={`/jobs/${job.id}`} className="hover:text-led">
              {job.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-mute">{job.employer}</p>
        </div>
        {typeof score === "number" && (
          <span className="flex items-center gap-2 font-mono text-sm text-glyph">
            <Led active={score >= 70} on={score >= 40} />
            {score}
          </span>
        )}
      </div>
      <p className="mt-3 font-mono text-[11px] text-mute">
        {job.qualification ? job.qualification : "Open qualification"}
        {job.minExperience != null ? ` · ${job.minExperience}+ yrs` : ""}
      </p>
      {job.requiredSkills?.length > 0 && (
        <p className="mt-2 text-xs text-mute">{job.requiredSkills.slice(0, 5).join("  ·  ")}</p>
      )}
      {why && why.length > 0 && (
        <ul className="mt-3 space-y-1 font-mono text-[11px] text-mute">
          {why.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Led on size={5} className="mt-1" />
              {item}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/jobs/${job.id}`}
          className="border border-line px-3 py-1.5 text-xs font-semibold text-glyph hover:border-glyph"
        >
          Details
        </Link>
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-led px-3 py-1.5 text-xs font-semibold text-glyph hover:bg-led-dim"
        >
          Apply on PGRKAM
        </a>
      </div>
    </article>
  );
}

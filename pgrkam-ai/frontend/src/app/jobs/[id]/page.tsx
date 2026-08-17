"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Job, api } from "@/lib/api";
import { useTheme } from "@/theme";

export default function JobDetailPage() {
  const { classes: t } = useTheme();
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    void api<Job>(`/jobs/${params.id}`)
      .then(setJob)
      .catch(() => setError("Job not found or API unavailable."));
  }, [params.id]);

  if (error) {
    return (
      <main className={t.pageMedium}>
        <p className={t.error}>{error}</p>
        <Link href="/jobs" className={`mt-4 inline-block ${t.link}`}>
          Back to jobs
        </Link>
      </main>
    );
  }

  if (!job) {
    return (
      <main className={t.pageMedium}>
        <p className={t.loading}>Loading job…</p>
      </main>
    );
  }

  return (
    <main className={t.pageMedium}>
      <Link href="/jobs" className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute hover:text-glyph">
        ← All jobs
      </Link>
      <article className={`${t.surface} mt-4 animate-rise p-6`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{job.sector}</p>
        <h1 className={`mt-1 ${t.title}`}>{job.title}</h1>
        <p className="mt-2 text-muted-foreground">
          {job.employer} · {job.location}
        </p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Qualification</dt>
            <dd className="font-medium">{job.qualification ?? "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Experience</dt>
            <dd className="font-medium">
              {job.minExperience != null ? `${job.minExperience}+ years` : "Not specified"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Salary</dt>
            <dd className="font-medium">
              {job.salaryMin != null
                ? `₹${job.salaryMin.toLocaleString()} – ₹${(job.salaryMax ?? job.salaryMin).toLocaleString()}`
                : "Not listed"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Deadline</dt>
            <dd className="font-medium">
              {job.deadline ? new Date(job.deadline).toLocaleDateString() : "Open"}
            </dd>
          </div>
        </dl>
        {job.requiredSkills?.length > 0 && (
          <div className="mt-6">
            <h2 className="font-display text-lg font-bold">Required skills</h2>
            <p className="mt-2 text-sm">{job.requiredSkills.join(" · ")}</p>
          </div>
        )}
        <a href={job.sourceUrl} target="_blank" rel="noreferrer" className={`mt-8 ${t.buttonAccent}`}>
          Open on PGRKAM
        </a>
      </article>
    </main>
  );
}

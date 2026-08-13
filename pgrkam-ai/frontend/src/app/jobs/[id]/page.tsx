"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Job, api } from "@/lib/api";

export default function JobDetailPage() {
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
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-danger">{error}</p>
        <Link href="/jobs" className="mt-4 inline-block text-sm underline">
          Back to jobs
        </Link>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="animate-pulse-soft text-muted-foreground">Loading job…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <Link href="/jobs" className="text-sm text-muted-foreground hover:text-brand">
        ← All jobs
      </Link>
      <article className="surface mt-4 animate-rise p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{job.sector}</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-brand">{job.title}</h1>
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
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          Open on PGRKAM
        </a>
      </article>
    </main>
  );
}

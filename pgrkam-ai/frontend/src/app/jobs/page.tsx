"use client";

import { FormEvent, useEffect, useState } from "react";
import { JobCard } from "@/components/job-card";
import { Job, api } from "@/lib/api";
import { useTheme } from "@/theme";

export default function JobsPage() {
  const { classes: t } = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [sector, setSector] = useState("");
  const [qualification, setQualification] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function load(filters?: {
    q?: string;
    location?: string;
    sector?: string;
    qualification?: string;
  }) {
    setPending(true);
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filters?.q) params.set("q", filters.q);
      if (filters?.location) params.set("location", filters.location);
      if (filters?.sector) params.set("sector", filters.sector);
      if (filters?.qualification) params.set("qualification", filters.qualification);
      const data = await api<Job[]>(`/jobs?${params.toString()}`);
      setJobs(data);
    } catch {
      setError("Could not load jobs. Check that the API is running and seeded.");
      setJobs([]);
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void load({ q, location, sector, qualification });
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 pl-6 md:grid-cols-[240px_1fr] md:px-10 md:pl-rail">
      <aside className={`${t.surface} h-fit animate-rise p-4`}>
        <h1 className="font-display text-xl font-medium text-glyph">Browse jobs</h1>
        <p className={`mt-1 ${t.muted}`}>Structured filters from seeded PGRKAM-style listings.</p>
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <label className={t.label}>
            Search
            <input
              className={t.inputCompact}
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Title or employer"
            />
          </label>
          <label className={t.label}>
            Location
            <input
              className={t.inputCompact}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Punjab, Ludhiana…"
            />
          </label>
          <label className={t.label}>
            Sector
            <input
              className={t.inputCompact}
              value={sector}
              onChange={(event) => setSector(event.target.value)}
              placeholder="IT, Healthcare…"
            />
          </label>
          <label className={t.label}>
            Qualification
            <input
              className={t.inputCompact}
              value={qualification}
              onChange={(event) => setQualification(event.target.value)}
              placeholder="B.Tech, 12th…"
            />
          </label>
          <button className={t.buttonPrimaryBlock} disabled={pending}>
            {pending ? "Filtering…" : "Apply filters"}
          </button>
        </form>
      </aside>

      <section className="space-y-3 animate-rise" style={{ animationDelay: "80ms" }}>
        {error && <p className={t.errorBanner}>{error}</p>}
        {!error && !pending && jobs.length === 0 && (
          <p className={t.surfaceEmpty}>
            No jobs matched. Try clearing filters or run <code>npm run prisma:seed</code>.
          </p>
        )}
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { JobCard } from "@/components/job-card";
import { Recommendation, api, ensureGuest } from "@/lib/api";

export default function RecommendationsPage() {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        await ensureGuest();
        const data = await api<Recommendation[]>("/recommendations/jobs");
        setItems(data);
      } catch {
        setError("Could not load recommendations. Save a profile first, then refresh.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <h1 className="font-display text-3xl font-extrabold text-brand">Recommended for you</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Deterministic scoring from skills, education, location, and sector preferences — with a
        short “why” for each match.
      </p>
      <Link href="/profile" className="mt-3 inline-block text-sm font-medium text-brand underline">
        Edit profile
      </Link>

      <section className="mt-6 space-y-3">
        {loading && <p className="animate-pulse-soft text-sm text-muted-foreground">Scoring jobs…</p>}
        {error && <p className="rounded-xl border border-danger/30 bg-white px-4 py-3 text-sm text-danger">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="surface px-4 py-8 text-center text-sm text-muted-foreground">
            No recommendations yet. Fill your profile and ensure jobs are seeded.
          </p>
        )}
        {items.map((item) => {
          const why = [
            ...(item.why.matchedSkills.length ? [`Matched skills: ${item.why.matchedSkills.join(", ")}`] : []),
            ...(item.why.educationMatch ? ["Education aligns with the role"] : []),
            ...(item.why.locationMatch ? ["Location matches your preference"] : []),
            ...(item.why.sectorMatch ? ["Sector matches your preference"] : []),
          ];
          return <JobCard key={item.job.id} job={item.job} score={item.score} why={why} />;
        })}
      </section>
    </main>
  );
}

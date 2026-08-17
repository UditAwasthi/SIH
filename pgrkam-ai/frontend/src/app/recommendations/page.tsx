"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { JobCard } from "@/components/job-card";
import { Recommendation, api } from "@/lib/api";
import { useTheme } from "@/theme";

export default function RecommendationsPage() {
  const { classes: t } = useTheme();
  const { loading: authLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace(`/signup?next=${encodeURIComponent("/recommendations")}`);
      return;
    }
    if (!user?.hasProfile) {
      router.replace("/profile?onboarding=1");
      return;
    }

    void (async () => {
      try {
        const data = await api<Recommendation[]>("/recommendations/jobs");
        setItems(data);
      } catch {
        setError("Could not load recommendations. Save a profile first, then refresh.");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, isAuthenticated, user?.hasProfile, router]);

  if (authLoading || !isAuthenticated || !user?.hasProfile) {
    return (
      <main className={t.pageMedium}>
        <p className={t.loading}>Preparing recommendations…</p>
      </main>
    );
  }

  return (
    <main className={t.pageMedium}>
      <h1 className={t.title}>Recommended for you</h1>
      <p className={t.lead}>
        Deterministic scoring from skills, education, location, and sector preferences — with a
        short “why” for each match.
      </p>
      <Link href="/profile" className={`mt-3 inline-block ${t.link}`}>
        Edit profile
      </Link>

      <section className="mt-6 space-y-3">
        {loading && <p className={t.loading}>Scoring jobs…</p>}
        {error && <p className={t.errorBanner}>{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className={t.surfaceEmpty}>
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

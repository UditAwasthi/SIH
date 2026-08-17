"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/components/auth-provider";
import { ApiError, Profile, api } from "@/lib/api";
import { useTheme } from "@/theme";

const schema = z.object({
  education: z.string().min(2, "Add your education"),
  skills: z.string().min(2, "Add at least one skill"),
  experienceYears: z.coerce.number().min(0).max(40),
  location: z.string().min(2, "Add a preferred location"),
  preferredSectors: z.string().min(2, "Add preferred sectors"),
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

function ProfilePageInner() {
  const { classes: t } = useTheme();
  const { user, loading: authLoading, isAuthenticated, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboarding = searchParams.get("onboarding") === "1";
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      education: "",
      skills: "",
      experienceYears: 0,
      location: "Punjab",
      preferredSectors: "IT",
      salaryMin: 15000,
      salaryMax: 40000,
    },
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace(`/signup?next=${encodeURIComponent("/profile?onboarding=1")}`);
      return;
    }

    void (async () => {
      try {
        const profile = await api<Profile | null>("/profile");
        if (!profile) {
          setReady(true);
          return;
        }
        const education = Array.isArray(profile.education)
          ? profile.education
              .map((item) => {
                if (item && typeof item === "object" && "field" in item) {
                  return String((item as { field?: string }).field ?? "");
                }
                return String(item);
              })
              .filter(Boolean)
              .join(", ")
          : typeof profile.education === "string"
            ? profile.education
            : "";
        reset({
          education: education || "",
          skills: profile.skills.join(", "),
          experienceYears: profile.experienceYears ?? 0,
          location: profile.location ?? "Punjab",
          preferredSectors: profile.preferredSectors.join(", ") || "IT",
          salaryMin: profile.salaryMin ?? 15000,
          salaryMax: profile.salaryMax ?? 40000,
        });
      } catch {
        setError("Could not load profile. Start the API and refresh.");
      } finally {
        setReady(true);
      }
    })();
  }, [authLoading, isAuthenticated, reset, router]);

  async function onSubmit(values: FormValues) {
    setError(null);
    setStatus(null);
    try {
      await api<Profile>("/profile", {
        method: "PUT",
        body: JSON.stringify({
          education: [{ level: "degree", field: values.education }],
          skills: values.skills
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean),
          experienceYears: values.experienceYears,
          location: values.location,
          preferredSectors: values.preferredSectors
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean),
          salaryMin: values.salaryMin,
          salaryMax: values.salaryMax,
        }),
      });
      await refresh();
      setStatus("Profile saved. Check Recommendations or ask chat for “jobs for me”.");
      if (onboarding) router.push("/recommendations");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile.");
    }
  }

  if (authLoading || !isAuthenticated || !ready) {
    return (
      <main className={t.pageNarrow}>
        <p className={t.loading}>Loading your profile…</p>
      </main>
    );
  }

  return (
    <main className={t.pageNarrow}>
      <h1 className={t.title}>
        {onboarding || !user?.hasProfile ? "Create your profile" : "Your profile"}
      </h1>
      <p className={t.lead}>
        {onboarding || !user?.hasProfile
          ? "Tell us about your education and skills so we can recommend matching jobs."
          : "Update skills and preferences anytime. Comma-separate skills and sectors."}
      </p>
      {user?.email && (
        <p className="mt-1 text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-brand">{user.email}</span>
        </p>
      )}

      <form className={`mt-6 space-y-4 ${t.surfacePad}`} onSubmit={handleSubmit(onSubmit)}>
        <Field label="Education" error={errors.education?.message} labelClass={t.label} errorClass={t.fieldError}>
          <input className={t.input} placeholder="B.Tech CSE" {...register("education")} />
        </Field>
        <Field label="Skills" error={errors.skills?.message} labelClass={t.label} errorClass={t.fieldError}>
          <input className={t.input} placeholder="JavaScript, React, SQL" {...register("skills")} />
        </Field>
        <Field
          label="Experience (years)"
          error={errors.experienceYears?.message}
          labelClass={t.label}
          errorClass={t.fieldError}
        >
          <input className={t.input} type="number" {...register("experienceYears")} />
        </Field>
        <Field label="Preferred location" error={errors.location?.message} labelClass={t.label} errorClass={t.fieldError}>
          <input className={t.input} placeholder="Punjab / Ludhiana" {...register("location")} />
        </Field>
        <Field
          label="Preferred sectors"
          error={errors.preferredSectors?.message}
          labelClass={t.label}
          errorClass={t.fieldError}
        >
          <input className={t.input} placeholder="IT, Healthcare" {...register("preferredSectors")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Salary min (₹)" error={errors.salaryMin?.message} labelClass={t.label} errorClass={t.fieldError}>
            <input className={t.input} type="number" {...register("salaryMin")} />
          </Field>
          <Field label="Salary max (₹)" error={errors.salaryMax?.message} labelClass={t.label} errorClass={t.fieldError}>
            <input className={t.input} type="number" {...register("salaryMax")} />
          </Field>
        </div>
        {error && <p className={t.error}>{error}</p>}
        {status && <p className={t.success}>{status}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button className={t.buttonPrimary} disabled={isSubmitting}>
            {isSubmitting
              ? "Saving…"
              : onboarding || !user?.hasProfile
                ? "Save and continue"
                : "Save profile"}
          </button>
          {user?.hasProfile && (
            <Link href="/recommendations" className={t.link}>
              View recommendations
            </Link>
          )}
        </div>
      </form>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-4 py-10 md:px-6">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <ProfilePageInner />
    </Suspense>
  );
}

function Field({
  label,
  error,
  children,
  labelClass,
  errorClass,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  labelClass: string;
  errorClass: string;
}) {
  return (
    <label className={labelClass}>
      {label}
      {children}
      {error && <span className={errorClass}>{error}</span>}
    </label>
  );
}

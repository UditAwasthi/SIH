"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Profile, api, ensureGuest } from "@/lib/api";

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

const inputClass =
  "mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2";

export default function ProfilePage() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    void (async () => {
      try {
        await ensureGuest();
        const profile = await api<Profile | null>("/profile");
        if (!profile) return;
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
          education: education || "B.Tech CSE",
          skills: profile.skills.join(", "),
          experienceYears: profile.experienceYears ?? 0,
          location: profile.location ?? "Punjab",
          preferredSectors: profile.preferredSectors.join(", ") || "IT",
          salaryMin: profile.salaryMin ?? 15000,
          salaryMax: profile.salaryMax ?? 40000,
        });
      } catch {
        setError("Could not load profile. Start the API and refresh.");
      }
    })();
  }, [reset]);

  async function onSubmit(values: FormValues) {
    setError(null);
    setStatus(null);
    try {
      await ensureGuest();
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
      setStatus("Profile saved. Check Recommendations or ask chat for “jobs for me”.");
    } catch {
      setError("Could not save profile.");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      <h1 className="font-display text-3xl font-extrabold text-brand">Your profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manual profile powers explainable job recommendations. Skills and sectors can be
        comma-separated.
      </p>

      <form className="surface mt-6 space-y-4 animate-rise p-5" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Education" error={errors.education?.message}>
          <input className={inputClass} placeholder="B.Tech CSE" {...register("education")} />
        </Field>
        <Field label="Skills" error={errors.skills?.message}>
          <input className={inputClass} placeholder="JavaScript, React, SQL" {...register("skills")} />
        </Field>
        <Field label="Experience (years)" error={errors.experienceYears?.message}>
          <input className={inputClass} type="number" {...register("experienceYears")} />
        </Field>
        <Field label="Preferred location" error={errors.location?.message}>
          <input className={inputClass} placeholder="Punjab / Ludhiana" {...register("location")} />
        </Field>
        <Field label="Preferred sectors" error={errors.preferredSectors?.message}>
          <input className={inputClass} placeholder="IT, Healthcare" {...register("preferredSectors")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Salary min (₹)" error={errors.salaryMin?.message}>
            <input className={inputClass} type="number" {...register("salaryMin")} />
          </Field>
          <Field label="Salary max (₹)" error={errors.salaryMax?.message}>
            <input className={inputClass} type="number" {...register("salaryMax")} />
          </Field>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {status && <p className="text-sm text-brand">{status}</p>}
        <button
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving…" : "Save profile"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
      {children}
      {error && <span className="mt-1 block normal-case tracking-normal text-danger">{error}</span>}
    </label>
  );
}

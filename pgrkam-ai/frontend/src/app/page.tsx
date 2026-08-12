import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center p-6">
      <section className="space-y-4 text-center">
        <p className="text-sm font-medium text-slate-600">SIH1305</p>
        <h1 className="text-3xl font-bold tracking-tight">PGRKAM AI Career Assistant</h1>
        <p className="text-slate-600">Frontend foundation is ready for Day 1.</p>
        <Button type="button">Project setup complete</Button>
      </section>
    </main>
  );
}

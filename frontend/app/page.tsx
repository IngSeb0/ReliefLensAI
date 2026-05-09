import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="panel panel-strong rounded-[2rem] p-8 md:p-12">
          <p className="text-[11px] uppercase tracking-[0.34em] text-sky-200/70">ReliefLens AI</p>
          <h1 className="mt-4 max-w-4xl text-5xl leading-none text-white md:text-6xl">
            Public emergency evidence intake with a private review dashboard
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Human-in-the-loop decision support for multimodal emergency triage. Public users can submit evidence through the intake portal, while authorized operators review incidents in the private admin workspace.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/emergencies"
              className="rounded-full bg-sky-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
            >
              Report emergency evidence
            </Link>
            <Link
              href="/admin"
              className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Admin dashboard
            </Link>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="panel rounded-[1.6rem] p-6">
            <h2 className="text-2xl text-white">Public Portal</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Submit image, audio, text, and location hints. The portal returns a tracking code, incident priority, location source, and confidence without exposing sensitive incident lists.
            </p>
          </div>
          <div className="panel rounded-[1.6rem] p-6">
            <h2 className="text-2xl text-white">Private Admin</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Review full incident records, update status, assign teams, and inspect backend telemetry. Authentication is backed by FastAPI environment variables and bearer tokens.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

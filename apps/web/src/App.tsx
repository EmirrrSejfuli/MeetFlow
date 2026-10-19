
function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="text-2xl font-bold tracking-tight text-indigo-600">
            MeetFlow
          </span>

          <span className="text-sm font-medium text-slate-500">
            Smart Scheduling
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-indigo-600">
            Simple. Smart. Seamless.
          </p>

          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Scheduling made effortless.
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-slate-600">
            Share your availability, let others book a time,
            and manage meetings in one beautiful place.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <span className="text-sm font-semibold text-indigo-600">
              FOR HOSTS
            </span>

            <h2 className="mt-3 text-2xl font-bold">
              Manage availability
            </h2>

            <p className="mt-3 text-slate-600">
              Create time slots and manage your schedule
              from one convenient dashboard.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <span className="text-sm font-semibold text-indigo-600">
              FOR GUESTS
            </span>

            <h2 className="mt-3 text-2xl font-bold">
              Book a meeting
            </h2>

            <p className="mt-3 text-slate-600">
              Find an available time and reserve your meeting
              in just a few steps.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-slate-400">
          Interface preview — booking functionality coming next.
        </p>
      </main>
    </div>
  )
}

export default App

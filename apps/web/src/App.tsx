import { useState } from 'react'

import { AvailableSlots } from './features/slots/AvailableSlots'
import { CreateSlotForm } from './features/slots/CreateSlotForm'

function App() {
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSlotCreated() {
    setRefreshKey((current) => current + 1)
  }

  return (
    <div className="app-background min-h-screen text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-[0_7px_20px_-7px_rgba(79,70,229,0.7)]" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="3" />
                <path d="M7.5 3v4M16.5 3v4M3 10h18M8 15l2.5 2.5L16 13" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-extrabold tracking-tight text-slate-950">Meet<span className="text-indigo-600">Flow</span></p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Smart scheduling</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 sm:flex">
            <span className="h-2 w-2 rounded-full bg-indigo-500" aria-hidden="true" />
            Europe / Skopje
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-16 pt-7 sm:px-8 sm:pt-9 lg:px-10">
        <section className="hero-surface relative overflow-hidden rounded-[30px] px-6 py-9 text-white shadow-[0_20px_50px_-24px_rgba(49,46,129,0.55)] sm:px-10 sm:py-11 lg:px-12" aria-labelledby="hero-title">
          <div className="hero-orb hero-orb-one" aria-hidden="true" />
          <div className="hero-orb hero-orb-two" aria-hidden="true" />

          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.4fr_0.85fr] lg:gap-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.17em] text-indigo-100">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-200" aria-hidden="true" />
                Simple. Smart. Seamless.
              </div>
              <h1 id="hero-title" className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.13] tracking-tight sm:text-5xl lg:text-[3.45rem]">
                Scheduling that <span className="text-indigo-200">just flows.</span>
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-indigo-100/90 sm:text-base">
                Share your availability, find a convenient time and book a meeting — all in one simple place.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5 text-xs font-medium text-white/90">
                <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-2">Time slots in Skopje time</span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-2">Calendar-aware booking</span>
              </div>
            </div>

            <div className="hidden rounded-3xl border border-white/20 bg-white/10 p-5 shadow-xl backdrop-blur-sm lg:block" aria-label="How MeetFlow works">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.17em] text-indigo-200">How it works</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xs font-bold">01</span>
                  <span className="text-sm font-medium">Create availability</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xs font-bold">02</span>
                  <span className="text-sm font-medium">Choose a time</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-indigo-300/25 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xs font-bold">03</span>
                  <span className="text-sm font-medium">Get confirmed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)]">
          <CreateSlotForm onCreated={handleSlotCreated} />
          <AvailableSlots key={refreshKey} />
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span className="font-semibold text-slate-700">MeetFlow <span className="font-normal text-slate-400">· Smart scheduling</span></span>
          <span>All meeting times displayed in Europe/Skopje</span>
        </div>
      </footer>
    </div>
  )
}

export default App

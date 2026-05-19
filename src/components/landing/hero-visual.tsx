export function HeroVisual() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1f3d] via-[#0f2d52] to-[#1a3d6b] p-6 shadow-2xl shadow-[#0f2d52]/30">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl" />
      <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-cyan-400/10 blur-xl" />

      <div className="relative space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-400/80" />
          <div className="h-2 w-2 rounded-full bg-amber-400/80" />
          <div className="h-2 w-2 rounded-full bg-emerald-400/80" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 rounded-lg bg-white/10 p-3 backdrop-blur-sm">
            <div className="mb-2 h-2 w-16 rounded bg-white/30" />
            <div className="flex h-20 items-end gap-1">
              {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-blue-400/60 to-cyan-300/80"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-white/10 p-3 backdrop-blur-sm">
            <div className="mx-auto h-14 w-14 rounded-full border-4 border-cyan-300/60 border-t-transparent" />
            <p className="mt-2 text-center text-[10px] text-white/60">98%</p>
          </div>
        </div>

        <div className="rounded-lg bg-white/10 p-3 backdrop-blur-sm">
          <div className="mb-2 flex justify-between">
            <div className="h-2 w-20 rounded bg-white/30" />
            <div className="h-2 w-10 rounded bg-emerald-400/50" />
          </div>
          <svg viewBox="0 0 200 40" className="h-10 w-full" preserveAspectRatio="none">
            <path
              d="M0,35 Q30,10 60,25 T120,15 T180,5 T200,10"
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="2"
            />
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg bg-white/5 p-2">
              <div className="h-1.5 w-12 rounded bg-white/20" />
              <div className="mt-2 h-1 w-full rounded bg-white/10" />
              <div className="mt-1 h-1 w-3/4 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WorkflowVisual() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-red-300" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <div className="ml-2 h-2 flex-1 rounded bg-slate-100" />
      </div>

      <div className="space-y-3 rounded-xl bg-slate-50 p-5">
        <div className="h-2 w-full rounded bg-slate-200" />
        <div className="h-2 w-4/5 rounded bg-slate-200" />
        <div className="h-2 w-3/5 rounded bg-slate-200" />
        <div className="h-2 w-full rounded bg-slate-200" />
        <div className="h-2 w-2/3 rounded bg-slate-200" />

        <div className="mt-6 flex items-center justify-center">
          <div className="rounded-lg bg-[#0f2d52] px-6 py-2.5 text-xs font-semibold tracking-wider text-white shadow-md">
            AI ANALYZING...
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#0f2d52] to-blue-500" />
        </div>
      </div>
    </div>
  );
}

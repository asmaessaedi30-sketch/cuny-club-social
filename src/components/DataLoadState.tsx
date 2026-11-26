export function DataLoadState({ label, loading, error, onRetry }: { label: string; loading: boolean; error: string; onRetry: () => void }) {
  return <section role={loading ? 'status' : 'alert'} aria-busy={loading} className="rounded-lg border border-slate-200 bg-white p-6">
    <h1 className="text-base font-semibold text-slate-900">{loading ? `Loading ${label}…` : `${label.charAt(0).toUpperCase() + label.slice(1)} unavailable`}</h1>
    {loading ? <p className="mt-2 text-sm text-slate-500">Please wait while workspace data loads.</p> : <>
      <p className="mt-2 text-sm text-red-800">{/failed to fetch|networkerror/i.test(error) ? 'Could not reach the server. Check your connection and retry.' : error}</p>
      <p className="mt-1 text-xs text-slate-600">The data could not be loaded. This is not an empty result.</p>
      <button type="button" onClick={onRetry} className="mt-4 text-sm font-semibold text-[#004B87] underline">Retry loading {label}</button>
    </>}
  </section>;
}

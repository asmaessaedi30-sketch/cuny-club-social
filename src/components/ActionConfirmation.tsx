import { useEffect, useId, useRef } from 'react';

export interface ConfirmationAction {
  title: string;
  description: string;
  preview?: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function ActionConfirmation({ action, onCancel }: { action: ConfirmationAction | null; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (action && dialog && !dialog.open) dialog.showModal();
    if (!action && dialog?.open) dialog.close();
  }, [action]);
  return <dialog ref={ref} aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={(event) => { event.preventDefault(); onCancel(); }}
    className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-slate-950/50">
    {action && <>
      <h2 id={titleId} className="text-lg font-semibold text-slate-900">{action.title}</h2>
      <p id={descriptionId} className="mt-3 text-sm whitespace-pre-line text-slate-700">{action.description}</p>
      {action.preview && <div className="mt-4 max-h-52 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">{action.preview}</div>}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button type="button" autoFocus onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
        <button type="button" onClick={action.onConfirm} className="rounded-md bg-[#004B87] px-4 py-2 text-sm text-white">{action.confirmLabel}</button>
      </div>
    </>}
  </dialog>;
}

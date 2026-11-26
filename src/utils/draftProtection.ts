import { createElement, useEffect, useRef, useState } from 'react';

const DISCARD_EVENT = 'hub:request-draft-discard';

export function requestDraftDiscard(): Promise<boolean> {
  return new Promise(resolve => {
    const event = new CustomEvent(DISCARD_EVENT, { cancelable: true, detail: { resolve } });
    if (window.dispatchEvent(event)) resolve(true);
  });
}

export function useDraftProtection(busy: boolean) {
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const version = useRef(0);
  const busyRef = useRef(busy);
  const [confirming, setConfirming] = useState(false);
  const pending = useRef<((discard: boolean) => void) | null>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  busyRef.current = busy;
  const markChanged = () => {
    version.current += 1;
    dirtyRef.current = true;
    setDirty(true);
  };
  const markClean = (savedVersion = version.current) => {
    if (savedVersion !== version.current) return;
    dirtyRef.current = false;
    setDirty(false);
  };
  useEffect(() => {
    const onDiscard = (event: Event) => {
      if (!busyRef.current && !dirtyRef.current) return;
      event.preventDefault();
      const resolve = (event as CustomEvent<{ resolve: (discard: boolean) => void }>).detail.resolve;
      if (busyRef.current || pending.current) { resolve(false); return; }
      pending.current = resolve;
      setConfirming(true);
    };
    const onUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current || busyRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener(DISCARD_EVENT, onDiscard);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener(DISCARD_EVENT, onDiscard);
      window.removeEventListener('beforeunload', onUnload);
      pending.current?.(false);
      pending.current = null;
    };
  }, []);
  useEffect(() => {
    if (!confirming) return;
    const previous = document.activeElement as HTMLElement | null;
    keepButton.current?.focus();
    return () => previous?.focus();
  }, [confirming]);
  const finish = (discard: boolean) => {
    const resolve = pending.current;
    pending.current = null;
    setConfirming(false);
    resolve?.(discard);
  };
  const discardDialog = confirming ? createElement('div', {
    className: 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4',
  }, createElement('div', {
    role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'discard-draft-title',
    'aria-describedby': 'discard-draft-description',
    className: 'w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4',
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') { event.preventDefault(); finish(false); }
      if (event.key === 'Tab') {
        event.preventDefault();
        const buttons = Array.from(event.currentTarget.querySelectorAll('button'));
        buttons[document.activeElement === buttons[0] ? 1 : 0]?.focus();
      }
    },
  }, createElement('h2', { id: 'discard-draft-title', className: 'text-lg font-semibold' }, 'Discard unsaved changes?'),
  createElement('p', { id: 'discard-draft-description', className: 'text-sm text-slate-600' }, 'Your post has unsaved changes. Keep editing to save your draft, or discard these edits and continue.'),
  createElement('div', { className: 'flex flex-wrap justify-end gap-3' },
    createElement('button', { ref: keepButton, type: 'button', onClick: () => finish(false), className: 'rounded-md border border-slate-300 px-4 py-2 text-sm' }, 'Keep editing'),
    createElement('button', { type: 'button', onClick: () => finish(true), className: 'rounded-md bg-red-700 px-4 py-2 text-sm text-white' }, 'Discard changes')))) : null;
  return { dirty, markChanged, markClean, version, discardDialog };
}

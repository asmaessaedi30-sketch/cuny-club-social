import { AlertCircle, CheckCircle2, Clock, MinusCircle, ShieldAlert } from 'lucide-react';

interface StatusTextProps {
  status: string;
}

export function StatusText({ status }: StatusTextProps) {
  const normalized = status.toLowerCase();

  if (
    normalized === 'active' ||
    normalized === 'connected' ||
    normalized === 'published' ||
    normalized === 'accepted' ||
    normalized === 'approved' ||
    normalized === 'co-signed' ||
    normalized === 'success' ||
    normalized === 'allowed' ||
    normalized === 'available via official api' ||
    normalized === 'compliant'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{status}</span>
      </span>
    );
  }

  if (
    normalized === 'failed' ||
    normalized === 'expired' ||
    normalized === 'revoked' ||
    normalized === 'rejected' ||
    normalized === 'declined' ||
    normalized === 'denied' ||
    normalized === 'revisions requested' ||
    normalized === 'setup blocked' ||
    normalized === 'suspended' ||
    normalized === 'attention required'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{status}</span>
      </span>
    );
  }

  if (
    normalized === 'scheduled' ||
    normalized === 'in review' ||
    normalized === 'under review' ||
    normalized === 'under student life review' ||
    normalized === 'awaiting cuny approval' ||
    normalized === 'approved for setup' ||
    normalized === 'setup in progress' ||
    normalized === 'pending' ||
    normalized === 'pending approval' ||
    normalized === 'submitted' ||
    normalized === 'more information required' ||
    normalized === 'publishing' ||
    normalized === 'waitlisted' ||
    normalized === 'restricted in pilot' ||
    normalized === 'transition scheduled'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{status}</span>
      </span>
    );
  }

  if (normalized === 'disconnected' || normalized === 'cancelled' || normalized === 'not allowed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
        <MinusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{status}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

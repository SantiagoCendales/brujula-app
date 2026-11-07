import { STATUS_LABELS } from '../lib/labels.js';

const statusClasses = {
  requested: 'bg-slate-100 text-slate-700',
  assigned: 'bg-blue-100 text-blue-800',
  on_site: 'bg-amber-100 text-amber-800',
  report_ready: 'bg-violet-100 text-violet-800',
  validated: 'bg-green-100 text-green-800',
  returned: 'bg-red-100 text-red-800',
  delivered: 'bg-emerald-800 text-white',
};

function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] ?? status;
  const colorClasses = statusClasses[status] ?? 'bg-slate-100 text-slate-700';

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${colorClasses}`}>
      {label}
    </span>
  );
}

export default StatusBadge;
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS } from '@/lib/labels';

const STATUS_COLORS = {
  requested: 'bg-slate-100 text-slate-700',
  assigned: 'bg-sky-100 text-sky-800',
  on_site: 'bg-amber-100 text-amber-800',
  report_ready: 'bg-violet-100 text-violet-800',
  validated: 'bg-emerald-100 text-emerald-800',
  returned: 'bg-red-100 text-red-800',
  delivered: 'bg-teal-700 text-white',
};

export default function StatusBadge({ status }) {
  return <Badge className={`shrink-0 ${STATUS_COLORS[status] ?? ''}`}>{STATUS_LABELS[status] ?? status}</Badge>;
}

import { cn } from '@/lib/utils';
import { RequisitionStatus, statusLabels } from '@/lib/requisition-data';

const statusStyles: Record<RequisitionStatus, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  approved: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  'in-progress': 'bg-info/15 text-info border-info/30',
};

export function StatusBadge({ status }: { status: RequisitionStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
      statusStyles[status]
    )}>
      {statusLabels[status]}
    </span>
  );
}

import { cn } from '@/lib/utils';
import { RequisitionPriority, priorityLabels } from '@/lib/requisition-data';

const priorityStyles: Record<RequisitionPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/10 text-info',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

export function PriorityBadge({ priority }: { priority: RequisitionPriority }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
      priorityStyles[priority]
    )}>
      {priorityLabels[priority]}
    </span>
  );
}

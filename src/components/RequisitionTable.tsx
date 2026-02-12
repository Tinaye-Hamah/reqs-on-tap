import { useNavigate } from 'react-router-dom';
import { Requisition, categoryLabels } from '@/lib/requisition-data';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Props {
  requisitions: Requisition[];
}

export function RequisitionTable({ requisitions }: Props) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-heading font-semibold">ID</TableHead>
            <TableHead className="font-heading font-semibold">Title</TableHead>
            <TableHead className="font-heading font-semibold hidden md:table-cell">Category</TableHead>
            <TableHead className="font-heading font-semibold hidden sm:table-cell">Priority</TableHead>
            <TableHead className="font-heading font-semibold">Status</TableHead>
            <TableHead className="font-heading font-semibold text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requisitions.map((req) => (
            <TableRow
              key={req.id}
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => navigate(`/requisitions/${req.id}`)}
            >
              <TableCell className="font-medium text-muted-foreground text-xs">{req.id}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{req.title}</p>
                  <p className="text-xs text-muted-foreground md:hidden">{categoryLabels[req.category]}</p>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {categoryLabels[req.category]}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <PriorityBadge priority={req.priority} />
              </TableCell>
              <TableCell>
                <StatusBadge status={req.status} />
              </TableCell>
              <TableCell className="text-right font-medium text-sm">
                ${req.totalAmount.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

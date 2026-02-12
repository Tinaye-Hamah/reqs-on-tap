import { useParams, useNavigate } from 'react-router-dom';
import { sampleRequisitions, categoryLabels } from '@/lib/requisition-data';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, Building2, FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function RequisitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const req = sampleRequisitions.find(r => r.id === id);

  if (!req) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <p className="text-lg font-medium text-muted-foreground">Requisition not found</p>
        <Button variant="ghost" onClick={() => navigate('/requisitions')} className="mt-4">
          ← Back to list
        </Button>
      </div>
    );
  }

  const formattedDate = new Date(req.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">{req.id}</p>
              <h1 className="text-xl font-heading font-bold">{req.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={req.priority} />
              <StatusBadge status={req.status} />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Requester</p>
              <p className="text-sm font-medium">{req.requester}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> Department</p>
              <p className="text-sm font-medium">{req.department}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Category</p>
              <p className="text-sm font-medium">{categoryLabels[req.category]}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</p>
              <p className="text-sm font-medium">{formattedDate}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">Justification</p>
            <p className="text-sm text-foreground/80 bg-muted/50 rounded-lg p-3">{req.justification}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Items</p>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-center">Qty</TableHead>
                    <TableHead className="text-xs text-right">Unit Price</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {req.items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-right">${item.unitPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-right font-medium">${(item.quantity * item.unitPrice).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end mt-3">
              <div className="bg-primary/5 rounded-lg px-4 py-2">
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-lg font-heading font-bold text-primary">${req.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {req.status === 'pending' && (
            <div className="flex gap-3 pt-2 border-t border-border">
              <Button className="bg-success text-success-foreground hover:bg-success/90 flex-1">Approve</Button>
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 flex-1">Reject</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

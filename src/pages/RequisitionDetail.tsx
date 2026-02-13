import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, Building2, FileText, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import logo from '@/assets/logo.png';

const categoryLabels: Record<string, string> = {
  'office-supplies': 'Office Supplies', equipment: 'Equipment', software: 'Software',
  travel: 'Travel', maintenance: 'Maintenance', other: 'Other',
};

export default function RequisitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isElevated, role, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: req, isLoading } = useQuery({
    queryKey: ['requisition', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requisitions')
        .select('*, requisition_items(*)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from('requisitions').update({ status }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      toast({ title: `Requisition ${status}` });
      queryClient.invalidateQueries({ queryKey: ['requisition', id] });
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Loading...</p></div>;
  }

  if (!req) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <p className="text-lg font-medium text-muted-foreground">Requisition not found</p>
        <Button variant="ghost" onClick={() => navigate('/requisitions')} className="mt-4">← Back to list</Button>
      </div>
    );
  }

  const formattedDate = new Date(req.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const items = req.requisition_items || [];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" /> Print
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden print:shadow-none print:border-black">
        <div className="p-6 border-b border-border">
          <div className="hidden print:flex items-center gap-3 mb-4">
            <img src={logo} alt="Brainstake" className="w-12 h-12 object-contain" />
            <div>
              <h2 className="font-heading font-bold text-lg">Brainstake</h2>
              <p className="text-xs text-muted-foreground">Internal Requisition Platform</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">{req.req_number}</p>
              <h1 className="text-xl font-heading font-bold">{req.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={req.priority as any} />
              <StatusBadge status={req.status as any} />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Department</p>
              <p className="text-sm font-medium">{req.department}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> Category</p>
              <p className="text-sm font-medium">{categoryLabels[req.category] || req.category}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Priority</p>
              <p className="text-sm font-medium capitalize">{req.priority}</p>
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
                  {items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-right">${Number(item.unit_price).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-right font-medium">${(item.quantity * Number(item.unit_price)).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end mt-3">
              <div className="bg-primary/5 rounded-lg px-4 py-2">
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-lg font-heading font-bold text-primary">${Number(req.total_amount).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Manager: first approval (pending → manager_approved) */}
          {role === 'manager' && req.status === 'pending' && (
            <div className="flex gap-3 pt-2 border-t border-border print:hidden">
              <Button onClick={() => updateStatus.mutate('manager_approved')} className="bg-success text-success-foreground hover:bg-success/90 flex-1">Approve (Manager)</Button>
              <Button onClick={() => updateStatus.mutate('rejected')} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 flex-1">Reject</Button>
            </div>
          )}

          {/* Accountant: second approval (manager_approved → approved) + cashbook entry */}
          {role === 'accountant' && req.status === 'manager_approved' && (
            <div className="flex gap-3 pt-2 border-t border-border print:hidden">
              <Button
                onClick={async () => {
                  // Approve and record in cashbook
                  await updateStatus.mutateAsync('approved');
                  const lastEntry = await supabase
                    .from('cashbook')
                    .select('balance')
                    .order('created_at', { ascending: false })
                    .limit(1);
                  const prevBalance = lastEntry.data?.[0]?.balance ?? 0;
                  const debitAmount = Number(req.total_amount);
                  await supabase.from('cashbook').insert({
                    requisition_id: req.id,
                    description: `${req.req_number} — ${req.title}`,
                    debit: debitAmount,
                    credit: 0,
                    balance: Number(prevBalance) - debitAmount,
                  });
                  queryClient.invalidateQueries({ queryKey: ['cashbook'] });
                  toast({ title: 'Approved & recorded in cashbook' });
                }}
                className="bg-success text-success-foreground hover:bg-success/90 flex-1"
              >
                Approve (Accountant)
              </Button>
              <Button onClick={() => updateStatus.mutate('rejected')} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 flex-1">Reject</Button>
            </div>
          )}

          {/* CEO can also see but approval is manager→accountant flow */}
          {role === 'ceo' && req.status === 'pending' && (
            <div className="flex gap-3 pt-2 border-t border-border print:hidden">
              <Button onClick={() => updateStatus.mutate('manager_approved')} className="bg-success text-success-foreground hover:bg-success/90 flex-1">Approve</Button>
              <Button onClick={() => updateStatus.mutate('rejected')} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 flex-1">Reject</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

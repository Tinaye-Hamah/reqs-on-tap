import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, Building2, FileText, Printer, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import logo from '@/assets/logo.png';
import { AccountantApprovalModal, type ApprovalData } from '@/components/AccountantApprovalModal';
import { RejectionReasonModal } from '@/components/RejectionReasonModal';

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
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: req, isLoading } = useQuery({
    queryKey: ['requisition', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requisitions')
        .select('*, requisition_items(*)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      // Fetch requester name
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', data.user_id).single();
      return { ...data, requester_name: profile?.full_name || 'Unknown' };
    },
    enabled: !!id && !!user,
  });

  // Get system accounting method
  const { data: accountingMethod } = useQuery({
    queryKey: ['accounting-method'],
    queryFn: async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'accounting_method').single();
      return data?.value || 'cash';
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ status, rejection_reason }: { status: string; rejection_reason?: string }) => {
      const updateData: any = { status };
      if (rejection_reason) updateData.rejection_reason = rejection_reason;
      if (status === 'manager_approved' || status === 'approved') {
        updateData.approved_by = user?.id;
        updateData.approved_at = new Date().toISOString();
      }
      const { error } = await supabase.from('requisitions').update(updateData).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast({ title: `Requisition ${status}` });
      queryClient.invalidateQueries({ queryKey: ['requisition', id] });
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['cashbook'] });
    },
  });

  const handleReject = async (reason: string) => {
    setSubmitting(true);
    try {
      await updateStatus.mutateAsync({ status: 'rejected', rejection_reason: reason });
      // Audit trail
      await supabase.from('audit_trail').insert({
        entity_type: 'requisition', entity_id: id!,
        action: 'reject', details: { reason, role },
        performed_by: user!.id,
      });
      setRejectionModalOpen(false);
    } finally { setSubmitting(false); }
  };

  const handleAccountantApprove = async (data: ApprovalData) => {
    if (!req || !user) return;
    setSubmitting(true);
    try {
      const isCash = accountingMethod === 'cash';

      // Create journal entry
      const { data: journal, error: jErr } = await supabase.from('journals').insert({
        journal_number: 'AUTO',
        journal_date: data.paymentDate,
        description: `${req.req_number} — ${req.title}`,
        journal_type: 'requisition_approval' as any,
        reference_type: 'requisition',
        reference_id: req.id,
        is_posted: true,
        is_locked: true,
        payment_method: data.paymentMethod as any,
        payment_reference: data.paymentReference,
        payment_account_id: data.paymentAccountId,
        notes: data.notes,
        created_by: user.id,
      }).select().single();
      if (jErr) throw jErr;

      if (isCash) {
        // Cash basis: Debit Expense/Asset, Credit Cash/Bank
        await supabase.from('journal_lines').insert([
          { journal_id: journal.id, account_id: data.expenseAccountId, debit: Number(req.total_amount), credit: 0, description: `${req.req_number} — ${req.title}` },
          { journal_id: journal.id, account_id: data.paymentAccountId, debit: 0, credit: Number(req.total_amount), description: `${req.req_number} — ${req.title}` },
        ]);
      } else {
        // Accrual basis: Debit Expense/Asset, Credit Accounts Payable
        const { data: apAccounts } = await supabase.from('chart_of_accounts').select('id').eq('account_subtype', 'Payable').limit(1);
        const apAccountId = apAccounts?.[0]?.id;
        if (!apAccountId) throw new Error('Accounts Payable not found');

        await supabase.from('journal_lines').insert([
          { journal_id: journal.id, account_id: data.expenseAccountId, debit: Number(req.total_amount), credit: 0, description: `${req.req_number} — ${req.title}` },
          { journal_id: journal.id, account_id: apAccountId, debit: 0, credit: Number(req.total_amount), description: `${req.req_number} — ${req.title}` },
        ]);

        // Create payable record
        await supabase.from('payables').insert({
          supplier: '', description: `${req.req_number} — ${req.title}`,
          amount: Number(req.total_amount), requisition_id: req.id, journal_id: journal.id,
        });
      }

      // Update requisition with journal link
      await supabase.from('requisitions').update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        journal_id: journal.id,
        payment_method: data.paymentMethod as any,
        expense_account_id: data.expenseAccountId,
        payment_account_id: data.paymentAccountId,
      }).eq('id', id!);

      // Also update legacy cashbook — requisitions are money going OUT so credit the cashbook
      const lastEntry = await supabase.from('cashbook').select('balance').order('created_at', { ascending: false }).limit(1);
      const prevBalance = lastEntry.data?.[0]?.balance ?? 0;
      const amount = Number(req.total_amount);
      await supabase.from('cashbook').insert({
        requisition_id: req.id,
        description: `${req.req_number} — ${req.title}`,
        debit: 0, credit: amount,
        balance: Number(prevBalance) - amount,
      });

      // Audit trail
      await supabase.from('audit_trail').insert({
        entity_type: 'requisition', entity_id: id!,
        action: 'approve', details: { role, journal_id: journal.id, ...data },
        performed_by: user.id,
      });

      queryClient.invalidateQueries({ queryKey: ['requisition', id] });
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['cashbook'] });
      toast({ title: 'Approved & journal posted' });
      setApprovalModalOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

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
              <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Requested By</p>
              <p className="text-sm font-medium">{req.requester_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> Department</p>
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

          {/* Show rejection reason if rejected */}
          {req.status === 'rejected' && req.rejection_reason && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Rejection Reason</p>
                <p>{req.rejection_reason}</p>
              </div>
            </div>
          )}

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
              <Button onClick={() => updateStatus.mutate({ status: 'manager_approved' })} className="bg-success text-success-foreground hover:bg-success/90 flex-1">Approve (Manager)</Button>
              <Button onClick={() => setRejectionModalOpen(true)} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 flex-1">Reject</Button>
            </div>
          )}

          {/* Accountant: second approval (manager_approved → approved) via modal */}
          {role === 'accountant' && req.status === 'manager_approved' && (
            <div className="flex gap-3 pt-2 border-t border-border print:hidden">
              <Button onClick={() => setApprovalModalOpen(true)} className="bg-success text-success-foreground hover:bg-success/90 flex-1">
                Approve (Accountant)
              </Button>
              <Button onClick={() => setRejectionModalOpen(true)} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 flex-1">Reject</Button>
            </div>
          )}

          {/* CEO can also approve at pending stage */}
          {role === 'ceo' && req.status === 'pending' && (
            <div className="flex gap-3 pt-2 border-t border-border print:hidden">
              <Button onClick={() => updateStatus.mutate({ status: 'manager_approved' })} className="bg-success text-success-foreground hover:bg-success/90 flex-1">Approve</Button>
              <Button onClick={() => setRejectionModalOpen(true)} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 flex-1">Reject</Button>
            </div>
          )}

          {/* Journal link */}
          {req.journal_id && (
            <div className="text-xs text-muted-foreground pt-2 border-t border-border">
              Linked Journal: {req.journal_id}
            </div>
          )}
        </div>
      </div>

      <AccountantApprovalModal
        open={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        onApprove={handleAccountantApprove}
        requisitionTotal={Number(req?.total_amount || 0)}
        submitting={submitting}
      />

      <RejectionReasonModal
        open={rejectionModalOpen}
        onClose={() => setRejectionModalOpen(false)}
        onReject={handleReject}
        submitting={submitting}
      />
    </div>
  );
}

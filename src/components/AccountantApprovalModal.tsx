import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onApprove: (data: ApprovalData) => void;
  requisitionTotal: number;
  submitting?: boolean;
}

export interface ApprovalData {
  expenseAccountId: string;
  paymentMethod: 'cash' | 'bank';
  paymentAccountId: string;
  paymentDate: string;
  paymentReference: string;
  notes: string;
}

export function AccountantApprovalModal({ open, onClose, onApprove, requisitionTotal, submitting }: Props) {
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | ''>('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['coa-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Expense/Asset accounts for "account to charge"
  const expenseAccounts = accounts.filter(
    (a: any) => a.account_type === 'Expense' || a.account_type === 'Asset'
  );

  // Cash or Bank accounts based on payment method
  const paymentAccounts = accounts.filter((a: any) => {
    if (paymentMethod === 'cash') return a.account_subtype === 'Cash';
    if (paymentMethod === 'bank') return a.account_subtype === 'Bank';
    return false;
  });

  // Calculate available funds for selected payment account
  const { data: availableFunds } = useQuery({
    queryKey: ['account-balance', paymentAccountId],
    queryFn: async () => {
      if (!paymentAccountId) return 0;
      const { data, error } = await supabase
        .from('journal_lines')
        .select('debit, credit')
        .eq('account_id', paymentAccountId);
      if (error) throw error;
      // For asset accounts (cash/bank): balance = debits - credits
      const total = (data || []).reduce((sum: number, line: any) => {
        return sum + Number(line.debit) - Number(line.credit);
      }, 0);
      return total;
    },
    enabled: !!paymentAccountId,
  });

  const insufficientFunds = paymentAccountId && availableFunds !== undefined && requisitionTotal > availableFunds;

  const canSubmit = expenseAccountId && paymentMethod && paymentAccountId && paymentDate && !insufficientFunds && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onApprove({
      expenseAccountId,
      paymentMethod: paymentMethod as 'cash' | 'bank',
      paymentAccountId,
      paymentDate,
      paymentReference,
      notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Approve & Post Journal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Account to Charge *</Label>
            <Select value={expenseAccountId} onValueChange={setExpenseAccountId}>
              <SelectTrigger><SelectValue placeholder="Select expense/asset account" /></SelectTrigger>
              <SelectContent>
                {expenseAccounts.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v as any); setPaymentAccountId(''); }}>
              <SelectTrigger><SelectValue placeholder="Cash or Bank" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod && (
            <div className="space-y-2">
              <Label>{paymentMethod === 'cash' ? 'Cash' : 'Bank'} Account *</Label>
              <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                <SelectTrigger><SelectValue placeholder={`Select ${paymentMethod} account`} /></SelectTrigger>
                <SelectContent>
                  {paymentAccounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {paymentAccountId && availableFunds !== undefined && (
                <p className={`text-xs ${insufficientFunds ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Available: ${availableFunds.toLocaleString()} | Required: ${requisitionTotal.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {insufficientFunds && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Insufficient funds. Available ${availableFunds?.toLocaleString()}, requested ${requisitionTotal.toLocaleString()}.</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Payment Date *</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Payment Reference</Label>
            <Input placeholder="e.g. Cheque #, Transfer ref" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-success text-success-foreground hover:bg-success/90">
            {submitting ? 'Posting...' : 'Approve & Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

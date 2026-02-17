import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, AlertTriangle } from 'lucide-react';

export default function Payments() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [payableId, setPayableId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [amount, setAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const { data: payables = [] } = useQuery({
    queryKey: ['payables-outstanding'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payables').select('*').in('status', ['outstanding', 'partial']).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: cashBankAccounts = [] } = useQuery({
    queryKey: ['coa-cash-bank'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chart_of_accounts').select('*').in('account_subtype', ['Cash', 'Bank']).eq('is_active', true).order('code');
      if (error) throw error;
      return data;
    },
  });

  // Check available funds
  const { data: availableFunds } = useQuery({
    queryKey: ['account-balance', paymentAccountId],
    queryFn: async () => {
      if (!paymentAccountId) return 0;
      const { data, error } = await supabase.from('journal_lines').select('debit, credit').eq('account_id', paymentAccountId);
      if (error) throw error;
      return (data || []).reduce((sum: number, l: any) => sum + Number(l.debit) - Number(l.credit), 0);
    },
    enabled: !!paymentAccountId,
  });

  const selectedPayable = payables.find((p: any) => p.id === payableId);
  const maxPayment = selectedPayable ? Number(selectedPayable.amount) - Number(selectedPayable.amount_paid) : 0;
  const insufficientFunds = paymentAccountId && availableFunds !== undefined && amount > availableFunds;

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      // Find Accounts Payable account
      const { data: apAccounts } = await supabase.from('chart_of_accounts').select('id').eq('account_subtype', 'Payable').limit(1);
      const apAccountId = apAccounts?.[0]?.id;
      if (!apAccountId) throw new Error('Accounts Payable account not found');

      // Create payment journal
      const { data: journal, error: jErr } = await supabase.from('journals').insert({
        journal_number: 'AUTO',
        journal_date: paymentDate,
        description: `Payment: ${selectedPayable?.description}`,
        journal_type: 'payment' as any,
        reference_type: 'payable',
        reference_id: payableId,
        is_posted: true,
        is_locked: true,
        payment_reference: reference,
        payment_account_id: paymentAccountId,
        notes,
        created_by: user.id,
      }).select().single();
      if (jErr) throw jErr;

      // Debit AP, Credit Cash/Bank
      await supabase.from('journal_lines').insert([
        { journal_id: journal.id, account_id: apAccountId, debit: amount, credit: 0, description: `Payment for ${selectedPayable?.description}` },
        { journal_id: journal.id, account_id: paymentAccountId, debit: 0, credit: amount, description: `Payment for ${selectedPayable?.description}` },
      ]);

      // Update payable
      const newPaid = Number(selectedPayable!.amount_paid) + amount;
      const newStatus = newPaid >= Number(selectedPayable!.amount) ? 'paid' : 'partial';
      await supabase.from('payables').update({ amount_paid: newPaid, status: newStatus }).eq('id', payableId);
    },
    onSuccess: () => {
      toast({ title: 'Payment posted' });
      queryClient.invalidateQueries({ queryKey: ['payables-outstanding'] });
      queryClient.invalidateQueries({ queryKey: ['journals-manual'] });
      setPayableId(''); setAmount(0); setReference(''); setNotes('');
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  if (role !== 'accountant' && role !== 'ceo') {
    return <div className="flex flex-col items-center justify-center py-20"><p className="text-lg font-medium text-muted-foreground">Access Denied</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Payments</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Make payments against outstanding payables</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
        <div className="space-y-2">
          <Label>Select Payable *</Label>
          <Select value={payableId} onValueChange={(v) => { setPayableId(v); const p = payables.find((p: any) => p.id === v); if (p) setAmount(Number(p.amount) - Number(p.amount_paid)); }}>
            <SelectTrigger><SelectValue placeholder="Choose outstanding payable" /></SelectTrigger>
            <SelectContent>
              {payables.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.supplier ? `${p.supplier} — ` : ''}{p.description} (${(Number(p.amount) - Number(p.amount_paid)).toLocaleString()} due)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Payment Account *</Label>
            <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
              <SelectTrigger><SelectValue placeholder="Cash or Bank account" /></SelectTrigger>
              <SelectContent>
                {cashBankAccounts.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.code} — {a.name} ({a.account_subtype})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {paymentAccountId && availableFunds !== undefined && (
              <p className={`text-xs ${insufficientFunds ? 'text-destructive' : 'text-muted-foreground'}`}>Available: ${availableFunds.toLocaleString()}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input type="number" min={0} max={maxPayment} step={0.01} value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        {insufficientFunds && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Insufficient funds.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Cheque #, Transfer ref" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex justify-end">
          <Button onClick={() => payMutation.mutate()} disabled={!payableId || !paymentAccountId || amount <= 0 || !!insufficientFunds || payMutation.isPending}>
            {payMutation.isPending ? 'Posting...' : 'Post Payment'}
          </Button>
        </div>
      </div>

      {/* Outstanding payables list */}
      {payables.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-heading font-bold">Outstanding Payables</h2>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-heading font-semibold">Supplier</TableHead>
                  <TableHead className="font-heading font-semibold">Description</TableHead>
                  <TableHead className="font-heading font-semibold text-right">Total ($)</TableHead>
                  <TableHead className="font-heading font-semibold text-right">Paid ($)</TableHead>
                  <TableHead className="font-heading font-semibold text-right">Due ($)</TableHead>
                  <TableHead className="font-heading font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{p.supplier || '—'}</TableCell>
                    <TableCell className="text-sm">{p.description}</TableCell>
                    <TableCell className="text-sm text-right">${Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-right">${Number(p.amount_paid).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-right font-medium">${(Number(p.amount) - Number(p.amount_paid)).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

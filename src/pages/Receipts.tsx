import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Wallet } from 'lucide-react';

export default function Receipts() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'revenue' | 'receivable'>('revenue');
  const [revenueAccountId, setRevenueAccountId] = useState('');
  const [cashBankAccountId, setCashBankAccountId] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [receivableId, setReceivableId] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['coa-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chart_of_accounts').select('*').eq('is_active', true).order('code');
      if (error) throw error;
      return data;
    },
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ['receivables-outstanding'],
    queryFn: async () => {
      const { data, error } = await supabase.from('receivables').select('*').in('status', ['outstanding', 'partial']).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const revenueAccounts = accounts.filter((a: any) => a.account_type === 'Revenue');
  const cashBankAccounts = accounts.filter((a: any) => a.account_subtype === 'Cash' || a.account_subtype === 'Bank');

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data: journal, error: jErr } = await supabase.from('journals').insert({
        journal_number: 'AUTO',
        journal_date: receiptDate,
        description: `Receipt: ${description}`,
        journal_type: 'receipt' as any,
        is_posted: true, is_locked: true,
        payment_reference: reference,
        payment_account_id: cashBankAccountId,
        notes, created_by: user.id,
      }).select().single();
      if (jErr) throw jErr;

      if (mode === 'revenue') {
        await supabase.from('journal_lines').insert([
          { journal_id: journal.id, account_id: cashBankAccountId, debit: amount, credit: 0, description },
          { journal_id: journal.id, account_id: revenueAccountId, debit: 0, credit: amount, description },
        ]);
      } else {
        const arAccount = accounts.find((a: any) => a.account_subtype === 'Receivable');
        if (!arAccount) throw new Error('Accounts Receivable account not found');
        await supabase.from('journal_lines').insert([
          { journal_id: journal.id, account_id: cashBankAccountId, debit: amount, credit: 0, description },
          { journal_id: journal.id, account_id: arAccount.id, debit: 0, credit: amount, description },
        ]);
        // Update receivable
        if (receivableId) {
          const rec = receivables.find((r: any) => r.id === receivableId);
          if (rec) {
            const newReceived = Number(rec.amount_received) + amount;
            const newStatus = newReceived >= Number(rec.amount) ? 'received' : 'partial';
            await supabase.from('receivables').update({ amount_received: newReceived, status: newStatus }).eq('id', receivableId);
          }
        }
      }
    },
    onSuccess: () => {
      toast({ title: 'Receipt posted' });
      queryClient.invalidateQueries({ queryKey: ['receivables-outstanding'] });
      setDescription(''); setAmount(0); setReference(''); setNotes('');
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
          <Wallet className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Receipts</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Record incoming payments</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
        <div className="space-y-2">
          <Label>Receipt Type</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Direct Revenue</SelectItem>
              <SelectItem value="receivable">Settle Receivable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === 'receivable' && (
          <div className="space-y-2">
            <Label>Select Receivable</Label>
            <Select value={receivableId} onValueChange={(v) => { setReceivableId(v); const r = receivables.find((r: any) => r.id === v); if (r) { setAmount(Number(r.amount) - Number(r.amount_received)); setDescription(r.description); } }}>
              <SelectTrigger><SelectValue placeholder="Choose receivable" /></SelectTrigger>
              <SelectContent>
                {receivables.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.customer} — {r.description} (${(Number(r.amount) - Number(r.amount_received)).toLocaleString()} due)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === 'revenue' && (
          <div className="space-y-2">
            <Label>Revenue Account *</Label>
            <Select value={revenueAccountId} onValueChange={setRevenueAccountId}>
              <SelectTrigger><SelectValue placeholder="Select revenue account" /></SelectTrigger>
              <SelectContent>
                {revenueAccounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cash/Bank Account *</Label>
            <Select value={cashBankAccountId} onValueChange={setCashBankAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {cashBankAccounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description *</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Payment description" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Receipt #" /></div>
        </div>

        <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        <div className="flex justify-end">
          <Button onClick={() => postMutation.mutate()} disabled={!cashBankAccountId || amount <= 0 || !description || postMutation.isPending}>
            {postMutation.isPending ? 'Posting...' : 'Post Receipt'}
          </Button>
        </div>
      </div>
    </div>
  );
}

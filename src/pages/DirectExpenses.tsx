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
import { Receipt, AlertTriangle } from 'lucide-react';

export default function DirectExpenses() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [payFrom, setPayFrom] = useState<'cash_bank' | 'payable'>('cash_bank');
  const [cashBankAccountId, setCashBankAccountId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['coa-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chart_of_accounts').select('*').eq('is_active', true).order('code');
      if (error) throw error;
      return data;
    },
  });

  const expenseAccounts = accounts.filter((a: any) => a.account_type === 'Expense');
  const cashBankAccounts = accounts.filter((a: any) => a.account_subtype === 'Cash' || a.account_subtype === 'Bank');

  // Check available funds
  const { data: availableFunds } = useQuery({
    queryKey: ['account-balance', cashBankAccountId],
    queryFn: async () => {
      if (!cashBankAccountId) return 0;
      const { data, error } = await supabase.from('journal_lines').select('debit, credit').eq('account_id', cashBankAccountId);
      if (error) throw error;
      return (data || []).reduce((sum: number, l: any) => sum + Number(l.debit) - Number(l.credit), 0);
    },
    enabled: !!cashBankAccountId && payFrom === 'cash_bank',
  });

  const insufficientFunds = payFrom === 'cash_bank' && cashBankAccountId && availableFunds !== undefined && amount > availableFunds;

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data: journal, error: jErr } = await supabase.from('journals').insert({
        journal_number: 'AUTO',
        journal_date: entryDate,
        description: `Expense: ${description}`,
        journal_type: 'expense' as any,
        is_posted: true, is_locked: true,
        notes, created_by: user.id,
      }).select().single();
      if (jErr) throw jErr;

      if (payFrom === 'cash_bank') {
        await supabase.from('journal_lines').insert([
          { journal_id: journal.id, account_id: expenseAccountId, debit: amount, credit: 0, description },
          { journal_id: journal.id, account_id: cashBankAccountId, debit: 0, credit: amount, description },
        ]);
      } else {
        const apAccount = accounts.find((a: any) => a.account_subtype === 'Payable');
        if (!apAccount) throw new Error('Accounts Payable not found');
        await supabase.from('journal_lines').insert([
          { journal_id: journal.id, account_id: expenseAccountId, debit: amount, credit: 0, description },
          { journal_id: journal.id, account_id: apAccount.id, debit: 0, credit: amount, description },
        ]);
        await supabase.from('payables').insert({
          supplier, description, amount, journal_id: journal.id,
        });
      }
    },
    onSuccess: () => {
      toast({ title: 'Expense posted' });
      queryClient.invalidateQueries({ queryKey: ['payables-outstanding'] });
      setDescription(''); setAmount(0); setSupplier(''); setNotes('');
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  if (role !== 'accountant') {
    return <div className="flex flex-col items-center justify-center py-20"><p className="text-lg font-medium text-muted-foreground">Access Denied</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <Receipt className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Direct Expenses</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Record expenses not initiated by requisitions</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Supplier</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name" /></div>
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} /></div>
        </div>

        <div className="space-y-2"><Label>Description *</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Expense description" /></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Expense Account *</Label>
            <Select value={expenseAccountId} onValueChange={setExpenseAccountId}>
              <SelectTrigger><SelectValue placeholder="Select expense account" /></SelectTrigger>
              <SelectContent>{expenseAccounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Amount *</Label><Input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} /></div>
        </div>

        <div className="space-y-2">
          <Label>Pay From</Label>
          <Select value={payFrom} onValueChange={(v) => setPayFrom(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash_bank">Cash/Bank (immediate)</SelectItem>
              <SelectItem value="payable">Accounts Payable (on credit)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {payFrom === 'cash_bank' && (
          <div className="space-y-2">
            <Label>Cash/Bank Account *</Label>
            <Select value={cashBankAccountId} onValueChange={setCashBankAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>{cashBankAccounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
            </Select>
            {cashBankAccountId && availableFunds !== undefined && (
              <p className={`text-xs ${insufficientFunds ? 'text-destructive' : 'text-muted-foreground'}`}>Available: ${availableFunds.toLocaleString()}</p>
            )}
          </div>
        )}

        {insufficientFunds && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>Insufficient funds.</span>
          </div>
        )}

        <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        <div className="flex justify-end">
          <Button onClick={() => postMutation.mutate()} disabled={!expenseAccountId || amount <= 0 || !description || !!insufficientFunds || postMutation.isPending || (payFrom === 'cash_bank' && !cashBankAccountId)}>
            {postMutation.isPending ? 'Posting...' : 'Post Expense'}
          </Button>
        </div>
      </div>
    </div>
  );
}

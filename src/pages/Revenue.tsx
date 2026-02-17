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
import { useToast } from '@/hooks/use-toast';
import { TrendingUp } from 'lucide-react';

export default function Revenue() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customer, setCustomer] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [revenueAccountId, setRevenueAccountId] = useState('');
  const [receiveTo, setReceiveTo] = useState<'cash_bank' | 'receivable'>('cash_bank');
  const [cashBankAccountId, setCashBankAccountId] = useState('');
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

  const revenueAccounts = accounts.filter((a: any) => a.account_type === 'Revenue');
  const cashBankAccounts = accounts.filter((a: any) => a.account_subtype === 'Cash' || a.account_subtype === 'Bank');

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data: journal, error: jErr } = await supabase.from('journals').insert({
        journal_number: 'AUTO',
        journal_date: entryDate,
        description: `Revenue: ${description}`,
        journal_type: 'revenue' as any,
        is_posted: true, is_locked: true,
        notes, created_by: user.id,
      }).select().single();
      if (jErr) throw jErr;

      if (receiveTo === 'cash_bank') {
        await supabase.from('journal_lines').insert([
          { journal_id: journal.id, account_id: cashBankAccountId, debit: amount, credit: 0, description },
          { journal_id: journal.id, account_id: revenueAccountId, debit: 0, credit: amount, description },
        ]);
      } else {
        const arAccount = accounts.find((a: any) => a.account_subtype === 'Receivable');
        if (!arAccount) throw new Error('Accounts Receivable not found');
        await supabase.from('journal_lines').insert([
          { journal_id: journal.id, account_id: arAccount.id, debit: amount, credit: 0, description },
          { journal_id: journal.id, account_id: revenueAccountId, debit: 0, credit: amount, description },
        ]);
        // Create receivable record
        await supabase.from('receivables').insert({
          customer, description, amount, journal_id: journal.id,
        });
      }
    },
    onSuccess: () => {
      toast({ title: 'Revenue posted' });
      queryClient.invalidateQueries({ queryKey: ['receivables-outstanding'] });
      setCustomer(''); setDescription(''); setAmount(0); setNotes('');
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
          <TrendingUp className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Revenue</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Record sales and service income</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Customer</Label><Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" /></div>
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} /></div>
        </div>

        <div className="space-y-2"><Label>Description *</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Revenue description" /></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Revenue Account *</Label>
            <Select value={revenueAccountId} onValueChange={setRevenueAccountId}>
              <SelectTrigger><SelectValue placeholder="Select revenue account" /></SelectTrigger>
              <SelectContent>{revenueAccounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Amount *</Label><Input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} /></div>
        </div>

        <div className="space-y-2">
          <Label>Receive To</Label>
          <Select value={receiveTo} onValueChange={(v) => setReceiveTo(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash_bank">Cash/Bank (immediate)</SelectItem>
              <SelectItem value="receivable">Accounts Receivable (on credit)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {receiveTo === 'cash_bank' && (
          <div className="space-y-2">
            <Label>Cash/Bank Account *</Label>
            <Select value={cashBankAccountId} onValueChange={setCashBankAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>{cashBankAccounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        <div className="flex justify-end">
          <Button onClick={() => postMutation.mutate()} disabled={!revenueAccountId || amount <= 0 || !description || postMutation.isPending || (receiveTo === 'cash_bank' && !cashBankAccountId)}>
            {postMutation.isPending ? 'Posting...' : 'Post Revenue'}
          </Button>
        </div>
      </div>
    </div>
  );
}

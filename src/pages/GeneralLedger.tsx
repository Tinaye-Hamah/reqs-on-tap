import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { BookOpen } from 'lucide-react';

export default function GeneralLedger() {
  const { role } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['coa-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chart_of_accounts').select('*').eq('is_active', true).order('code');
      if (error) throw error;
      return data;
    },
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['ledger', selectedAccount],
    queryFn: async () => {
      if (!selectedAccount) return [];
      const { data, error } = await supabase
        .from('journal_lines')
        .select('*, journals!inner(journal_number, journal_date, description, is_posted)')
        .eq('account_id', selectedAccount)
        .eq('journals.is_posted', true)
        .order('created_at', { ascending: true });
      if (error) throw error;

      let runningBalance = 0;
      return data.map((entry: any) => {
        // For asset/expense: balance = debits - credits; for liability/equity/revenue: balance = credits - debits
        const account = accounts.find((a: any) => a.id === selectedAccount);
        const isDebitNormal = account?.account_type === 'Asset' || account?.account_type === 'Expense';
        if (isDebitNormal) {
          runningBalance += Number(entry.debit) - Number(entry.credit);
        } else {
          runningBalance += Number(entry.credit) - Number(entry.debit);
        }
        return { ...entry, runningBalance };
      });
    },
    enabled: !!selectedAccount,
  });

  const selectedAccountInfo = accounts.find((a: any) => a.id === selectedAccount);

  if (role !== 'accountant' && role !== 'ceo') {
    return <div className="flex flex-col items-center justify-center py-20"><p className="text-lg font-medium text-muted-foreground">Access Denied</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-heading font-bold">General Ledger</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Transaction history per account</p>
      </div>

      <div className="space-y-2 max-w-md">
        <Label>Select Account</Label>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger><SelectValue placeholder="Choose an account" /></SelectTrigger>
          <SelectContent>
            {accounts.map((a: any) => (
              <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedAccount && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {isLoading ? <p className="p-4 text-muted-foreground">Loading...</p> : entries.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">No transactions for this account.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-heading font-semibold">Date</TableHead>
                  <TableHead className="font-heading font-semibold">Journal</TableHead>
                  <TableHead className="font-heading font-semibold">Description</TableHead>
                  <TableHead className="font-heading font-semibold text-right">Debit ($)</TableHead>
                  <TableHead className="font-heading font-semibold text-right">Credit ($)</TableHead>
                  <TableHead className="font-heading font-semibold text-right">Balance ($)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{new Date(e.journals.journal_date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-sm">{e.journals.journal_number}</TableCell>
                    <TableCell className="text-sm">{e.description || e.journals.description}</TableCell>
                    <TableCell className="text-sm text-right">{Number(e.debit) > 0 ? `$${Number(e.debit).toLocaleString()}` : '—'}</TableCell>
                    <TableCell className="text-sm text-right">{Number(e.credit) > 0 ? `$${Number(e.credit).toLocaleString()}` : '—'}</TableCell>
                    <TableCell className={`text-sm text-right font-bold ${e.runningBalance < 0 ? 'text-destructive' : ''}`}>${e.runningBalance.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}

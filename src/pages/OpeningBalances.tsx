import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Lock, Scale } from 'lucide-react';

export default function OpeningBalances() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [balanceDate, setBalanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [balances, setBalances] = useState<Record<string, { debit: number; credit: number }>>({});

  const { data: accounts = [] } = useQuery({
    queryKey: ['coa-for-opening'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chart_of_accounts').select('*').eq('is_active', true).order('code');
      if (error) throw error;
      return data;
    },
  });

  // Check if opening balances already exist
  const { data: existingOB } = useQuery({
    queryKey: ['opening-balance-journal'],
    queryFn: async () => {
      const { data, error } = await supabase.from('journals')
        .select('*')
        .eq('journal_type', 'opening_balance')
        .eq('is_locked', true)
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  const isLocked = !!existingOB;

  const updateBalance = (accountId: string, field: 'debit' | 'credit', value: number) => {
    setBalances(prev => ({
      ...prev,
      [accountId]: { ...prev[accountId], [field]: value, [field === 'debit' ? 'credit' : 'debit']: 0 },
    }));
  };

  const totalDebits = Object.values(balances).reduce((s, b) => s + (b.debit || 0), 0);
  const totalCredits = Object.values(balances).reduce((s, b) => s + (b.credit || 0), 0);
  const difference = totalDebits - totalCredits;

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const lines = Object.entries(balances)
        .filter(([, b]) => b.debit > 0 || b.credit > 0)
        .map(([accountId, b]) => ({ account_id: accountId, debit: b.debit || 0, credit: b.credit || 0, description: 'Opening balance' }));

      // Auto-balance to Opening Balance Equity
      if (difference !== 0) {
        const obeAccount = accounts.find((a: any) => a.code === '3000');
        if (obeAccount) {
          lines.push({
            account_id: obeAccount.id,
            debit: difference < 0 ? Math.abs(difference) : 0,
            credit: difference > 0 ? difference : 0,
            description: 'Auto-balance to Opening Balance Equity',
          });
        }
      }

      // Create journal
      const { data: journal, error: jErr } = await supabase.from('journals').insert({
        journal_number: 'AUTO',
        journal_date: balanceDate,
        description: 'Opening Balances',
        journal_type: 'opening_balance' as any,
        is_posted: true,
        is_locked: true,
        created_by: user.id,
      }).select().single();
      if (jErr) throw jErr;

      // Create lines
      const lineRows = lines.map(l => ({ ...l, journal_id: journal.id }));
      const { error: lErr } = await supabase.from('journal_lines').insert(lineRows);
      if (lErr) throw lErr;
    },
    onSuccess: () => {
      toast({ title: 'Opening balances posted and locked' });
      queryClient.invalidateQueries({ queryKey: ['opening-balance-journal'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  if (role !== 'accountant') {
    return <div className="flex flex-col items-center justify-center py-20"><p className="text-lg font-medium text-muted-foreground">Access Denied</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Scale className="w-6 h-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Opening Balances</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Set starting account balances</p>
        </div>
        {isLocked && (
          <div className="flex items-center gap-2 text-warning">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">Locked</span>
          </div>
        )}
      </div>

      {isLocked ? (
        <div className="rounded-xl border bg-card shadow-sm p-8 text-center">
          <p className="text-muted-foreground">Opening balances have been posted and locked. Create a manual journal to make adjustments.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 max-w-xs">
            <Label>Balance Date</Label>
            <Input type="date" value={balanceDate} onChange={(e) => setBalanceDate(e.target.value)} />
          </div>

          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-heading font-semibold">Code</TableHead>
                  <TableHead className="font-heading font-semibold">Account</TableHead>
                  <TableHead className="font-heading font-semibold">Type</TableHead>
                  <TableHead className="font-heading font-semibold text-right">Debit ($)</TableHead>
                  <TableHead className="font-heading font-semibold text-right">Credit ($)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.filter((a: any) => a.account_subtype !== 'Accumulated Depreciation').map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-sm">{a.code}</TableCell>
                    <TableCell className="text-sm font-medium">{a.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.account_type}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number" min={0} step={0.01} className="w-28 ml-auto text-right"
                        value={balances[a.id]?.debit || ''}
                        onChange={(e) => updateBalance(a.id, 'debit', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number" min={0} step={0.01} className="w-28 ml-auto text-right"
                        value={balances[a.id]?.credit || ''}
                        onChange={(e) => updateBalance(a.id, 'credit', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3} className="text-right font-heading">Totals</TableCell>
                  <TableCell className="text-right">${totalDebits.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${totalCredits.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {difference !== 0 && (
            <p className="text-sm text-warning">
              Difference of ${Math.abs(difference).toLocaleString()} will be auto-balanced to Opening Balance Equity.
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={() => postMutation.mutate()} disabled={postMutation.isPending || Object.keys(balances).length === 0}>
              {postMutation.isPending ? 'Posting...' : 'Post & Lock Opening Balances'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3 } from 'lucide-react';

export default function Reports() {
  const { role } = useAuth();
  const [tab, setTab] = useState('trial-balance');

  const { data: accounts = [] } = useQuery({
    queryKey: ['coa-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chart_of_accounts').select('*').eq('is_active', true).order('code');
      if (error) throw error;
      return data;
    },
  });

  const { data: allLines = [] } = useQuery({
    queryKey: ['all-journal-lines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_lines')
        .select('*, journals!inner(is_posted)')
        .eq('journals.is_posted', true);
      if (error) throw error;
      return data;
    },
  });

  // Calculate balances per account
  const accountBalances = accounts.map((a: any) => {
    const lines = allLines.filter((l: any) => l.account_id === a.id);
    const totalDebit = lines.reduce((s: number, l: any) => s + Number(l.debit), 0);
    const totalCredit = lines.reduce((s: number, l: any) => s + Number(l.credit), 0);
    const isDebitNormal = a.account_type === 'Asset' || a.account_type === 'Expense';
    const balance = isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit;
    return { ...a, totalDebit, totalCredit, balance };
  }).filter((a: any) => a.totalDebit > 0 || a.totalCredit > 0);

  const trialBalanceDebit = accountBalances.filter((a: any) => a.balance > 0 && (a.account_type === 'Asset' || a.account_type === 'Expense')).reduce((s: number, a: any) => s + a.balance, 0);
  const trialBalanceCredit = accountBalances.filter((a: any) => a.balance > 0 && (a.account_type === 'Liability' || a.account_type === 'Equity' || a.account_type === 'Revenue')).reduce((s: number, a: any) => s + a.balance, 0);

  // Income Statement
  const revenueTotal = accountBalances.filter((a: any) => a.account_type === 'Revenue').reduce((s: number, a: any) => s + a.balance, 0);
  const expenseTotal = accountBalances.filter((a: any) => a.account_type === 'Expense').reduce((s: number, a: any) => s + a.balance, 0);
  const netIncome = revenueTotal - expenseTotal;

  // Balance Sheet
  const assetTotal = accountBalances.filter((a: any) => a.account_type === 'Asset').reduce((s: number, a: any) => s + a.balance, 0);
  const liabilityTotal = accountBalances.filter((a: any) => a.account_type === 'Liability').reduce((s: number, a: any) => s + a.balance, 0);
  const equityTotal = accountBalances.filter((a: any) => a.account_type === 'Equity').reduce((s: number, a: any) => s + a.balance, 0);

  if (role !== 'accountant' && role !== 'ceo') {
    return <div className="flex flex-col items-center justify-center py-20"><p className="text-lg font-medium text-muted-foreground">Access Denied</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Reports</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Financial reports from posted journals</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="trial-balance" className="mt-4">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-heading font-semibold">Code</TableHead>
                  <TableHead className="font-heading font-semibold">Account</TableHead>
                  <TableHead className="font-heading font-semibold text-right">Debit ($)</TableHead>
                  <TableHead className="font-heading font-semibold text-right">Credit ($)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountBalances.map((a: any) => {
                  const isDebitNormal = a.account_type === 'Asset' || a.account_type === 'Expense';
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-sm">{a.code}</TableCell>
                      <TableCell className="text-sm">{a.name}</TableCell>
                      <TableCell className="text-sm text-right">{isDebitNormal && a.balance > 0 ? `$${a.balance.toLocaleString()}` : '—'}</TableCell>
                      <TableCell className="text-sm text-right">{!isDebitNormal && a.balance > 0 ? `$${a.balance.toLocaleString()}` : '—'}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={2} className="text-right font-heading">Totals</TableCell>
                  <TableCell className="text-right">${trialBalanceDebit.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${trialBalanceCredit.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="income-statement" className="mt-4">
          <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
            <h3 className="font-heading font-bold text-lg">Revenue</h3>
            {accountBalances.filter((a: any) => a.account_type === 'Revenue').map((a: any) => (
              <div key={a.id} className="flex justify-between text-sm"><span>{a.name}</span><span>${a.balance.toLocaleString()}</span></div>
            ))}
            <div className="flex justify-between font-bold border-t pt-2"><span>Total Revenue</span><span>${revenueTotal.toLocaleString()}</span></div>

            <h3 className="font-heading font-bold text-lg mt-4">Expenses</h3>
            {accountBalances.filter((a: any) => a.account_type === 'Expense').map((a: any) => (
              <div key={a.id} className="flex justify-between text-sm"><span>{a.name}</span><span>${a.balance.toLocaleString()}</span></div>
            ))}
            <div className="flex justify-between font-bold border-t pt-2"><span>Total Expenses</span><span>${expenseTotal.toLocaleString()}</span></div>

            <div className={`flex justify-between font-bold text-lg border-t pt-3 ${netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
              <span>Net {netIncome >= 0 ? 'Income' : 'Loss'}</span><span>${Math.abs(netIncome).toLocaleString()}</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="balance-sheet" className="mt-4">
          <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
            <h3 className="font-heading font-bold text-lg">Assets</h3>
            {accountBalances.filter((a: any) => a.account_type === 'Asset').map((a: any) => (
              <div key={a.id} className="flex justify-between text-sm"><span>{a.name}</span><span>${a.balance.toLocaleString()}</span></div>
            ))}
            <div className="flex justify-between font-bold border-t pt-2"><span>Total Assets</span><span>${assetTotal.toLocaleString()}</span></div>

            <h3 className="font-heading font-bold text-lg mt-4">Liabilities</h3>
            {accountBalances.filter((a: any) => a.account_type === 'Liability').map((a: any) => (
              <div key={a.id} className="flex justify-between text-sm"><span>{a.name}</span><span>${a.balance.toLocaleString()}</span></div>
            ))}
            <div className="flex justify-between font-bold border-t pt-2"><span>Total Liabilities</span><span>${liabilityTotal.toLocaleString()}</span></div>

            <h3 className="font-heading font-bold text-lg mt-4">Equity</h3>
            {accountBalances.filter((a: any) => a.account_type === 'Equity').map((a: any) => (
              <div key={a.id} className="flex justify-between text-sm"><span>{a.name}</span><span>${a.balance.toLocaleString()}</span></div>
            ))}
            <div className="flex justify-between text-sm"><span>Net Income</span><span>${netIncome.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold border-t pt-2"><span>Total Equity</span><span>${(equityTotal + netIncome).toLocaleString()}</span></div>

            <div className="flex justify-between font-bold text-lg border-t pt-3">
              <span>Total Liabilities + Equity</span><span>${(liabilityTotal + equityTotal + netIncome).toLocaleString()}</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
        .select('*, journals!inner(is_posted, journal_type)')
        .eq('journals.is_posted', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: cashbookEntries = [] } = useQuery({
    queryKey: ['cashbook'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cashbook').select('*').order('created_at', { ascending: true });
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

  // Cash Flow Statement
  // Operating: receipts (debit to cash/bank) minus payments (credit from cash/bank)
  const cashBankAccounts = accounts.filter((a: any) => a.account_subtype === 'Cash' || a.account_subtype === 'Bank');
  const cashBankIds = cashBankAccounts.map((a: any) => a.id);

  const operatingLines = allLines.filter((l: any) => {
    const jType = l.journals?.journal_type;
    return cashBankIds.includes(l.account_id) && ['receipt', 'payment', 'requisition_approval', 'revenue', 'expense'].includes(jType);
  });
  const operatingInflows = operatingLines.reduce((s: number, l: any) => s + Number(l.debit), 0);
  const operatingOutflows = operatingLines.reduce((s: number, l: any) => s + Number(l.credit), 0);
  const netOperating = operatingInflows - operatingOutflows;

  const investingLines = allLines.filter((l: any) => {
    const jType = l.journals?.journal_type;
    return cashBankIds.includes(l.account_id) && ['depreciation'].includes(jType);
  });
  const investingInflows = investingLines.reduce((s: number, l: any) => s + Number(l.debit), 0);
  const investingOutflows = investingLines.reduce((s: number, l: any) => s + Number(l.credit), 0);
  const netInvesting = investingInflows - investingOutflows;

  // Fixed asset purchases from journal lines
  const fixedAssetAccounts = accounts.filter((a: any) => a.account_subtype === 'Fixed Asset');
  const fixedAssetIds = fixedAssetAccounts.map((a: any) => a.id);
  const assetPurchases = allLines.filter((l: any) => fixedAssetIds.includes(l.account_id)).reduce((s: number, l: any) => s + Number(l.debit) - Number(l.credit), 0);

  const financingLines = allLines.filter((l: any) => {
    const jType = l.journals?.journal_type;
    return cashBankIds.includes(l.account_id) && ['opening_balance', 'manual'].includes(jType);
  });
  const financingInflows = financingLines.reduce((s: number, l: any) => s + Number(l.debit), 0);
  const financingOutflows = financingLines.reduce((s: number, l: any) => s + Number(l.credit), 0);
  const netFinancing = financingInflows - financingOutflows;

  const totalCashChange = netOperating + netInvesting + netFinancing;
  const totalCashBalance = cashBankAccounts.reduce((s: number, a: any) => {
    const ab = accountBalances.find((ab: any) => ab.id === a.id);
    return s + (ab?.balance || 0);
  }, 0);

  if (role !== 'accountant') {
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
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
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

        <TabsContent value="cash-flow" className="mt-4">
          <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
            <h3 className="font-heading font-bold text-lg">Operating Activities</h3>
            <div className="flex justify-between text-sm"><span>Cash received from customers</span><span className="text-success">${operatingInflows.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span>Cash paid to suppliers & expenses</span><span className="text-destructive">(${operatingOutflows.toLocaleString()})</span></div>
            <div className={`flex justify-between font-bold border-t pt-2 ${netOperating >= 0 ? 'text-success' : 'text-destructive'}`}>
              <span>Net Cash from Operations</span><span>${netOperating.toLocaleString()}</span>
            </div>

            <h3 className="font-heading font-bold text-lg mt-4">Investing Activities</h3>
            <div className="flex justify-between text-sm"><span>Purchase of fixed assets</span><span className="text-destructive">{assetPurchases > 0 ? `($${assetPurchases.toLocaleString()})` : '$0'}</span></div>
            {netInvesting !== 0 && <div className="flex justify-between text-sm"><span>Other investing cash flows</span><span>${netInvesting.toLocaleString()}</span></div>}
            <div className={`flex justify-between font-bold border-t pt-2 ${(netInvesting - assetPurchases) >= 0 ? '' : 'text-destructive'}`}>
              <span>Net Cash from Investing</span><span>${(netInvesting - assetPurchases).toLocaleString()}</span>
            </div>

            <h3 className="font-heading font-bold text-lg mt-4">Financing Activities</h3>
            <div className="flex justify-between text-sm"><span>Capital & opening balances</span><span>${financingInflows.toLocaleString()}</span></div>
            {financingOutflows > 0 && <div className="flex justify-between text-sm"><span>Distributions</span><span className="text-destructive">(${financingOutflows.toLocaleString()})</span></div>}
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Net Cash from Financing</span><span>${netFinancing.toLocaleString()}</span>
            </div>

            <div className={`flex justify-between font-bold text-lg border-t-2 pt-4 mt-4 ${totalCashBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              <span>Cash & Cash Equivalents at End</span><span>${totalCashBalance.toLocaleString()}</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

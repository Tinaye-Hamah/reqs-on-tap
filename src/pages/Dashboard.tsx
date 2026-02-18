import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatsCard } from '@/components/StatsCard';
import { RequisitionTable } from '@/components/RequisitionTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FilePlus, ClipboardList, Clock, CheckCircle2, DollarSign,
  TrendingUp, TrendingDown, Wallet, CreditCard, BookOpen,
  FileEdit, BarChart3, ArrowRight, AlertTriangle,
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const { data: requisitions = [] } = useQuery({
    queryKey: ['requisitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requisitions')
        .select('*, requisition_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Accountant-specific queries
  const { data: accountBalances = [] } = useQuery({
    queryKey: ['dashboard-balances'],
    queryFn: async () => {
      const { data: accounts } = await supabase.from('chart_of_accounts').select('*').eq('is_active', true);
      if (!accounts?.length) return [];
      const { data: lines } = await supabase.from('journal_lines').select('account_id, debit, credit');
      if (!lines) return [];

      return accounts.map((acc: any) => {
        const accLines = lines.filter((l: any) => l.account_id === acc.id);
        const isDebitNormal = acc.account_type === 'Asset' || acc.account_type === 'Expense';
        const balance = accLines.reduce((s: number, l: any) => {
          return s + (isDebitNormal ? Number(l.debit) - Number(l.credit) : Number(l.credit) - Number(l.debit));
        }, 0);
        return { ...acc, balance };
      });
    },
    enabled: !!user && role === 'accountant',
  });

  const { data: recentJournals = [] } = useQuery({
    queryKey: ['dashboard-journals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('journals').select('*').order('created_at', { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user && role === 'accountant',
  });

  const { data: pendingPayables = [] } = useQuery({
    queryKey: ['dashboard-payables'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payables').select('*').eq('status', 'outstanding').limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user && role === 'accountant',
  });

  const pending = requisitions.filter(r => r.status === 'pending' || r.status === 'manager_approved').length;
  const approved = requisitions.filter(r => r.status === 'approved').length;
  const rejected = requisitions.filter(r => r.status === 'rejected').length;
  const total = requisitions.reduce((s, r) => s + Number(r.total_amount), 0);
  const recent = requisitions.slice(0, 5);

  // Accountant financial summaries
  const cashAccounts = accountBalances.filter((a: any) => a.account_subtype === 'Cash');
  const bankAccounts = accountBalances.filter((a: any) => a.account_subtype === 'Bank');
  const totalCash = cashAccounts.reduce((s: number, a: any) => s + a.balance, 0);
  const totalBank = bankAccounts.reduce((s: number, a: any) => s + a.balance, 0);
  const totalRevenue = accountBalances.filter((a: any) => a.account_type === 'Revenue').reduce((s: number, a: any) => s + a.balance, 0);
  const totalExpenses = accountBalances.filter((a: any) => a.account_type === 'Expense').reduce((s: number, a: any) => s + a.balance, 0);
  const awaitingAccountantApproval = requisitions.filter(r => r.status === 'manager_approved').length;

  const isAccountant = role === 'accountant';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">
            {isAccountant ? 'Accountant Dashboard' : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAccountant ? 'Financial overview & pending actions' : 'Overview of requisition activity'}
          </p>
        </div>
        <div className="flex gap-2">
          {isAccountant && (
            <Button variant="outline" onClick={() => navigate('/accounting/journal')} className="gap-2">
              <FileEdit className="w-4 h-4" /> New Journal
            </Button>
          )}
          <Button onClick={() => navigate('/requisitions/new')} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 font-medium shadow-sm">
            <FilePlus className="w-4 h-4" /> New Requisition
          </Button>
        </div>
      </div>

      {/* Accountant Financial Overview */}
      {isAccountant && (
        <>
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-bl-[4rem]" />
              <div className="flex items-center justify-between relative">
                <p className="text-sm font-medium text-muted-foreground">Cash on Hand</p>
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-success" />
                </div>
              </div>
              <p className={`mt-2 text-2xl font-heading font-bold ${totalCash >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                ${totalCash.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{cashAccounts.length} cash account{cashAccounts.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-info/5 rounded-bl-[4rem]" />
              <div className="flex items-center justify-between relative">
                <p className="text-sm font-medium text-muted-foreground">Bank Balance</p>
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-info" />
                </div>
              </div>
              <p className={`mt-2 text-2xl font-heading font-bold ${totalBank >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                ${totalBank.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{bankAccounts.length} bank account{bankAccounts.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-bl-[4rem]" />
              <div className="flex items-center justify-between relative">
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-heading font-bold text-foreground">${totalRevenue.toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">From posted journals</p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 rounded-bl-[4rem]" />
              <div className="flex items-center justify-between relative">
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-heading font-bold text-foreground">${totalExpenses.toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">From posted journals</p>
            </div>
          </div>

          {/* Pending Actions Alert */}
          {awaitingAccountantApproval > 0 && (
            <div className="rounded-xl border-2 border-warning/30 bg-warning/5 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-heading font-semibold">{awaitingAccountantApproval} requisition{awaitingAccountantApproval !== 1 ? 's' : ''} awaiting your approval</p>
                  <p className="text-xs text-muted-foreground">Manager-approved and ready for final review</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/requisitions')} className="gap-1 shrink-0">
                Review <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="rounded-xl border bg-card shadow-sm p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Chart of Accounts', icon: BookOpen, to: '/accounting/coa' },
                  { label: 'Manual Journal', icon: FileEdit, to: '/accounting/journal' },
                  { label: 'Payments', icon: CreditCard, to: '/accounting/payments' },
                  { label: 'Receipts', icon: Wallet, to: '/accounting/receipts' },
                  { label: 'General Ledger', icon: BookOpen, to: '/accounting/ledger' },
                  { label: 'Reports', icon: BarChart3, to: '/accounting/reports' },
                ].map(item => (
                  <button
                    key={item.to}
                    onClick={() => navigate(item.to)}
                    className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent/10 hover:text-foreground hover:border-accent/30 transition-all"
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Journals */}
            <div className="rounded-xl border bg-card shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-sm">Recent Journals</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/accounting/ledger')} className="text-xs text-muted-foreground h-6 px-2">
                  View all →
                </Button>
              </div>
              {recentJournals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No journals posted yet</p>
              ) : (
                <div className="space-y-2">
                  {recentJournals.map((j: any) => (
                    <div key={j.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-muted-foreground">{j.journal_number}</p>
                        <p className="text-sm font-medium truncate">{j.description}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                        {j.journal_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outstanding Payables */}
            <div className="rounded-xl border bg-card shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-sm">Outstanding Payables</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/accounting/payments')} className="text-xs text-muted-foreground h-6 px-2">
                  View all →
                </Button>
              </div>
              {pendingPayables.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No outstanding payables</p>
              ) : (
                <div className="space-y-2">
                  {pendingPayables.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.description || p.supplier}</p>
                        <p className="text-xs text-muted-foreground">{p.supplier}</p>
                      </div>
                      <p className="text-sm font-heading font-bold text-destructive shrink-0 ml-2">
                        ${Number(p.amount - p.amount_paid).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Requisition Stats — shown to all roles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Requests" value={requisitions.length} icon={ClipboardList} trend="All time" />
        <StatsCard label="Pending Approval" value={pending} icon={Clock} trend="Awaiting review" />
        <StatsCard label="Approved" value={approved} icon={CheckCircle2} trend="Completed" />
        <StatsCard label="Total Value" value={`$${total.toLocaleString()}`} icon={DollarSign} trend="Combined amount" />
      </div>

      {/* Recent Requisitions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold">Recent Requisitions</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/requisitions')} className="text-muted-foreground hover:text-foreground text-xs">
            View all →
          </Button>
        </div>
        <RequisitionTable requisitions={recent} />
      </div>
    </div>
  );
}

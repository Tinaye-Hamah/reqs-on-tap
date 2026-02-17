import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, BookMarked } from 'lucide-react';

const accountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as const;
const accountSubtypes = ['Cash', 'Bank', 'Receivable', 'Payable', 'Fixed Asset', 'Accumulated Depreciation', 'Current Liability', 'Long Term Liability', 'Equity', 'Revenue', 'Cost of Sales', 'Expense', 'Other'] as const;

interface AccountForm {
  code: string; name: string; account_type: string; account_subtype: string; description: string; is_active: boolean;
}

const emptyForm: AccountForm = { code: '', name: '', account_type: '', account_subtype: 'Other', description: '', is_active: true };

export default function ChartOfAccounts() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [filter, setFilter] = useState('');

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chart_of_accounts').select('*').order('code');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from('chart_of_accounts').update({
          code: form.code, name: form.name, account_type: form.account_type as any,
          account_subtype: form.account_subtype as any, description: form.description, is_active: form.is_active,
        }).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('chart_of_accounts').insert({
          code: form.code, name: form.name, account_type: form.account_type as any,
          account_subtype: form.account_subtype as any, description: form.description, is_active: form.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editId ? 'Account updated' : 'Account created' });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      setModalOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const openEdit = (account: any) => {
    setEditId(account.id);
    setForm({
      code: account.code, name: account.name, account_type: account.account_type,
      account_subtype: account.account_subtype, description: account.description || '', is_active: account.is_active,
    });
    setModalOpen(true);
  };

  const openNew = () => { setEditId(null); setForm(emptyForm); setModalOpen(true); };

  const filtered = accounts.filter((a: any) =>
    a.code.toLowerCase().includes(filter.toLowerCase()) ||
    a.name.toLowerCase().includes(filter.toLowerCase()) ||
    a.account_type.toLowerCase().includes(filter.toLowerCase())
  );

  const typeColor = (type: string) => {
    const map: Record<string, string> = { Asset: 'bg-info/10 text-info', Liability: 'bg-warning/10 text-warning', Equity: 'bg-primary/10 text-primary', Revenue: 'bg-success/10 text-success', Expense: 'bg-destructive/10 text-destructive' };
    return map[type] || '';
  };

  if (role !== 'accountant' && role !== 'ceo') {
    return <div className="flex flex-col items-center justify-center py-20"><p className="text-lg font-medium text-muted-foreground">Access Denied</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <BookMarked className="w-6 h-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Chart of Accounts</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Manage your organization's account structure</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add Account</Button>
      </div>

      <Input placeholder="Search accounts..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-heading font-semibold">Code</TableHead>
                <TableHead className="font-heading font-semibold">Name</TableHead>
                <TableHead className="font-heading font-semibold">Type</TableHead>
                <TableHead className="font-heading font-semibold">Subtype</TableHead>
                <TableHead className="font-heading font-semibold text-center">Status</TableHead>
                <TableHead className="font-heading font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-sm">{a.code}</TableCell>
                  <TableCell className="text-sm font-medium">{a.name}</TableCell>
                  <TableCell><Badge variant="outline" className={typeColor(a.account_type)}>{a.account_type}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.account_subtype}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={a.is_active ? 'default' : 'secondary'}>{a.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">{editId ? 'Edit Account' : 'New Account'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. 1000" />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Account name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{accountTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subtype</Label>
                <Select value={form.account_subtype} onValueChange={(v) => setForm({ ...form, account_subtype: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{accountSubtypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.code || !form.name || !form.account_type || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

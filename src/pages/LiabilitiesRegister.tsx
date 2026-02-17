import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Landmark } from 'lucide-react';

export default function LiabilitiesRegister() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', liability_type: 'loan', original_amount: 0, outstanding_amount: 0, interest_rate: 0, start_date: new Date().toISOString().split('T')[0], maturity_date: '', creditor: '', notes: '' });

  const { data: liabilities = [], isLoading } = useQuery({
    queryKey: ['liabilities-register'],
    queryFn: async () => {
      const { data, error } = await supabase.from('liabilities_register').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const insertData = { ...form, maturity_date: form.maturity_date || null };
      const { error } = await supabase.from('liabilities_register').insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Liability added' });
      queryClient.invalidateQueries({ queryKey: ['liabilities-register'] });
      setModalOpen(false);
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  if (role !== 'accountant' && role !== 'ceo') {
    return <div className="flex flex-col items-center justify-center py-20"><p className="text-lg font-medium text-muted-foreground">Access Denied</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3"><Landmark className="w-6 h-6 text-primary" /><h1 className="text-2xl md:text-3xl font-heading font-bold">Liabilities Register</h1></div>
          <p className="text-muted-foreground text-sm mt-1">Track loans, taxes, and repayments</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Add Liability</Button>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-heading font-semibold">Name</TableHead>
                <TableHead className="font-heading font-semibold">Type</TableHead>
                <TableHead className="font-heading font-semibold">Creditor</TableHead>
                <TableHead className="font-heading font-semibold text-right">Original ($)</TableHead>
                <TableHead className="font-heading font-semibold text-right">Outstanding ($)</TableHead>
                <TableHead className="font-heading font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liabilities.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm font-medium">{l.name}</TableCell>
                  <TableCell className="text-sm capitalize">{l.liability_type}</TableCell>
                  <TableCell className="text-sm">{l.creditor || '—'}</TableCell>
                  <TableCell className="text-sm text-right">${Number(l.original_amount).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-right font-medium">${Number(l.outstanding_amount).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={l.status === 'active' ? 'default' : 'secondary'}>{l.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Add Liability</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Loan name" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Input value={form.liability_type} onChange={(e) => setForm({ ...form, liability_type: e.target.value })} /></div>
              <div className="space-y-2"><Label>Creditor</Label><Input value={form.creditor} onChange={(e) => setForm({ ...form, creditor: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Original Amount</Label><Input type="number" min={0} value={form.original_amount} onChange={(e) => setForm({ ...form, original_amount: parseFloat(e.target.value) || 0, outstanding_amount: parseFloat(e.target.value) || 0 })} /></div>
              <div className="space-y-2"><Label>Interest Rate (%)</Label><Input type="number" min={0} step={0.01} value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Maturity Date</Label><Input type="date" value={form.maturity_date} onChange={(e) => setForm({ ...form, maturity_date: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

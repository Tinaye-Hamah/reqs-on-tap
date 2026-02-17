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
import { Plus, Package } from 'lucide-react';

export default function AssetsRegister() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ asset_code: '', name: '', category: 'General', location: '', cost: 0, acquisition_date: new Date().toISOString().split('T')[0], useful_life_months: 60, residual_value: 0, notes: '' });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets-register'],
    queryFn: async () => {
      const { data, error } = await supabase.from('assets_register').select('*').order('asset_code');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('assets_register').insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Asset added' });
      queryClient.invalidateQueries({ queryKey: ['assets-register'] });
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
          <div className="flex items-center gap-3"><Package className="w-6 h-6 text-primary" /><h1 className="text-2xl md:text-3xl font-heading font-bold">Assets Register</h1></div>
          <p className="text-muted-foreground text-sm mt-1">Track company assets and depreciation</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Add Asset</Button>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-heading font-semibold">Code</TableHead>
                <TableHead className="font-heading font-semibold">Name</TableHead>
                <TableHead className="font-heading font-semibold">Category</TableHead>
                <TableHead className="font-heading font-semibold text-right">Cost ($)</TableHead>
                <TableHead className="font-heading font-semibold text-right">Accum. Depr. ($)</TableHead>
                <TableHead className="font-heading font-semibold text-right">Net Value ($)</TableHead>
                <TableHead className="font-heading font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-sm">{a.asset_code}</TableCell>
                  <TableCell className="text-sm font-medium">{a.name}</TableCell>
                  <TableCell className="text-sm">{a.category}</TableCell>
                  <TableCell className="text-sm text-right">${Number(a.cost).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-right">${Number(a.accumulated_depreciation).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-right font-medium">${(Number(a.cost) - Number(a.accumulated_depreciation)).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={a.status === 'active' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Add Asset</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Asset Code *</Label><Input value={form.asset_code} onChange={(e) => setForm({ ...form, asset_code: e.target.value })} placeholder="AST-001" /></div>
              <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Cost *</Label><Input type="number" min={0} value={form.cost} onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} /></div>
              <div className="space-y-2"><Label>Acquisition Date</Label><Input type="date" value={form.acquisition_date} onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Useful Life (months)</Label><Input type="number" min={1} value={form.useful_life_months} onChange={(e) => setForm({ ...form, useful_life_months: parseInt(e.target.value) || 60 })} /></div>
              <div className="space-y-2"><Label>Residual Value</Label><Input type="number" min={0} value={form.residual_value} onChange={(e) => setForm({ ...form, residual_value: parseFloat(e.target.value) || 0 })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.asset_code || !form.name || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

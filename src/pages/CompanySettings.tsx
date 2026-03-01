import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Building2 } from 'lucide-react';

const SETTINGS_KEYS = ['company_name', 'company_phone', 'company_email', 'company_address', 'company_registration', 'company_vat'];

export default function CompanySettings() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings-all'],
    queryFn: async () => {
      const { data } = await supabase.from('system_settings').select('key, value').in('key', SETTINGS_KEYS);
      const s: Record<string, string> = {};
      data?.forEach((r: any) => { s[r.key] = r.value; });
      return s;
    },
  });

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      for (const key of SETTINGS_KEYS) {
        const value = form[key] || '';
        const { data: existing } = await supabase.from('system_settings').select('id').eq('key', key).maybeSingle();
        if (existing) {
          await supabase.from('system_settings').update({ value, updated_by: user.id }).eq('key', key);
        } else {
          await supabase.from('system_settings').insert({ key, value, updated_by: user.id });
        }
      }
    },
    onSuccess: () => {
      toast({ title: 'Company information saved' });
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      queryClient.invalidateQueries({ queryKey: ['company-settings-all'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  if (role !== 'ceo' && role !== 'accountant') {
    return <div className="flex flex-col items-center justify-center py-20"><p className="text-lg font-medium text-muted-foreground">Access Denied</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Company Settings</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Manage company information displayed on printed documents</p>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4 max-w-2xl">
          <div className="space-y-2">
            <Label>Company Name *</Label>
            <Input value={form.company_name || ''} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Your Company Name" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.company_phone || ''} onChange={(e) => setForm({ ...form, company_phone: e.target.value })} placeholder="+263 xxx xxx xxx" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.company_email || ''} onChange={(e) => setForm({ ...form, company_email: e.target.value })} placeholder="info@company.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea rows={2} value={form.company_address || ''} onChange={(e) => setForm({ ...form, company_address: e.target.value })} placeholder="Street, City, Country" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Registration Number</Label>
              <Input value={form.company_registration || ''} onChange={(e) => setForm({ ...form, company_registration: e.target.value })} placeholder="Reg. No." />
            </div>
            <div className="space-y-2">
              <Label>VAT Number</Label>
              <Input value={form.company_vat || ''} onChange={(e) => setForm({ ...form, company_vat: e.target.value })} placeholder="VAT No." />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Company Info'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

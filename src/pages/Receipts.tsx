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
import { Wallet, Printer, Mail } from 'lucide-react';

function generateReceiptHtml(receipt: any, companySettings: any) {
  const companyName = companySettings?.company_name || 'Company Name';
  const companyPhone = companySettings?.company_phone || '';
  const companyEmail = companySettings?.company_email || '';
  const companyAddress = companySettings?.company_address || '';
  const companyReg = companySettings?.company_registration || '';
  const receiptAmount = (receipt.journal_lines || []).reduce((s: number, l: any) => s + Number(l.debit), 0);

  return `<!DOCTYPE html><html><head><title>Receipt ${receipt.journal_number}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1a1a1a; max-width: 420px; margin: 40px auto; }
      .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #16a34a; }
      .header h1 { margin: 0; font-size: 22px; color: #16a34a; }
      .header p { margin: 2px 0; font-size: 11px; color: #666; }
      .receipt-title { text-align: center; font-size: 18px; font-weight: bold; color: #16a34a; margin: 15px 0; text-transform: uppercase; letter-spacing: 3px; }
      .row { display: flex; justify-content: space-between; font-size: 13px; padding: 5px 0; }
      .row.total { font-weight: bold; font-size: 18px; border-top: 3px solid #16a34a; margin-top: 10px; padding-top: 12px; color: #16a34a; }
      .divider { border-top: 1px dashed #16a34a40; margin: 10px 0; }
      .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 2px solid #16a34a; font-size: 10px; color: #666; }
      .footer p { margin: 2px 0; }
      .thank-you { text-align: center; font-size: 13px; color: #16a34a; font-weight: bold; margin-top: 20px; }
    </style>
  </head><body>
    <div class="header">
      <h1>${companyName}</h1>
      ${companyAddress ? `<p>${companyAddress}</p>` : ''}
      ${companyReg ? `<p>Reg: ${companyReg}</p>` : ''}
    </div>
    <div class="receipt-title">Receipt</div>
    <div class="row"><span>Receipt #:</span><span>${receipt.journal_number}</span></div>
    <div class="row"><span>Date:</span><span>${new Date(receipt.journal_date).toLocaleDateString()}</span></div>
    ${receipt.payment_reference ? `<div class="row"><span>Reference:</span><span>${receipt.payment_reference}</span></div>` : ''}
    <div class="divider"></div>
    <div class="row"><span>Description:</span><span>${receipt.description?.replace('Receipt: ', '')}</span></div>
    <div class="row total"><span>Amount:</span><span>$${receiptAmount.toLocaleString()}</span></div>
    ${receipt.notes ? `<div class="divider"></div><div style="font-size:12px;"><strong>Notes:</strong> ${receipt.notes}</div>` : ''}
    <div class="thank-you">Thank you for your payment!</div>
    <div class="footer">
      <p><strong>${companyName}</strong></p>
      ${companyPhone ? `<p>Tel: ${companyPhone}</p>` : ''}
      ${companyEmail ? `<p>Email: ${companyEmail}</p>` : ''}
      ${companyAddress ? `<p>${companyAddress}</p>` : ''}
    </div>
  </body></html>`;
}

export default function Receipts() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'revenue' | 'receivable'>('revenue');
  const [revenueAccountId, setRevenueAccountId] = useState('');
  const [cashBankAccountId, setCashBankAccountId] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [receivableId, setReceivableId] = useState('');
  const [customerName, setCustomerName] = useState('');

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('system_settings').select('key, value').in('key', ['company_name', 'company_phone', 'company_email', 'company_address', 'company_registration', 'company_vat']);
      const settings: Record<string, string> = {};
      data?.forEach((s: any) => { settings[s.key] = s.value; });
      return settings;
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['coa-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chart_of_accounts').select('*').eq('is_active', true).order('code');
      if (error) throw error;
      return data;
    },
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ['receivables-outstanding'],
    queryFn: async () => {
      const { data, error } = await supabase.from('receivables').select('*').in('status', ['outstanding', 'partial']).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: postedReceipts = [] } = useQuery({
    queryKey: ['posted-receipts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('journals').select('*, journal_lines(*, chart_of_accounts:account_id(name, code))').eq('journal_type', 'receipt').order('created_at', { ascending: false }).limit(50);
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
        journal_date: receiptDate,
        description: `Receipt: ${description}`,
        journal_type: 'receipt' as any,
        is_posted: true, is_locked: true,
        payment_reference: reference,
        payment_account_id: cashBankAccountId,
        notes, created_by: user.id,
      }).select().single();
      if (jErr) throw jErr;

      if (mode === 'revenue') {
        await supabase.from('journal_lines').insert([
          { journal_id: journal.id, account_id: cashBankAccountId, debit: amount, credit: 0, description },
          { journal_id: journal.id, account_id: revenueAccountId, debit: 0, credit: amount, description },
        ]);
      } else {
        const arAccount = accounts.find((a: any) => a.account_subtype === 'Receivable');
        if (!arAccount) throw new Error('Accounts Receivable account not found');
        await supabase.from('journal_lines').insert([
          { journal_id: journal.id, account_id: cashBankAccountId, debit: amount, credit: 0, description },
          { journal_id: journal.id, account_id: arAccount.id, debit: 0, credit: amount, description },
        ]);
        if (receivableId) {
          const rec = receivables.find((r: any) => r.id === receivableId);
          if (rec) {
            const newReceived = Number(rec.amount_received) + amount;
            const newStatus = newReceived >= Number(rec.amount) ? 'received' : 'partial';
            await supabase.from('receivables').update({ amount_received: newReceived, status: newStatus }).eq('id', receivableId);
          }
        }
      }

      // Record in cashbook (money in = debit)
      const { data: lastEntry } = await supabase.from('cashbook').select('balance').order('created_at', { ascending: false }).limit(1).maybeSingle();
      const prevBalance = lastEntry ? Number(lastEntry.balance) : 0;
      await supabase.from('cashbook').insert({
        requisition_id: journal.id, // using journal id as reference
        description: `Receipt: ${description}`,
        debit: amount,
        credit: 0,
        balance: prevBalance + amount,
      });

      return journal;
    },
    onSuccess: () => {
      toast({ title: 'Receipt posted' });
      queryClient.invalidateQueries({ queryKey: ['receivables-outstanding'] });
      queryClient.invalidateQueries({ queryKey: ['posted-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['cashbook'] });
      setDescription(''); setAmount(0); setReference(''); setNotes(''); setCustomerName('');
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const handlePrintReceipt = (receipt: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(generateReceiptHtml(receipt, companySettings));
    printWindow.document.close();
    printWindow.print();
  };

  const handleEmailReceipt = (receipt: any) => {
    const receiptAmount = (receipt.journal_lines || []).reduce((s: number, l: any) => s + Number(l.debit), 0);
    const subject = encodeURIComponent(`Receipt ${receipt.journal_number} from ${companySettings?.company_name || 'Our Company'}`);
    const body = encodeURIComponent(
      `Dear Customer,\n\nThank you for your payment. Please find your receipt details below:\n\nReceipt #: ${receipt.journal_number}\nDate: ${new Date(receipt.journal_date).toLocaleDateString()}\nDescription: ${receipt.description?.replace('Receipt: ', '')}\nAmount: $${receiptAmount.toLocaleString()}\n${receipt.payment_reference ? `Reference: ${receipt.payment_reference}\n` : ''}\nKind regards,\n${companySettings?.company_name || 'Our Company'}\n${companySettings?.company_phone ? `Tel: ${companySettings.company_phone}` : ''}\n${companySettings?.company_email ? `Email: ${companySettings.company_email}` : ''}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  };

  if (role !== 'accountant' && role !== 'manager') {
    return <div className="flex flex-col items-center justify-center py-20"><p className="text-lg font-medium text-muted-foreground">Access Denied</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Receipts</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Record incoming payments</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
        <div className="space-y-2">
          <Label>Receipt Type</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Direct Revenue</SelectItem>
              <SelectItem value="receivable">Settle Receivable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === 'receivable' && (
          <div className="space-y-2">
            <Label>Select Receivable</Label>
            <Select value={receivableId} onValueChange={(v) => { setReceivableId(v); const r = receivables.find((r: any) => r.id === v); if (r) { setAmount(Number(r.amount) - Number(r.amount_received)); setDescription(r.description); setCustomerName(r.customer); } }}>
              <SelectTrigger><SelectValue placeholder="Choose receivable" /></SelectTrigger>
              <SelectContent>
                {receivables.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.customer} — {r.description} (${(Number(r.amount) - Number(r.amount_received)).toLocaleString()} due)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === 'revenue' && (
          <>
            <div className="space-y-2">
              <Label>Received From</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer / payer name" />
            </div>
            <div className="space-y-2">
              <Label>Revenue Account *</Label>
              <Select value={revenueAccountId} onValueChange={setRevenueAccountId}>
                <SelectTrigger><SelectValue placeholder="Select revenue account" /></SelectTrigger>
                <SelectContent>
                  {revenueAccounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cash/Bank Account *</Label>
            <Select value={cashBankAccountId} onValueChange={setCashBankAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {cashBankAccounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description *</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Payment description" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Receipt #" /></div>
        </div>

        <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        <div className="flex justify-end">
          <Button onClick={() => postMutation.mutate()} disabled={!cashBankAccountId || amount <= 0 || !description || postMutation.isPending}>
            {postMutation.isPending ? 'Posting...' : 'Post Receipt'}
          </Button>
        </div>
      </div>

      {postedReceipts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-heading font-bold">Recent Receipts</h2>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-heading font-semibold">Number</TableHead>
                  <TableHead className="font-heading font-semibold">Date</TableHead>
                  <TableHead className="font-heading font-semibold">Description</TableHead>
                  <TableHead className="font-heading font-semibold text-right">Amount</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {postedReceipts.map((r: any) => {
                  const amt = (r.journal_lines || []).reduce((s: number, l: any) => s + Number(l.debit), 0);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.journal_number}</TableCell>
                      <TableCell className="text-sm">{new Date(r.journal_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{r.description?.replace('Receipt: ', '')}</TableCell>
                      <TableCell className="text-sm text-right font-medium">${amt.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handlePrintReceipt(r)} className="gap-1 text-xs">
                            <Printer className="w-3 h-3" /> Print
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEmailReceipt(r)} className="gap-1 text-xs">
                            <Mail className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

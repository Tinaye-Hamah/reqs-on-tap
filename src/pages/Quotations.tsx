import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, FileText, Printer, Eye, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import logo from '@/assets/logo.png';

interface QuotationItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

const emptyItem: QuotationItem = { description: '', quantity: 1, unitPrice: 0 };

function generatePrintHtml(q: any, qItems: any[], companySettings: any) {
  const companyName = companySettings?.company_name || 'Company Name';
  const companyPhone = companySettings?.company_phone || '';
  const companyEmail = companySettings?.company_email || '';
  const companyAddress = companySettings?.company_address || '';
  const companyReg = companySettings?.company_registration || '';
  const companyVat = companySettings?.company_vat || '';
  const qTotal = qItems.reduce((s: number, i: any) => s + i.quantity * Number(i.unit_price), 0);

  return `<!DOCTYPE html><html><head><title>Quotation ${q.quotation_number}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1a1a1a; }
      .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #16a34a; }
      .header h1 { margin: 0; font-size: 26px; color: #16a34a; }
      .header p { margin: 3px 0; font-size: 12px; color: #666; }
      .doc-title { text-align: center; font-size: 20px; font-weight: bold; color: #16a34a; margin: 20px 0; text-transform: uppercase; letter-spacing: 3px; }
      .details { display: flex; justify-content: space-between; margin-bottom: 25px; }
      .details div { font-size: 13px; }
      .details div p { margin: 3px 0; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th { background: #16a34a; color: white; padding: 10px 12px; text-align: left; font-size: 13px; font-weight: 600; }
      td { border-bottom: 1px solid #e5e7eb; padding: 10px 12px; font-size: 13px; }
      .text-right { text-align: right; }
      .total-row { font-weight: bold; background: #f0fdf4; }
      .total-row td { border-top: 2px solid #16a34a; }
      .notes { margin-top: 20px; font-size: 12px; background: #f0fdf4; padding: 12px; border-radius: 6px; border-left: 3px solid #16a34a; }
      .footer { text-align: center; margin-top: 40px; padding-top: 15px; border-top: 2px solid #16a34a; font-size: 11px; color: #666; }
      .footer p { margin: 2px 0; }
    </style>
  </head><body>
    <div class="header">
      <h1>${companyName}</h1>
      ${companyAddress ? `<p>${companyAddress}</p>` : ''}
      ${companyReg ? `<p>Reg: ${companyReg}</p>` : ''}
      ${companyVat ? `<p>VAT: ${companyVat}</p>` : ''}
    </div>
    <div class="doc-title">Quotation</div>
    <div class="details">
      <div>
        <p><strong>To:</strong> ${q.customer_name}</p>
        ${q.customer_email ? `<p>Email: ${q.customer_email}</p>` : ''}
        ${q.customer_phone ? `<p>Phone: ${q.customer_phone}</p>` : ''}
        ${q.customer_address ? `<p>Address: ${q.customer_address}</p>` : ''}
      </div>
      <div style="text-align:right;">
        <p><strong>Quotation #:</strong> ${q.quotation_number}</p>
        <p><strong>Date:</strong> ${new Date(q.quotation_date).toLocaleDateString()}</p>
      </div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Description</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead>
      <tbody>
        ${qItems.map((item: any, i: number) => `<tr>
          <td>${i + 1}</td><td>${item.description}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">$${Number(item.unit_price).toLocaleString()}</td>
          <td class="text-right">$${(item.quantity * Number(item.unit_price)).toLocaleString()}</td>
        </tr>`).join('')}
        <tr class="total-row"><td colspan="4" class="text-right">TOTAL</td><td class="text-right">$${qTotal.toLocaleString()}</td></tr>
      </tbody>
    </table>
    ${q.notes ? `<div class="notes"><strong>Notes:</strong> ${q.notes}</div>` : ''}
    <div class="footer">
      <p><strong>${companyName}</strong></p>
      ${companyPhone ? `<p>Tel: ${companyPhone}</p>` : ''}
      ${companyEmail ? `<p>Email: ${companyEmail}</p>` : ''}
      ${companyAddress ? `<p>${companyAddress}</p>` : ''}
    </div>
  </body></html>`;
}

export default function Quotations() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<QuotationItem[]>([{ ...emptyItem }, { ...emptyItem }]);
  const [previewQuotation, setPreviewQuotation] = useState<any>(null);

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('system_settings').select('key, value').in('key', ['company_name', 'company_phone', 'company_email', 'company_address', 'company_registration', 'company_vat']);
      const settings: Record<string, string> = {};
      data?.forEach((s: any) => { settings[s.key] = s.value; });
      return settings;
    },
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ['quotations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quotations').select('*, quotation_items(*)').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof QuotationItem, value: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    setItems(updated);
  };

  const total = items.reduce((s, item) => s + item.quantity * item.unitPrice, 0);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data: quotation, error: qErr } = await supabase.from('quotations').insert({
        quotation_number: 'AUTO',
        quotation_date: quotationDate,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        notes,
        total_amount: total,
        created_by: user.id,
      } as any).select().single();
      if (qErr) throw qErr;

      const itemRows = items.filter(i => i.description).map(i => ({
        quotation_id: quotation.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unitPrice,
      }));
      if (itemRows.length) {
        const { error: iErr } = await supabase.from('quotation_items').insert(itemRows as any);
        if (iErr) throw iErr;
      }
      return quotation;
    },
    onSuccess: () => {
      toast({ title: 'Quotation created' });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setCustomerAddress('');
      setNotes(''); setItems([{ ...emptyItem }, { ...emptyItem }]);
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const handlePrint = () => {
    const q = previewQuotation;
    if (!q) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(generatePrintHtml(q, q.quotation_items || [], companySettings));
    printWindow.document.close();
    printWindow.print();
  };

  const handleEmail = () => {
    const q = previewQuotation;
    if (!q || !q.customer_email) {
      toast({ title: 'No email', description: 'Customer email is required to send', variant: 'destructive' });
      return;
    }
    const subject = encodeURIComponent(`Quotation ${q.quotation_number} from ${companySettings?.company_name || 'Our Company'}`);
    const qItems = q.quotation_items || [];
    const qTotal = qItems.reduce((s: number, i: any) => s + i.quantity * Number(i.unit_price), 0);
    const itemsList = qItems.map((i: any, idx: number) => `${idx + 1}. ${i.description} - Qty: ${i.quantity} x $${Number(i.unit_price).toLocaleString()} = $${(i.quantity * Number(i.unit_price)).toLocaleString()}`).join('%0A');
    const body = encodeURIComponent(
      `Dear ${q.customer_name},\n\nPlease find below your quotation details:\n\nQuotation #: ${q.quotation_number}\nDate: ${new Date(q.quotation_date).toLocaleDateString()}\n\n`) +
      itemsList +
      encodeURIComponent(`\n\nTotal: $${qTotal.toLocaleString()}\n\n${q.notes ? `Notes: ${q.notes}\n\n` : ''}Kind regards,\n${companySettings?.company_name || 'Our Company'}\n${companySettings?.company_phone ? `Tel: ${companySettings.company_phone}` : ''}\n${companySettings?.company_email ? `Email: ${companySettings.company_email}` : ''}`);
    window.open(`mailto:${q.customer_email}?subject=${subject}&body=${body}`, '_self');
  };

  if (role !== 'accountant' && role !== 'manager') {
    return <div className="flex flex-col items-center justify-center py-20"><p className="text-lg font-medium text-muted-foreground">Access Denied</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Quotations</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Create and manage sales quotations</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Customer Name *</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" /></div>
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Email</Label><Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@email.com" /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+1 234 567 890" /></div>
          <div className="space-y-2"><Label>Address</Label><Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Customer address" /></div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Items</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addItem} className="gap-1 text-xs"><Plus className="w-3 h-3" /> Add Item</Button>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-24">Qty</TableHead>
                  <TableHead className="text-right w-32">Unit Price ($)</TableHead>
                  <TableHead className="text-right w-32">Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell><Input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder="Item description" /></TableCell>
                    <TableCell><Input type="number" min={1} className="text-right" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} /></TableCell>
                    <TableCell><Input type="number" min={0} step={0.01} className="text-right" value={item.unitPrice || ''} onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} /></TableCell>
                    <TableCell className="text-right font-medium text-sm">${(item.quantity * item.unitPrice).toLocaleString()}</TableCell>
                    <TableCell>{items.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="w-4 h-4" /></Button>}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3} className="text-right font-heading">Total</TableCell>
                  <TableCell className="text-right">${total.toLocaleString()}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Terms, conditions, or additional notes..." /></div>

        <div className="flex justify-end">
          <Button onClick={() => createMutation.mutate()} disabled={!customerName || total <= 0 || createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Quotation'}
          </Button>
        </div>
      </div>

      {quotations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-heading font-bold">Recent Quotations</h2>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-heading font-semibold">Number</TableHead>
                  <TableHead className="font-heading font-semibold">Date</TableHead>
                  <TableHead className="font-heading font-semibold">Customer</TableHead>
                  <TableHead className="font-heading font-semibold text-right">Amount</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q: any) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-sm">{q.quotation_number}</TableCell>
                    <TableCell className="text-sm">{new Date(q.quotation_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{q.customer_name}</TableCell>
                    <TableCell className="text-sm text-right font-medium">${Number(q.total_amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setPreviewQuotation(q)} className="gap-1 text-xs">
                        <Eye className="w-3 h-3" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={!!previewQuotation} onOpenChange={() => setPreviewQuotation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quotation {previewQuotation?.quotation_number}</DialogTitle>
          </DialogHeader>
          {previewQuotation && (
            <div ref={printRef} className="space-y-4">
              <div className="text-center border-b-2 border-green-600 pb-3">
                <h2 className="text-xl font-bold text-green-700">{companySettings?.company_name || 'Company Name'}</h2>
                {companySettings?.company_address && <p className="text-xs text-muted-foreground">{companySettings.company_address}</p>}
              </div>
              <p className="text-center text-green-700 font-bold uppercase tracking-widest">Quotation</p>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">To: {previewQuotation.customer_name}</p>
                  {previewQuotation.customer_email && <p className="text-xs text-muted-foreground">{previewQuotation.customer_email}</p>}
                  {previewQuotation.customer_phone && <p className="text-xs text-muted-foreground">{previewQuotation.customer_phone}</p>}
                </div>
                <div className="text-right">
                  <p className="font-mono">{previewQuotation.quotation_number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(previewQuotation.quotation_date).toLocaleDateString()}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-green-50"><TableHead>#</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {(previewQuotation.quotation_items || []).map((item: any, i: number) => (
                    <TableRow key={item.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">${Number(item.unit_price).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">${(item.quantity * Number(item.unit_price)).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-green-700">${Number(previewQuotation.total_amount).toLocaleString()}</p>
                </div>
              </div>
              {previewQuotation.notes && <p className="text-sm bg-green-50 p-3 rounded-lg border-l-3 border-green-600"><strong>Notes:</strong> {previewQuotation.notes}</p>}
              <div className="text-center text-xs text-muted-foreground border-t-2 border-green-600 pt-3">
                <p className="font-medium">{companySettings?.company_name}</p>
                {companySettings?.company_phone && <p>Tel: {companySettings.company_phone}</p>}
                {companySettings?.company_email && <p>Email: {companySettings.company_email}</p>}
              </div>
              <div className="flex justify-end gap-2 print:hidden">
                <Button variant="outline" onClick={handleEmail} className="gap-2"><Mail className="w-4 h-4" /> Email</Button>
                <Button onClick={handlePrint} className="gap-2 bg-green-600 hover:bg-green-700"><Printer className="w-4 h-4" /> Print</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

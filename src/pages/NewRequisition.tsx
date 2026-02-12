import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Send } from 'lucide-react';
import { RequisitionCategory, RequisitionPriority, categoryLabels, priorityLabels } from '@/lib/requisition-data';
import { useToast } from '@/hooks/use-toast';

interface ItemRow {
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function NewRequisition() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState<RequisitionCategory | ''>('');
  const [priority, setPriority] = useState<RequisitionPriority | ''>('');
  const [justification, setJustification] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ description: '', quantity: 1, unitPrice: 0 }]);

  const addItem = () => setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const total = items.reduce((s, item) => s + item.quantity * item.unitPrice, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !department || !category || !priority) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Requisition Submitted!', description: `Your request "${title}" has been submitted for review.` });
    navigate('/requisitions');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold">New Requisition</h1>
        <p className="text-muted-foreground text-sm mt-1">Fill out the form below to submit a new request</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Request Title *</Label>
            <Input id="title" placeholder="e.g. Office Printer Replacement" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {['Finance', 'Engineering', 'Marketing', 'Operations', 'HR', 'Sales'].map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as RequisitionCategory)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {(Object.entries(categoryLabels) as [RequisitionCategory, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority *</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as RequisitionPriority)}>
              <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
              <SelectContent>
                {(Object.entries(priorityLabels) as [RequisitionPriority, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="justification">Justification *</Label>
            <Textarea id="justification" placeholder="Explain why this requisition is needed..." rows={3} value={justification} onChange={e => setJustification(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Items</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addItem} className="gap-1 text-xs text-accent hover:text-accent">
              <Plus className="w-3 h-3" /> Add Item
            </Button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start animate-fade-in">
              <div className="flex-1">
                <Input placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
              </div>
              <div className="w-20">
                <Input type="number" placeholder="Qty" min={1} value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 0)} />
              </div>
              <div className="w-28">
                <Input type="number" placeholder="Unit price" min={0} step={0.01} value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
              </div>
              {items.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <div className="flex justify-end">
            <div className="bg-primary/5 rounded-lg px-4 py-2 text-right">
              <p className="text-xs text-muted-foreground">Estimated Total</p>
              <p className="text-lg font-heading font-bold text-primary">${total.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Send className="w-4 h-4" />
            Submit Requisition
          </Button>
        </div>
      </form>
    </div>
  );
}

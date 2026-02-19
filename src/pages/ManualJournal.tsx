import { useState, useRef } from 'react';
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
import { Plus, Trash2, FileEdit, AlertTriangle, Upload, Paperclip, X } from 'lucide-react';

interface JournalLine {
  accountId: string; debit: number; credit: number; description: string;
}

const emptyLine: JournalLine = { accountId: '', debit: 0, credit: 0, description: '' };

export default function ManualJournal() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([{ ...emptyLine }, { ...emptyLine }]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ['coa-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chart_of_accounts').select('*').eq('is_active', true).order('code');
      if (error) throw error;
      return data;
    },
  });

  const { data: journals = [], isLoading: journalsLoading } = useQuery({
    queryKey: ['journals-manual'],
    queryFn: async () => {
      const { data, error } = await supabase.from('journals')
        .select('*, journal_lines(*)')
        .eq('journal_type', 'manual')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      // Fetch attachment counts
      const journalIds = data.map((j: any) => j.id);
      if (journalIds.length) {
        const { data: atts } = await supabase.from('attachments').select('entity_id').eq('entity_type', 'journal').in('entity_id', journalIds);
        const countMap = new Map<string, number>();
        (atts || []).forEach((a: any) => countMap.set(a.entity_id, (countMap.get(a.entity_id) || 0) + 1));
        return data.map((j: any) => ({ ...j, attachment_count: countMap.get(j.id) || 0 }));
      }
      return data.map((j: any) => ({ ...j, attachment_count: 0 }));
    },
  });

  const addLine = () => setLines([...lines, { ...emptyLine }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof JournalLine, value: any) => {
    const updated = [...lines];
    (updated[i] as any)[field] = value;
    setLines(updated);
  };

  const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = totalDebits === totalCredits && totalDebits > 0;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (i: number) => setAttachments(attachments.filter((_, idx) => idx !== i));

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data: journal, error: jErr } = await supabase.from('journals').insert({
        journal_number: 'AUTO',
        journal_date: journalDate,
        description,
        journal_type: 'manual' as any,
        is_posted: true,
        is_locked: true,
        notes,
        created_by: user.id,
      }).select().single();
      if (jErr) throw jErr;

      const lineRows = lines.filter(l => l.accountId).map(l => ({
        journal_id: journal.id,
        account_id: l.accountId,
        debit: l.debit,
        credit: l.credit,
        description: l.description,
      }));
      const { error: lErr } = await supabase.from('journal_lines').insert(lineRows);
      if (lErr) throw lErr;

      // Upload attachments
      if (attachments.length > 0) {
        setUploading(true);
        for (const file of attachments) {
          const filePath = `journals/${journal.id}/${Date.now()}_${file.name}`;
          const { error: uploadErr } = await supabase.storage.from('attachments').upload(filePath, file);
          if (uploadErr) {
            console.error('Upload error:', uploadErr);
            continue;
          }
          await supabase.from('attachments').insert({
            entity_type: 'journal',
            entity_id: journal.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id,
          });
        }
        setUploading(false);
      }

      return journal;
    },
    onSuccess: () => {
      toast({ title: 'Journal posted and locked' });
      queryClient.invalidateQueries({ queryKey: ['journals-manual'] });
      setDescription('');
      setNotes('');
      setLines([{ ...emptyLine }, { ...emptyLine }]);
      setAttachments([]);
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  if (role !== 'accountant') {
    return <div className="flex flex-col items-center justify-center py-20"><p className="text-lg font-medium text-muted-foreground">Access Denied</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <FileEdit className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Manual Journal</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Create multi-line journal entries</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input type="date" value={journalDate} onChange={(e) => setJournalDate(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Journal description" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Lines</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addLine} className="gap-1 text-xs">
              <Plus className="w-3 h-3" /> Add Line
            </Button>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right w-32">Debit ($)</TableHead>
                  <TableHead className="text-right w-32">Credit ($)</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Select value={line.accountId} onValueChange={(v) => updateLine(i, 'accountId', v)}>
                        <SelectTrigger className="min-w-[200px]"><SelectValue placeholder="Select account" /></SelectTrigger>
                        <SelectContent>
                          {accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} step={0.01} className="text-right" value={line.debit || ''} onChange={(e) => updateLine(i, 'debit', parseFloat(e.target.value) || 0)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} step={0.01} className="text-right" value={line.credit || ''} onChange={(e) => updateLine(i, 'credit', parseFloat(e.target.value) || 0)} />
                    </TableCell>
                    <TableCell>
                      <Input value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} placeholder="Line memo" />
                    </TableCell>
                    <TableCell>
                      {lines.length > 2 && (
                        <Button variant="ghost" size="icon" onClick={() => removeLine(i)}><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell className="text-right font-heading">Totals</TableCell>
                  <TableCell className="text-right">${totalDebits.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${totalCredits.toLocaleString()}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
          </div>
          {!isBalanced && totalDebits + totalCredits > 0 && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4" /> Debits must equal credits
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
        </div>

        {/* Proof Documents / Attachments */}
        <div className="space-y-2">
          <Label>Supporting Documents</Label>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" /> Attach Files
            </Button>
            <span className="text-xs text-muted-foreground">PDF, images, or documents</span>
          </div>
          {attachments.length > 0 && (
            <div className="space-y-1 mt-2">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm">
                  <Paperclip className="w-3 h-3 text-muted-foreground" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                  <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => postMutation.mutate()} disabled={!isBalanced || !description || postMutation.isPending || uploading}>
            {postMutation.isPending ? (uploading ? 'Uploading...' : 'Posting...') : 'Post & Lock Journal'}
          </Button>
        </div>
      </div>

      {/* Recent Journals */}
      {journals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-heading font-bold">Recent Manual Journals</h2>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-heading font-semibold">Number</TableHead>
                  <TableHead className="font-heading font-semibold">Date</TableHead>
                  <TableHead className="font-heading font-semibold">Description</TableHead>
                  <TableHead className="font-heading font-semibold text-right">Amount ($)</TableHead>
                  <TableHead className="font-heading font-semibold text-center">Docs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journals.map((j: any) => {
                  const amount = (j.journal_lines || []).reduce((s: number, l: any) => s + Number(l.debit), 0);
                  return (
                    <TableRow key={j.id}>
                      <TableCell className="font-mono text-sm">{j.journal_number}</TableCell>
                      <TableCell className="text-sm">{new Date(j.journal_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{j.description}</TableCell>
                      <TableCell className="text-sm text-right font-medium">${amount.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        {j.attachment_count > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="w-3 h-3" /> {j.attachment_count}
                          </span>
                        )}
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

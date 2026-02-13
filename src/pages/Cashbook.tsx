import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BookOpen } from 'lucide-react';

export default function Cashbook() {
  const { user, role } = useAuth();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['cashbook'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cashbook')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && role === 'accountant',
  });

  if (role !== 'accountant') {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <p className="text-lg font-medium text-muted-foreground">Access Denied</p>
        <p className="text-sm text-muted-foreground mt-1">Only accountants can view the cashbook.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Cashbook</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Record of all approved requisition transactions</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-sm p-8 text-center">
          <p className="text-muted-foreground">No cashbook entries yet. Entries are created when you approve requisitions.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-heading font-semibold">Date</TableHead>
                <TableHead className="font-heading font-semibold">Description</TableHead>
                <TableHead className="font-heading font-semibold text-right">Debit ($)</TableHead>
                <TableHead className="font-heading font-semibold text-right">Credit ($)</TableHead>
                <TableHead className="font-heading font-semibold text-right">Balance ($)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{entry.description}</TableCell>
                  <TableCell className="text-sm text-right text-destructive font-medium">
                    {Number(entry.debit) > 0 ? `$${Number(entry.debit).toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-right text-success font-medium">
                    {Number(entry.credit) > 0 ? `$${Number(entry.credit).toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-right font-bold">
                    ${Number(entry.balance).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

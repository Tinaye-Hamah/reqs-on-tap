import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RequisitionTable } from '@/components/RequisitionTable';
import { Button } from '@/components/ui/button';
import { FilePlus, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  'in-progress': 'In Progress',
};

const filters = ['all', 'pending', 'approved', 'in-progress', 'rejected'];

export default function RequisitionList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');

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

  const filtered = activeFilter === 'all'
    ? requisitions
    : requisitions.filter(r => r.status === activeFilter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Requisitions</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} request{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
        <Button onClick={() => navigate('/requisitions/new')} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 font-medium shadow-sm">
          <FilePlus className="w-4 h-4" />
          New Requisition
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors border',
              activeFilter === f
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/30'
            )}
          >
            {f === 'all' ? 'All' : statusLabels[f] || f}
          </button>
        ))}
      </div>

      <RequisitionTable requisitions={filtered} />
    </div>
  );
}

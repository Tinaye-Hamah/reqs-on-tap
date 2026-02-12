import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatsCard } from '@/components/StatsCard';
import { RequisitionTable } from '@/components/RequisitionTable';
import { Button } from '@/components/ui/button';
import { FilePlus, ClipboardList, Clock, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const pending = requisitions.filter(r => r.status === 'pending').length;
  const approved = requisitions.filter(r => r.status === 'approved').length;
  const total = requisitions.reduce((s, r) => s + Number(r.total_amount), 0);
  const recent = requisitions.slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of requisition activity</p>
        </div>
        <Button onClick={() => navigate('/requisitions/new')} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 font-medium shadow-sm">
          <FilePlus className="w-4 h-4" />
          New Requisition
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Requests" value={requisitions.length} icon={ClipboardList} trend="All time" />
        <StatsCard label="Pending Approval" value={pending} icon={Clock} trend="Awaiting review" />
        <StatsCard label="Approved" value={approved} icon={CheckCircle2} trend="This month" />
        <StatsCard label="Total Value" value={`$${total.toLocaleString()}`} icon={ClipboardList} trend="Combined amount" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold">Recent Requisitions</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/requisitions')} className="text-muted-foreground hover:text-foreground text-xs">
            View all →
          </Button>
        </div>
        <RequisitionTable requisitions={recent} />
      </div>
    </div>
  );
}

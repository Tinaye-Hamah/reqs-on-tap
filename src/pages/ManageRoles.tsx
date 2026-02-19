import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';

import { Input } from '@/components/ui/input';

const roleOptions = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'ceo', label: 'CEO' },
];

export default function ManageRoles() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users-roles'],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, department'),
        supabase.from('user_roles').select('user_id, role, id'),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const rolesMap = new Map(rolesRes.data.map(r => [r.user_id, r]));
      return profilesRes.data.map(p => ({
        ...p,
        role: rolesMap.get(p.user_id)?.role || 'employee',
        role_id: rolesMap.get(p.user_id)?.id,
      }));
    },
    enabled: !!user && role === 'ceo',
  });

  const ceoCount = users.filter((u: any) => u.role === 'ceo').length;

  const updateRole = useMutation({
    mutationFn: async ({ roleId, newRole, userId }: { roleId: string; newRole: string; userId: string }) => {
      // Enforce max 2 CEOs
      if (newRole === 'ceo') {
        const currentCeos = users.filter((u: any) => u.role === 'ceo' && u.user_id !== userId);
        if (currentCeos.length >= 2) {
          throw new Error('Maximum of 2 CEO roles allowed. Please remove a CEO role first.');
        }
      }
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as any })
        .eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Role updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['all-users-roles'] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to update role', description: err.message, variant: 'destructive' });
    },
  });

  const updateDepartment = useMutation({
    mutationFn: async ({ userId, department }: { userId: string; department: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ department })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Department updated' });
      queryClient.invalidateQueries({ queryKey: ['all-users-roles'] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to update department', description: err.message, variant: 'destructive' });
    },
  });

  if (role !== 'ceo') {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <p className="text-lg font-medium text-muted-foreground">Access Denied</p>
        <p className="text-sm text-muted-foreground mt-1">Only the CEO can manage user roles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Manage Roles</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Assign roles to staff members</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading users...</p>
      ) : users.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-sm p-8 text-center">
          <p className="text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-heading font-semibold">Name</TableHead>
                <TableHead className="font-heading font-semibold">Department</TableHead>
                <TableHead className="font-heading font-semibold">Current Role</TableHead>
                <TableHead className="font-heading font-semibold">Change Role</TableHead>
                <TableHead className="font-heading font-semibold">Assign Department</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium text-sm">{u.full_name || 'Unnamed'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.department || '—'}</TableCell>
                  <TableCell className="text-sm capitalize">{u.role}</TableCell>
                  <TableCell>
                    {u.user_id === user?.id ? (
                      <span className="text-xs text-muted-foreground italic">You</span>
                    ) : u.role_id ? (
                      <Select
                        value={u.role}
                        onValueChange={(newRole) => updateRole.mutate({ roleId: u.role_id, newRole, userId: u.user_id })}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map(r => (
                            <SelectItem key={r.value} value={r.value} disabled={r.value === 'ceo' && ceoCount >= 2 && u.role !== 'ceo'}>
                              {r.label}{r.value === 'ceo' && ceoCount >= 2 && u.role !== 'ceo' ? ' (max 2)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">No role record</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.user_id === user?.id ? (
                      <span className="text-xs text-muted-foreground italic">{u.department || '—'}</span>
                    ) : (
                      <Input
                        className="w-36 h-8 text-xs"
                        defaultValue={u.department || ''}
                        placeholder="Assign dept"
                        onBlur={(e) => {
                          if (e.target.value !== (u.department || '')) {
                            updateDepartment.mutate({ userId: u.user_id, department: e.target.value });
                          }
                        }}
                      />
                    )}
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

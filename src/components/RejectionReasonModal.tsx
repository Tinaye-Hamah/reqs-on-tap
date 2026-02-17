import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  open: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
  submitting?: boolean;
}

export function RejectionReasonModal({ open, onClose, onReject, submitting }: Props) {
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Rejection Reason</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Please provide a reason for rejection *</Label>
          <Textarea
            placeholder="Explain why this requisition is being rejected..."
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            onClick={() => onReject(reason)}
            disabled={!reason.trim() || submitting}
            variant="destructive"
          >
            {submitting ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

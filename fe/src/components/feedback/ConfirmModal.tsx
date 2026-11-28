import { AlertTriangle, Trash2 } from 'lucide-react';
import React from 'react';
import { Badge, Button, Modal } from '@/components/ui';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useConfirmStore } from '@/stores/confirm.store';

export const ConfirmModal: React.FC = () => {
  const options = useConfirmStore((s) => s.options);
  const isPending = useConfirmStore((s) => s.isPending);
  const closeConfirm = useConfirmStore((s) => s.closeConfirm);
  const confirm = useConfirmStore((s) => s.confirm);

  useEscapeKey(Boolean(options) && !isPending, closeConfirm);

  return (
    <Modal
      open={Boolean(options)}
      onClose={closeConfirm}
      maxWidth="sm"
      headerBadge={
        <Badge variant="pink" size="xs">
          <AlertTriangle className="w-3 h-3" />
          XÁC NHẬN THAO TÁC
        </Badge>
      }
      title={options?.title}
      footer={
        <>
          <Button variant="default" size="sm" disabled={isPending} onClick={closeConfirm}>
            {options?.cancelLabel || 'Hủy'}
          </Button>
          <Button
            variant="pink"
            size="sm"
            disabled={isPending}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => void confirm()}
          >
            {isPending ? 'Đang xóa...' : options?.confirmLabel || 'Xác nhận xóa'}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-[#141414]/90">{options?.message}</div>
    </Modal>
  );
};

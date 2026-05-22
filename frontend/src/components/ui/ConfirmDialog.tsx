import { Button } from './Button';
import { Sheet } from './Sheet';
import type { ButtonVariant } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Visual weight of the confirm action — defaults to a destructive red. */
  confirmVariant?: ButtonVariant;
  /** True while the confirm action is in flight. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Centered confirmation dialog built on the Sheet primitive.
 * Used to gate destructive or irreversible actions (log out,
 * unlink wallet, cancel invite).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Sheet
      open={open}
      onClose={loading ? () => undefined : onCancel}
      variant="dialog"
      title={title}
      description={description}
      footer={
        <div className="flex flex-col gap-2">
          <Button variant={confirmVariant} fullWidth loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="ghost" fullWidth disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      }
    />
  );
}

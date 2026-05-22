import { useState } from 'react';
import { CheckCircle2, Clipboard, Share2 } from 'lucide-react';
import { useI18n } from '../lib/useI18n';
import { Button, Card, useToast } from './ui';

/** Shareable invite link with copy-to-clipboard and native share controls. */
export function InviteLink({ inviteId }: { inviteId: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const value = `${window.location.origin}/invite/${inviteId}`;
  // navigator.share is mobile-first and not present on every browser.
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.show(t('invite.linkCopied'), 'success');
    } catch {
      toast.show(t('common.copyFailed'), 'error');
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: t('app.name'), text: t('invite.shareText'), url: value });
    } catch {
      // User dismissed the share sheet, or share failed — fall back to copy.
      await copy();
    }
  };

  return (
    <Card padding="md">
      <p className="mb-2 text-xs font-semibold text-slate-400">{t('invite.link')}</p>
      <div className="flex items-center gap-2 rounded-2xl bg-surface-sunken px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">{value}</span>
        <button
          type="button"
          aria-label={copied ? t('common.copied') : t('common.copy')}
          onClick={() => void copy()}
          className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {copied ? (
            <CheckCircle2 size={18} className="text-success-600" aria-hidden="true" />
          ) : (
            <Clipboard size={18} aria-hidden="true" />
          )}
        </button>
      </div>
      {canShare ? (
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          className="mt-3"
          iconLeft={<Share2 size={15} aria-hidden="true" />}
          onClick={() => void share()}
        >
          {t('common.share')}
        </Button>
      ) : null}
    </Card>
  );
}

import { useState } from 'react';
import { CheckCircle2, Clipboard } from 'lucide-react';
import { useI18n } from '../lib/useI18n';
import { Card } from './ui';

/** Shareable invite link with a copy-to-clipboard control. */
export function InviteLink({ inviteId }: { inviteId: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const value = `${window.location.origin}/invite/${inviteId}`;

  return (
    <Card padding="md">
      <p className="mb-2 text-xs font-semibold text-slate-400">{t('invite.link')}</p>
      <div className="flex items-center gap-2 rounded-2xl bg-surface-sunken px-3 py-2.5">
        <span className="flex-1 truncate font-mono text-xs text-slate-700">{value}</span>
        <button
          type="button"
          aria-label={copied ? t('common.copied') : t('common.copy')}
          onClick={() => void navigator.clipboard.writeText(value).then(() => setCopied(true))}
          className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {copied ? (
            <CheckCircle2 size={18} className="text-success-600" aria-hidden="true" />
          ) : (
            <Clipboard size={18} aria-hidden="true" />
          )}
        </button>
      </div>
    </Card>
  );
}

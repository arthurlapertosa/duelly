import type { FeeQuoteView } from '../lib/types';
import { formatBRL, potentialPayoutRaw } from '../lib/format';
import { useI18n } from '../lib/useI18n';
import { Card } from './ui';

/** Stake / fee / total / payout breakdown for a bet or invite. */
export function AmountBreakdown({ quote }: { quote: FeeQuoteView }) {
  const { locale, t } = useI18n();
  const rows: Array<{ label: string; value: string; emphasis?: boolean }> = [
    { label: t('fee.stake'), value: quote.stakeRaw },
    { label: t('fee.service'), value: quote.selectedLoserFeeRaw },
    { label: t('fee.total'), value: quote.totalRequiredAmountRaw },
    {
      label: t('fee.payout'),
      value: potentialPayoutRaw(quote.stakeRaw, quote.selectedLoserFeeRaw),
      emphasis: true,
    },
  ];

  return (
    <Card padding="md">
      <dl className="space-y-2.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-center justify-between text-sm ${
              row.emphasis ? 'border-t border-slate-100 pt-2.5' : ''
            }`}
          >
            <dt className={row.emphasis ? 'font-semibold text-slate-700' : 'text-slate-500'}>
              {row.label}
            </dt>
            <dd className={`font-bold ${row.emphasis ? 'text-success-700' : 'text-slate-950'}`}>
              {formatBRL(row.value, locale)}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

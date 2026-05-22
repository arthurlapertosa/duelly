import { localizeOutcomeLabel } from './i18n';
import type { Locale, TemplateLocalizedDisplay, TemplateView } from './types';

export function templateDisplay(template: TemplateView, locale: Locale): TemplateLocalizedDisplay {
  if (locale === 'pt-BR' && template.display?.ptBR) return template.display.ptBR;
  return {
    question: template.title,
    rulesSummary: template.rulesSummary,
    outcomes: [
      localizeOutcomeLabel(locale, template.outcomes[0]),
      localizeOutcomeLabel(locale, template.outcomes[1]),
    ],
  };
}

export function templateOutcomeLabel(template: TemplateView, locale: Locale, providerOutcomeIndex: number): string {
  const index = template.outcomeIndexes.indexOf(providerOutcomeIndex);
  if (index < 0) return '-';
  return templateDisplay(template, locale).outcomes[index] ?? '-';
}

import type { TemplateView } from './types';

export type TemplateCategoryFilter = 'all' | TemplateView['category'];

interface TemplateFilterOptions {
  category: TemplateCategoryFilter;
  query: string;
}

export function filterTemplates(
  templates: TemplateView[],
  { category, query }: TemplateFilterOptions,
): TemplateView[] {
  const categoryMatches =
    category === 'all' ? templates : templates.filter((template) => template.category === category);
  const terms = searchTerms(query);
  if (terms.length === 0) return categoryMatches;

  return categoryMatches.filter((template) => {
    const searchable = normalizeSearchText([
      template.title,
      template.category,
      template.source,
      ...template.outcomes,
    ].join(' '));
    return terms.every((term) => searchable.includes(term));
  });
}

function searchTerms(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

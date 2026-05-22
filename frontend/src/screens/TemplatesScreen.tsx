import { useEffect, useState } from 'react';
import { Compass, Search, X } from 'lucide-react';
import { useI18n } from '../lib/useI18n';
import { filterTemplates, type TemplateCategoryFilter } from '../lib/templateFilters';
import { useAppStore } from '../store/useAppStore';
import { EmptyState, ScreenHeader, SegmentedControl, SkeletonList } from '../components/ui';
import { MotionList, Page, TemplateCard } from '../components';
import { cn } from '../lib/cn';

const CATEGORIES: TemplateCategoryFilter[] = ['all', 'football', 'tennis', 'ufc', 'f1'];

/** Browse approved betting templates with category and text filters. */
export function TemplatesScreen() {
  const { t } = useI18n();
  const templates = useAppStore((state) => state.templates);
  const templatesLoaded = useAppStore((state) => state.templatesLoaded);
  const refreshTemplates = useAppStore((state) => state.refreshTemplates);
  const [category, setCategory] = useState<TemplateCategoryFilter>('all');
  const [query, setQuery] = useState('');
  const filtered = filterTemplates(templates, { category, query });
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    void refreshTemplates();
  }, [refreshTemplates]);

  return (
    <Page>
      <ScreenHeader
        eyebrow={t('home.explore')}
        title={t('templates.title')}
        description={t('templates.subtitle')}
        icon={<Compass size={20} aria-hidden="true" />}
      />

      <SegmentedControl
        ariaLabel={t('home.explore')}
        scrollable
        size="sm"
        value={category}
        onChange={setCategory}
        options={CATEGORIES.map((item) => ({
          value: item,
          label: item === 'all' ? t('common.all') : item.toUpperCase(),
        }))}
      />

      <div className="space-y-1.5">
        <label htmlFor="template-search" className="block text-xs font-semibold text-slate-600">
          {t('templates.searchLabel')}
        </label>
        <div
          className={cn(
            'flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-card',
            'focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15',
          )}
        >
          <Search size={16} aria-hidden="true" className="shrink-0 text-slate-400" />
          <input
            id="template-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('templates.searchPlaceholder')}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          {hasQuery ? (
            <button
              type="button"
              aria-label={t('templates.searchClear')}
              onClick={() => setQuery('')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-surface-sunken hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {!templatesLoaded ? (
        <SkeletonList count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Compass size={22} aria-hidden="true" />}
          title={hasQuery ? t('templates.searchEmpty') : t('templates.empty')}
        />
      ) : (
        <MotionList>
          {filtered.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </MotionList>
      )}
    </Page>
  );
}

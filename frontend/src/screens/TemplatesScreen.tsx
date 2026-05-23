import { useCallback, useEffect, useRef, useState } from 'react';
import { Compass, Search, X } from 'lucide-react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';
import { useI18n } from '../lib/useI18n';
import type { TemplateCategoryFilter } from '../lib/templateFilters';
import { useAppStore } from '../store/useAppStore';
import { EmptyState, ScreenHeader, SegmentedControl, SkeletonList } from '../components/ui';
import { MotionList, Page, TemplateCard } from '../components';
import { cn } from '../lib/cn';
import type { TemplateView } from '../lib/types';

const CATEGORIES: TemplateCategoryFilter[] = ['all', 'football', 'tennis', 'ufc', 'f1'];
const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

/** Browse approved betting templates with category and text filters. */
export function TemplatesScreen() {
  const { locale, t } = useI18n();
  const upsertTemplates = useAppStore((state) => state.upsertTemplates);
  const [category, setCategory] = useState<TemplateCategoryFilter>('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [templates, setTemplates] = useState<TemplateView[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasQuery = query.trim().length > 0;
  const backendCategory = category === 'all' ? undefined : category;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadPage = useCallback(async (cursor: string | null, reset: boolean) => {
    if (loadingRef.current && !reset) return;
    if (reset) abortRef.current?.abort();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const controller = new AbortController();
    abortRef.current = controller;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    if (reset) {
      setTemplatesLoaded(false);
      setNextCursor(null);
    }
    try {
      const page = await api.listTemplates({
        category: backendCategory,
        query: debouncedQuery,
        limit: PAGE_SIZE,
        cursor,
        signal: controller.signal,
      });
      if (requestIdRef.current !== requestId) return;
      setTemplates((current) => reset ? page.templates : appendTemplates(current, page.templates));
      upsertTemplates(page.templates);
      setNextCursor(page.nextCursor);
      setTemplatesLoaded(true);
    } catch (cause) {
      if (controller.signal.aborted || requestIdRef.current !== requestId) return;
      setError(errorMessage(locale, cause));
      setTemplatesLoaded(true);
    } finally {
      if (requestIdRef.current === requestId) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [backendCategory, debouncedQuery, locale, upsertTemplates]);

  useEffect(() => {
    void loadPage(null, true);
    return () => abortRef.current?.abort();
  }, [loadPage]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !nextCursor) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible && nextCursor && !loadingRef.current) void loadPage(nextCursor, false);
    }, { rootMargin: '360px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadPage, nextCursor]);

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
      ) : error ? (
        <EmptyState
          icon={<Compass size={22} aria-hidden="true" />}
          title={error}
        />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<Compass size={22} aria-hidden="true" />}
          title={hasQuery ? t('templates.searchEmpty') : t('templates.empty')}
        />
      ) : (
        <>
          <MotionList>
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </MotionList>
          {nextCursor ? <div ref={sentinelRef} className="h-1" aria-hidden="true" /> : null}
          {loading ? <SkeletonList count={2} /> : null}
        </>
      )}
    </Page>
  );
}

function appendTemplates(current: TemplateView[], next: TemplateView[]): TemplateView[] {
  const byId = new Map(current.map((template) => [template.id, template]));
  for (const template of next) byId.set(template.id, template);
  return [...byId.values()];
}

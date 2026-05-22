import { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';
import type { TemplateView } from '../lib/types';
import { useI18n } from '../lib/useI18n';
import { useAppStore } from '../store/useAppStore';
import { EmptyState, ScreenHeader, SegmentedControl, SkeletonList } from '../components/ui';
import { MotionList, Page, TemplateCard } from '../components';

type CategoryFilter = 'all' | TemplateView['category'];
const CATEGORIES: CategoryFilter[] = ['all', 'football', 'tennis', 'ufc', 'f1'];

/** Browse approved betting templates with a category filter. */
export function TemplatesScreen() {
  const { t } = useI18n();
  const templates = useAppStore((state) => state.templates);
  const templatesLoaded = useAppStore((state) => state.templatesLoaded);
  const refreshTemplates = useAppStore((state) => state.refreshTemplates);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const filtered =
    category === 'all' ? templates : templates.filter((template) => template.category === category);

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

      {!templatesLoaded ? (
        <SkeletonList count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Compass size={22} aria-hidden="true" />} title={t('templates.empty')} />
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

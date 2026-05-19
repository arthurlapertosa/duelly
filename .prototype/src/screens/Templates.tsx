import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Compass } from 'lucide-react'
import { useStore } from '../store/useStore'
import { TemplateCard } from '../components/TemplateCard'
import { PageTransition } from '../components/PageTransition'

const categories = [
  { key: 'all', label: 'Todos' },
  { key: 'collectibles', label: 'Colecionáveis' },
  { key: 'sports', label: 'Esportes' },
] as const

type CategoryKey = (typeof categories)[number]['key']

export function Templates() {
  const templates = useStore((s) => s.templates)
  const [category, setCategory] = useState<CategoryKey>('all')

  const filtered =
    category === 'all'
      ? templates.filter((t) => t.active)
      : templates.filter((t) => t.active && t.category === category)

  return (
    <PageTransition>
      <div className="pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-5"
        >
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 mb-1">
                Explorar mercados
              </p>
              <h1 className="text-2xl font-bold text-gray-900">Escolha seu proximo duelo</h1>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
              <Compass size={20} />
            </div>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Filtre os templates, encontre o mercado certo e avance em etapas ate gerar seu convite.
          </p>
        </motion.div>

        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const isActive = category === cat.key

            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className="relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap"
              >
                {isActive && (
                  <motion.span
                    layoutId="templates-category-pill"
                    className="absolute inset-0 rounded-full bg-primary-600 shadow-sm"
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  />
                )}
                <span
                  className={`relative z-10 transition-colors ${
                    isActive ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {filtered.length === 0 ? (
            <motion.div
              key={`empty-${category}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
              className="bg-white border border-dashed border-gray-200 rounded-3xl py-14 px-6 text-center"
            >
              <p className="text-sm font-semibold text-gray-700 mb-1">Nenhum template nesta categoria</p>
              <p className="text-sm text-gray-400">Troque o filtro para abrir novas oportunidades de duelo.</p>
            </motion.div>
          ) : (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-3"
            >
              {filtered.map((template, index) => (
                <motion.div
                  key={template.id}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      delay: index * 0.04,
                      duration: 0.3,
                      ease: [0.25, 0.1, 0.25, 1],
                    },
                  }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.16 } }}
                >
                  <TemplateCard template={template} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}

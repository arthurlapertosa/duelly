import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Template } from '../types'
import { formatDate } from '../helpers/date'

const categoryLabels: Record<string, string> = {
  collectibles: 'Colecionáveis',
  sports: 'Esportes',
}

interface Props {
  template: Template
}

export function TemplateCard({ template }: Props) {
  const navigate = useNavigate()

  return (
    <motion.button
      layout
      onClick={() => navigate(`/templates/${template.id}`)}
      className="w-full bg-white rounded-2xl p-4 text-left border border-gray-100 hover:border-gray-200 transition-colors"
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
          {categoryLabels[template.category] ?? template.category}
        </span>
        <span className="text-[10px] text-gray-400">
          {template.source}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 mb-3 leading-snug">
        {template.title}
      </h3>

      <div className="flex gap-2 mb-3">
        {template.outcomes.map((outcome, i) => (
          <span
            key={i}
            className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-lg border border-gray-100"
          >
            {outcome}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-400">
        <span>Fecha em {formatDate(template.bettingCloseAt)}</span>
        <span>Taxa: {template.loserFeeBps / 100}%</span>
      </div>
    </motion.button>
  )
}

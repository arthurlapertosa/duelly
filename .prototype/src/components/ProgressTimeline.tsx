import { Check } from 'lucide-react'

export interface TimelineStep {
  label: string
  sublabel?: string
  completed: boolean
  active?: boolean
}

interface Props {
  steps: TimelineStep[]
}

export function ProgressTimeline({ steps }: Props) {
  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                step.completed
                  ? 'bg-green-500 text-white'
                  : step.active
                    ? 'bg-primary-600 text-white animate-pulse'
                    : 'bg-gray-200 text-gray-400'
              }`}
            >
              {step.completed ? (
                <Check size={14} strokeWidth={3} />
              ) : (
                <span className="w-2 h-2 rounded-full bg-current" />
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-0.5 h-8 ${
                  step.completed ? 'bg-green-300' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
          <div className="pt-0.5 pb-4">
            <p
              className={`text-sm font-medium ${
                step.completed || step.active ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {step.label}
            </p>
            {step.sublabel && (
              <p className="text-xs text-gray-400 mt-0.5">{step.sublabel}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

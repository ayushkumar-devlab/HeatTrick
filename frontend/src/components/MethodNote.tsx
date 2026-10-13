import { methods, type MethodId } from '../data/methods'

interface MethodNoteProps {
  methodId: MethodId
}

export function MethodNote({ methodId }: MethodNoteProps) {
  const method = methods.find((entry) => entry.id === methodId)
  if (!method) {
    throw new Error(`Unknown method: ${methodId}`)
  }

  return (
    <details className="rounded-lg border border-border bg-surface-alt p-4">
      <summary className="cursor-pointer font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2">
        How is this calculated?
      </summary>
      <div className="mt-3 space-y-3 text-sm leading-6 text-ink-soft">
        <p>{method.formula}</p>
        <p><span className="font-medium text-ink">Inputs:</span> {method.inputs.join('; ')}</p>
        <p><span className="font-medium text-ink">Valid range:</span> {method.validRange}</p>
        <p><span className="font-medium text-ink">Source:</span> {method.source} Citation key: {method.citationKey}.</p>
        <ul className="list-disc space-y-1 pl-5">
          {method.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
        </ul>
      </div>
    </details>
  )
}

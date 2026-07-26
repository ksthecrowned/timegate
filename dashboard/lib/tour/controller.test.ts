import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { TourStep } from './types'
import { filterAvailableSteps, progressLabel } from './helpers'

const steps: TourStep[] = [
  { id: 'a', type: 'celebrate', module: 'Intro', title: 'A', description: '…' },
  {
    id: 'b',
    type: 'spotlight',
    module: 'Dashboard',
    title: 'B',
    description: '…',
    element: '[data-tour="missing"]',
  },
]

describe('filterAvailableSteps', () => {
  it('keeps celebrate without element', () => {
    const out = filterAvailableSteps(steps, () => null)
    assert.equal(out.length, 1)
    assert.equal(out[0].id, 'a')
  })

  it('keeps navigate steps even if element missing', () => {
    const nav: TourStep[] = [
      {
        id: 'n',
        type: 'navigate',
        module: 'Employés',
        title: 'N',
        description: '…',
        path: '/employees',
        element: '[data-tour="x"]',
      },
    ]
    const out = filterAvailableSteps(nav, () => null)
    assert.equal(out.length, 1)
  })
})

describe('progressLabel', () => {
  it('formats module and index', () => {
    assert.equal(progressLabel(steps[0], 0, 5), 'Intro · 1/5')
  })
})

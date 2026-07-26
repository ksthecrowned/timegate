import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import {
  storageKey,
  loadTourState,
  saveTourState,
  clearTourState,
} from './storage'

describe('tour storage', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    // @ts-expect-error test polyfill
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    }
  })

  it('scopes key by user and role', () => {
    assert.equal(
      storageKey('u1', 'ADMIN'),
      'timegate.dashboard.tour.v2:u1:ADMIN',
    )
  })

  it('round-trips state', () => {
    saveTourState('u1', 'ADMIN', {
      status: 'running',
      stepId: 'dash-today',
      updatedAt: '2026-07-26T00:00:00.000Z',
    })
    const loaded = loadTourState('u1', 'ADMIN')
    assert.equal(loaded?.stepId, 'dash-today')
    assert.equal(loaded?.status, 'running')
  })

  it('clear removes state', () => {
    saveTourState('u1', 'ADMIN', {
      status: 'completed',
      stepId: null,
      updatedAt: '2026-07-26T00:00:00.000Z',
    })
    clearTourState('u1', 'ADMIN')
    assert.equal(loadTourState('u1', 'ADMIN'), null)
  })
})

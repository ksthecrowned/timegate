import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  clearNotificationsCache,
  loadNotificationsCache,
  notificationsCacheKey,
  saveNotificationsCache,
} from './notifications-cache'

describe('notifications cache', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    // @ts-expect-error test polyfill
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    }
  })

  it('scopes key by user', () => {
    assert.equal(
      notificationsCacheKey('u1'),
      'timegate.dashboard.notifications.v1:u1',
    )
  })

  it('round-trips items and unread count', () => {
    saveNotificationsCache('u1', {
      unreadCount: 2,
      items: [
        {
          id: 'n1',
          type: 'LEAVE_REQUEST',
          title: 'Congé',
          body: 'Demande reçue',
          readAt: null,
          createdAt: '2026-07-29T00:00:00.000Z',
        },
      ],
    })
    const loaded = loadNotificationsCache('u1')
    assert.equal(loaded?.unreadCount, 2)
    assert.equal(loaded?.items.length, 1)
    assert.equal(loaded?.items[0]?.id, 'n1')
    assert.ok(typeof loaded?.cachedAt === 'number')
  })

  it('rejects corrupt payloads', () => {
    globalThis.localStorage.setItem(
      notificationsCacheKey('u1'),
      JSON.stringify({ items: [{ id: 1 }], unreadCount: 'x', cachedAt: 1 }),
    )
    assert.equal(loadNotificationsCache('u1'), null)
  })

  it('clear removes state', () => {
    saveNotificationsCache('u1', { items: [], unreadCount: 0 })
    clearNotificationsCache('u1')
    assert.equal(loadNotificationsCache('u1'), null)
  })
})

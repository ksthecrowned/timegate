import { driver, type Driver } from 'driver.js'

import { waitForSelector } from './dom'
import { onOrgSaved } from './events'
import { progressLabel } from './helpers'
import { loadTourState, saveTourState } from './storage'
import type { TourPersistedState, TourRole, TourStep } from './types'

export type TourRouter = { push: (href: string) => void }

export type TourProgress = {
  index: number
  total: number
  label: string
  step: TourStep | null
  running: boolean
}

export type TourController = {
  start: (opts?: {
    force?: boolean
    resumeFromStepId?: string
  }) => Promise<void>
  stop: (reason: 'completed' | 'dismissed') => void
  getProgress: () => TourProgress
  subscribe: (listener: () => void) => () => void
}

type ControllerOpts = {
  userId: string
  role: TourRole
  steps: TourStep[]
  router: TourRouter
}

export function createTourController(opts: ControllerOpts): TourController {
  const { userId, role, steps: allSteps, router } = opts
  let active: Driver | null = null
  let running = false
  let index = 0
  let queue: TourStep[] = []
  let unsubAction: (() => void) | null = null
  const listeners = new Set<() => void>()

  function notify() {
    listeners.forEach((l) => l())
  }

  function persist(
    partial: Partial<TourPersistedState> & Pick<TourPersistedState, 'status'>,
  ) {
    const prev = loadTourState(userId, role)
    saveTourState(userId, role, {
      status: partial.status,
      stepId:
        partial.stepId !== undefined
          ? partial.stepId
          : (queue[index]?.id ?? null),
      orgSetupSkipped: partial.orgSetupSkipped ?? prev?.orgSetupSkipped,
      orgReminderShown: partial.orgReminderShown ?? prev?.orgReminderShown,
      updatedAt: new Date().toISOString(),
    })
  }

  function cleanupStep() {
    unsubAction?.()
    unsubAction = null
    if (active) {
      try {
        active.destroy()
      } catch {
        // already destroyed
      }
      active = null
    }
  }

  function getProgress(): TourProgress {
    const step = queue[index] ?? null
    return {
      index,
      total: queue.length,
      label: step ? progressLabel(step, index, queue.length) : '',
      step,
      running,
    }
  }

  function stop(reason: 'completed' | 'dismissed') {
    running = false
    cleanupStep()
    persist({ status: reason, stepId: null })
    notify()
  }

  async function advance() {
    cleanupStep()
    index += 1
    if (index >= queue.length) {
      stop('completed')
      return
    }
    persist({ status: 'running', stepId: queue[index].id })
    notify()
    await runCurrentStep()
  }

  async function softSkip() {
    await advance()
  }

  function showDriver(
    step: TourStep,
    options: {
      onNext?: () => void
      showNext?: boolean
      nextLabel?: string
      allowTargetInteraction?: boolean
      onPopoverRender?: (popover: {
        wrapper: HTMLElement
        footerButtons: HTMLElement
      }) => void
    },
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      let settled = false
      const finish = (fn?: () => void) => {
        if (settled) return
        settled = true
        fn?.()
        resolve()
      }

      const buttons: Array<'next' | 'previous' | 'close'> =
        options.showNext === false ? ['close'] : ['next', 'close']

      let target: Element | string | undefined = step.element
      if (typeof step.element === 'string' && typeof document !== 'undefined') {
        const el = document.querySelector(step.element)
        if (el) {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          })
          target = el
        }
      }

      const launch = () => {
        if (settled) return
        active = driver({
          animate: true,
          allowClose: false,
          allowScroll: false,
          smoothScroll: true,
          overlayClickBehavior: () => undefined,
          overlayOpacity: 0.6,
          overlayColor: '#0b1120',
          stagePadding: 10,
          stageRadius: 12,
          disableActiveInteraction: !options.allowTargetInteraction,
          popoverClass: 'tg-driver-popover',
          showProgress: false,
          nextBtnText: options.nextLabel ?? 'Continuer',
          doneBtnText: options.nextLabel ?? 'Continuer',
          progressText: '{{current}} / {{total}}',
          showButtons: buttons,
          steps: [
            {
              element: target,
              popover: {
                title: step.title,
                description: step.description,
                side: step.side,
                align: step.align,
                showButtons: buttons,
                nextBtnText: options.nextLabel ?? 'Continuer',
                doneBtnText: options.nextLabel ?? 'Continuer',
                onNextClick: (_el, _s, { driver: d }) => {
                  d.destroy()
                  finish(() => options.onNext?.())
                },
                onCloseClick: (_el, _s, { driver: d }) => {
                  d.destroy()
                  finish(() => stop('dismissed'))
                },
                onPopoverRender: (popover) => {
                  options.onPopoverRender?.(popover)
                },
              },
            },
          ],
        })
        active.drive()
      }

      if (target instanceof Element) {
        window.setTimeout(launch, 280)
      } else {
        launch()
      }
    })
  }

  async function runCurrentStep() {
    if (!running) return
    const step = queue[index]
    if (!step) {
      stop('completed')
      return
    }

    if (step.type === 'navigate' || (step.path && step.type !== 'spotlight')) {
      if (step.path && typeof window !== 'undefined') {
        const here = window.location.pathname
        if (here !== step.path) {
          router.push(step.path)
        }
      }
      if (step.element) {
        const el = await waitForSelector(step.element, 4000)
        if (!el) {
          if (step.required) {
            await showDriver(
              { ...step, element: undefined },
              {
                onNext: () => void softSkip(),
                nextLabel: 'Passer',
              },
            )
            return
          }
          await softSkip()
          return
        }
      }
    }

    if (
      step.type === 'celebrate' ||
      step.type === 'spotlight' ||
      step.type === 'navigate'
    ) {
      if (step.element) {
        const el =
          typeof document !== 'undefined'
            ? document.querySelector(step.element)
            : null
        if (el) {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          })
        } else if (!step.required) {
          await softSkip()
          return
        }
      }
      await showDriver(step, {
        onNext: () => void advance(),
        nextLabel: index === queue.length - 1 ? 'Terminer' : 'Continuer',
        allowTargetInteraction: false,
      })
      return
    }

    if (step.type === 'awaitAction') {
      await showDriver(step, {
        showNext: false,
        allowTargetInteraction: true,
        onPopoverRender: () => {
          const selector = step.actionSelector
          if (!selector) return
          const handler = (ev: Event) => {
            const target = ev.target as Element | null
            if (!target?.closest?.(selector)) return
            document.removeEventListener('click', handler, true)
            void advance()
          }
          document.addEventListener('click', handler, true)
          unsubAction = () =>
            document.removeEventListener('click', handler, true)
        },
      })
      return
    }

    if (step.type === 'requireSave') {
      let advanced = false
      const go = () => {
        if (advanced) return
        advanced = true
        void advance()
      }
      unsubAction = onOrgSaved(go)
      await showDriver(step, {
        showNext: false,
        allowTargetInteraction: true,
        onPopoverRender: (popover) => {
          const btn = document.createElement('button')
          btn.type = 'button'
          btn.textContent = 'Plus tard'
          btn.className = 'driver-popover-prev-btn'
          btn.style.marginRight = '8px'
          btn.addEventListener('click', () => {
            const prev = loadTourState(userId, role)
            saveTourState(userId, role, {
              status: 'running',
              stepId: step.id,
              orgSetupSkipped: true,
              orgReminderShown: prev?.orgReminderShown,
              updatedAt: new Date().toISOString(),
            })
            go()
          })
          popover.footerButtons.prepend(btn)
        },
      })
      return
    }
  }

  async function start(startOpts?: {
    force?: boolean
    resumeFromStepId?: string
  }) {
    if (typeof window === 'undefined') return
    const existing = loadTourState(userId, role)
    if (!startOpts?.force && !startOpts?.resumeFromStepId) {
      if (existing?.status === 'completed' || existing?.status === 'dismissed')
        return
      if (existing?.status === 'running') return
    }

    cleanupStep()
    queue = [...allSteps]
    index = 0
    if (startOpts?.resumeFromStepId) {
      const i = queue.findIndex((s) => s.id === startOpts.resumeFromStepId)
      if (i >= 0) index = i
    }
    if (startOpts?.force) {
      saveTourState(userId, role, {
        status: 'running',
        stepId: queue[index]?.id ?? null,
        orgSetupSkipped: false,
        orgReminderShown: false,
        updatedAt: new Date().toISOString(),
      })
    }

    running = true
    persist({ status: 'running', stepId: queue[index]?.id ?? null })
    notify()
    await runCurrentStep()
  }

  return {
    start,
    stop,
    getProgress,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

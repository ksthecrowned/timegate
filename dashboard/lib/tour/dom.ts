export function isElementVisible(el: Element): boolean {
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

export function waitForSelector(
  selector: string,
  timeoutMs = 4000,
): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector)
    if (existing && isElementVisible(existing)) {
      resolve(existing)
      return
    }
    const started = Date.now()
    const timer = window.setInterval(() => {
      const el = document.querySelector(selector)
      if (el && isElementVisible(el)) {
        window.clearInterval(timer)
        resolve(el)
        return
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer)
        resolve(null)
      }
    }, 150)
  })
}

declare module 'preline/dist/select.mjs' {
  type HSSelectInstance = { destroy?: () => void }

  const HSSelect: {
    new (el: HTMLSelectElement): HSSelectInstance
    getInstance: (target: HTMLElement | string, isInstance?: boolean) => HSSelectInstance | null
  }

  export default HSSelect
}

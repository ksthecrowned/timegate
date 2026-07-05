declare module 'preline/plugins/select' {
  type HSSelectInstance = { destroy?: () => void }

  const HSSelect: {
    new (el: HTMLSelectElement): HSSelectInstance
    getInstance: (target: HTMLElement | string, isInstance?: boolean) => HSSelectInstance | null
  }

  export default HSSelect
}

/**
 * Walk up the navigator tree and open the nearest drawer.
 * Loose typing avoids a hard dep on @react-navigation/native types.
 */
type NavLike = {
  getParent?: () => NavLike | undefined;
  getState?: () => { type?: string; key?: string } | undefined;
  dispatch?: (action: { type: string; target?: string }) => void;
};

export function openRootDrawer(navigation: NavLike): void {
  let nav: NavLike | undefined = navigation;
  while (nav && typeof nav.getParent === 'function') {
    const parent = nav.getParent();
    if (!parent) break;
    const state = parent.getState?.();
    if (state?.type === 'drawer') {
      parent.dispatch?.({ type: 'OPEN_DRAWER', target: state.key });
      return;
    }
    nav = parent;
  }
  try {
    const state = navigation.getState?.();
    if (state?.type === 'drawer') {
      navigation.dispatch?.({ type: 'OPEN_DRAWER', target: state.key });
    }
  } catch {
    /* not in a drawer */
  }
}

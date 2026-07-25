import type { NavigationProp, ParamListBase } from "@react-navigation/native";

/**
 * Walk up the navigator tree and open the nearest drawer.
 */
export function openRootDrawer(
  navigation: NavigationProp<ParamListBase> | { getParent?: () => unknown },
): void {
  let nav: any = navigation;
  while (nav && typeof nav.getParent === "function") {
    const parent = nav.getParent();
    if (!parent) break;
    const state = parent.getState?.();
    if (state?.type === "drawer") {
      parent.dispatch({ type: "OPEN_DRAWER", target: state.key });
      return;
    }
    nav = parent;
  }
  try {
    const state = (navigation as any)?.getState?.();
    if (state?.type === "drawer") {
      (navigation as any).dispatch({ type: "OPEN_DRAWER", target: state.key });
    }
  } catch {
    /* not in a drawer */
  }
}

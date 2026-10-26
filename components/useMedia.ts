import { useSyncExternalStore } from "react";

/**
 * A media query as React state, without an effect.
 *
 * useSyncExternalStore subscribes to the query directly, so there is no
 * setState-in-effect and no flash of the wrong layout after mount. The server
 * snapshot is `fallback`, which is what the first client render also returns
 * before the store reports the real value.
 */
export function useMedia(query: string, fallback = false) {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

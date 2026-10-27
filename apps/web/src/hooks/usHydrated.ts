import { useSyncExternalStore } from "react";

const subscribe = () => () => {};


// False during SSR and the hydratation pass, true afterwards. Use it to mount
// Rdix popovers/selects whose generated ids would otherwise mismatch when the
// server and client tress difter above them (e.g inside animatePresence)

export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
};

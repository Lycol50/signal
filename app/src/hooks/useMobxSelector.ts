import { IEqualsComparer, reaction } from "mobx"
import { useCallback } from "react"
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector"
import RootStore from "../stores/RootStore"
import { useStores } from "./useStores"

type Selector<T> = () => T

export function useMobxSelector<T>(
  selector: Selector<T>,
  deps: any[],
  equals: IEqualsComparer<T> = Object.is,
): T {
  return useSyncExternalStoreWithSelector(
    useCallback(
      (onStoreChange) =>
        reaction(selector, onStoreChange, {
          fireImmediately: true,
          equals,
        }),
      deps,
    ),
    selector,
    undefined,
    useCallback((x) => x, []),
    equals,
  )
}

export function useMobxStore<T>(
  selector: (rootStore: RootStore) => T,
  equals?: IEqualsComparer<T>,
): T {
  const rootStore = useStores()
  return useMobxSelector(() => selector(rootStore), [rootStore], equals)
}

export function useMobxGetter<T, K extends keyof T>(
  store: T,
  prop: K,
  equals?: IEqualsComparer<T[K]>,
): T[K]
export function useMobxGetter<T, K extends keyof T>(
  store: T | undefined,
  prop: K,
  equals?: IEqualsComparer<T[K] | undefined>,
): T[K] | undefined
export function useMobxGetter<T, K extends keyof T>(
  store: T | undefined,
  prop: K,
  equals?: IEqualsComparer<T[K] | undefined>,
): T[K] | undefined {
  return useMobxSelector(() => store?.[prop], [store], equals)
}

import { createContext, useContext, useEffect, useMemo } from "react"
import { TempoSelection } from "../entities/selection/TempoSelection"
import TempoEditorStore from "../stores/TempoEditorStore"
import { useMobxGetter, useMobxSetter } from "./useMobxSelector"
import { QuantizerProvider } from "./useQuantizer"
import { RulerProvider, useRuler } from "./useRuler"
import { useStores } from "./useStores"
import { TickScrollProvider } from "./useTickScroll"

const TempoEditorStoreContext = createContext<TempoEditorStore>(null!)

export function TempoEditorProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { songStore, player } = useStores()
  const tempoEditorStore = useMemo(
    () => new TempoEditorStore(songStore, player),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    tempoEditorStore.tickScrollStore.setUpAutoScroll()
  }, [tempoEditorStore])

  return (
    <TempoEditorStoreContext.Provider value={tempoEditorStore}>
      {children}
    </TempoEditorStoreContext.Provider>
  )
}

export function TempoEditorScope({ children }: { children: React.ReactNode }) {
  const { tickScrollStore, rulerStore, quantizerStore } = useContext(
    TempoEditorStoreContext,
  )

  return (
    <TickScrollProvider value={tickScrollStore}>
      <RulerProvider value={rulerStore}>
        <QuantizerProvider value={quantizerStore}>{children}</QuantizerProvider>
      </RulerProvider>
    </TickScrollProvider>
  )
}

export function useTempoEditor() {
  const tempoEditorStore = useContext(TempoEditorStoreContext)

  const selection = useMobxGetter(tempoEditorStore, "selection")
  const { beats } = useRuler()
  const transform = useMobxGetter(tempoEditorStore, "transform")
  const mouseMode = useMobxGetter(tempoEditorStore, "mouseMode")

  const selectionRect = useMemo(
    () =>
      selection != null ? TempoSelection.getBounds(selection, transform) : null,
    [selection, transform],
  )

  const cursor = useMemo(
    () =>
      mouseMode === "pencil"
        ? `url("./cursor-pencil.svg") 0 20, pointer`
        : "auto",
    [mouseMode],
  )

  return {
    selection,
    transform,
    selectionRect,
    beats,
    cursor,
    get selectedEventIds() {
      return useMobxGetter(tempoEditorStore, "selectedEventIds")
    },
    get mouseMode() {
      return useMobxGetter(tempoEditorStore, "mouseMode")
    },
    setSelection: useMobxSetter(tempoEditorStore, "selection"),
    setSelectedEventIds: useMobxSetter(tempoEditorStore, "selectedEventIds"),
    setMouseMode: useMobxSetter(tempoEditorStore, "mouseMode"),
    setCanvasHeight: useMobxSetter(tempoEditorStore, "canvasHeight"),
  }
}

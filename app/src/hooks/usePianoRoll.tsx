import { deserializeSingleEvent, Stream } from "midifile-ts"
import { autorun } from "mobx"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react"
import { InstrumentSetting } from "../components/InstrumentBrowser/InstrumentBrowser"
import { Point } from "../entities/geometry/Point"
import { Rect } from "../entities/geometry/Rect"
import { KeySignature } from "../entities/scale/KeySignature"
import { Selection } from "../entities/selection/Selection"
import { addedSet, deletedSet } from "../helpers/set"
import PianoRollStore, {
  PianoNoteItem,
  PianoRollMouseMode,
  SerializedPianoRollStore,
} from "../stores/PianoRollStore"
import { TrackId, UNASSIGNED_TRACK_ID } from "../track"
import { KeyScrollProvider, useKeyScroll } from "./useKeyScroll"
import { useMobxSelector } from "./useMobxSelector"
import { QuantizerProvider, useQuantizer } from "./useQuantizer"
import { RulerProvider } from "./useRuler"
import { useStores } from "./useStores"
import { TickScrollProvider, useTickScroll } from "./useTickScroll"

const PianoRollStoreContext = createContext<PianoRollStore>(null!)

export function PianoRollProvider({ children }: { children: React.ReactNode }) {
  const { songStore, player, midiInput, midiMonitor, midiRecorder } =
    useStores()

  const pianoRollStore = useMemo(
    () => new PianoRollStore(songStore, player),
    [songStore, player],
  )

  useEffect(() => {
    pianoRollStore.setUpAutorun()
  }, [pianoRollStore])

  // Initially select the first track that is not a conductor track
  useEffect(() => {
    pianoRollStore.selectedTrackId =
      songStore.song.tracks.find((t) => !t.isConductorTrack)?.id ??
      UNASSIGNED_TRACK_ID
  }, [pianoRollStore])

  // highlight notes when receiving MIDI input
  useEffect(
    () =>
      midiInput.on("midiMessage", (e) => {
        const stream = new Stream(e.data)
        const event = deserializeSingleEvent(stream)

        if (event.type !== "channel") {
          return
        }

        if (event.subtype === "noteOn") {
          pianoRollStore.previewingNoteNumbers = addedSet(
            pianoRollStore.previewingNoteNumbers,
            event.noteNumber,
          )
        } else if (event.subtype === "noteOff") {
          pianoRollStore.previewingNoteNumbers = deletedSet(
            pianoRollStore.previewingNoteNumbers,
            event.noteNumber,
          )
        }
      }),
    [pianoRollStore],
  )

  // sync MIDIMonitor channel with selected track
  useEffect(
    () =>
      autorun(() => {
        const track = pianoRollStore.selectedTrack
        midiMonitor.channel = track?.channel ?? 0
      }),
    [pianoRollStore, midiMonitor],
  )

  // sync MIDIRecorder channel with selected track
  useEffect(
    () =>
      autorun(() => {
        midiRecorder.trackId = pianoRollStore.selectedTrackId
      }),
    [pianoRollStore, midiRecorder],
  )

  return (
    <PianoRollStoreContext.Provider value={pianoRollStore}>
      {children}
    </PianoRollStoreContext.Provider>
  )
}

export function PianoRollScope({ children }: { children: React.ReactNode }) {
  const { tickScrollStore, keyScrollStore, rulerStore, quantizerStore } =
    useContext(PianoRollStoreContext)

  return (
    <TickScrollProvider value={tickScrollStore}>
      <KeyScrollProvider value={keyScrollStore}>
        <RulerProvider value={rulerStore}>
          <QuantizerProvider value={quantizerStore}>
            {children}
          </QuantizerProvider>
        </RulerProvider>
      </KeyScrollProvider>
    </TickScrollProvider>
  )
}

export function usePianoRoll() {
  const pianoRollStore = useContext(PianoRollStoreContext)
  const { songStore } = useStores()
  const { tickScrollStore, keyScrollStore } = pianoRollStore
  const { setScrollLeftInTicks, setScrollLeftInPixels } =
    useTickScroll(tickScrollStore)
  const { setScrollTopInPixels } = useKeyScroll(keyScrollStore)

  return {
    get currentPan() {
      return useMobxSelector(() => pianoRollStore.currentPan, [pianoRollStore])
    },
    get currentVolume() {
      return useMobxSelector(
        () => pianoRollStore.currentVolume,
        [pianoRollStore],
      )
    },
    get notes() {
      return useMobxSelector(() => pianoRollStore.notes, [pianoRollStore])
    },
    get notGhostTrackIds() {
      return useMobxSelector(
        () => pianoRollStore.notGhostTrackIds,
        [pianoRollStore],
      )
    },
    get rulerStore() {
      return useMobxSelector(() => pianoRollStore.rulerStore, [pianoRollStore])
    },
    get mouseMode() {
      return useMobxSelector(() => pianoRollStore.mouseMode, [pianoRollStore])
    },
    get keySignature() {
      return useMobxSelector(
        () => pianoRollStore.keySignature,
        [pianoRollStore],
      )
    },
    get selection() {
      return useMobxSelector(() => pianoRollStore.selection, [pianoRollStore])
    },
    get selectedTrack() {
      return useMobxSelector(
        () => pianoRollStore.selectedTrack,
        [pianoRollStore],
      )
    },
    get selectedTrackId() {
      return useMobxSelector(
        () => pianoRollStore.selectedTrackId,
        [pianoRollStore],
      )
    },
    get selectedTrackIndex() {
      return useMobxSelector(
        () => pianoRollStore.selectedTrackIndex,
        [pianoRollStore],
      )
    },
    get selectedNoteIds() {
      return useMobxSelector(
        () => pianoRollStore.selectedNoteIds,
        [pianoRollStore],
      )
    },
    get transform() {
      return useMobxSelector(() => pianoRollStore.transform, [pianoRollStore])
    },
    get windowedEvents() {
      return useMobxSelector(
        () => pianoRollStore.windowedEvents,
        [pianoRollStore],
      )
    },
    get notesCursor() {
      return useMobxSelector(() => pianoRollStore.notesCursor, [pianoRollStore])
    },
    get selectionBounds() {
      return useMobxSelector(
        () => pianoRollStore.selectionBounds,
        [pianoRollStore],
      )
    },
    get showTrackList() {
      return useMobxSelector(
        () => pianoRollStore.showTrackList,
        [pianoRollStore],
      )
    },
    get showEventList() {
      return useMobxSelector(
        () => pianoRollStore.showEventList,
        [pianoRollStore],
      )
    },
    get ghostTrackIds() {
      return useMobxSelector(
        () => pianoRollStore.ghostTrackIds,
        [pianoRollStore],
      )
    },
    get previewingNoteNumbers() {
      return useMobxSelector(
        () => pianoRollStore.previewingNoteNumbers,
        [pianoRollStore],
      )
    },
    get openTransposeDialog() {
      return useMobxSelector(
        () => pianoRollStore.openTransposeDialog,
        [pianoRollStore],
      )
    },
    get openVelocityDialog() {
      return useMobxSelector(
        () => pianoRollStore.openVelocityDialog,
        [pianoRollStore],
      )
    },
    get newNoteVelocity() {
      return useMobxSelector(
        () => pianoRollStore.newNoteVelocity,
        [pianoRollStore],
      )
    },
    get lastNoteDuration() {
      return useMobxSelector(
        () => pianoRollStore.lastNoteDuration,
        [pianoRollStore],
      )
    },
    get currentMBTTime() {
      return useMobxSelector(
        () => pianoRollStore.currentMBTTime,
        [pianoRollStore],
      )
    },
    get controlCursor() {
      return useMobxSelector(
        () => pianoRollStore.controlCursor,
        [pianoRollStore],
      )
    },
    get instrumentBrowserSetting() {
      return useMobxSelector(
        () => pianoRollStore.instrumentBrowserSetting,
        [pianoRollStore],
      )
    },
    get openInstrumentBrowser() {
      return useMobxSelector(
        () => pianoRollStore.openInstrumentBrowser,
        [pianoRollStore],
      )
    },
    get activePane() {
      return useMobxSelector(() => pianoRollStore.activePane, [pianoRollStore])
    },
    resetSelection: useCallback(() => {
      pianoRollStore.selection = null
      pianoRollStore.selectedNoteIds = []
    }, [pianoRollStore]),
    scrollBy: useCallback(
      (dx: number, dy: number) => {
        setScrollLeftInPixels(tickScrollStore.scrollLeft - dx)
        setScrollTopInPixels(keyScrollStore.scrollTop - dy)
      },
      [
        setScrollLeftInPixels,
        setScrollTopInPixels,
        keyScrollStore,
        tickScrollStore,
      ],
    ),
    setNotGhostTrackIds: useCallback(
      (ids: Set<TrackId>) => (pianoRollStore.notGhostTrackIds = ids),
      [pianoRollStore],
    ),
    setOpenTransposeDialog: useCallback(
      (open: boolean) => (pianoRollStore.openTransposeDialog = open),
      [pianoRollStore],
    ),
    setOpenVelocityDialog: useCallback(
      (open: boolean) => (pianoRollStore.openVelocityDialog = open),
      [pianoRollStore],
    ),
    setKeySignature: useCallback(
      (keySignature: KeySignature | null) =>
        (pianoRollStore.keySignature = keySignature),
      [pianoRollStore],
    ),
    setMouseMode: useCallback(
      (mode: PianoRollMouseMode) => {
        pianoRollStore.mouseMode = mode
        pianoRollStore.notesCursor = mode === "pencil" ? "auto" : "crosshair"
      },
      [pianoRollStore],
    ),
    addPreviewingNoteNumbers: useCallback(
      (noteNumber: number) =>
        (pianoRollStore.previewingNoteNumbers = new Set([
          ...pianoRollStore.previewingNoteNumbers,
          noteNumber,
        ])),
      [pianoRollStore],
    ),
    removePreviewingNoteNumbers: useCallback(
      (noteNumber: number) =>
        (pianoRollStore.previewingNoteNumbers = new Set(
          [...pianoRollStore.previewingNoteNumbers].filter(
            (n) => n !== noteNumber,
          ),
        )),
      [pianoRollStore],
    ),
    setSelection: useCallback(
      (selection: Selection | null) => (pianoRollStore.selection = selection),
      [pianoRollStore],
    ),
    setShowTrackList: useCallback(
      (show: boolean) => (pianoRollStore.showTrackList = show),
      [pianoRollStore],
    ),
    setShowEventList: useCallback(
      (show: boolean) => (pianoRollStore.showEventList = show),
      [pianoRollStore],
    ),
    setScrollLeftInTicks,
    setScrollLeftInPixels,
    setSelectedTrackId: useCallback(
      (id: TrackId) => (pianoRollStore.selectedTrackId = id),
      [pianoRollStore],
    ),
    setSelectedTrackIndex: useCallback(
      (index: number) =>
        (pianoRollStore.selectedTrackId = songStore.song.tracks[index]?.id),
      [pianoRollStore],
    ),
    setSelectedNoteIds: useCallback(
      (ids: number[]) => (pianoRollStore.selectedNoteIds = ids),
      [pianoRollStore],
    ),
    setNotesCursor: useCallback(
      (cursor: string) => (pianoRollStore.notesCursor = cursor),
      [pianoRollStore],
    ),
    // convert mouse position to the local coordinate on the canvas
    getLocal: useCallback(
      (e: { offsetX: number; offsetY: number }): Point => ({
        x: e.offsetX + tickScrollStore.scrollLeft,
        y: e.offsetY + keyScrollStore.scrollTop,
      }),
      [keyScrollStore, tickScrollStore],
    ),
    getNotes: useCallback(
      (local: Point): PianoNoteItem[] =>
        pianoRollStore.notes.filter((n) => Rect.containsPoint(n, local)),
      [pianoRollStore],
    ),
    getSelection: useCallback(() => pianoRollStore.selection, [pianoRollStore]),
    getSelectedTrack: useCallback(
      () => pianoRollStore.selectedTrack,
      [pianoRollStore],
    ),
    getSelectedNoteIds: useCallback(
      () => pianoRollStore.selectedNoteIds,
      [pianoRollStore],
    ),
    setLastNoteDuration: useCallback(
      (duration: number | null) => (pianoRollStore.lastNoteDuration = duration),
      [pianoRollStore],
    ),
    toggleTool: useCallback(
      () =>
        (pianoRollStore.mouseMode =
          pianoRollStore.mouseMode === "pencil" ? "selection" : "pencil"),
      [pianoRollStore],
    ),
    setNewNoteVelocity: useCallback(
      (velocity: number) => (pianoRollStore.newNoteVelocity = velocity),
      [pianoRollStore],
    ),
    setInstrumentBrowserSetting: useCallback(
      (setting: InstrumentSetting) =>
        (pianoRollStore.instrumentBrowserSetting = setting),
      [pianoRollStore],
    ),
    setOpenInstrumentBrowser: useCallback(
      (open: boolean) => (pianoRollStore.openInstrumentBrowser = open),
      [pianoRollStore],
    ),
    setActivePane: useCallback(
      (pane: "notes" | "control" | null) => (pianoRollStore.activePane = pane),
      [pianoRollStore],
    ),
    serializeState: useCallback(
      () => pianoRollStore.serialize(),
      [pianoRollStore],
    ),
    restoreState: useCallback(
      (state: SerializedPianoRollStore) => pianoRollStore.restore(state),
      [pianoRollStore],
    ),
  }
}

export function usePianoRollTickScroll() {
  const { tickScrollStore } = useContext(PianoRollStoreContext)
  return useTickScroll(tickScrollStore)
}

export function usePianoRollQuantizer() {
  const { quantizerStore } = useContext(PianoRollStoreContext)
  return useQuantizer(quantizerStore)
}

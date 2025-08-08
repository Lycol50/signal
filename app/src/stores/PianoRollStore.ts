import { Player } from "@signal-app/player"
import { cloneDeep } from "lodash"
import { computed, makeObservable, observable, reaction } from "mobx"
import { InstrumentSetting } from "../components/InstrumentBrowser/InstrumentBrowser"
import { Range } from "../entities/geometry/Range"
import { Rect } from "../entities/geometry/Rect"
import { Measure } from "../entities/measure/Measure"
import { KeySignature } from "../entities/scale/KeySignature"
import { Selection } from "../entities/selection/Selection"
import { NoteCoordTransform } from "../entities/transform/NoteCoordTransform"
import { isEventOverlapRange } from "../helpers/filterEvents"
import Track, {
  NoteEvent,
  TrackEvent,
  TrackId,
  UNASSIGNED_TRACK_ID,
  isNoteEvent,
} from "../track"
import { KeyScrollStore } from "./KeyScrollStore"
import QuantizerStore from "./QuantizerStore"
import { RulerStore } from "./RulerStore"
import { SongStore } from "./SongStore"
import { TickScrollStore } from "./TickScrollStore"

export type PianoRollMouseMode = "pencil" | "selection"

export type PianoNoteItem = Rect & {
  id: number
  velocity: number
  noteNumber: number
  isSelected: boolean
}

export type PianoRollDraggable =
  | {
      type: "selection"
      position: "center" | "left" | "right"
    }
  | {
      type: "note"
      position: "center" | "left" | "right"
      noteId: number
    }

export type DraggableArea = {
  tickRange?: Range
  noteNumberRange?: Range
}

export type SerializedPianoRollStore = Pick<
  PianoRollStore,
  "selection" | "selectedNoteIds" | "selectedTrackId"
>

export default class PianoRollStore {
  readonly rulerStore: RulerStore
  readonly tickScrollStore: TickScrollStore
  readonly keyScrollStore: KeyScrollStore
  readonly quantizerStore: QuantizerStore

  notesCursor = "auto"
  mouseMode: PianoRollMouseMode = "pencil"
  selectedTrackId: TrackId = UNASSIGNED_TRACK_ID
  selection: Selection | null = null
  selectedNoteIds: number[] = []
  lastNoteDuration: number | null = null
  openInstrumentBrowser = false
  instrumentBrowserSetting: InstrumentSetting = {
    isRhythmTrack: false,
    programNumber: 0,
  }
  notGhostTrackIds: ReadonlySet<TrackId> = new Set()
  showTrackList = false
  showEventList = false
  openTransposeDialog = false
  openVelocityDialog = false
  newNoteVelocity = 100
  keySignature: KeySignature | null = null
  previewingNoteNumbers: ReadonlySet<number> = new Set()

  constructor(
    private readonly songStore: SongStore,
    private readonly player: Player,
  ) {
    this.tickScrollStore = new TickScrollStore(
      this.songStore,
      this.player,
      0.15,
      15,
    )
    this.keyScrollStore = new KeyScrollStore()
    this.rulerStore = new RulerStore(this.tickScrollStore, this.songStore)
    this.quantizerStore = new QuantizerStore(this.songStore, 8)

    makeObservable(this, {
      notesCursor: observable,
      mouseMode: observable,
      selectedTrackId: observable,
      selection: observable.shallow,
      selectedNoteIds: observable,
      lastNoteDuration: observable,
      openInstrumentBrowser: observable,
      instrumentBrowserSetting: observable,
      notGhostTrackIds: observable,
      showTrackList: observable,
      showEventList: observable,
      openTransposeDialog: observable,
      openVelocityDialog: observable,
      newNoteVelocity: observable,
      keySignature: observable,
      previewingNoteNumbers: observable.ref,
      transform: computed,
      windowedEvents: computed,
      allNoteBounds: computed,
      notes: computed,
      selectedTrackIndex: computed,
      ghostTrackIds: computed,
      selectionBounds: computed,
      currentVolume: computed,
      currentPan: computed,
      currentMBTTime: computed,
      controlCursor: computed,
      selectedTrack: computed,
    })
  }

  setUpAutorun() {
    this.tickScrollStore.setUpAutoScroll()

    // reset selection when change track or mouse mode
    reaction(
      () => ({
        selectedTrackId: this.selectedTrackId,
        mouseMode: this.mouseMode,
      }),
      () => {
        this.selection = null
        this.selectedNoteIds = []
      },
    )
  }

  serialize = (): SerializedPianoRollStore => {
    return {
      selection: this.selection ? { ...this.selection } : null,
      selectedNoteIds: cloneDeep(this.selectedNoteIds),
      selectedTrackId: this.selectedTrackId,
    }
  }

  restore = (serialized: SerializedPianoRollStore) => {
    this.selection = serialized.selection
    this.selectedNoteIds = serialized.selectedNoteIds
    this.selectedTrackId = serialized.selectedTrackId
  }

  get selectedTrackIndex(): number {
    return this.songStore.song.tracks.findIndex(
      (t) => t.id === this.selectedTrackId,
    )
  }

  get selectedTrack(): Track | undefined {
    return this.songStore.song.getTrack(this.selectedTrackId)
  }

  get transform(): NoteCoordTransform {
    return new NoteCoordTransform(
      this.tickScrollStore.transform,
      this.keyScrollStore.transform,
    )
  }

  get windowedEvents(): TrackEvent[] {
    const { transform, selectedTrack: track } = this
    const { canvasWidth, scrollLeft } = this.tickScrollStore

    if (track === undefined) {
      return []
    }

    return track.events.filter(
      isEventOverlapRange(
        Range.fromLength(
          transform.getTick(scrollLeft),
          transform.getTick(canvasWidth),
        ),
      ),
    )
  }

  get allNoteBounds(): { bounds: Rect; note: NoteEvent }[] {
    const { transform, selectedTrack: track } = this
    if (track === undefined) {
      return []
    }
    const noteEvents = track.events.filter(isNoteEvent)
    const getRect = track.isRhythmTrack
      ? (e: NoteEvent) => transform.getDrumRect(e)
      : (e: NoteEvent) => transform.getRect(e)

    return noteEvents.map((e) => {
      const bounds = getRect(e)
      return {
        bounds,
        note: e,
      }
    })
  }

  get notes(): PianoNoteItem[] {
    const { allNoteBounds, selectedNoteIds } = this
    const { canvasWidth, scrollLeft } = this.tickScrollStore

    const range = Range.fromLength(scrollLeft, canvasWidth)
    return allNoteBounds
      .filter((n) =>
        Range.intersects(Range.fromLength(n.bounds.x, n.bounds.width), range),
      )
      .map((n) => {
        const isSelected = selectedNoteIds.includes(n.note.id)
        return {
          ...n.bounds,
          id: n.note.id,
          velocity: n.note.velocity,
          noteNumber: n.note.noteNumber,
          isSelected,
        }
      })
  }

  get ghostTrackIds(): TrackId[] {
    const song = this.songStore.song
    const { notGhostTrackIds, selectedTrackId } = this
    return song.tracks
      .filter(
        (track) =>
          track.id !== selectedTrackId && !notGhostTrackIds.has(track.id),
      )
      .map((track) => track.id)
  }

  get selectionBounds(): Rect | null {
    if (this.selection !== null) {
      return Selection.getBounds(this.selection, this.transform)
    }
    return null
  }

  get currentVolume(): number | undefined {
    return this.selectedTrack?.getVolume(this.player.position)
  }

  get currentPan(): number | undefined {
    return this.selectedTrack?.getPan(this.player.position)
  }

  get currentMBTTime(): string {
    return Measure.getMBTString(
      this.songStore.song.measures,
      this.player.position,
      this.songStore.song.timebase,
    )
  }

  get controlCursor(): string {
    return this.mouseMode === "pencil"
      ? `url("./cursor-pencil.svg") 0 20, pointer`
      : "auto"
  }
}

import { cloneDeep } from "lodash"
import { MIDIControlEvents } from "midifile-ts"
import { makeObservable, observable } from "mobx"
import { makePersistable } from "mobx-persist-store"
import { ValueEventType } from "../entities/event/ValueEventType"
import { ControlSelection } from "../entities/selection/ControlSelection"

export type ControlMode = { type: "velocity" } | ValueEventType

export const controlModeKey = (controlMode: ControlMode) => {
  switch (controlMode.type) {
    case "velocity":
      return "velocity"
    case "pitchBend":
      return "pitchBend"
    case "controller":
      return `controller-${controlMode.controllerType}`
  }
}

export const isEqualControlMode = (a: ControlMode, b: ControlMode) => {
  switch (a.type) {
    case "velocity":
    case "pitchBend":
      return a.type === b.type
    case "controller":
      switch (b.type) {
        case "velocity":
        case "pitchBend":
          return false
        case "controller":
          return ValueEventType.equals(a, b)
      }
  }
}

export type SerializedControlStore = Pick<
  ControlStore,
  "controlModes" | "selection" | "selectedEventIds"
>

export const defaultControlModes: ControlMode[] = [
  {
    type: "velocity",
  },
  {
    type: "pitchBend",
  },
  {
    type: "controller",
    controllerType: MIDIControlEvents.MSB_MAIN_VOLUME,
  },
  {
    type: "controller",
    controllerType: MIDIControlEvents.MSB_PAN,
  },
  {
    type: "controller",
    controllerType: MIDIControlEvents.MSB_EXPRESSION,
  },
  {
    type: "controller",
    controllerType: MIDIControlEvents.SUSTAIN,
  },
  {
    type: "controller",
    controllerType: MIDIControlEvents.MSB_MODWHEEL,
  },
]

export class ControlStore {
  controlMode: ControlMode = { type: "velocity" }
  selection: ControlSelection | null = null
  selectedEventIds: number[] = []

  controlModes: ControlMode[] = defaultControlModes

  constructor() {
    makeObservable(this, {
      controlMode: observable.ref,
      selection: observable,
      selectedEventIds: observable,
      controlModes: observable.shallow,
    })

    makePersistable(this, {
      name: "ControlStore",
      properties: ["controlModes"],
      storage: window.localStorage,
    })
  }

  serialize = (): SerializedControlStore => {
    return cloneDeep({
      controlModes: this.controlModes,
      selection: this.selection,
      selectedEventIds: this.selectedEventIds,
    })
  }

  restore = (serialized: SerializedControlStore) => {
    this.controlModes = serialized.controlModes
    this.selection = serialized.selection
    this.selectedEventIds = serialized.selectedEventIds
  }
}

import { SendableEvent } from "@signal-app/player"
import { useCallback } from "react"
import { useMobxGetter } from "./useMobxSelector"
import { useStores } from "./useStores"

export function usePlayer() {
  const { player } = useStores()

  return {
    get position() {
      return useMobxGetter(player, "position")
    },
    get isPlaying() {
      return useMobxGetter(player, "isPlaying")
    },
    get loop() {
      return useMobxGetter(player, "loop")
    },
    setPosition: useCallback(
      (position: number) => (player.position = position),
      [player],
    ),
    playOrPause: useCallback(() => player.playOrPause(), [player]),
    play: useCallback(() => player.play(), [player]),
    stop: useCallback(() => player.stop(), [player]),
    reset: useCallback(() => player.reset(), [player]),
    sendEvent: useCallback(
      (e: SendableEvent, delayTime?: number) => player.sendEvent(e, delayTime),
      [player],
    ),
    toggleEnableLoop: useCallback(() => player.toggleEnableLoop(), [player]),
    setLoopBegin: useCallback(
      (tick: number) => player.setLoopBegin(tick),
      [player],
    ),
    setLoopEnd: useCallback(
      (tick: number) => player.setLoopEnd(tick),
      [player],
    ),
    setCurrentTempo: useCallback(
      (tempo: number) => (player.currentTempo = tempo),
      [player],
    ),
    allSoundsOffChannel: useCallback(
      (channel: number) => player.allSoundsOffChannel(channel),
      [player],
    ),
    allSoundsOffExclude: useCallback(
      (channel: number) => player.allSoundsOffExclude(channel),
      [player],
    ),
  }
}

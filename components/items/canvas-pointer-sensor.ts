import { PointerSensor } from "@dnd-kit/core";

export class CanvasPointerSensor extends PointerSensor {
  static activators = [{
    eventName: "onPointerDown" as const,
    handler: ({ nativeEvent }: { nativeEvent: PointerEvent }) => {
      const target = nativeEvent.target;
      if (!(target instanceof Element)) return false;
      return !target.closest("button, a, input, textarea, select, [contenteditable='true'], [data-no-dnd]");
    },
  }];
}

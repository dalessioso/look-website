export type DemoState = {
  mode: 'browser-demo';
  arm: 'idle' | 'awaiting confirmation' | 'grabbing' | 'delivered';
  selected: string | null;
  animation_id: string | null;
  events: { id: number; kind: string; message: string }[];
};
export function createDemoController(): {
  readState(): DemoState;
  performAction(action: string, payload?: Record<string, unknown>): DemoState;
};

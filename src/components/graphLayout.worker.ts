/// <reference lib="webworker" />
import { places, type LayoutReply, type LayoutRequest } from "./graphLayout";

// The layout of a large graph off the main thread (FTR.NAB.MEM-0001 R24, tech §12.1): the page keeps scrolling
// while 150 nodes settle.
self.onmessage = (e: MessageEvent<LayoutRequest>) => {
  const { id, nodes, edges, seed } = e.data;
  const reply: LayoutReply = { id, places: places(nodes, edges, seed) };
  self.postMessage(reply);
};

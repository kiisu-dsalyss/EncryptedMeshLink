/**
 * Handle Echo Message Function
 * Handles echo messages by sending instructions instead
 */

import type { MeshDevice } from "@meshtastic/core";
import { NodeInfo } from './types';
import { sendInstructions } from './sendInstructions';

export async function handleEchoMessage(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  packet: any
): Promise<void> {
  // Send instructions instead of echo
  await sendInstructions(device, knownNodes, packet);
}

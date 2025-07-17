import { getDeliverySystemState } from './startDeliverySystem';

/**
 * Stop the delayed delivery system
 * Halts periodic processing but keeps queued messages
 */
export function stopDeliverySystem(): boolean {
  const deliverySystem = getDeliverySystemState();
  
  if (!deliverySystem?.isRunning) {
    console.warn("⚠️ Delayed delivery system is not running");
    return false;
  }

  if (deliverySystem.intervalId) {
    clearInterval(deliverySystem.intervalId);
    deliverySystem.intervalId = undefined;
  }

  deliverySystem.isRunning = false;
  
  console.log("🛑 Delayed delivery system stopped");
  return true;
}
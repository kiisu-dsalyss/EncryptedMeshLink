/**
 * Stop Delivery System Function
 * Stop the delayed message delivery system
 */

export function stopDeliverySystem(deliveryTimer: NodeJS.Timeout): void {
  console.log('🛑 Stopping delayed message delivery system...');
  
  if (deliveryTimer) {
    clearInterval(deliveryTimer);
  }

  console.log('✅ Delayed delivery stopped');
}

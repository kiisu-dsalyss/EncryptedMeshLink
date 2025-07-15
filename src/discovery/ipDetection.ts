/**
 * IP Detection Function
 * Handles detecting public IP address
 */

export async function getPublicIP(): Promise<string> {
  try {
    // Try multiple IP detection services
    const services = [
      'https://api.ipify.org?format=json',
      'https://ipinfo.io/json',
      'https://httpbin.org/ip'
    ];

    for (const service of services) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(service, { 
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        const data = await response.json() as any;
        
        // Handle different response formats
        const ip = data.ip || data.origin || data.query;
        if (ip && isValidIP(ip)) {
          return ip;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to get IP from ${service}:`, error);
        continue;
      }
    }
    
    throw new Error('All IP detection services failed');
  } catch (error) {
    console.warn(`⚠️ Could not determine public IP, using localhost`);
    return '127.0.0.1';
  }
}

export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

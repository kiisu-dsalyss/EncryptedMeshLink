/**
 * IP Detection Function
 * Handles detecting public IP address
 */

export async function getPublicIP(): Promise<string> {
  // Check for local testing mode
  if (process.env.EML_LOCAL_TESTING === 'true' || process.env.NODE_ENV === 'test') {
    console.log('🏠 Local testing mode: using 127.0.0.1');
    return '127.0.0.1';
  }

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
        }        } catch (error) {
          // Failed to get IP from this service, try next
          continue;
        }
    }
    
    throw new Error('All IP detection services failed');    } catch (error) {
      // All services failed, use localhost as fallback
      return '127.0.0.1';
    }
}

export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

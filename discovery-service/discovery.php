<?php
/**
 * EncryptedMeshLink Discovery Service
 * MIB-001: Encrypted Discovery Service (PHP)
 * 
 * Single-file PHP service for Dreamhost shared hosting
 * Stores encrypted station contact information for P2P discovery
 * 
 * API Endpoints:
 * POST /discovery.php - Register station
 * GET /discovery.php?peers=true - Get active peers
 * DELETE /discovery.php?station_id=X - Unregister
 * GET /discovery.php?health=true - Health check
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

class DiscoveryService {
    private $db;
    private const DB_FILE = 'encryptedmeshlink_discovery.db';
    private const STALE_TIMEOUT = 300; // 5 minutes
    private const MAX_STATIONS = 1000;
    private const RATE_LIMIT_WINDOW = 60; // 1 minute
    private const RATE_LIMIT_REQUESTS = 30;

    public function __construct() {
        $this->initDatabase();
        $this->cleanupStaleEntries();
    }

    private function initDatabase() {
        try {
            $this->db = new SQLite3(self::DB_FILE);
            $this->db->exec('PRAGMA journal_mode=WAL;');
            $this->db->exec('PRAGMA synchronous=NORMAL;');
            
            // Create stations table
            $this->db->exec('
                CREATE TABLE IF NOT EXISTS stations (
                    station_id TEXT PRIMARY KEY,
                    encrypted_contact_info TEXT NOT NULL,
                    public_key TEXT NOT NULL,
                    last_seen INTEGER NOT NULL,
                    created_at INTEGER NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT
                )
            ');

            // Create rate limiting table
            $this->db->exec('
                CREATE TABLE IF NOT EXISTS rate_limits (
                    ip_address TEXT PRIMARY KEY,
                    request_count INTEGER NOT NULL,
                    window_start INTEGER NOT NULL
                )
            ');

            // Create indexes for performance
            $this->db->exec('CREATE INDEX IF NOT EXISTS idx_last_seen ON stations(last_seen)');
            $this->db->exec('CREATE INDEX IF NOT EXISTS idx_created_at ON stations(created_at)');
            
        } catch (Exception $e) {
            $this->errorResponse('Database initialization failed', 500);
        }
    }

    private function checkRateLimit($ip) {
        $now = time();
        
        // Get current rate limit data
        $stmt = $this->db->prepare('SELECT request_count, window_start FROM rate_limits WHERE ip_address = ?');
        $stmt->bindValue(1, $ip, SQLITE3_TEXT);
        $result = $stmt->execute();
        $row = $result->fetchArray(SQLITE3_ASSOC);

        if ($row) {
            // Check if we're in a new window
            if ($now - $row['window_start'] > self::RATE_LIMIT_WINDOW) {
                // New window, reset counter
                $stmt = $this->db->prepare('UPDATE rate_limits SET request_count = 1, window_start = ? WHERE ip_address = ?');
                $stmt->bindValue(1, $now, SQLITE3_INTEGER);
                $stmt->bindValue(2, $ip, SQLITE3_TEXT);
                $stmt->execute();
            } else {
                // Same window, check limit
                if ($row['request_count'] >= self::RATE_LIMIT_REQUESTS) {
                    $this->errorResponse('Rate limit exceeded', 429);
                }
                
                // Increment counter
                $stmt = $this->db->prepare('UPDATE rate_limits SET request_count = request_count + 1 WHERE ip_address = ?');
                $stmt->bindValue(1, $ip, SQLITE3_TEXT);
                $stmt->execute();
            }
        } else {
            // First request from this IP
            $stmt = $this->db->prepare('INSERT INTO rate_limits (ip_address, request_count, window_start) VALUES (?, 1, ?)');
            $stmt->bindValue(1, $ip, SQLITE3_TEXT);
            $stmt->bindValue(2, $now, SQLITE3_INTEGER);
            $stmt->execute();
        }
    }

    private function cleanupStaleEntries() {
        $cutoff = time() - self::STALE_TIMEOUT;
        
        // Remove stale stations
        $stmt = $this->db->prepare('DELETE FROM stations WHERE last_seen < ?');
        $stmt->bindValue(1, $cutoff, SQLITE3_INTEGER);
        $stmt->execute();
        
        // Clean up old rate limit entries
        $rateLimitCutoff = time() - self::RATE_LIMIT_WINDOW;
        $stmt = $this->db->prepare('DELETE FROM rate_limits WHERE window_start < ?');
        $stmt->bindValue(1, $rateLimitCutoff, SQLITE3_INTEGER);
        $stmt->execute();
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $ip = $this->getClientIP();
        
        // Apply rate limiting
        $this->checkRateLimit($ip);

        switch ($method) {
            case 'POST':
                $this->registerStation($ip);
                break;
            case 'GET':
                if (isset($_GET['peers'])) {
                    $this->getPeers();
                } elseif (isset($_GET['health'])) {
                    $this->healthCheck();
                } else {
                    $this->errorResponse('Invalid GET request', 400);
                }
                break;
            case 'DELETE':
                if (isset($_GET['station_id'])) {
                    $this->unregisterStation($_GET['station_id']);
                } else {
                    $this->errorResponse('Missing station_id parameter', 400);
                }
                break;
            default:
                $this->errorResponse('Method not allowed', 405);
        }
    }

    private function registerStation($ip) {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['station_id']) || !isset($input['encrypted_contact_info']) || !isset($input['public_key'])) {
            $this->errorResponse('Missing required fields', 400);
        }

        $stationId = $input['station_id'];
        $encryptedContactInfo = $input['encrypted_contact_info'];
        $publicKey = $input['public_key'];

        // Validate station ID format (3-20 alphanumeric + dash)
        if (!preg_match('/^[a-zA-Z0-9-]{3,20}$/', $stationId)) {
            $this->errorResponse('Invalid station_id format', 400);
        }

        // Validate public key format (basic PEM check)
        if (!str_contains($publicKey, '-----BEGIN PUBLIC KEY-----') || !str_contains($publicKey, '-----END PUBLIC KEY-----')) {
            $this->errorResponse('Invalid public_key format', 400);
        }

        // Check station count limit
        $count = $this->db->querySingle('SELECT COUNT(*) FROM stations');
        if ($count >= self::MAX_STATIONS) {
            $this->errorResponse('Station limit reached', 503);
        }

        $now = time();
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';

        try {
            // Insert or update station
            $stmt = $this->db->prepare('
                INSERT OR REPLACE INTO stations 
                (station_id, encrypted_contact_info, public_key, last_seen, created_at, ip_address, user_agent) 
                VALUES (?, ?, ?, ?, 
                    COALESCE((SELECT created_at FROM stations WHERE station_id = ?), ?),
                    ?, ?)
            ');
            
            $stmt->bindValue(1, $stationId, SQLITE3_TEXT);
            $stmt->bindValue(2, $encryptedContactInfo, SQLITE3_TEXT);
            $stmt->bindValue(3, $publicKey, SQLITE3_TEXT);
            $stmt->bindValue(4, $now, SQLITE3_INTEGER);
            $stmt->bindValue(5, $stationId, SQLITE3_TEXT);
            $stmt->bindValue(6, $now, SQLITE3_INTEGER);
            $stmt->bindValue(7, $ip, SQLITE3_TEXT);
            $stmt->bindValue(8, $userAgent, SQLITE3_TEXT);
            
            $result = $stmt->execute();
            
            if ($result) {
                $this->successResponse(['message' => 'Station registered successfully']);
            } else {
                $this->errorResponse('Registration failed', 500);
            }
        } catch (Exception $e) {
            $this->errorResponse('Database error during registration', 500);
        }
    }

    private function getPeers() {
        try {
            $stmt = $this->db->prepare('
                SELECT station_id, encrypted_contact_info, public_key, last_seen 
                FROM stations 
                ORDER BY last_seen DESC
            ');
            
            $result = $stmt->execute();
            $peers = [];
            
            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                $peers[] = [
                    'station_id' => $row['station_id'],
                    'encrypted_contact_info' => $row['encrypted_contact_info'],
                    'public_key' => $row['public_key'],
                    'last_seen' => (int)$row['last_seen']
                ];
            }
            
            $this->successResponse([
                'peers' => $peers,
                'count' => count($peers),
                'timestamp' => time()
            ]);
        } catch (Exception $e) {
            $this->errorResponse('Failed to retrieve peers', 500);
        }
    }

    private function unregisterStation($stationId) {
        if (!preg_match('/^[a-zA-Z0-9-]{3,20}$/', $stationId)) {
            $this->errorResponse('Invalid station_id format', 400);
        }

        try {
            $stmt = $this->db->prepare('DELETE FROM stations WHERE station_id = ?');
            $stmt->bindValue(1, $stationId, SQLITE3_TEXT);
            $result = $stmt->execute();
            
            if ($this->db->changes() > 0) {
                $this->successResponse(['message' => 'Station unregistered successfully']);
            } else {
                $this->errorResponse('Station not found', 404);
            }
        } catch (Exception $e) {
            $this->errorResponse('Database error during unregistration', 500);
        }
    }

    private function healthCheck() {
        $stats = [
            'status' => 'healthy',
            'timestamp' => time(),
            'version' => '1.0.0',
            'uptime' => time() - filemtime(__FILE__),
            'active_stations' => $this->db->querySingle('SELECT COUNT(*) FROM stations'),
            'db_size' => filesize(self::DB_FILE),
            'php_version' => PHP_VERSION,
            'sqlite_version' => SQLite3::version()['versionString']
        ];
        
        $this->successResponse($stats);
    }

    private function getClientIP() {
        // Handle common proxy headers
        $headers = [
            'HTTP_CF_CONNECTING_IP',     // Cloudflare
            'HTTP_X_FORWARDED_FOR',      // Standard proxy header
            'HTTP_X_REAL_IP',            // Nginx proxy
            'HTTP_CLIENT_IP',            // Alternative
            'REMOTE_ADDR'                // Default
        ];
        
        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ip = $_SERVER[$header];
                // Take first IP if comma-separated list
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    private function successResponse($data) {
        http_response_code(200);
        echo json_encode(['success' => true, 'data' => $data], JSON_PRETTY_PRINT);
        exit;
    }

    private function errorResponse($message, $code = 400) {
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'error' => $message,
            'timestamp' => time()
        ], JSON_PRETTY_PRINT);
        exit;
    }
}

// Initialize and handle request
try {
    $service = new DiscoveryService();
    $service->handleRequest();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'timestamp' => time()
    ]);
}
?>

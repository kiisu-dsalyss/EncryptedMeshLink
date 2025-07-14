#!/bin/bash

# EncryptedMeshLink Discovery Service API Test Script
# Tests all API endpoints for the Dreamhost-deployed discovery service

# Configuration
DISCOVERY_URL="http://localhost:8080/discovery.php"
TEST_STATION_ID="test-$(date +%H%M%S)"

echo "🧪 Testing EncryptedMeshLink Discovery Service"
echo "URL: $DISCOVERY_URL"
echo "Test Station ID: $TEST_STATION_ID"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -X POST -H "Content-Type: application/json" -d "$data" "$url")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -X DELETE "$url")
    else
        response=$(curl -s "$url")
    fi
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        echo "Response: $(echo "$response" | jq -c .)"
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "Response: $response"
    fi
    echo ""
}

# 1. Health Check
test_endpoint "Health Check" "GET" "$DISCOVERY_URL?health=true"

# 2. Register Station
REGISTER_DATA='{
    "station_id": "'$TEST_STATION_ID'",
    "encrypted_contact_info": "AES_ENCRYPTED_TEST_DATA_12345",
    "public_key": "-----BEGIN PUBLIC KEY-----\nTEST_PUBLIC_KEY_DATA\n-----END PUBLIC KEY-----"
}'

test_endpoint "Register Station" "POST" "$DISCOVERY_URL" "$REGISTER_DATA"

# 3. Get Peers
test_endpoint "Get Peers" "GET" "$DISCOVERY_URL?peers=true"

# 4. Register Another Station (to test multiple peers)
TEST_STATION_ID_2="test2-$(date +%H%M%S)"
REGISTER_DATA_2='{
    "station_id": "'$TEST_STATION_ID_2'",
    "encrypted_contact_info": "AES_ENCRYPTED_TEST_DATA_67890",
    "public_key": "-----BEGIN PUBLIC KEY-----\nTEST_PUBLIC_KEY_DATA_2\n-----END PUBLIC KEY-----"
}'

test_endpoint "Register Second Station" "POST" "$DISCOVERY_URL" "$REGISTER_DATA_2"

# 5. Get Peers Again (should show 2 stations)
test_endpoint "Get Peers (with 2 stations)" "GET" "$DISCOVERY_URL?peers=true"

# 6. Unregister First Station
test_endpoint "Unregister First Station" "DELETE" "$DISCOVERY_URL?station_id=$TEST_STATION_ID"

# 7. Get Peers After Unregister
test_endpoint "Get Peers After Unregister" "GET" "$DISCOVERY_URL?peers=true"

# 8. Unregister Second Station (cleanup)
test_endpoint "Unregister Second Station" "DELETE" "$DISCOVERY_URL?station_id=$TEST_STATION_ID_2"

# 9. Final Health Check
test_endpoint "Final Health Check" "GET" "$DISCOVERY_URL?health=true"

echo "🏁 Testing complete!"
echo ""
echo "Usage Instructions:"
echo "1. Update DISCOVERY_URL in this script with your actual domain"
echo "2. Ensure jq is installed for JSON parsing: brew install jq"
echo "3. Make executable: chmod +x test-api.sh"
echo "4. Run: ./test-api.sh"

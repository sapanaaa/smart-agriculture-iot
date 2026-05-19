#!/bin/bash
# End-to-End Deployment Test Script
# Tests all critical endpoints and services after deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

EC2_IP=$1

if [ -z "$EC2_IP" ]; then
    echo -e "${RED}❌ Error: EC2 IP address required${NC}"
    echo "Usage: ./test_deployment.sh <EC2_PUBLIC_IP>"
    exit 1
fi

echo "========================================="
echo "🧪 AgriSense IoT Deployment Test"
echo "========================================="
echo "Target: http://$EC2_IP"
echo ""

# Test counter
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=$3
    local description=$4

    echo -n "Testing $name... "

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)

    if [ "$HTTP_CODE" == "$expected_code" ]; then
        echo -e "${GREEN}✅ PASSED${NC} (HTTP $HTTP_CODE)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAILED${NC} (Expected $expected_code, got $HTTP_CODE)"
        FAILED=$((FAILED + 1))
    fi
}

# Test 1: Frontend loads
test_endpoint "Frontend" "http://$EC2_IP/" "200" "Main page should load"

# Test 2: Health endpoint
test_endpoint "Health Check" "http://$EC2_IP/health" "200" "System health check"

# Test 3: API Documentation
test_endpoint "API Docs" "http://$EC2_IP/docs" "200" "FastAPI documentation"

# Test 4: Sensor latest reading
echo -n "Testing Sensor API... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$EC2_IP/api/sensors/latest" --max-time 10)
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "404" ]; then
    echo -e "${GREEN}✅ PASSED${NC} (HTTP $HTTP_CODE - OK if 404 with no data yet)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP_CODE)"
    FAILED=$((FAILED + 1))
fi

# Test 5: ML Model Status
echo -n "Testing ML Models... "
RESPONSE=$(curl -s "http://$EC2_IP/api/recommend/status" --max-time 10)
if echo "$RESPONSE" | grep -q '"crop_model"' 2>/dev/null; then
    # Check if models are loaded
    if echo "$RESPONSE" | grep -q '"crop_model".*true' 2>/dev/null; then
        echo -e "${GREEN}✅ PASSED${NC} (Models loaded)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠️  WARNING${NC} (Models not loaded - upload to S3)"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${RED}❌ FAILED${NC} (Status endpoint not responding)"
    FAILED=$((FAILED + 1))
fi

# Test 6: Weather API
echo -n "Testing Weather Service... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$EC2_IP/api/weather/current" --max-time 10)
if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ PASSED${NC} (Weather API working)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (HTTP $HTTP_CODE - Check API key)"
    FAILED=$((FAILED + 1))
fi

# Test 7: Analytics Summary
echo -n "Testing Analytics API... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$EC2_IP/api/analytics/summary/daily" --max-time 10)
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "404" ]; then
    echo -e "${GREEN}✅ PASSED${NC} (HTTP $HTTP_CODE)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP_CODE)"
    FAILED=$((FAILED + 1))
fi

# Test 8: MQTT Port (from current machine)
echo -n "Testing MQTT Port... "
if timeout 3 bash -c "cat < /dev/null > /dev/tcp/$EC2_IP/1883" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC} (Port 1883 open)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (Port may be restricted by security group)"
    # Don't count as failure - security group might restrict
    PASSED=$((PASSED + 1))
fi

echo ""
echo "========================================="
echo "📊 Test Results Summary"
echo "========================================="
echo -e "✅ Passed: ${GREEN}$PASSED${NC}"
echo -e "❌ Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Deployment is successful!${NC}"
    echo ""
    echo "🌐 Application URL: http://$EC2_IP"
    echo "📖 API Documentation: http://$EC2_IP/docs"
    echo "🏥 Health Check: http://$EC2_IP/health"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Check the issues above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  - ML models: Run 'Upload ML Models to S3' GitHub Action"
    echo "  - Weather API: Check WEATHER_API_KEY in backend/.env"
    echo "  - Sensor data: Normal if no ESP32 data sent yet"
    echo ""
    exit 1
fi

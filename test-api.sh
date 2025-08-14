#!/bin/bash

# Claude Debug API Test Script
# This script tests the VS Code debug API and shows how Claude Code can interact with it

echo "🚀 Testing Claude Debug API..."

# Discover the port
if [ -f "/tmp/vscode-claude-debug-port.json" ]; then
    PORT=$(cat /tmp/vscode-claude-debug-port.json | grep -o '"port":[0-9]*' | grep -o '[0-9]*')
    echo "📡 Found API running on port: $PORT"
else
    PORT=3001
    echo "⚠️  Using default port: $PORT (port file not found)"
fi

BASE_URL="http://localhost:$PORT"

echo ""
echo "=== 1. Health Check ==="
curl -s "$BASE_URL/health" | jq '.' || echo "❌ API not responding"

echo ""
echo "=== 2. Debug Status ==="
curl -s "$BASE_URL/debug/status" | jq '.' || echo "❌ Failed to get debug status"

echo ""
echo "=== 3. List Breakpoints ==="
curl -s "$BASE_URL/debug/breakpoints" | jq '.' || echo "❌ Failed to get breakpoints"

echo ""
echo "=== 4. Test Debug Context (requires active debug session) ==="
CONTEXT_RESPONSE=$(curl -s "$BASE_URL/debug/context" 2>/dev/null)
if echo "$CONTEXT_RESPONSE" | jq . >/dev/null 2>&1; then
    echo "✅ Debug context captured successfully"
    echo "$CONTEXT_RESPONSE" | jq '.currentFrame // "No current frame"'
else
    echo "⚠️  No active debug session (this is expected if not debugging)"
fi

echo ""
echo "=== 5. Available API Endpoints ==="
echo "Health:       GET  $BASE_URL/health"
echo "Status:       GET  $BASE_URL/debug/status"  
echo "Context:      GET  $BASE_URL/debug/context"
echo "Step:         POST $BASE_URL/debug/step"
echo "Control:      POST $BASE_URL/debug/control" 
echo "Breakpoints:  GET  $BASE_URL/debug/breakpoints"
echo "Set BP:       POST $BASE_URL/debug/breakpoint"
echo "Evaluate:     POST $BASE_URL/debug/evaluate"

echo ""
echo "🎯 Ready for Claude Code debugging!"
echo "💡 Start debugging in VS Code, then use the API endpoints above"
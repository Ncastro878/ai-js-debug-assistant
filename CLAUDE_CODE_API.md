# Claude Code API for VS Code Debug Control

This document describes the HTTP API that Claude Code can use to programmatically control VS Code's debugger and analyze debugging data.

## Quick Start

1. **Install & Run Extension**: The VS Code extension starts an Express server automatically
2. **Find the Port**: Check VS Code status bar or use discovery commands below
3. **Start Debugging**: Set breakpoints and start debugging in VS Code  
4. **Control via API**: Use the curl commands below to step through and analyze code

## Port Discovery

The extension tries ports 3001-3010 and writes the active port to a file:

```bash
# Get the current port (macOS/Linux)
PORT=$(cat /tmp/vscode-claude-debug-port.json | jq -r .port)

# Health check to verify server is running
curl http://localhost:$PORT/health
```

## API Endpoints

### 1. Health & Status

#### Health Check
```bash
curl http://localhost:3001/health
```
**Response:**
```json
{
  "status": "ok",
  "port": 3001,
  "hasActiveSession": true,
  "timestamp": "2025-01-14T10:30:00.000Z"
}
```

#### Debug Status
```bash
curl http://localhost:3001/debug/status
```
**Response:**
```json
{
  "hasActiveSession": true,
  "sessionName": "Launch Program",
  "sessionType": "node",
  "breakpoints": 3,
  "timestamp": "2025-01-14T10:30:00.000Z"
}
```

### 2. Debug Context Capture

#### Get Current Debug Context
```bash
curl http://localhost:3001/debug/context
```
**Response:**
```json
{
  "timestamp": "2025-01-14T10:30:00.000Z",
  "session": {
    "name": "Launch Program",
    "type": "node"
  },
  "currentFrame": {
    "file": "/Users/user/project/src/app.js",
    "function": "processData",
    "line": 42,
    "column": 18
  },
  "stack": {
    "stackFrames": [
      {
        "id": 16,
        "name": "processData",
        "line": 42,
        "column": 18,
        "source": {
          "name": "src/app.js",
          "path": "/Users/user/project/src/app.js"
        }
      }
    ]
  },
  "scopes": {
    "scopes": [
      {
        "name": "Local",
        "variablesReference": 1
      }
    ]
  },
  "variables": {
    "variables": [
      {
        "name": "data",
        "value": "{id: 123, name: 'test'}",
        "type": "Object"
      }
    ]
  }
}
```

### 3. Debug Step Control

#### Step Over
```bash
curl -X POST http://localhost:3001/debug/step \
  -H "Content-Type: application/json" \
  -d '{"action": "over"}'
```

#### Step Into
```bash
curl -X POST http://localhost:3001/debug/step \
  -H "Content-Type: application/json" \
  -d '{"action": "into"}'
```

#### Step Out
```bash
curl -X POST http://localhost:3001/debug/step \
  -H "Content-Type: application/json" \
  -d '{"action": "out"}'
```

**Response:**
```json
{
  "success": true,
  "action": "step_over",
  "message": "Executed step over"
}
```

### 4. Debug Control

#### Continue Execution
```bash
curl -X POST http://localhost:3001/debug/control \
  -H "Content-Type: application/json" \
  -d '{"action": "continue"}'
```

#### Pause Execution
```bash
curl -X POST http://localhost:3001/debug/control \
  -H "Content-Type: application/json" \
  -d '{"action": "pause"}'
```

#### Stop Debugging
```bash
curl -X POST http://localhost:3001/debug/control \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

#### Restart Debugging
```bash
curl -X POST http://localhost:3001/debug/control \
  -H "Content-Type: application/json" \
  -d '{"action": "restart"}'
```

#### Start Debugging
```bash
curl -X POST http://localhost:3001/debug/control \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

### 5. Breakpoint Management

#### Set Breakpoint
```bash
curl -X POST http://localhost:3001/debug/breakpoint \
  -H "Content-Type: application/json" \
  -d '{
    "file": "/Users/user/project/src/app.js",
    "line": 25,
    "action": "set"
  }'
```

#### Remove Breakpoint
```bash
curl -X POST http://localhost:3001/debug/breakpoint \
  -H "Content-Type: application/json" \
  -d '{
    "file": "/Users/user/project/src/app.js", 
    "line": 25,
    "action": "remove"
  }'
```

#### List All Breakpoints
```bash
curl http://localhost:3001/debug/breakpoints
```
**Response:**
```json
{
  "breakpoints": [
    {
      "type": "source",
      "file": "/Users/user/project/src/app.js",
      "line": 25,
      "enabled": true
    }
  ],
  "count": 1
}
```

### 6. Expression Evaluation

#### Evaluate Expression
```bash
curl -X POST http://localhost:3001/debug/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "expression": "Object.keys(data)",
    "context": "watch"
  }'
```
**Response:**
```json
{
  "success": true,
  "expression": "Object.keys(data)",
  "result": "['id', 'name']",
  "type": "Array"
}
```

## Common Debugging Workflows

### Workflow 1: Basic Step-Through Analysis
```bash
# 1. Check if debugging is active
curl http://localhost:3001/debug/status

# 2. Get current context
curl http://localhost:3001/debug/context

# 3. Step over current line
curl -X POST http://localhost:3001/debug/step \
  -H "Content-Type: application/json" \
  -d '{"action": "over"}'

# 4. Get updated context
curl http://localhost:3001/debug/context
```

### Workflow 2: Set Breakpoint and Analyze
```bash
# 1. Set breakpoint at suspicious line
curl -X POST http://localhost:3001/debug/breakpoint \
  -H "Content-Type: application/json" \
  -d '{
    "file": "/path/to/file.js",
    "line": 42,
    "action": "set"
  }'

# 2. Continue execution to hit breakpoint
curl -X POST http://localhost:3001/debug/control \
  -H "Content-Type: application/json" \
  -d '{"action": "continue"}'

# 3. Analyze context at breakpoint
curl http://localhost:3001/debug/context

# 4. Evaluate specific variables
curl -X POST http://localhost:3001/debug/evaluate \
  -H "Content-Type: application/json" \
  -d '{"expression": "variableName"}'
```

### Workflow 3: Step Into Function Analysis
```bash
# 1. At function call, step into it
curl -X POST http://localhost:3001/debug/step \
  -H "Content-Type: application/json" \
  -d '{"action": "into"}'

# 2. Analyze function parameters
curl http://localhost:3001/debug/context

# 3. Step through function logic
curl -X POST http://localhost:3001/debug/step \
  -H "Content-Type: application/json" \
  -d '{"action": "over"}'

# 4. Step out when done analyzing
curl -X POST http://localhost:3001/debug/step \
  -H "Content-Type: application/json" \
  -d '{"action": "out"}'
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- **200**: Success
- **400**: Bad request (missing parameters, invalid actions)
- **500**: Server error (debug session issues, VS Code API errors)

Example error response:
```json
{
  "error": "No active debug session"
}
```

## Tools for Claude Code

As Claude Code, you can use these endpoints to:

1. **Analyze Current State**: Get variables, stack trace, and execution context
2. **Control Execution**: Step through code, continue, pause, restart
3. **Set Strategic Breakpoints**: Place breakpoints where issues might occur
4. **Evaluate Expressions**: Test hypotheses about variable values and states
5. **Navigate Call Stack**: Step into suspicious functions, step out when done

## Example Debugging Session

```bash
# Discover the port
PORT=$(cat /tmp/vscode-claude-debug-port.json | jq -r .port)

# Check status
curl http://localhost:$PORT/debug/status

# If debugging is active, get context
curl http://localhost:$PORT/debug/context > current-context.json

# Analyze the context (you'll see variables, stack, current location)

# Step through a few lines
curl -X POST http://localhost:$PORT/debug/step -H "Content-Type: application/json" -d '{"action": "over"}'
curl -X POST http://localhost:$PORT/debug/step -H "Content-Type: application/json" -d '{"action": "over"}'

# Get updated context to see what changed
curl http://localhost:$PORT/debug/context > after-steps.json

# Compare the two contexts to understand what happened
```

This API gives you full programmatic control over VS Code's debugger, allowing for AI-guided debugging sessions where you can analyze code execution in real-time and provide intelligent debugging guidance.
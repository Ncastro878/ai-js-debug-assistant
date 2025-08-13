# VS Code Claude Debug Extension

A VS Code extension that bridges your JavaScript/TypeScript debugger with AI agents like Claude Code, automatically capturing and transmitting debug context (variables, stack traces, scopes) to help with debugging.

## What This Extension Does

This extension creates a seamless connection between your VS Code debugging session and AI assistants. Instead of manually copying and pasting variables, stack traces, and debugging context to Claude Code, this extension automatically captures that information and can transmit it to external tools or AI agents.

### Key Features

- **Automatic Debug Context Capture**: When you hit a breakpoint, extract complete debugging information
- **Rich Data Collection**: Captures stack traces, local/global scopes, variable values, and execution context
- **AI Integration Ready**: Structured data output perfect for sending to Claude Code or other AI debugging assistants
- **Real-time Debug Information**: Get comprehensive context about your application state at any breakpoint

## The Problem This Solves

When debugging complex applications, you often need to:
1. Hit a breakpoint
2. Examine variables in the debugger
3. Look at the call stack
4. Copy/paste this information to an AI assistant for help
5. Go back and forth between the debugger and AI tool

This extension automates steps 2-4, giving AI assistants instant access to your complete debugging context.

## How VS Code Extensions Work

### Extension Architecture Overview

VS Code extensions run in a separate "Extension Host" process from the main VS Code window. This allows extensions to:

- Access VS Code's APIs (debugging, editor, workspace, etc.)
- Run code without blocking the main UI
- Communicate with external services
- Register commands, event handlers, and UI elements

### Key Concepts

**Extension Manifest (`package.json`)**:
- Defines extension metadata, commands, and activation events
- Specifies when the extension should load (e.g., `onDebug`, `onCommand`)
- Declares required VS Code API version

**Activation Events**:
- `"onDebug"`: Extension activates when debugging starts
- `"onCommand:your.command"`: Activates when specific command is run
- `"*"`: Activates immediately when VS Code starts

**VS Code APIs Used**:
- `vscode.debug`: Access to debugging sessions, breakpoints, and debug protocol
- `vscode.window`: UI interactions (messages, output channels)
- `vscode.commands`: Register and execute commands

## Project Structure

```
vscode-claude-debug/
├── src/
│   └── extension.ts          # Main extension code
├── out/                      # Compiled JavaScript output
├── .vscode/
│   └── launch.json          # Debug configuration for the extension itself
├── package.json             # Extension manifest and dependencies
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## How the Extension Development Process Works

### 1. Extension Generator (`yo code`)

The commands you used:
```bash
npm install -g yo generator-code
yo code
```

- **`yo`**: Yeoman - a scaffolding tool that generates project templates
- **`generator-code`**: Official VS Code extension generator
- **`yo code`**: Runs the generator to create a new VS Code extension with all the boilerplate

This creates the basic file structure, TypeScript configuration, and sample code.

### 2. Development Workflow

1. **Edit Code**: Modify `src/extension.ts` and other source files
2. **Compile**: Run `npm run compile` to transpile TypeScript to JavaScript
3. **Test**: Press `F5` to launch "Extension Development Host" - a separate VS Code window with your extension loaded
4. **Debug**: Set breakpoints in your extension code and debug like any other application

### 3. Extension Host vs Main Window

- **Main VS Code Window**: Where you write your extension code
- **Extension Development Host**: Separate VS Code instance where your extension runs for testing
- Your extension code executes in the Extension Development Host's Extension Host process

## Technical Implementation

### Debug Protocol Integration

This extension uses VS Code's Debug Adapter Protocol (DAP) to communicate with debuggers:

```typescript
// Get stack trace from active debug session
const stackResp = await session.customRequest('stackTrace', {
    threadId: 1
});

// Get variable scopes for current frame
const scopesResp = await session.customRequest('scopes', {
    frameId: stackResp.stackFrames[0].id
});

// Get actual variable values
const varsResp = await session.customRequest('variables', {
    variablesReference: scopesResp.scopes[0].variablesReference
});
```

### Data Structure

The extension captures:
- **Stack Frames**: Complete call stack with file paths, line numbers, function names
- **Scopes**: Local variables, closure variables, global scope
- **Variables**: Names, values, types, and references to nested objects
- **Source Information**: File paths, current execution position

### Output Channels

Debug information is logged to multiple places:
- **Output Channel**: Clean, organized view in VS Code's Output panel
- **Console Logs**: For debugging the extension itself
- **Popup Messages**: Quick status updates

## Current Capabilities

### What Works Now

1. **Command Registration**: "Claude Debug: Dump Context" appears in Command Palette
2. **Debug Session Detection**: Only works when actively debugging
3. **Data Extraction**: Captures complete debugging context
4. **Multi-format Output**: Logs to output channel, console, and shows status messages

### Example Output

```json
{
  "stackFrames": [
    {
      "id": 16,
      "name": "<anonymous>",
      "line": 23,
      "column": 18,
      "source": {
        "name": "src/jobs/index.js",
        "path": "/Users/user/project/src/jobs/index.js"
      }
    }
  ],
  "scopes": [
    {
      "name": "Local",
      "variablesReference": 1
    }
  ],
  "variables": [
    {
      "name": "enableJobs",
      "value": "false",
      "type": "boolean"
    }
  ]
}
```

## Future Development Roadmap

### Phase 1: AI Integration (Next Steps)

**HTTP/WebSocket Server**:
- Add Express.js server to extension
- Create REST endpoints for debug data
- Enable Claude Code to fetch debug context via HTTP requests

**Automatic Transmission**:
- Send debug data to Claude Code automatically on breakpoint hits
- Configure Claude Code endpoint in extension settings

### Phase 2: Enhanced Debugging Features

**Variable Watching**:
- Monitor specific variables across debug sessions
- Track variable changes over time
- Export variable history for AI analysis

**Smart Context Selection**:
- Filter relevant variables based on current code context
- Reduce noise by excluding system/internal variables
- Focus on user-defined variables and application state

### Phase 3: Advanced AI Integration

**Bidirectional Communication**:
- Allow Claude Code to send commands back to VS Code
- Enable AI to suggest breakpoints, variable watches
- Implement AI-suggested debugging strategies

**Code Stepping Control**:
- Potentially allow AI to control debugger stepping (step over, step into, continue)
- Enable AI to set/remove breakpoints programmatically
- Create AI-guided debugging sessions

### Phase 4: Multi-Language Support

- Extend beyond JavaScript/TypeScript to Python, Go, etc.
- Universal debug protocol bridge for any language VS Code supports

## Technical Challenges & Solutions

### Challenge 1: Extension Host Communication
**Problem**: Extension runs in separate process from main VS Code
**Solution**: Use VS Code's message passing APIs and output channels

### Challenge 2: Debug Protocol Complexity
**Problem**: DAP has many different request types and response formats
**Solution**: Focus on core requests (stackTrace, scopes, variables) that provide 80% of needed context

### Challenge 3: AI Context Size Limits
**Problem**: Debug sessions can generate massive amounts of data
**Solution**: Implement smart filtering and data summarization

### Challenge 4: Real-time Synchronization
**Problem**: Debug state changes rapidly during stepping
**Solution**: Event-driven architecture with debug session listeners

## Getting Started with Development

### Prerequisites
- Node.js 16+
- VS Code
- Basic TypeScript knowledge

### Development Commands
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes (auto-compile)
npm run watch

# Run extension in development
# Press F5 in VS Code or use "Run Extension" debug configuration
```

### Testing Your Changes
1. Make code changes in `src/extension.ts`
2. Run `npm run compile`
3. Press `F5` to launch Extension Development Host
4. Open a JavaScript/TypeScript project in the Extension Development Host
5. Set breakpoints and start debugging
6. Run "Claude Debug: Dump Context" command while at a breakpoint

### Debugging the Extension Itself
- Set breakpoints in your extension code
- Use VS Code's built-in debugger to step through extension logic
- Check "Extension Host" logs in main VS Code window

## Architecture for AI Integration

### Proposed Claude Code Integration

```
┌─────────────────┐    HTTP/WebSocket    ┌─────────────────┐
│   VS Code       │◄───────────────────►│   Claude Code   │
│   Debug Session │                      │   Terminal      │
└─────────────────┘                      └─────────────────┘
         │                                        │
         │ Debug Events                           │ AI Analysis
         ▼                                        ▼
┌─────────────────┐                      ┌─────────────────┐
│ Claude Debug    │                      │ Debug Context   │
│ Extension       │                      │ Processing      │
│                 │                      │                 │
│ • Capture Data  │                      │ • Analyze State │
│ • Format JSON   │                      │ • Suggest Fixes │
│ • Send to AI    │                      │ • Guide Debug   │
└─────────────────┘                      └─────────────────┘
```

### Data Flow
1. Developer hits breakpoint in VS Code
2. Extension captures debug context automatically
3. Context sent to Claude Code via HTTP/WebSocket
4. Claude Code analyzes the data and provides debugging insights
5. Developer receives AI assistance without manual copy/paste

## Contributing

This is currently a personal project for bridging VS Code debugging with AI assistance. Future contributions could include:

- Additional debugger protocol support
- Better data filtering and context selection
- Integration with other AI tools beyond Claude Code
- Performance optimizations for large codebases

## License

MIT License - Feel free to use and modify for your own debugging workflow.

---

**Note**: This extension is in active development. Current version provides debug context capture and logging. AI integration features are planned for future releases.

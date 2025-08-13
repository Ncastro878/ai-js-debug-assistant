/**
 * VS Code Claude Debug Extension
 * 
 * This extension bridges VS Code's JavaScript/TypeScript debugger with AI agents like Claude Code.
 * It automatically captures debugging context (variables, stack traces, scopes) when you hit
 * breakpoints and can transmit this data to external AI tools for analysis.
 * 
 * Key Features:
 * - Captures complete debug context at breakpoints
 * - Extracts stack traces, variable scopes, and values
 * - Outputs structured JSON data perfect for AI consumption
 * - Ready for integration with Claude Code and other AI debugging assistants
 */

// Import the VS Code extensibility API
// This gives us access to all VS Code functionality like debugging, UI, commands, etc.
import * as vscode from 'vscode';

/**
 * Extension Activation Function
 * 
 * This function is called by VS Code when the extension is activated.
 * Activation happens based on the "activationEvents" defined in package.json.
 * 
 * Current activation events:
 * - "onCommand:claudeDebug.dumpContext" - when our command is run
 * - "onDebug" - when any debugging session starts
 * - "*" - immediately when VS Code starts
 * 
 * @param context - Extension context provided by VS Code, contains subscriptions and other extension lifecycle info
 */
export function activate(context: vscode.ExtensionContext) {
    // Log activation for debugging purposes
    // Using both console.log and console.error to ensure visibility in different log outputs
    console.log('Claude Debugger Extension Activated!');
    console.error('Claude Debugger Extension Activated! (using error log for visibility)');
    
    // Create a dedicated output channel for our extension's logs
    // This appears in VS Code's Output panel and provides a clean view of our debug data
    const outputChannel = vscode.window.createOutputChannel('Claude Debug');

    // Set up debug session event listeners
    // These allow us to monitor debugging activity and potentially auto-capture context
    
    // Fires when a debug session starts (user presses F5, starts debugging, etc.)
    vscode.debug.onDidStartDebugSession(session => {
        console.log(`Debug session started: ${session.name}`);
        // TODO: Could auto-capture initial context here or set up breakpoint listeners
    });

    // Fires when a debug session stops (user stops debugging, app finishes, etc.)
    vscode.debug.onDidTerminateDebugSession(session => {
        console.log(`Debug session ended: ${session.name}`);
        // TODO: Could clean up any stored debug data or send final summary to AI
    });

    // Fires on custom debug events (breakpoints hit, exceptions thrown, stepping, etc.)
    // This is where we could automatically capture context when breakpoints are hit
    vscode.debug.onDidReceiveDebugSessionCustomEvent(event => {
        console.log(`Custom debug event: ${event.event}`);
        // TODO: Auto-capture context on 'stopped' events (breakpoints, exceptions)
        // if (event.event === 'stopped') {
        //     captureDebugContext();
        // }
    });

    /**
     * Register the main command: "Claude Debug: Dump Context"
     * 
     * This command appears in VS Code's Command Palette (Cmd+Shift+P) and can be run
     * manually when you're at a breakpoint to capture complete debug context.
     * 
     * The command ID 'claudeDebug.dumpContext' must match what's defined in package.json
     * under contributes.commands[].command
     */
    let disposable = vscode.commands.registerCommand('claudeDebug.dumpContext', async () => {
        // Get the currently active debug session
        // This will be null if no debugging is happening
        const session = vscode.debug.activeDebugSession;
        if (!session) {
            vscode.window.showWarningMessage("No active debug session");
            return;
        }

        try {
            // STEP 1: Get Stack Trace
            // This uses VS Code's Debug Adapter Protocol (DAP) to request the current call stack
            // threadId: 1 is typically the main thread for single-threaded languages like JavaScript
            const stackResp = await session.customRequest('stackTrace', {
                threadId: 1 // Usually 1 for single-threaded languages like JavaScript/TypeScript
            });

            // Log the stack trace to multiple outputs for maximum visibility
            console.log("=== FULL STACK TRACE ===");
            console.log(JSON.stringify(stackResp, null, 2));
            console.error("=== FULL STACK TRACE ==="); // Error logs are more visible
            console.error(JSON.stringify(stackResp, null, 2));
            
            // Also log to our dedicated output channel (cleanest view)
            outputChannel.appendLine("=== FULL STACK TRACE ===");
            outputChannel.appendLine(JSON.stringify(stackResp, null, 2));
            outputChannel.show(); // Automatically show the output channel
            
            // Show a quick status popup to the user
            vscode.window.showInformationMessage(`Stack frames: ${stackResp.stackFrames.length}`);

            // STEP 2: Get Variable Scopes for the Top Stack Frame
            // Scopes contain different categories of variables (local, global, closure, etc.)
            // We use the top frame (where execution is currently paused)
            const scopesResp = await session.customRequest('scopes', {
                frameId: stackResp.stackFrames[0].id
            });

            console.log("=== FULL SCOPES ===");
            console.log(JSON.stringify(scopesResp, null, 2));
            console.error("=== FULL SCOPES ===");
            console.error(JSON.stringify(scopesResp, null, 2));
            
            outputChannel.appendLine("=== FULL SCOPES ===");
            outputChannel.appendLine(JSON.stringify(scopesResp, null, 2));
            
            vscode.window.showInformationMessage(`Scopes: ${scopesResp.scopes.length}`);

            // STEP 3: Get Actual Variable Values from the First Scope
            // The first scope is usually "Local" variables - the most relevant for debugging
            // variablesReference is a unique ID that lets us fetch the actual variable data
            const varsResp = await session.customRequest('variables', {
                variablesReference: scopesResp.scopes[0].variablesReference
            });

            console.log("=== FULL VARIABLES ===");
            console.log(JSON.stringify(varsResp, null, 2));
            console.error("=== FULL VARIABLES ===");
            console.error(JSON.stringify(varsResp, null, 2));
            
            outputChannel.appendLine("=== FULL VARIABLES ===");
            outputChannel.appendLine(JSON.stringify(varsResp, null, 2));
            
            vscode.window.showInformationMessage(`Variables: ${varsResp.variables.length}`);

            // STEP 4: Extract and Log Key Information About Current Execution Context
            console.log("=== TOP FRAME DETAILS ===");
            console.error("=== TOP FRAME DETAILS ===");
            const topFrame = stackResp.stackFrames[0];
            console.log(`File: ${topFrame.source?.path}`);
            console.log(`Function: ${topFrame.name}`);
            console.log(`Line: ${topFrame.line}, Column: ${topFrame.column}`);
            console.error(`File: ${topFrame.source?.path}`);
            console.error(`Function: ${topFrame.name}`);
            console.error(`Line: ${topFrame.line}, Column: ${topFrame.column}`);
            
            outputChannel.appendLine("=== TOP FRAME DETAILS ===");
            outputChannel.appendLine(`File: ${topFrame.source?.path}`);
            outputChannel.appendLine(`Function: ${topFrame.name}`);
            outputChannel.appendLine(`Line: ${topFrame.line}, Column: ${topFrame.column}`);

            // 🚀 FUTURE: AI Integration Point
            // At this point you have complete debug context in structured JSON format:
            // - stackResp: Full call stack with file paths, line numbers, function names
            // - scopesResp: Available variable scopes (local, global, closure, etc.)
            // - varsResp: Actual variable names, values, and types
            // - topFrame: Current execution location details
            // 
            // This data can be sent to Claude Code via:
            // - HTTP POST request to a local server
            // - WebSocket message
            // - File system communication
            // - VS Code extension messaging API
            //
            // Example future integration:
            // await sendToClaudeCode({
            //     stack: stackResp,
            //     scopes: scopesResp, 
            //     variables: varsResp,
            //     currentFrame: topFrame,
            //     timestamp: new Date().toISOString()
            // });

        } catch (error) {
            // Handle any errors in the debug protocol communication
            console.error('Error capturing debug context:', error);
            vscode.window.showErrorMessage(`Failed to capture debug context: ${error}`);
        }
    });

    // Add the command to the extension's subscriptions
    // This ensures VS Code properly cleans up the command when the extension is deactivated
    // All event listeners and commands should be added to context.subscriptions
    context.subscriptions.push(disposable);
}

/**
 * Extension Deactivation Function
 * 
 * Called when the extension is deactivated (VS Code closes, extension disabled, etc.)
 * Use this for cleanup tasks like:
 * - Closing network connections
 * - Saving state
 * - Disposing of resources
 * 
 * Currently we don't need any cleanup, but this is where it would go.
 */
export function deactivate() {
    // No cleanup needed yet, but future versions might:
    // - Close HTTP servers
    // - Clear cached debug data
    // - Notify AI services that debugging session ended
}


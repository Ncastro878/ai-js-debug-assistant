// // The module 'vscode' contains the VS Code extensibility API
// // Import the module and reference it with the alias vscode in your code below
// import * as vscode from 'vscode';
//
// // This method is called when your extension is activated
// // Your extension is activated the very first time the command is executed
// export function activate(context: vscode.ExtensionContext) {
//
// 	// Use the console to output diagnostic information (console.log) and errors (console.error)
// 	// This line of code will only be executed once when your extension is activated
// 	console.log('Congratulations, your extension "vscode-claude-debug" is now active!');
//
// 	// The command has been defined in the package.json file
// 	// Now provide the implementation of the command with registerCommand
// 	// The commandId parameter must match the command field in package.json
// 	const disposable = vscode.commands.registerCommand('vscode-claude-debug.helloWorld', () => {
// 		// The code you place here will be executed every time your command is executed
// 		// Display a message box to the user
// 		vscode.window.showInformationMessage('Hello World from vscode-claude-debug!');
// 	});
//
// 	context.subscriptions.push(disposable);
// }
//
// // This method is called when your extension is deactivated
// export function deactivate() {}


import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Claude Debugger Extension Activated!');
    console.error('Claude Debugger Extension Activated! (using error log for visibility)');
    
    // Create output channel for our logs
    const outputChannel = vscode.window.createOutputChannel('Claude Debug');

    // Fires when a debug session starts
    vscode.debug.onDidStartDebugSession(session => {
        console.log(`Debug session started: ${session.name}`);
    });

    // Fires when a debug session stops
    vscode.debug.onDidTerminateDebugSession(session => {
        console.log(`Debug session ended: ${session.name}`);
    });

    // Fires on custom debug events (breakpoints, exceptions, etc.)
    vscode.debug.onDidReceiveDebugSessionCustomEvent(event => {
        console.log(`Custom debug event: ${event.event}`);
    });

    // Example: command to grab current stack + variables
    let disposable = vscode.commands.registerCommand('claudeDebug.dumpContext', async () => {
        const session = vscode.debug.activeDebugSession;
        if (!session) {
            vscode.window.showWarningMessage("No active debug session");
            return;
        }

        // 1. Get stack frames
        const stackResp = await session.customRequest('stackTrace', {
            threadId: 1 // Usually 1 for single-threaded languages
        });

        // Log to console AND output channel
        console.log("=== FULL STACK TRACE ===");
        console.log(JSON.stringify(stackResp, null, 2));
        console.error("=== FULL STACK TRACE ===");
        console.error(JSON.stringify(stackResp, null, 2));
        
        outputChannel.appendLine("=== FULL STACK TRACE ===");
        outputChannel.appendLine(JSON.stringify(stackResp, null, 2));
        outputChannel.show(); // Show the output channel
        
        // Show in VS Code output channel
        vscode.window.showInformationMessage(`Stack frames: ${stackResp.stackFrames.length}`);

        // 2. Get scopes for top frame
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

        // 3. Get variables for first scope
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

        // 4. Also log the top stack frame details
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

        // 🚀 At this point you could send this JSON to Claude Code via HTTP/WebSocket
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}


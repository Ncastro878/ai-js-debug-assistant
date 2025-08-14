/**
 * VS Code Claude Debug Extension with Express Server
 * 
 * This extension creates an HTTP API that Claude Code can use to programmatically control
 * VS Code's debugger and analyze debugging data in real-time.
 * 
 * Features:
 * - HTTP API for debug control (step, continue, pause, etc.)
 * - Breakpoint management via REST endpoints
 * - Real-time debug context capture and analysis
 * - Automatic port discovery and status reporting
 */

import * as vscode from 'vscode';
import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';

// Global variables for server management
let server: express.Express;
let serverInstance: any;
let currentPort: number;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Claude Debug Extension with Express Server Activated!');
    
    // Create output channel for logging
    outputChannel = vscode.window.createOutputChannel('Claude Debug API');
    
    // Start the Express server
    startExpressServer(context);
    
    // Set up debug event listeners
    setupDebugListeners();
    
    // Register manual commands (backup for HTTP API)
    registerManualCommands(context);

}

/**
 * Start Express Server for Claude Code API
 */
async function startExpressServer(context: vscode.ExtensionContext) {
    server = express();
    server.use(cors());
    server.use(express.json());
    
    // Try ports 3001-3010 until we find one available
    const PORTS = [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];
    
    for (const port of PORTS) {
        try {
            serverInstance = await new Promise((resolve, reject) => {
                const srv = server.listen(port, () => resolve(srv));
                srv.on('error', reject);
            });
            currentPort = port;
            
            // Log success
            const message = `🔥 Claude Debug API running on http://localhost:${port}`;
            console.log(message);
            outputChannel.appendLine(message);
            outputChannel.show();
            
            // Show status in VS Code
            const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
            statusItem.text = `$(debug-alt) Claude Debug API :${port}`;
            statusItem.tooltip = `Claude Debug API running on port ${port}`;
            statusItem.show();
            context.subscriptions.push(statusItem);
            
            // Write port info for Claude Code discovery
            writePortInfo(port);
            
            // Set up all the API routes
            setupAPIRoutes();
            
            break;
        } catch (error) {
            continue; // Try next port
        }
    }
    
    if (!serverInstance) {
        vscode.window.showErrorMessage('Failed to start Claude Debug API server on any port');
    }
}

/**
 * Write port info to file for Claude Code discovery
 */
function writePortInfo(port: number) {
    const portInfo = {
        port,
        pid: process.pid,
        timestamp: new Date().toISOString(),
        status: 'running'
    };
    
    try {
        // Write to temp directory for cross-platform compatibility
        const tmpDir = require('os').tmpdir();
        const portFile = path.join(tmpDir, 'vscode-claude-debug-port.json');
        fs.writeFileSync(portFile, JSON.stringify(portInfo, null, 2));
        console.log(`Port info written to: ${portFile}`);
    } catch (error) {
        console.error('Failed to write port info:', error);
    }
}

/**
 * Set up all API routes for Claude Code
 */
function setupAPIRoutes() {
    // Health check endpoint
    server.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            port: currentPort,
            hasActiveSession: !!vscode.debug.activeDebugSession,
            timestamp: new Date().toISOString()
        });
    });
    
    // Get current debug status
    server.get('/debug/status', async (req, res) => {
        try {
            const session = vscode.debug.activeDebugSession;
            res.json({
                hasActiveSession: !!session,
                sessionName: session?.name || null,
                sessionType: session?.type || null,
                breakpoints: vscode.debug.breakpoints.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });
    
    // Capture current debug context (your existing functionality)
    server.get('/debug/context', async (req, res) => {
        try {
            const context = await captureDebugContext();
            res.json(context);
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });
    
    // Debug step commands
    server.post('/debug/step', async (req, res) => {
        try {
            const { action = 'over' } = req.body;
            let command: string;
            
            switch (action) {
                case 'over':
                    command = 'workbench.action.debug.stepOver';
                    break;
                case 'into':
                    command = 'workbench.action.debug.stepInto';
                    break;
                case 'out':
                    command = 'workbench.action.debug.stepOut';
                    break;
                default:
                    return res.status(400).json({ error: 'Invalid step action. Use: over, into, out' });
            }
            
            await vscode.commands.executeCommand(command);
            
            // Wait a moment for step to complete, then capture context
            setTimeout(async () => {
                try {
                    const context = await captureDebugContext();
                    outputChannel.appendLine(`✅ Step ${action} completed`);
                } catch (err) {
                    console.error('Failed to capture context after step:', err);
                }
            }, 500);
            
            res.json({ 
                success: true, 
                action: `step_${action}`,
                message: `Executed step ${action}`
            });
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });
    
    // Debug control commands
    server.post('/debug/control', async (req, res) => {
        try {
            const { action } = req.body;
            let command: string;
            let message: string;
            
            switch (action) {
                case 'continue':
                    command = 'workbench.action.debug.continue';
                    message = 'Continued execution';
                    break;
                case 'pause':
                    command = 'workbench.action.debug.pause';
                    message = 'Paused execution';
                    break;
                case 'stop':
                    command = 'workbench.action.debug.stop';
                    message = 'Stopped debugging';
                    break;
                case 'restart':
                    command = 'workbench.action.debug.restart';
                    message = 'Restarted debugging';
                    break;
                case 'start':
                    command = 'workbench.action.debug.start';
                    message = 'Started debugging';
                    break;
                default:
                    return res.status(400).json({ error: 'Invalid action. Use: continue, pause, stop, restart, start' });
            }
            
            await vscode.commands.executeCommand(command);
            outputChannel.appendLine(`✅ ${message}`);
            
            res.json({ 
                success: true, 
                action,
                message
            });
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });
    
    // Set breakpoints
    server.post('/debug/breakpoint', async (req, res) => {
        try {
            const { file, line, action = 'set' } = req.body;
            
            if (!file || !line) {
                return res.status(400).json({ error: 'file and line are required' });
            }
            
            const uri = vscode.Uri.file(file);
            const position = new vscode.Position(line - 1, 0); // VS Code uses 0-based line numbers
            const location = new vscode.Location(uri, position);
            const breakpoint = new vscode.SourceBreakpoint(location);
            
            if (action === 'set') {
                vscode.debug.addBreakpoints([breakpoint]);
                outputChannel.appendLine(`✅ Breakpoint set at ${file}:${line}`);
                res.json({ 
                    success: true, 
                    action: 'set',
                    file, 
                    line,
                    message: `Breakpoint set at ${file}:${line}`
                });
            } else if (action === 'remove') {
                vscode.debug.removeBreakpoints([breakpoint]);
                outputChannel.appendLine(`✅ Breakpoint removed from ${file}:${line}`);
                res.json({ 
                    success: true, 
                    action: 'remove',
                    file, 
                    line,
                    message: `Breakpoint removed from ${file}:${line}`
                });
            } else {
                res.status(400).json({ error: 'Invalid action. Use: set, remove' });
            }
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });
    
    // List all breakpoints
    server.get('/debug/breakpoints', (req, res) => {
        try {
            const breakpoints = vscode.debug.breakpoints.map(bp => {
                if (bp instanceof vscode.SourceBreakpoint) {
                    return {
                        type: 'source',
                        file: bp.location.uri.fsPath,
                        line: bp.location.range.start.line + 1, // Convert back to 1-based
                        enabled: bp.enabled
                    };
                }
                return { type: 'other', enabled: bp.enabled };
            });
            
            res.json({ breakpoints, count: breakpoints.length });
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });
    
    // Evaluate expression in debug context
    server.post('/debug/evaluate', async (req, res) => {
        try {
            const { expression, context: evalContext = 'watch' } = req.body;
            
            if (!expression) {
                return res.status(400).json({ error: 'expression is required' });
            }
            
            const session = vscode.debug.activeDebugSession;
            if (!session) {
                return res.status(400).json({ error: 'No active debug session' });
            }
            
            const result = await session.customRequest('evaluate', {
                expression,
                context: evalContext
            });
            
            outputChannel.appendLine(`✅ Evaluated: ${expression} = ${result.result}`);
            res.json({ 
                success: true,
                expression,
                result: result.result,
                type: result.type
            });
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });
    
    outputChannel.appendLine('🔥 All API routes configured!');
}

/**
 * Capture complete debug context (extracted from your existing code)
 */
async function captureDebugContext() {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
        throw new Error('No active debug session');
    }
    
    // Get stack trace
    const stackResp = await session.customRequest('stackTrace', {
        threadId: 1
    });
    
    // Get scopes for top frame
    const scopesResp = await session.customRequest('scopes', {
        frameId: stackResp.stackFrames[0].id
    });
    
    // Get variables for first scope
    const varsResp = await session.customRequest('variables', {
        variablesReference: scopesResp.scopes[0].variablesReference
    });
    
    const topFrame = stackResp.stackFrames[0];
    
    const context = {
        timestamp: new Date().toISOString(),
        session: {
            name: session.name,
            type: session.type
        },
        currentFrame: {
            file: topFrame.source?.path,
            function: topFrame.name,
            line: topFrame.line,
            column: topFrame.column
        },
        stack: stackResp,
        scopes: scopesResp,
        variables: varsResp
    };
    
    // Log to output channel
    outputChannel.appendLine('📊 Debug context captured');
    outputChannel.appendLine(`📁 File: ${context.currentFrame.file}`);
    outputChannel.appendLine(`🔢 Line: ${context.currentFrame.line}`);
    outputChannel.appendLine(`📚 Variables: ${context.variables.variables.length}`);
    
    return context;
}

/**
 * Set up debug event listeners
 */
function setupDebugListeners() {
    vscode.debug.onDidStartDebugSession(session => {
        outputChannel.appendLine(`🚀 Debug session started: ${session.name}`);
    });
    
    vscode.debug.onDidTerminateDebugSession(session => {
        outputChannel.appendLine(`🛑 Debug session ended: ${session.name}`);
    });
    
    vscode.debug.onDidReceiveDebugSessionCustomEvent(event => {
        if (event.event === 'stopped') {
            outputChannel.appendLine(`⏸️  Debugger stopped: ${event.body?.reason || 'unknown'}`);
        }
    });
}

/**
 * Register manual commands (backup for HTTP API)
 */
function registerManualCommands(context: vscode.ExtensionContext) {
    const dumpCommand = vscode.commands.registerCommand('claudeDebug.dumpContext', async () => {
        try {
            const context = await captureDebugContext();
            vscode.window.showInformationMessage('Debug context captured! Check output channel.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to capture context: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    
    context.subscriptions.push(dumpCommand);
}

/**
 * Extension Deactivation Function
 */
export function deactivate() {
    if (serverInstance) {
        serverInstance.close();
        console.log('🛑 Claude Debug API server stopped');
    }
    
    // Clean up port info file
    try {
        const tmpDir = require('os').tmpdir();
        const portFile = path.join(tmpDir, 'vscode-claude-debug-port.json');
        if (fs.existsSync(portFile)) {
            fs.unlinkSync(portFile);
        }
    } catch (error) {
        console.error('Failed to clean up port file:', error);
    }
}


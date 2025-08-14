"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Global variables for server management
let server;
let serverInstance;
let currentPort;
let outputChannel;
function activate(context) {
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
async function startExpressServer(context) {
    server = (0, express_1.default)();
    server.use((0, cors_1.default)());
    server.use(express_1.default.json());
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
        }
        catch (error) {
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
function writePortInfo(port) {
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
    }
    catch (error) {
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
        }
        catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });
    // Capture current debug context (your existing functionality)
    server.get('/debug/context', async (req, res) => {
        try {
            const context = await captureDebugContext();
            res.json(context);
        }
        catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });
    // Debug step commands
    server.post('/debug/step', async (req, res) => {
        try {
            const { action = 'over' } = req.body;
            let command;
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
                }
                catch (err) {
                    console.error('Failed to capture context after step:', err);
                }
            }, 500);
            res.json({
                success: true,
                action: `step_${action}`,
                message: `Executed step ${action}`
            });
        }
        catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });
    // Debug control commands
    server.post('/debug/control', async (req, res) => {
        try {
            const { action } = req.body;
            let command;
            let message;
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
        }
        catch (error) {
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
            }
            else if (action === 'remove') {
                vscode.debug.removeBreakpoints([breakpoint]);
                outputChannel.appendLine(`✅ Breakpoint removed from ${file}:${line}`);
                res.json({
                    success: true,
                    action: 'remove',
                    file,
                    line,
                    message: `Breakpoint removed from ${file}:${line}`
                });
            }
            else {
                res.status(400).json({ error: 'Invalid action. Use: set, remove' });
            }
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
function registerManualCommands(context) {
    const dumpCommand = vscode.commands.registerCommand('claudeDebug.dumpContext', async () => {
        try {
            const context = await captureDebugContext();
            vscode.window.showInformationMessage('Debug context captured! Check output channel.');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to capture context: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    context.subscriptions.push(dumpCommand);
}
/**
 * Extension Deactivation Function
 */
function deactivate() {
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
    }
    catch (error) {
        console.error('Failed to clean up port file:', error);
    }
}
//# sourceMappingURL=extension.js.map
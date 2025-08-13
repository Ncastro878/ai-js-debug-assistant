// extension.js - VS Code Extension that listens to and controls debugger

const vscode = require('vscode');

function activate(context) {
   console.log('Debug controller extension activated');

   // 1. Listen to debug session changes
   const sessionListener = vscode.debug.onDidChangeActiveDebugSession((session) => {
       if (session) {
           console.log('Debug session started:', session.name, session.type);
           // Auto-start stepping when debug session begins
           setTimeout(() => autoStepThroughCode(), 2000);
       } else {
           console.log('Debug session ended');
       }
   });

   // 2. Listen to breakpoint changes
   const breakpointListener = vscode.debug.onDidChangeBreakpoints((e) => {
       console.log('Breakpoints added:', e.added.length);
       console.log('Breakpoints removed:', e.removed.length);
       console.log('Breakpoints changed:', e.changed.length);
   });

   // 3. Listen when debugger terminates
   const terminateListener = vscode.debug.onDidTerminateDebugSession((session) => {
       console.log('Debug session terminated:', session.name);
   });

   // 4. Track debug messages
   const trackerFactory = vscode.debug.registerDebugAdapterTrackerFactory('*', {
       createDebugAdapterTracker(session) {
           return {
               onDidSendMessage: (message) => {
                   if (message.type === 'event' && message.event === 'stopped') {
                       console.log('Debugger stopped:', message.body.reason);
                       console.log('Thread ID:', message.body.threadId);
                   }
               }
           };
       }
   });

   // 5. Commands to control debugger programmatically
   const autoStepCommand = vscode.commands.registerCommand('debugController.autoStep', autoStepThroughCode);
   const stepOnceCommand = vscode.commands.registerCommand('debugController.stepOnce', stepOnce);
   const evaluateCommand = vscode.commands.registerCommand('debugController.evaluate', evaluateExpression);

   // Add all listeners to context
   context.subscriptions.push(
       sessionListener,
       breakpointListener, 
       terminateListener,
       trackerFactory,
       autoStepCommand,
       stepOnceCommand,
       evaluateCommand
   );
}

// Automatically step through code multiple times
async function autoStepThroughCode() {
   const activeSession = vscode.debug.activeDebugSession;
   
   if (!activeSession) {
       vscode.window.showErrorMessage('No active debug session');
       return;
   }

   console.log('Starting auto-step sequence...');
   
   try {
       for (let i = 0; i < 5; i++) {
           console.log(`Step ${i + 1}`);
           
           // Wait a bit between steps
           await new Promise(resolve => setTimeout(resolve, 1500));
           
           // Step over current line
           await vscode.commands.executeCommand('workbench.action.debug.stepOver');
           
           // Optional: Evaluate variables at each step
           await evaluateCurrentScope();
       }
       
       console.log('Auto-step sequence completed');
   } catch (error) {
       console.error('Error during auto-step:', error);
   }
}

// Single step function
async function stepOnce() {
   const activeSession = vscode.debug.activeDebugSession;
   if (!activeSession) {
       vscode.window.showErrorMessage('No active debug session');
       return;
   }

   // You can change this to any debug command
   await vscode.commands.executeCommand('workbench.action.debug.stepOver');
   console.log('Executed single step');
}

// Evaluate expression in debug context
async function evaluateExpression() {
   const activeSession = vscode.debug.activeDebugSession;
   if (!activeSession) {
       vscode.window.showErrorMessage('No active debug session');
       return;
   }

   try {
       // Evaluate a variable or expression
       const response = await activeSession.customRequest('evaluate', {
           expression: 'Object.keys(this)', // Change this expression
           context: 'watch'
       });
       
       console.log('Evaluation result:', response.result);
       vscode.window.showInformationMessage(`Result: ${response.result}`);
   } catch (error) {
       console.error('Evaluation error:', error);
   }
}

// Evaluate current scope variables
async function evaluateCurrentScope() {
   const activeSession = vscode.debug.activeDebugSession;
   if (!activeSession) return;

   try {
       // Get current stack trace
       const stackTrace = await activeSession.customRequest('stackTrace', {
           threadId: 1 // Assuming thread 1, you might need to get actual thread ID
       });

       if (stackTrace.stackFrames && stackTrace.stackFrames[0]) {
           // Get variables in current scope
           const scopes = await activeSession.customRequest('scopes', {
               frameId: stackTrace.stackFrames[0].id
           });

           console.log('Current scopes:', scopes.scopes.map(s => s.name));
       }
   } catch (error) {
       console.log('Could not evaluate scope:', error.message);
   }
}

// All available debug commands you can execute:
const debugCommands = {
   // Basic stepping
   stepOver: () => vscode.commands.executeCommand('workbench.action.debug.stepOver'),
   stepInto: () => vscode.commands.executeCommand('workbench.action.debug.stepInto'), 
   stepOut: () => vscode.commands.executeCommand('workbench.action.debug.stepOut'),
   continue: () => vscode.commands.executeCommand('workbench.action.debug.continue'),
   pause: () => vscode.commands.executeCommand('workbench.action.debug.pause'),
   stop: () => vscode.commands.executeCommand('workbench.action.debug.stop'),
   restart: () => vscode.commands.executeCommand('workbench.action.debug.restart'),
   
   // Start debugging
   start: () => vscode.commands.executeCommand('workbench.action.debug.start'),
   
   // Breakpoints
   toggleBreakpoint: () => vscode.commands.executeCommand('editor.debug.action.toggleBreakpoint'),
   
   // Debug console
   focusDebugConsole: () => vscode.commands.executeCommand('workbench.debug.action.focusRepl')
};

function deactivate() {
   console.log('Debug controller extension deactivated');
}

module.exports = {
   activate,
   deactivate
};

// Package.json content you'll need:
/*
{
 "name": "debug-controller",
 "displayName": "Debug Controller",
 "description": "Listen to and control VS Code debugger",
 "version": "0.0.1",
 "engines": {
   "vscode": "^1.60.0"
 },
 "categories": ["Debuggers"],
 "activationEvents": [
   "onDebug",
   "onCommand:debugController.autoStep"
 ],
 "main": "./extension.js",
 "contributes": {
   "commands": [
     {
       "command": "debugController.autoStep",
       "title": "Auto Step Through Code"
     },
     {
       "command": "debugController.stepOnce", 
       "title": "Step Once"
     },
     {
       "command": "debugController.evaluate",
       "title": "Evaluate Expression"
     }
   ]
 }
}
*/

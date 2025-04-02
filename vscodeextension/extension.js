const vscode = require('vscode');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');

let ws = null;
let isConnected = false;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Extension "claude-vscode-mcp" activation started!');

    // Command to connect to MCP server
    let connectCommand = vscode.commands.registerCommand('claude-vscode-mcp.connect', async () => {
        try {
            const config = vscode.workspace.getConfiguration('claudeVscodeMcp');
            const serverUrl = config.get('serverUrl') || 'ws://localhost:3000';

            vscode.window.showInformationMessage(`Connecting to MCP server at ${serverUrl}...`);
            connectToServer(serverUrl);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to connect: ${error.message}`);
        }
    });

    // Command to generate code from prompt
    let generateCommand = vscode.commands.registerCommand('claude-vscode-mcp.generateCode', async () => {
        if (!isConnected) {
            const connectNow = await vscode.window.showErrorMessage(
                'Not connected to MCP server. Connect now?',
                'Yes', 'No'
            );

            if (connectNow === 'Yes') {
                vscode.commands.executeCommand('claude-vscode-mcp.connect');
                return;
            } else {
                return;
            }
        }

        const prompt = await vscode.window.showInputBox({
            placeHolder: 'Describe the web app you want to create...',
            prompt: 'Be specific about features, technologies, and design'
        });

        if (!prompt) return;

        vscode.window.showInformationMessage(`Sending prompt: ${prompt}`);

        try {
            ws.send(JSON.stringify({
                type: 'prompt',
                prompt: prompt,
                context: { simple: true }
            }));
        } catch (error) {
            vscode.window.showErrorMessage(`Error sending prompt: ${error.message}`);
        }
    });

    context.subscriptions.push(connectCommand);
    context.subscriptions.push(generateCommand);

    console.log('Extension "claude-vscode-mcp" is now active');
}

/**
 * Connect to the MCP server via WebSocket
 * @param {string} serverUrl
 */
function connectToServer(serverUrl) {
    // Close existing connection if any
    if (ws) {
        ws.close();
    }

    // Create new WebSocket connection
    ws = new WebSocket(serverUrl);

    ws.on('open', () => {
        isConnected = true;
        vscode.window.showInformationMessage('Connected to MCP server!');
    });

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            console.log('Received message type:', message.type);

            if (message.type === 'response') {
                // Validate files object
                if (!message.files || typeof message.files !== 'object') {
                    vscode.window.showErrorMessage('Invalid response: No files found');
                    console.error('Invalid files object:', message.files);
                    return;
                }

                // Filter out null or undefined files
                const validFiles = Object.entries(message.files)
                    .filter(([path, content]) => 
                        path && 
                        content !== null && 
                        content !== undefined && 
                        content !== ''
                    )
                    .reduce((acc, [path, content]) => {
                        acc[path] = content;
                        return acc;
                    }, {});

                // Check if we have any valid files
                const fileCount = Object.keys(validFiles).length;
                if (fileCount === 0) {
                    vscode.window.showErrorMessage('No valid files to create');
                    console.error('All files were null or undefined');
                    return;
                }

                // Create files
                await createProjectFiles(validFiles);
                vscode.window.showInformationMessage(`Created ${fileCount} file(s) successfully!`);
            } else if (message.type === 'error') {
                // Handle server-side errors
                vscode.window.showErrorMessage(`Server error: ${message.error}`);
            }
        } catch (error) {
            console.error('Error processing message:', error);
            vscode.window.showErrorMessage(`Error processing server message: ${error.message}`);
            
            // Log the raw data for debugging
            console.error('Raw received data:', data);
        }
    });

    ws.on('close', () => {
        isConnected = false;
        vscode.window.showInformationMessage('Disconnected from MCP server');
    });

    ws.on('error', (error) => {
        isConnected = false;
        vscode.window.showErrorMessage(`WebSocket error: ${error.message}`);
    });
}

/**
 * Create project files based on the received code
 * @param {Object} files - Object containing file paths and contents
 */
async function createProjectFiles(files) {
    // Check if a workspace folder is open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('Please open a workspace folder first');
        return;
    }

    // Get the path of the first workspace folder
    const workspacePath = workspaceFolders[0].uri.fsPath;

    // Create project files
    const createdFiles = [];
    for (const [filePath, fileContent] of Object.entries(files)) {
        try {
            // Resolve the full file path within the workspace
            const fullPath = path.join(workspacePath, filePath);

            // Ensure the directory exists
            const directory = path.dirname(fullPath);
            await fs.mkdir(directory, { recursive: true });

            // Write the file
            await fs.writeFile(fullPath, fileContent, 'utf8');

            // Track successfully created files
            createdFiles.push(filePath);

            // Show a message for each file created
            vscode.window.showInformationMessage(`Created file: ${filePath}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Error creating file ${filePath}: ${error.message}`);
        }
    }

    // Open the first created file if any
    if (createdFiles.length > 0) {
        const firstFilePath = createdFiles[0];
        const fileUri = vscode.Uri.file(path.join(workspacePath, firstFilePath));
        vscode.window.showTextDocument(fileUri);
    }
}

function deactivate() {
    if (ws) {
        ws.close();
    }
}

module.exports = {
    activate,
    deactivate
};
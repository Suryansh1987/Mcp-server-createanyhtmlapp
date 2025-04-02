// mcp-server.js
// Model Context Protocol (MCP) server for connecting Claude to VS Code

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');

// Load environment variables
dotenv.config();

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Create Express app
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data.type);
      
      // Handle different message types
      switch (data.type) {
        case 'prompt':
          await handlePrompt(ws, data);
          break;
        case 'context':
          // Store context for future requests
          storeContext(data);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Function to handle prompts
async function handlePrompt(ws, data) {
  try {
    const { prompt, context } = data;
    
    // Construct system message with context
    let systemMessage = `You are an expert web development assistant that generates complete, functional web applications.

Application Generation Guidelines:
1. Always generate a complete, functional web application
2. Include necessary files:
   - index.html (main HTML structure)
   - styles.css (application styling)
   - script.js (core application logic)
   - Additional files as needed (e.g., components, modules)

Code Quality Requirements:
- Use modern, semantic HTML5
- Implement responsive design
- Write clean, readable, and well-commented code
- Ensure cross-browser compatibility
- Follow best practices for web development
- Handle potential user interactions and edge cases
- Use modern JavaScript (ES6+)
- Implement basic error handling

Technologies:
- Prefer vanilla JavaScript for simplicity
- Use CSS for styling
- Optional: Include basic responsive design techniques
- Avoid unnecessary external libraries unless specifically requested

Specific Instructions:
- Carefully analyze the user's requirements
- If requirements are ambiguous, make reasonable assumptions
- Focus on creating a functional and user-friendly application
- Provide a clear, intuitive user interface
`;
    
    // Prepare additional context if provided
    if (context && context.files) {
      systemMessage += "\n\nCurrent Project Context:\n";
      context.files.forEach(file => {
        systemMessage += `- ${file.path}\n`;
      });
    }
    
    // Call Gemini API with the latest stable version
    const geminiModel = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro-002",
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.95,
        topK: 40
      }
    });
    
    const chatSession = geminiModel.startChat({
      history: [],
      systemInstruction: systemMessage,
    });
    
    // Enhance the prompt with additional context
    const enhancedPrompt = `Generate a complete web application based on the following requirements:

${prompt}

Please provide the code for the necessary files to implement this application. 
Use markdown code blocks with explicit file paths, like:
\`\`\`file:index.html
... HTML content ...
\`\`\`
\`\`\`file:styles.css
... CSS content ...
\`\`\`
\`\`\`file:script.js
... JavaScript content ...
\`\`\``;
    
    const result = await chatSession.sendMessage(enhancedPrompt);
    const response = await result.response;
    
    // Extract files from the response
    const generatedFiles = extractFilesFromResponse(response.text());
    
    // Ensure minimum required files exist
    const finalFiles = ensureBasicFiles(generatedFiles, prompt);
    
    // Send response back to client with files
    ws.send(JSON.stringify({
      type: 'response',
      files: finalFiles
    }));
    
  } catch (error) {
    console.error('Error handling prompt:', error);
    ws.send(JSON.stringify({
      type: 'error',
      error: error.message
    }));
  }
}

// Function to extract files from response
function extractFilesFromResponse(text) {
  const files = {};
  const fileRegex = /```(?:file:)?([^\n]+)\n([\s\S]*?)```/g;
  
  let match;
  while ((match = fileRegex.exec(text)) !== null) {
    const filePath = match[1].trim();
    const fileContent = match[2].trim();
    
    files[filePath] = fileContent;
  }
  
  return files;
}

// Ensure basic files exist with sensible defaults
function ensureBasicFiles(generatedFiles, prompt) {
  // Default files to create if not provided
  const defaultFiles = {
    'index.html': createDefaultHTMLFile(prompt),
    'styles.css': createDefaultCSSFile(prompt),
    'script.js': createDefaultJSFile(prompt)
  };

  // Merge generated files with defaults, prioritizing generated files
  const finalFiles = { ...defaultFiles };
  
  // Update with any generated files
  Object.entries(generatedFiles).forEach(([path, content]) => {
    if (content && content.trim() !== '') {
      finalFiles[path] = content;
    }
  });

  return finalFiles;
}

// Create a generic default HTML file
function createDefaultHTMLFile(prompt) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web Application</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="app">
        <h1>Web Application</h1>
        <p>Application generated for: ${escapeHTML(prompt)}</p>
    </div>
    <script src="script.js"></script>
</body>
</html>`;
}

// Create a generic default CSS file
function createDefaultCSSFile(prompt) {
  return `/* Basic Reset */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f4f4f4;
}

#app {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

h1 {
  color: #333;
  text-align: center;
  margin-bottom: 20px;
}`;
}

// Create a generic default JS file
function createDefaultJSFile(prompt) {
  return `// Basic application setup
document.addEventListener('DOMContentLoaded', () => {
  console.log('Application initialized');
  console.log('Original prompt: ${escapeJavaScript(prompt)}');
  
  // Placeholder for application logic
  const app = document.getElementById('app');
  
  // Add any initial setup or event listeners here
});

// Utility function to handle potential errors
function handleError(error) {
  console.error('An error occurred:', error);
  const errorElement = document.createElement('div');
  errorElement.className = 'error';
  errorElement.textContent = 'An error occurred while running the application.';
  document.body.appendChild(errorElement);
}

// Catch and log any unhandled errors
window.addEventListener('error', (event) => {
  handleError(event.error);
});`;
}

// Utility to escape HTML to prevent XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
}

// Utility to escape JavaScript strings
function escapeJavaScript(str) {
  return str.replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n');
}

// Store context information
let projectContext = {};
function storeContext(data) {
  projectContext = {
    ...projectContext,
    ...data.context
  };
  console.log('Updated context');
}

// REST API endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`MCP server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
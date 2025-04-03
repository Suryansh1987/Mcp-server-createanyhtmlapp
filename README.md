# MCP Server & VSCode Extension

This repository contains the code for the MCP (Model-Controlled Programming) Server and a VSCode extension that enables developers to create applications using HTML, CSS, and JavaScript through simple prompts, powered by Google's LLM.

## Features
- Generate full HTML, CSS, and JavaScript applications using natural language prompts.
- Seamless integration with VSCode for an enhanced developer experience.
- Leverages Google LLM for high-quality AI-generated code.
- MCP Server acts as the backend to process prompts and generate code dynamically.

## Installation
### MCP Server
1. Clone this repository:
   ```sh
   git clone https://github.com/your-username/mcp-server-vscode-extension.git
   ```
2. Navigate to the server directory:
   ```sh
   cd mcp-server
   ```
3. Install dependencies:
   ```sh
   npm install
   ```
4. Start the server:
   ```sh
   npm start
   ```

### VSCode Extension
1. Open VSCode and navigate to the `extensions` directory:
   ```sh
   cd vscode-extension
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Run the extension in VSCode:
   ```sh
   npm run compile
   ```
4. Open the `Run and Debug` tab in VSCode and launch the extension.

## Usage
1. Open VSCode and start the MCP Server.
2. Use the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and select "Create App with Prompt".
3. Enter your prompt describing the application you want to generate.
4. The extension will generate and open the required files automatically.
5. Edit and refine as needed, then preview the app in a browser.

## Configuration
- Ensure that the MCP Server is running before using the extension.
- The extension communicates with the server via `http://localhost:3000`. Modify the `config.json` if needed.

## Contributing
Feel free to fork this repository and contribute via pull requests. Ensure that your code follows best practices and includes documentation where necessary.

## License
This project is licensed under the MIT License.

## Contact
For any issues or feature requests, please open an issue in the repository or reach out via email at `suryanshsingh2586@gmail.com`.


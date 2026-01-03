import { WebContainer } from '@webcontainer/api';

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export enum CodeLanguage {
  JAVASCRIPT = 'javascript',
  HTML = 'html',
  CSS = 'css',
  TYPESCRIPT = 'typescript'
}

class CodeExecutionService {
  private container: WebContainer | null = null;
  private isInitializing = false;

  async initialize(): Promise<void> {
    if (this.container || this.isInitializing) return;
    
    this.isInitializing = true;
    try {
      this.container = await WebContainer.boot();
      console.log('WebContainer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebContainer:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async executeJavaScript(code: string): Promise<ExecutionResult> {
    const startTime = performance.now();
    
    try {
      await this.initialize();
      if (!this.container) {
        throw new Error('WebContainer not initialized');
      }

      // Capture console output
      let output = '';
      const consoleCapture = `
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        let output = [];
        
        console.log = (...args) => {
          output.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
          originalLog(...args);
        };
        console.error = (...args) => {
          output.push('ERROR: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
          originalError(...args);
        };
        console.warn = (...args) => {
          output.push('WARN: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
          originalWarn(...args);
        };

        try {
          ${code}
        } catch (e) {
          output.push('ERROR: ' + e.message);
        }

        output.join('\\n');
      `;

      // Write and execute the code
      await this.container.fs.writeFile('/script.js', consoleCapture);
      
      const process = await this.container.spawn('node', ['/script.js']);
      const exitCode = await process.exit;

      // Collect output
      const reader = process.output.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output += decoder.decode(value);
      }

      const executionTime = performance.now() - startTime;

      return {
        success: exitCode === 0,
        output: output.trim() || 'Code executed successfully (no output)',
        executionTime
      };
    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      return {
        success: false,
        output: '',
        error: error.message || 'Execution failed',
        executionTime
      };
    }
  }

  async executeHTML(html: string, css: string = '', js: string = ''): Promise<ExecutionResult> {
    const startTime = performance.now();
    
    try {
      await this.initialize();
      if (!this.container) {
        throw new Error('WebContainer not initialized');
      }

      const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>${css}</style>
</head>
<body>
  ${html}
  <script>${js}</script>
</body>
</html>
      `;

      await this.container.fs.writeFile('/index.html', fullHTML);
      
      const executionTime = performance.now() - startTime;

      return {
        success: true,
        output: fullHTML,
        executionTime
      };
    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      return {
        success: false,
        output: '',
        error: error.message || 'HTML rendering failed',
        executionTime
      };
    }
  }

  // Simple in-memory execution for quick JS snippets (fallback)
  executeSimpleJS(code: string): ExecutionResult {
    const startTime = performance.now();
    let output = '';
    
    try {
      // Create a sandboxed console
      const logs: string[] = [];
      const sandboxConsole = {
        log: (...args: any[]) => logs.push(args.map(a => 
          typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
        ).join(' ')),
        error: (...args: any[]) => logs.push('ERROR: ' + args.join(' ')),
        warn: (...args: any[]) => logs.push('WARN: ' + args.join(' '))
      };

      // Execute in isolated context
      const func = new Function('console', code);
      func(sandboxConsole);
      
      output = logs.join('\n') || 'Code executed successfully (no output)';
      const executionTime = performance.now() - startTime;

      return {
        success: true,
        output,
        executionTime
      };
    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      return {
        success: false,
        output: '',
        error: error.message || 'Execution failed',
        executionTime
      };
    }
  }

  async cleanup(): Promise<void> {
    if (this.container) {
      await this.container.teardown();
      this.container = null;
    }
  }
}

export const codeExecutionService = new CodeExecutionService();

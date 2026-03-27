import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// PowerShell execution wrapper
async function executePowerShell(
  scriptPath: string,
  parameters: Record<string, string> = {},
  options: {
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
  } = {}
): Promise<{ success: boolean; output: string; error: string; duration: number }> {
  const startTime = Date.now();
  const timeout = options.timeout || 3600000; // 1 hour default
  const maxRetries = options.retryCount || 3;
  const retryDelay = options.retryDelay || 5000;

  // Build parameter string
  const paramStrings = Object.entries(parameters)
    .map(([key, value]) => `-${key} '${value}'`)
    .join(' ');

  const command = `pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" ${paramStrings}`;

  let lastError = '';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      const duration = Date.now() - startTime;

      if (stderr && !stdout) {
        lastError = stderr;
        throw new Error(stderr);
      }

      // Log success
      await logExecution({
        scriptPath,
        parameters,
        success: true,
        attempt,
        duration,
        output: stdout,
      });

      return {
        success: true,
        output: stdout,
        error: '',
        duration,
      };
    } catch (error: any) {
      lastError = error.message;
      
      // Check if it's a transient error
      const isTransient = isTransientError(error);
      
      if (isTransient && attempt < maxRetries) {
        await logExecution({
          scriptPath,
          parameters,
          success: false,
          attempt,
          duration: Date.now() - startTime,
          error: error.message,
          willRetry: true,
        });
        
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue;
      }

      // Log failure
      await logExecution({
        scriptPath,
        parameters,
        success: false,
        attempt,
        duration: Date.now() - startTime,
        error: error.message,
        willRetry: false,
      });

      return {
        success: false,
        output: '',
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  return {
    success: false,
    output: '',
    error: lastError || 'Unknown error after all retries',
    duration: Date.now() - startTime,
  };
}

// Check if error is transient (should retry)
function isTransientError(error: any): boolean {
  const transientPatterns = [
    'network',
    'timeout',
    'connection',
    'temporarily',
    'throttl',
    'rate limit',
    'service unavailable',
    'ECONNRESET',
    'ETIMEDOUT',
  ];

  const message = (error.message || '').toLowerCase();
  return transientPatterns.some(pattern => message.includes(pattern));
}

// Log execution to file
async function logExecution(data: {
  scriptPath: string;
  parameters: Record<string, string>;
  success: boolean;
  attempt: number;
  duration: number;
  output?: string;
  error?: string;
  willRetry?: boolean;
}): Promise<void> {
  const logDir = '/logs';
  const logFile = path.join(logDir, 'executor.log');
  const timestamp = new Date().toISOString();

  const logEntry = {
    timestamp,
    level: data.success ? 'SUCCESS' : (data.willRetry ? 'WARNING' : 'ERROR'),
    source: 'ExecutorAPI',
    script: data.scriptPath,
    attempt: data.attempt,
    duration: data.duration,
    success: data.success,
    ...(data.error && { error: data.error }),
    ...(data.willRetry !== undefined && { willRetry: data.willRetry }),
  };

  try {
    if (!existsSync(logDir)) {
      await mkdir(logDir, { recursive: true });
    }
    
    const logLine = `[${timestamp}] [${logEntry.level}] ${JSON.stringify(logEntry)}\n`;
    await writeFile(logFile, logLine, { flag: 'a' });
  } catch (e) {
    console.error('Failed to write log:', e);
  }
}

// POST /api/executor/execute - Execute a PowerShell script
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      scriptPath,
      parameters = {},
      timeout,
      retryCount,
      retryDelay,
      validateOnly = false,
    } = body;

    if (!scriptPath) {
      return NextResponse.json(
        { error: 'scriptPath is required' },
        { status: 400 }
      );
    }

    // Security: Ensure script is in allowed directory
    const normalizedPath = path.normalize(scriptPath);
    if (!normalizedPath.startsWith('/scripts/') && !normalizedPath.startsWith('/app/pwsh/')) {
      return NextResponse.json(
        { error: 'Script must be in /scripts/ or /app/pwsh/ directory' },
        { status: 403 }
      );
    }

    // Check if script exists
    if (!existsSync(normalizedPath)) {
      return NextResponse.json(
        { error: `Script not found: ${scriptPath}` },
        { status: 404 }
      );
    }

    // Validation only mode
    if (validateOnly) {
      return NextResponse.json({
        valid: true,
        scriptPath: normalizedPath,
        parameters,
      });
    }

    // Execute the script
    const result = await executePowerShell(normalizedPath, parameters, {
      timeout,
      retryCount,
      retryDelay,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        output: result.output,
        duration: result.duration,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          duration: result.duration,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Executor error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/executor/execute - Get execution status/info
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scriptPath = searchParams.get('scriptPath');

  if (scriptPath) {
    // Check specific script
    const normalizedPath = path.normalize(scriptPath);
    const exists = existsSync(normalizedPath);
    
    return NextResponse.json({
      scriptPath: normalizedPath,
      exists,
      ready: exists,
    });
  }

  // Return executor info
  return NextResponse.json({
    status: 'ready',
    version: '2.0.0',
    features: {
      logging: true,
      retry: true,
      validation: true,
      healthChecks: true,
    },
    defaults: {
      timeout: 3600000,
      maxRetries: 3,
      retryDelay: 5000,
    },
  });
}

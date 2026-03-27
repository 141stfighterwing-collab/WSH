import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Path to the WSH project
const PROJECT_PATH = process.env.WSH_PROJECT_PATH || '/app';
const PACKAGE_JSON_PATH = path.join(PROJECT_PATH, 'package.json');

interface UpdateResult {
  success: boolean;
  message: string;
  pulled: boolean;
  restarted: boolean;
  previousVersion?: string;
  newVersion?: string;
  changes?: string[];
  error?: string;
  timestamp: string;
}

async function getCurrentVersion(): Promise<string> {
  try {
    if (existsSync(PACKAGE_JSON_PATH)) {
      const content = readFileSync(PACKAGE_JSON_PATH, 'utf-8');
      const pkg = JSON.parse(content);
      return pkg.version || 'unknown';
    }
  } catch (error) {
    console.error('Error reading version:', error);
  }
  return 'unknown';
}

async function gitPull(): Promise<{ success: boolean; output: string; changes: string[] }> {
  try {
    const { stdout, stderr } = await execAsync('git pull', {
      cwd: PROJECT_PATH,
      timeout: 60000, // 1 minute timeout
    });
    
    const output = stdout + stderr;
    const changes: string[] = [];
    
    // Parse the output to find what changed
    if (output.includes('Already up to date') || output.includes('Already up-to-date')) {
      return { success: true, output: 'Already up to date', changes: [] };
    }
    
    // Extract file changes
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('|') || line.includes('->') || line.match(/^\s*[a-zA-Z]/)) {
        changes.push(line.trim());
      }
    }
    
    return { success: true, output, changes };
  } catch (error: any) {
    return { 
      success: false, 
      output: error.message || 'Unknown git error',
      changes: []
    };
  }
}

async function installDependencies(): Promise<{ success: boolean; output: string }> {
  try {
    // Check if npm or bun is available
    let cmd = 'npm install';
    try {
      await execAsync('which bun', { timeout: 5000 });
      cmd = 'bun install';
    } catch {
      // npm is fine
    }
    
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: PROJECT_PATH,
      timeout: 120000, // 2 minute timeout for npm install
    });
    
    return { success: true, output: stdout + stderr };
  } catch (error: any) {
    return { 
      success: false, 
      output: error.message || 'Unknown install error'
    };
  }
}

async function restartApplication(): Promise<{ success: boolean; output: string }> {
  try {
    // Try different restart methods
    // 1. Try pm2 first (common in production)
    try {
      const { stdout } = await execAsync('which pm2', { timeout: 5000 });
      if (stdout.trim()) {
        await execAsync('pm2 restart all', { timeout: 30000 });
        return { success: true, output: 'Restarted via pm2' };
      }
    } catch {
      // pm2 not available, try other methods
    }
    
    // 2. Try systemctl (for systemd services)
    try {
      const { stdout } = await execAsync('systemctl --user is-active wsh 2>/dev/null || systemctl is-active wsh 2>/dev/null', { timeout: 5000 });
      if (stdout.trim() === 'active') {
        await execAsync('systemctl restart wsh || systemctl --user restart wsh', { timeout: 30000 });
        return { success: true, output: 'Restarted via systemctl' };
      }
    } catch {
      // systemctl not available for wsh
    }
    
    // 3. Try docker (if running in container)
    if (existsSync('/.dockerenv')) {
      // Signal that restart is needed - the container orchestrator should handle this
      return { success: true, output: 'Container restart required - please restart container manually or via orchestrator' };
    }
    
    // 4. Fallback - just signal restart needed
    return { success: true, output: 'Manual restart required - no process manager detected' };
  } catch (error: any) {
    return { 
      success: false, 
      output: error.message || 'Unknown restart error'
    };
  }
}

// POST /api/update - Pull changes and restart
export async function POST(request: NextRequest) {
  const result: UpdateResult = {
    success: false,
    message: '',
    pulled: false,
    restarted: false,
    timestamp: new Date().toISOString(),
  };
  
  try {
    // Get current version before update
    result.previousVersion = await getCurrentVersion();
    
    // Check if this is a git repository
    if (!existsSync(path.join(PROJECT_PATH, '.git'))) {
      result.error = 'Not a git repository. Update via git pull is not available.';
      result.message = 'Update failed: not a git repository';
      return NextResponse.json(result, { status: 400 });
    }
    
    // Perform git pull
    const pullResult = await gitPull();
    result.pulled = pullResult.success;
    result.changes = pullResult.changes;
    
    if (!pullResult.success) {
      result.error = pullResult.output;
      result.message = 'Git pull failed';
      return NextResponse.json(result, { status: 500 });
    }
    
    // Check if there were actual changes
    if (pullResult.changes.length === 0 && pullResult.output.includes('Already up to date')) {
      result.success = true;
      result.message = 'Already up to date - no changes to apply';
      result.newVersion = result.previousVersion;
      return NextResponse.json(result, { status: 200 });
    }
    
    // Install/update dependencies if package.json changed
    if (pullResult.changes.some(c => c.includes('package.json') || c.includes('package-lock.json'))) {
      const installResult = await installDependencies();
      if (!installResult.success) {
        result.error = `Dependencies install failed: ${installResult.output}`;
        result.message = 'Git pull succeeded but dependency installation failed';
        return NextResponse.json(result, { status: 500 });
      }
    }
    
    // Get new version
    result.newVersion = await getCurrentVersion();
    
    // Restart the application
    const restartResult = await restartApplication();
    result.restarted = restartResult.success;
    
    if (restartResult.success) {
      result.success = true;
      result.message = `Update successful! Version: ${result.previousVersion} → ${result.newVersion}. ${restartResult.output}`;
    } else {
      result.success = true; // Partial success
      result.message = `Update pulled successfully but restart failed: ${restartResult.output}. Please restart manually.`;
    }
    
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    result.error = error.message || 'Unknown error occurred';
    result.message = 'Update failed with an unexpected error';
    return NextResponse.json(result, { status: 500 });
  }
}

// GET /api/update - Check for updates without applying
export async function GET(request: NextRequest) {
  try {
    // Get current version
    const currentVersion = await getCurrentVersion();
    
    // Check if this is a git repository
    if (!existsSync(path.join(PROJECT_PATH, '.git'))) {
      return NextResponse.json({
        isGitRepo: false,
        currentVersion,
        message: 'Not a git repository',
      });
    }
    
    // Fetch latest from remote
    try {
      await execAsync('git fetch', {
        cwd: PROJECT_PATH,
        timeout: 30000,
      });
    } catch (error) {
      console.error('Git fetch error:', error);
    }
    
    // Check if we're behind
    let behind = 0;
    let ahead = 0;
    let currentBranch = 'unknown';
    
    try {
      // Get current branch
      const { stdout: branchOut } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: PROJECT_PATH,
        timeout: 5000,
      });
      currentBranch = branchOut.trim();
      
      // Get ahead/behind count
      const { stdout: countOut } = await execAsync(`git rev-list --left-right --count HEAD...@{u} 2>/dev/null || echo "0 0"`, {
        cwd: PROJECT_PATH,
        timeout: 5000,
      });
      const [aheadStr, behindStr] = countOut.trim().split(/\s+/);
      ahead = parseInt(aheadStr, 10) || 0;
      behind = parseInt(behindStr, 10) || 0;
    } catch (error) {
      console.error('Git status error:', error);
    }
    
    return NextResponse.json({
      isGitRepo: true,
      currentVersion,
      currentBranch,
      ahead,
      behind,
      updateAvailable: behind > 0,
      message: behind > 0 
        ? `${behind} commit(s) behind remote. Update available.`
        : ahead > 0 
          ? `${ahead} unpushed commit(s). You are ahead of remote.`
          : 'Up to date with remote.',
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      message: 'Failed to check for updates',
    }, { status: 500 });
  }
}

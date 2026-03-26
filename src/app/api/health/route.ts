import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'warning';
  details: Record<string, any>;
  duration?: number;
}

async function checkFilesystem(): Promise<HealthCheck> {
  const startTime = Date.now();
  const check: HealthCheck = {
    name: 'Filesystem',
    status: 'healthy',
    details: {},
  };

  const dirs = ['/scripts', '/logs', '/config', '/output', '/data'];
  
  for (const dir of dirs) {
    check.details[dir] = {
      exists: existsSync(dir),
    };
    if (!existsSync(dir)) {
      check.status = 'warning';
    }
  }

  check.duration = Date.now() - startTime;
  return check;
}

async function checkPowerShell(): Promise<HealthCheck> {
  const startTime = Date.now();
  const check: HealthCheck = {
    name: 'PowerShell',
    status: 'healthy',
    details: {},
  };

  try {
    const { stdout } = await execAsync('pwsh -NoProfile -Command "$PSVersionTable.PSVersion.ToString()"', {
      timeout: 5000,
    });
    check.details.version = stdout.trim();
    check.details.available = true;
  } catch (error: any) {
    check.status = 'unhealthy';
    check.details.available = false;
    check.details.error = error.message;
  }

  check.duration = Date.now() - startTime;
  return check;
}

async function checkModules(): Promise<HealthCheck> {
  const startTime = Date.now();
  const check: HealthCheck = {
    name: 'PowerShell Modules',
    status: 'healthy',
    details: {},
  };

  const modules = ['LoggingEngine', 'SafeExecutor', 'ConfigManager', 'HealthCheck'];
  
  for (const moduleName of modules) {
    const modulePath = `/modules/${moduleName}`;
    check.details[moduleName] = {
      exists: existsSync(modulePath),
    };
    if (!existsSync(modulePath)) {
      check.status = 'warning';
    }
  }

  check.duration = Date.now() - startTime;
  return check;
}

async function checkMemory(): Promise<HealthCheck> {
  const startTime = Date.now();
  const check: HealthCheck = {
    name: 'Memory',
    status: 'healthy',
    details: {},
  };

  try {
    const memUsage = process.memoryUsage();
    check.details.heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    check.details.heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    check.details.rssMB = Math.round(memUsage.rss / 1024 / 1024);

    // Warning if using more than 500MB
    if (check.details.heapUsedMB > 500) {
      check.status = 'warning';
    }
  } catch (error: any) {
    check.status = 'warning';
    check.details.error = error.message;
  }

  check.duration = Date.now() - startTime;
  return check;
}

async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();
  const check: HealthCheck = {
    name: 'Database',
    status: 'healthy',
    details: {},
  };

  try {
    // Import Prisma dynamically
    const { prisma } = await import('@/lib/db');
    await prisma.$queryRaw`SELECT 1`;
    check.details.connected = true;
    check.details.type = 'PostgreSQL';
  } catch (error: any) {
    check.status = 'unhealthy';
    check.details.connected = false;
    check.details.error = error.message;
  }

  check.duration = Date.now() - startTime;
  return check;
}

// GET /api/health - Full health check
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Run all health checks
  const checks: Record<string, HealthCheck> = {};
  
  checks.filesystem = await checkFilesystem();
  checks.powershell = await checkPowerShell();
  checks.modules = await checkModules();
  checks.memory = await checkMemory();
  checks.database = await checkDatabase();

  // Determine overall status
  let overallStatus: 'healthy' | 'unhealthy' | 'warning' = 'healthy';
  
  for (const check of Object.values(checks)) {
    if (check.status === 'unhealthy') {
      overallStatus = 'unhealthy';
      break;
    }
    if (check.status === 'warning') {
      overallStatus = 'warning';
    }
  }

  const result = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.POWERSHELL_EXECUTOR_VERSION || '2.0.0',
    uptime: process.uptime(),
    duration: Date.now() - startTime,
    checks,
    summary: {
      total: Object.keys(checks).length,
      healthy: Object.values(checks).filter(c => c.status === 'healthy').length,
      warning: Object.values(checks).filter(c => c.status === 'warning').length,
      unhealthy: Object.values(checks).filter(c => c.status === 'unhealthy').length,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      logLevel: process.env.LOG_LEVEL,
      strictMode: process.env.STRICT_MODE,
    },
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
  
  return NextResponse.json(result, { status: statusCode });
}

// HEAD /api/health - Quick health check for load balancers
export async function HEAD() {
  try {
    // Quick check - just verify PowerShell is available
    await execAsync('pwsh -NoProfile -Command "exit 0"', { timeout: 2000 });
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}

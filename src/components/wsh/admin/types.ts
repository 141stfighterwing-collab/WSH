export interface EnvVar {
  key: string;
  value: string;
  category: string;
  updated: string;
}

export interface SystemData {
  status: string;
  version: string;
  uptime: string;
  memory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
  };
  nodeVersion: string;
  platform: string;
  nextjs: string;
  buildDate: string;
  gitCommit: string;
  environment: string;
}

export interface UserData {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source: string;
}

export type AdminSection = 'env' | 'versioning' | 'users' | 'cloud' | 'logs' | 'dbviewer' | null;

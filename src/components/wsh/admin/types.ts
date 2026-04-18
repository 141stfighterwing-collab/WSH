export interface EnvVar {
  key: string;
  value: string;
  category: string;
  updated: string;
}

export interface EnvVolumeStatus {
  exists: boolean;
  readable: boolean;
  writable: boolean;
  keyCount: number;
  error?: string;
}

export interface SystemData {
  status: string;
  version: string;
  uptime: string;
  uptimeMs: number;
  memory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
    rssBytes?: number;
  };
  disk: {
    appSize: string;
    appSizeBytes: number;
    uploadSize: string;
    uploadSizeBytes: number;
    tmpSize: string;
    envSize: string;
    dbDataSize: string;
  };
  envVolume: EnvVolumeStatus;
  nodeVersion: string;
  platform: string;
  nextjs: string;
  buildDate: string;
  gitCommit: string;
  environment: string;
  dockerVersion?: string;
  hostname?: string;
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

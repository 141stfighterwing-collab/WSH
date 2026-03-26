// Stub for Gemini AI service
// In production, implement actual AI integration

export interface AIProcessingResult {
  title: string;
  formattedContent: string;
  tags: string[];
  summary: string;
  suggestions: string[];
}

export interface DiagnosticLog {
  id: string;
  timestamp: number;  // Unix timestamp in milliseconds
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  duration?: number;
  type?: 'error' | 'success' | 'warn' | 'info';
}

export const DAILY_REQUEST_LIMIT = 100;

export async function processNoteWithAI(
  content: string,
  tags: string[] = [],
  noteType?: string,
  user?: string | { id?: string; email?: string }
): Promise<AIProcessingResult> {
  // Return empty result for now
  // In production, this would call the Gemini API
  return {
    title: '',
    formattedContent: content,
    tags: [],
    summary: '',
    suggestions: [],
  };
}

export async function generateSummary(content: string): Promise<string> {
  return '';
}

export async function suggestTags(content: string): Promise<string[]> {
  return [];
}

export async function formatContent(content: string): Promise<string> {
  return content;
}

export async function runConnectivityTest(): Promise<{ logs: DiagnosticLog[]; success: boolean; message: string }> {
  const logs: DiagnosticLog[] = [];
  const startTime = Date.now();
  let allSuccess = true;
  
  // Test 1: API endpoint check
  try {
    const response = await fetch('/api/health', { method: 'GET' });
    logs.push({
      id: '1',
      timestamp: Date.now(),
      test: 'API Health Check',
      status: response.ok ? 'pass' : 'fail',
      message: response.ok ? 'API is responding' : 'API returned error',
      duration: Date.now() - startTime,
    });
    if (!response.ok) allSuccess = false;
  } catch (error) {
    logs.push({
      id: '1',
      timestamp: Date.now(),
      test: 'API Health Check',
      status: 'fail',
      message: 'Failed to connect to API',
      duration: Date.now() - startTime,
    });
    allSuccess = false;
  }
  
  // Test 2: Database connection
  const dbStartTime = Date.now();
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    const dbConnected = data.database === 'connected' || data.status === 'healthy';
    logs.push({
      id: '2',
      timestamp: Date.now(),
      test: 'Database Connection',
      status: dbConnected ? 'pass' : 'fail',
      message: dbConnected ? 'Database is connected' : 'Database connection failed',
      duration: Date.now() - dbStartTime,
    });
    if (!dbConnected) allSuccess = false;
  } catch (error) {
    logs.push({
      id: '2',
      timestamp: Date.now(),
      test: 'Database Connection',
      status: 'fail',
      message: 'Failed to test database connection',
      duration: Date.now() - dbStartTime,
    });
    allSuccess = false;
  }
  
  // Test 3: AI Service (stub)
  logs.push({
    id: '3',
    timestamp: Date.now(),
    test: 'AI Service',
    status: 'warning',
    message: 'AI service not configured - running in local mode',
    duration: 0,
  });
  
  return {
    logs,
    success: allSuccess,
    message: allSuccess ? 'All tests passed' : 'Some tests failed',
  };
}

export function getAIUsageLogs(): { date: string; count: number }[] {
  // Return empty usage logs
  return [];
}

export function getDailyUsage(): number {
  return 0;  // Returns current usage count
}

export function getDailyLimit(): number {
  return DAILY_REQUEST_LIMIT;
}

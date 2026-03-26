// Document parsing utilities

export interface ParsedDocument {
  title: string;
  content: string;
  type: string;
  tags: string[];
}

export async function parseDocument(input: File | string, type: string = 'quick'): Promise<ParsedDocument> {
  let content: string;
  
  if (typeof input === 'string') {
    content = input;
  } else {
    // Handle File object
    content = await readFileContent(input);
  }
  
  // Simple document parsing
  const lines = content.split('\n');
  const title = lines[0]?.replace(/^#+\s*/, '') || 'Untitled';
  
  // Extract potential tags from content
  const tagMatches = content.match(/#[\w-]+/g) || [];
  const tags = [...new Set(tagMatches.map(t => t.replace('#', '')))];
  
  return {
    title,
    content,
    type,
    tags,
  };
}

async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function extractTitle(content: string): string {
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim() || '';
  
  // Check for markdown heading
  if (firstLine.startsWith('#')) {
    return firstLine.replace(/^#+\s*/, '');
  }
  
  // Use first non-empty line as title
  return firstLine || 'Untitled';
}

export function extractTags(content: string): string[] {
  const tagMatches = content.match(/#[\w-]+/g) || [];
  return [...new Set(tagMatches.map(t => t.replace('#', '')))];
}

export function countWords(content: string): number {
  // Strip markdown syntax and count words
  const stripped = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
    .replace(/[#*_~`]/g, '') // Remove markdown formatting
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .trim();
  
  return stripped.split(/\s+/).filter(Boolean).length;
}

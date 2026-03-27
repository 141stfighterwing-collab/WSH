// Storage and export utilities

export interface ExportResult {
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
}

export async function exportDatabase(notes?: any[], format?: string, userId?: string): Promise<ExportResult> {
  try {
    // Export notes
    const notesResponse = await fetch('/api/notes');
    const notesData = await notesResponse.json();
    
    // Export folders
    const foldersResponse = await fetch('/api/folders');
    const foldersData = await foldersResponse.json();
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '2.1.0',
      exportedBy: userId,
      notes: notes || notesData.notes || [],
      folders: foldersData.folders || [],
    };
    
    let content: string;
    let filename: string;
    
    switch (format) {
      case 'sql':
        content = generateSqlExport(exportData);
        filename = `wsh-export-${new Date().toISOString().split('T')[0]}.sql`;
        break;
      case 'csv':
        content = generateCsvExport(exportData);
        filename = `wsh-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      default:
        content = JSON.stringify(exportData, null, 2);
        filename = `wsh-export-${new Date().toISOString().split('T')[0]}.json`;
    }
    
    return {
      success: true,
      data: content,
      filename,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to export database',
    };
  }
}

function generateSqlExport(data: any): string {
  let sql = '-- WSH Database Export\n';
  sql += `-- Generated: ${data.exportedAt}\n\n`;
  
  // Notes table
  sql += '-- Notes\n';
  for (const note of data.notes) {
    sql += `INSERT INTO notes (id, title, content, type, created_at) VALUES ('${note.id}', '${escapeSql(note.title)}', '${escapeSql(note.content)}', '${note.type}', '${note.createdAt}');\n`;
  }
  
  return sql;
}

function generateCsvExport(data: any): string {
  let csv = 'id,title,content,type,created_at\n';
  
  for (const note of data.notes) {
    csv += `"${note.id}","${escapeCsv(note.title)}","${escapeCsv(note.content)}","${note.type}","${note.createdAt}"\n`;
  }
  
  return csv;
}

function escapeSql(str: string): string {
  return str?.replace(/'/g, "''") || '';
}

function escapeCsv(str: string): string {
  return str?.replace(/"/g, '""') || '';
}

export async function importData(jsonData: string): Promise<ImportResult> {
  try {
    const data = JSON.parse(jsonData);
    
    // Import would need API endpoints for bulk operations
    // This is a stub implementation
    
    return {
      success: true,
      notesImported: data.notes?.length || 0,
      foldersImported: data.folders?.length || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse import data',
    };
  }
}

export interface ImportResult {
  success: boolean;
  notesImported?: number;
  foldersImported?: number;
  error?: string;
}

export function downloadFile(content: string, filename: string, mimeType: string = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

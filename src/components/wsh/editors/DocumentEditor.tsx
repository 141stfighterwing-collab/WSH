'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, File, Loader2, X, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

interface DocumentData {
  text: string;
  fileName: string;
  fileSize: number;
  ingestDate: string;
  format: string;
  rawText: string;
}

interface DocumentEditorProps {
  title: string;
  setTitle: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
}

function parseDoc(content: string): DocumentData {
  try {
    return JSON.parse(content);
  } catch {
    return { text: '', fileName: '', fileSize: 0, ingestDate: '', format: '', rawText: '' };
  }
}

export default function DocumentEditor({ title, setTitle, content, setContent }: DocumentEditorProps) {
  const [data, setData] = useState<DocumentData>(parseDoc(content));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (partial: Partial<DocumentData>) => {
    const next = { ...data, ...partial };
    setData(next);
    setContent(JSON.stringify(next));
  };

  const processFile = useCallback(async (file: File) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setUploadError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 50MB.`);
      setTimeout(() => setUploadError(''), 5000);
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      // Try server-side extraction first
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/users/extract-text', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        if (result.text && result.text.trim()) {
          const docData: DocumentData = {
            text: formatExtractedText(result.text, file.name),
            fileName: file.name,
            fileSize: file.size,
            ingestDate: new Date().toISOString(),
            format: file.type || 'unknown',
            rawText: result.text,
          };
          update(docData);
          if (title === 'Untitled Note' || title === '') {
            setTitle(file.name.replace(/\.[^.]+$/, ''));
          }
          setUploadSuccess(`Extracted ${result.text.length.toLocaleString()} characters from ${file.name}`);
          setTimeout(() => setUploadSuccess(''), 4000);
          setUploading(false);
          return;
        }
      }

      // Fallback: client-side text extraction for text-based files
      const text = await file.text();
      if (text && text.trim()) {
        const docData: DocumentData = {
          text: formatExtractedText(text, file.name),
          fileName: file.name,
          fileSize: file.size,
          ingestDate: new Date().toISOString(),
          format: file.type || 'text/plain',
          rawText: text,
        };
        update(docData);
        if (title === 'Untitled Note' || title === '') {
          setTitle(file.name.replace(/\.[^.]+$/, ''));
        }
        setUploadSuccess(`Loaded ${text.length.toLocaleString()} characters from ${file.name}`);
        setTimeout(() => setUploadSuccess(''), 4000);
      } else {
        setUploadError('Could not extract text from this file. Try a PDF, TXT, MD, or DOCX file.');
        setTimeout(() => setUploadError(''), 5000);
      }
    } catch {
      setUploadError('Upload failed. The server may not support this file type.');
      setTimeout(() => setUploadError(''), 5000);
    }
    setUploading(false);
  }, [data, title, setContent, setTitle, update]);

  const formatExtractedText = (text: string, fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    let formatted = text.trim();

    // Clean up common PDF extraction artifacts
    formatted = formatted.replace(/\r\n/g, '\n');
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // For code files, wrap in code block
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'cs', 'php', 'swift', 'kt', 'sh', 'bash', 'sql', 'html', 'css', 'json', 'yaml', 'yml', 'toml', 'xml', 'md'].includes(ext)) {
      return formatted;
    }

    return formatted;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const clearDocument = () => {
    update({ text: '', fileName: '', fileSize: 0, ingestDate: '', format: '', rawText: '' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3 px-3 py-2 animate-fadeIn">
      {/* Upload Area */}
      {!data.fileName && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-pri-500 bg-pri-500/10'
              : 'border-border/50 hover:border-pri-500/30 hover:bg-secondary/20'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
            accept=".pdf,.txt,.md,.docx,.doc,.rtf,.html,.htm,.csv,.json,.xml,.yaml,.yml,.log,.py,.js,.ts,.java,.go,.rs,.c,.cpp,.h,.cs,.rb,.php,.swift,.kt,.sh,.bash,.sql,.css"
            className="hidden"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-pri-400 animate-spin" />
              <span className="text-sm text-muted-foreground">Extracting text...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                Drop document here or click to upload
              </span>
              <span className="text-xs text-muted-foreground">
                Supports PDF, TXT, MD, DOCX, CSV, JSON, code files and more
              </span>
            </div>
          )}
        </div>
      )}

      {/* Upload Messages */}
      {uploadError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {uploadError}
        </div>
      )}
      {uploadSuccess && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-400">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {uploadSuccess}
        </div>
      )}

      {/* File Info Bar */}
      {data.fileName && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30">
          <File className="w-4 h-4 text-pri-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-foreground truncate block">{data.fileName}</span>
            <span className="text-[9px] text-muted-foreground">
              {formatFileSize(data.fileSize)} • {data.format || 'unknown type'}
              {data.ingestDate && ` • Ingested ${new Date(data.ingestDate).toLocaleDateString()}`}
            </span>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-pri-400 hover:bg-pri-500/10 transition-all"
            title="Replace file"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearDocument}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Remove document"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Extracted Text Editor */}
      {data.text && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="micro-label text-muted-foreground">Extracted Content</span>
            <span className="text-[9px] text-muted-foreground">
              ({data.text.length.toLocaleString()} chars)
            </span>
          </div>
          <textarea
            value={data.text}
            onChange={(e) => update({ text: e.target.value })}
            className="w-full min-h-[350px] px-3 py-2 rounded-xl text-sm bg-secondary/50 border border-border/30 focus:border-pri-500/40 focus:outline-none text-foreground font-mono leading-relaxed resize-y"
          />
        </div>
      )}

      {/* Hidden file input for replacement */}
      <input
        ref={fileRef}
        type="file"
        onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
        accept=".pdf,.txt,.md,.docx,.doc,.rtf,.html,.htm,.csv,.json,.xml,.yaml,.yml,.log,.py,.js,.ts,.java,.go,.rs,.c,.cpp,.h,.cs,.rb,.php,.swift,.kt,.sh,.bash,.sql,.css"
        className="hidden"
      />
    </div>
  );
}

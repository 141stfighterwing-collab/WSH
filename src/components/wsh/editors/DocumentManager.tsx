'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileText, File, Loader2, Trash2, AlertCircle, CheckCircle,
  Search, ChevronDown, ChevronRight, Database, Filter, BookOpen,
  Hash, Type, RefreshCw, Eye, X, Download, FileCode,
  FolderPlus, FolderOpen, Folder, GripVertical, Plus,
} from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

// ── Types ──────────────────────────────────────────────────────

interface FolderRecord {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

interface DocumentRecord {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  pageCount: number;
  totalChars: number;
  chunkCount: number;
  status: 'processing' | 'ready' | 'error';
  errorMessage: string;
  folderId: string | null;
  folder: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface SearchResult {
  id: string;
  pageNumber: number;
  chunkIndex: number;
  snippet: string;
  document: { id: string; title: string; fileName: string; createdAt: string };
}

interface SearchResponse {
  results: SearchResult[];
  summary: { query: string; mode: string; totalMatches: number; matchingDocuments: number };
}

type SearchMode = 'fulltext' | 'phrase' | 'boolean' | 'fuzzy';
type TabState = 'upload' | 'library' | 'search';

// ── Helpers ────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function statusColor(status: string): string {
  switch (status) {
    case 'ready': return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'processing': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    case 'error': return 'text-red-400 bg-red-500/10 border-red-500/20';
    default: return 'text-muted-foreground bg-secondary/50 border-border/30';
  }
}

function isViewableFile(mimeType: string, fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const viewableMimes = [
    'application/pdf',
    'text/plain', 'text/markdown', 'text/html', 'text/csv',
    'text/yaml', 'application/json', 'application/xml',
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  ];
  const viewableExts = ['pdf', 'txt', 'md', 'html', 'htm', 'csv', 'json', 'xml', 'yaml', 'yml', 'log', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
  return viewableMimes.includes(mimeType) || viewableExts.includes(ext);
}

function fileIcon(fileName: string, mimeType: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />;
  if (['doc', 'docx'].includes(ext)) return <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileCode className="w-4 h-4 text-green-400 flex-shrink-0" />;
  if (['json', 'xml', 'yaml', 'yml'].includes(ext)) return <FileCode className="w-4 h-4 text-amber-400 flex-shrink-0" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />;
  return <File className="w-4 h-4 text-pri-400 flex-shrink-0" />;
}

/** Get auth headers — reuse the store's token */
function getAuth(): Record<string, string> {
  const token = useWSHStore.getState().user.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── PDF / Document Viewer Overlay ──────────────────────────────

function DocumentViewer({ doc, onClose }: { doc: DocumentRecord; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadProgress, setLoadProgress] = useState('Fetching document...');
  const fileUrl = `/api/documents/${doc.id}/file`;
  const ext = doc.fileName.split('.').pop()?.toLowerCase() || '';
  const isPdf = ext === 'pdf' || doc.mimeType === 'application/pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
  const isText = ['txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'log', 'html', 'htm'].includes(ext);

  // Use a ref to track the current blob URL for proper cleanup
  const blobUrlRef = useRef<string | null>(null);

  // Fetch the file with auth headers and create a blob URL
  useEffect(() => {
    let revoked = false;
    const fetchFile = async () => {
      setLoading(true);
      setError('');
      setLoadProgress(`Loading ${doc.fileName}...`);
      try {
        const res = await fetch(fileUrl, { headers: getAuth() });
        if (!res.ok) {
          setError(`Failed to load file (${res.status})`);
          return;
        }
        setLoadProgress('Preparing document for viewing...');
        const blob = await res.blob();
        if (revoked) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      } catch {
        setError('Failed to load file. Check your connection.');
      } finally {
        if (!revoked) setLoading(false);
      }
    };
    fetchFile();
    return () => {
      revoked = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [doc.id]);

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col animate-fadeIn">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
        >
          <X className="w-3.5 h-3.5" />
          Back
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {fileIcon(doc.fileName, doc.mimeType)}
          <span className="text-sm font-semibold text-foreground truncate">{doc.title}</span>
          {doc.folder && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-pri-500/10 text-pri-400 border border-pri-500/20">
              <Folder className="w-2.5 h-2.5" />{doc.folder.name}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground hidden sm:inline">
          {formatFileSize(doc.fileSize)}
          {doc.pageCount > 0 && ` • ${doc.pageCount} page${doc.pageCount !== 1 ? 's' : ''}`}
        </span>
        <a
          href={blobUrl || fileUrl}
          download={doc.fileName}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-pri-600/20 text-pri-400 hover:bg-pri-600/30 transition-all"
          title="Download original file"
        >
          <Download className="w-3 h-3" />
          <span className="hidden sm:inline">Download</span>
        </a>
      </div>

      {/* Document content */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-8 h-8 text-pri-400 animate-spin" />
            <span className="text-sm text-muted-foreground">{loadProgress}</span>
            <span className="text-[10px] text-muted-foreground">This may take a moment for large files</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-secondary text-muted-foreground hover:text-foreground">Go Back</button>
          </div>
        ) : blobUrl && isPdf ? (
          <iframe
            src={blobUrl}
            className="w-full h-full border-0"
            title={doc.title}
          />
        ) : blobUrl && isImage ? (
          <div className="w-full h-full flex items-center justify-center bg-black/40 p-8 overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blobUrl}
              alt={doc.title}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        ) : blobUrl && isText ? (
          <iframe
            src={blobUrl}
            className="w-full h-full border-0 bg-background"
            title={doc.title}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <File className="w-12 h-12 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-semibold text-foreground">Preview not available for this file type</p>
              <p className="text-xs text-muted-foreground mt-1">.{ext} files can be downloaded but not previewed in-browser.</p>
            </div>
            <a
              href={fileUrl}
              download={doc.fileName}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-pri-600 text-white hover:bg-pri-700 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Folder Assignment Dropdown ─────────────────────────────────

function FolderDropdown({
  folders,
  currentFolderId,
  onAssign,
  onDismiss,
}: {
  folders: FolderRecord[];
  currentFolderId: string | null;
  onAssign: (folderId: string | null) => void;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onDismiss]);

  return (
    <div ref={ref} className="absolute right-8 top-8 z-50 w-52 rounded-xl bg-card border border-border shadow-xl animate-fadeIn overflow-hidden">
      <div className="px-3 py-2 border-b border-border/50">
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Move to Folder</span>
      </div>
      <div className="py-1 max-h-48 overflow-y-auto">
        <button
          onClick={() => onAssign(null)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-secondary transition-colors ${!currentFolderId ? 'bg-secondary/50 text-foreground' : 'text-muted-foreground'}`}
        >
          <FolderOpen className="w-3 h-3" />
          <span>Unfiled</span>
        </button>
        {folders.map((f) => (
          <button
            key={f.id}
            onClick={() => onAssign(f.id)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-secondary transition-colors ${currentFolderId === f.id ? 'bg-secondary/50 text-foreground' : 'text-muted-foreground'}`}
          >
            <Folder className="w-3 h-3" />
            <span className="truncate">{f.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function DocumentManager() {
  const { user } = useWSHStore();
  const [activeTab, setActiveTab] = useState<TabState>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Library
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [docChunks, setDocChunks] = useState<{ id: string; pageNumber: number; chunkIndex: number; content: string; charCount: number }[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Folders
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null); // null = all
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [folderDropdownDocId, setFolderDropdownDocId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Viewer
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('fulltext');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const token = user.token;

  // ── Folders ──────────────────────────────────────────────────

  const loadFolders = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/folders', { headers: getAuth() });
      if (res.ok) { const data = await res.json(); setFolders(data.folders || []); }
    } catch { /* silent */ }
  }, [token]);

  const handleCreateFolder = useCallback(async () => {
    if (!token || !newFolderName.trim()) return;
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { ...getAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (res.ok) {
        setNewFolderName('');
        setShowNewFolderInput(false);
        await loadFolders();
      }
    } catch { /* silent */ }
  }, [token, newFolderName, loadFolders]);

  const handleAssignFolder = useCallback(async (docId: string, folderId: string | null) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'PUT',
        headers: { ...getAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d) => {
            if (d.id !== docId) return d;
            const folder = folderId ? folders.find((f) => f.id === folderId) : null;
            return { ...d, folderId, folder: folder ? { id: folder.id, name: folder.name } : null };
          })
        );
        setFolderDropdownDocId(null);
      }
    } catch { /* silent */ }
  }, [token, folders]);

  // ── Upload ──────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    if (!token) { setUploadError('Login required to upload.'); setTimeout(() => setUploadError(''), 4000); return; }
    if (file.size > 50 * 1024 * 1024) { setUploadError('File too large. Max 50MB.'); setTimeout(() => setUploadError(''), 5000); return; }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    setUploadProgress(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUploadSuccess(data.message || 'Document uploaded successfully!');
        setUploadProgress('');
        setTimeout(() => { setUploadSuccess(''); setActiveTab('library'); loadDocuments(); }, 2000);
      } else {
        setUploadError(data.error || 'Upload failed.');
        setUploadProgress('');
      }
    } catch { setUploadError('Upload failed. Check connection.'); setUploadProgress(''); }
    setUploading(false);
  }, [token]);

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); };

  // ── Library ─────────────────────────────────────────────────

  const loadDocuments = useCallback(async () => {
    if (!token) return;
    setLoadingDocs(true);
    try {
      const url = activeFolderId
        ? `/api/documents?folderId=${activeFolderId}`
        : '/api/documents';
      const res = await fetch(url, { headers: getAuth() });
      if (res.ok) { const data = await res.json(); setDocuments(data.documents || []); }
    } catch { /* silent */ }
    setLoadingDocs(false);
  }, [token, activeFolderId]);

  // Load folders on mount, reload docs when folder changes
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    if (activeTab === 'library') loadDocuments();
  }, [activeTab, activeFolderId, loadDocuments]);

  const loadDocChunks = useCallback(async (docId: string) => {
    if (!token) return;
    setLoadingChunks(true);
    try {
      const res = await fetch(`/api/documents/${docId}`, { headers: getAuth() });
      if (res.ok) { const data = await res.json(); setDocChunks(data.document?.chunks || []); }
    } catch { /* silent */ }
    setLoadingChunks(false);
  }, [token]);

  const handleExpandDoc = (docId: string) => {
    if (expandedDocId === docId) { setExpandedDocId(null); setDocChunks([]); }
    else { setExpandedDocId(docId); loadDocChunks(docId); }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!token || !confirm('Delete this document and all its chunks?')) return;
    setDeletingDocId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE', headers: getAuth() });
      if (res.ok) { setDocuments((prev) => prev.filter((d) => d.id !== docId)); if (expandedDocId === docId) { setExpandedDocId(null); setDocChunks([]); } }
    } catch { /* silent */ }
    setDeletingDocId(null);
  };

  const handleViewDoc = (doc: DocumentRecord) => {
    setViewingDoc(doc);
  };

  const handleDownloadDoc = async (doc: DocumentRecord) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}/file`, { headers: getAuth() });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  };

  // ── Drag & Drop onto folders ───────────────────────────────

  const handleDocDragStart = (e: React.DragEvent, docId: string) => {
    e.dataTransfer.setData('text/plain', docId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleFolderDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleFolderDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const docId = e.dataTransfer.getData('text/plain');
    if (docId) handleAssignFolder(docId, folderId);
  };

  // ── Search ──────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!token || !searchQuery.trim()) return;
    setSearching(true); setSearchError(''); setSearchResults(null);
    try {
      const res = await fetch('/api/documents/search', {
        method: 'POST',
        headers: { ...getAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim(), mode: searchMode, limit: 30 }),
      });
      const data = await res.json();
      if (res.ok) { setSearchResults(data); if (data.results.length === 0) setSearchError(`No results for "${searchQuery.trim()}"`); }
      else { setSearchError(data.error || 'Search failed.'); }
    } catch { setSearchError('Search failed.'); }
    setSearching(false);
  }, [token, searchQuery, searchMode]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSearch(); } };

  const handleTabChange = (tab: TabState) => { setActiveTab(tab); };

  // ── Render ──────────────────────────────────────────────────

  const searchModes: { mode: SearchMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'fulltext', label: 'Full Text', icon: <Type className="w-3 h-3" /> },
    { mode: 'phrase', label: 'Phrase', icon: <FileText className="w-3 h-3" /> },
    { mode: 'boolean', label: 'Boolean', icon: <Hash className="w-3 h-3" /> },
    { mode: 'fuzzy', label: 'Fuzzy', icon: <Filter className="w-3 h-3" /> },
  ];

  // Count documents per folder (using all docs, not just filtered)
  const unfiledCount = documents.filter((d) => !d.folderId).length;
  // We derive counts from the current data; for accuracy, the counts in pills reflect the visible set

  // If viewing a document, show the fullscreen viewer
  if (viewingDoc) {
    return <DocumentViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />;
  }

  return (
    <div className="space-y-3 px-3 py-2 animate-fadeIn">
      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-secondary/30 rounded-xl">
        {([
          { key: 'upload' as TabState, label: 'Upload', icon: <Upload className="w-3 h-3" /> },
          { key: 'library' as TabState, label: 'Library', icon: <Database className="w-3 h-3" /> },
          { key: 'search' as TabState, label: 'Search', icon: <Search className="w-3 h-3" /> },
        ]).map(({ key, label, icon }) => (
          <button key={key} onClick={() => handleTabChange(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all active:scale-95 ${
              activeTab === key ? 'bg-pri-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}>{icon}{label}</button>
        ))}
      </div>

      {/* ═══ UPLOAD TAB ═══ */}
      {activeTab === 'upload' && (
        <div className="space-y-3">
          {!uploading ? (
            <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-pri-500 bg-pri-500/10' : 'border-border/50 hover:border-pri-500/30 hover:bg-secondary/20'}`}>
              <input ref={fileRef} type="file" onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
                accept=".pdf,.txt,.md,.docx,.doc,.rtf,.html,.htm,.csv,.json,.xml,.yaml,.yml,.log,.png,.jpg,.jpeg,.gif,.webp" className="hidden" />
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-pri-500/10 flex items-center justify-center"><Upload className="w-7 h-7 text-pri-400" /></div>
                <div>
                  <span className="text-sm font-bold text-foreground block">Drop document here or click to upload</span>
                  <span className="text-xs text-muted-foreground mt-1 block">PDF, TXT, MD, DOCX, CSV, JSON, XML, images, and more</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50 border border-border/30"><File className="w-3 h-3 text-muted-foreground" /><span className="text-[9px] text-muted-foreground">Save to Disk</span></div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50 border border-border/30"><Eye className="w-3 h-3 text-muted-foreground" /><span className="text-[9px] text-muted-foreground">View & Scroll</span></div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50 border border-border/30"><Folder className="w-3 h-3 text-muted-foreground" /><span className="text-[9px] text-muted-foreground">Organize</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-pri-400 animate-spin" />
              <span className="text-sm text-muted-foreground">{uploadProgress || 'Processing document...'}</span>
              <span className="text-[10px] text-muted-foreground">Saving file, extracting text, building chunks...</span>
            </div>
          )}
          {uploadError && <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{uploadError}</div>}
          {uploadSuccess && <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-400"><CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />{uploadSuccess}</div>}

          <div className="px-3 py-3 rounded-xl bg-secondary/30 border border-border/30">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Processing Pipeline</h4>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {['Upload File', 'Save to Disk', 'Extract Text', 'Chunk & Index'].map((step, i) => (
                <div key={step} className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-pri-500/20 flex items-center justify-center"><span className="text-[8px] font-bold text-pri-400">{i + 1}</span></div>
                  <span>{step}</span>
                  {i < 3 && <ChevronRight className="w-3 h-3" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ LIBRARY TAB ═══ */}
      {activeTab === 'library' && (
        <div className="space-y-3">
          {/* ── Folder Filter Bar ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1 flex-wrap">
                {/* All documents pill */}
                <button
                  onClick={() => setActiveFolderId(null)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${
                    activeFolderId === null
                      ? 'bg-pri-600 text-white shadow-lg'
                      : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  All
                </button>
                {/* Unfiled pill */}
                <button
                  onClick={() => setActiveFolderId('none')}
                  onDragOver={(e) => handleFolderDragOver(e, 'none')}
                  onDragLeave={handleFolderDragLeave}
                  onDrop={(e) => handleFolderDrop(e, null)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${
                    activeFolderId === 'none'
                      ? 'bg-pri-600 text-white shadow-lg'
                      : dragOverFolderId === 'none'
                        ? 'bg-pri-500/20 text-pri-400 border-2 border-dashed border-pri-500/40'
                        : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <FolderOpen className="w-3 h-3" />
                  Unfiled
                </button>
                {/* Folder pills */}
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setActiveFolderId(folder.id)}
                    onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={(e) => handleFolderDrop(e, folder.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${
                      activeFolderId === folder.id
                        ? 'bg-pri-600 text-white shadow-lg'
                        : dragOverFolderId === folder.id
                          ? 'bg-pri-500/20 text-pri-400 border-2 border-dashed border-pri-500/40'
                          : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Folder className="w-3 h-3" />
                    <span className="truncate max-w-20">{folder.name}</span>
                  </button>
                ))}
              </div>
              {/* New folder button */}
              {showNewFolderInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setShowNewFolderInput(false); setNewFolderName(''); } }}
                    placeholder="Folder name..."
                    autoFocus
                    className="w-28 px-2 py-1 rounded-lg text-[10px] bg-secondary border border-border focus:border-pri-500/40 focus:outline-none text-foreground placeholder:text-muted-foreground/50"
                  />
                  <button onClick={handleCreateFolder} className="p-1 rounded-lg bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95">
                    <CheckCircle className="w-3 h-3" />
                  </button>
                  <button onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewFolderInput(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
                  title="Create new folder"
                >
                  <FolderPlus className="w-3 h-3" />
                </button>
              )}
            </div>
            {dragOverFolderId !== null && (
              <span className="text-[9px] text-pri-400 animate-pulse">Drop document here to move it into this folder</span>
            )}
          </div>

          {/* Header row */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Document Library ({documents.length})
              {activeFolderId && activeFolderId !== 'none' && (
                <span className="ml-1.5 text-pri-400 normal-case tracking-normal">
                  in {folders.find((f) => f.id === activeFolderId)?.name || 'folder'}
                </span>
              )}
              {activeFolderId === 'none' && (
                <span className="ml-1.5 text-pri-400 normal-case tracking-normal">unfiled</span>
              )}
            </span>
            <button onClick={() => { loadDocuments(); loadFolders(); }} disabled={loadingDocs} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95">
              <RefreshCw className={`w-3 h-3 ${loadingDocs ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>

          {!loadingDocs && documents.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Database className="w-10 h-10 text-muted-foreground/30" />
              <span className="text-sm text-muted-foreground">
                {activeFolderId ? 'No documents in this folder' : 'No documents uploaded yet'}
              </span>
              <button onClick={() => handleTabChange('upload')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95"><Upload className="w-3 h-3" />Upload First Document</button>
            </div>
          )}

          {loadingDocs && <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-pri-400 animate-spin" /></div>}

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl bg-secondary/30 border border-border/30 overflow-hidden relative"
                draggable
                onDragStart={(e) => handleDocDragStart(e, doc.id)}
              >
                {/* Drag indicator */}
                <GripVertical className="absolute left-1 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/20 cursor-grab" />
                <div className="flex items-center gap-2 px-3 py-2 pl-5">
                  <button onClick={() => handleExpandDoc(doc.id)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                    {expandedDocId === doc.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  {fileIcon(doc.fileName, doc.mimeType)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground truncate">{doc.title}</span>
                      {doc.folder && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[8px] font-bold bg-pri-500/10 text-pri-400 border border-pri-500/20 whitespace-nowrap">
                          <Folder className="w-2 h-2" />{doc.folder.name}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground">{formatFileSize(doc.fileSize)} • {doc.pageCount > 0 ? `${doc.pageCount} pg • ` : ''}{doc.chunkCount} chunks • {formatDate(doc.createdAt)}</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColor(doc.status)}`}>
                    {doc.status === 'ready' ? 'Ready' : doc.status === 'processing' ? 'Processing' : 'Error'}
                  </span>

                  {/* View button — always show for viewable files regardless of processing status */}
                  {isViewableFile(doc.mimeType, doc.fileName) && (
                    <button
                      onClick={() => handleViewDoc(doc)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-pri-600/20 text-pri-400 hover:bg-pri-600/30 hover:text-pri-300 transition-all active:scale-95"
                      title="View document"
                    >
                      <Eye className="w-3 h-3" />
                      <span className="hidden sm:inline">View</span>
                    </button>
                  )}

                  {/* Download button */}
                  {doc.status === 'ready' && (
                    <button
                      onClick={() => handleDownloadDoc(doc)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                      title="Download file"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  )}

                  {/* Folder assignment button */}
                  <button
                    onClick={() => setFolderDropdownDocId(folderDropdownDocId === doc.id ? null : doc.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-pri-400 hover:bg-pri-500/10 transition-all"
                    title="Move to folder"
                  >
                    {doc.folderId ? <Folder className="w-3.5 h-3.5 text-pri-400" /> : <FolderPlus className="w-3.5 h-3.5" />}
                  </button>

                  <button onClick={() => handleDeleteDoc(doc.id)} disabled={deletingDocId === doc.id} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                    {deletingDocId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {/* Folder dropdown */}
                {folderDropdownDocId === doc.id && (
                  <FolderDropdown
                    folders={folders}
                    currentFolderId={doc.folderId}
                    onAssign={(folderId) => handleAssignFolder(doc.id, folderId)}
                    onDismiss={() => setFolderDropdownDocId(null)}
                  />
                )}
                {expandedDocId === doc.id && (
                  <div className="border-t border-border/30 px-3 py-2 max-h-[300px] overflow-y-auto">
                    {loadingChunks ? <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 text-pri-400 animate-spin" /></div> :
                    docChunks.length === 0 ? <span className="text-[10px] text-muted-foreground">No text chunks extracted.</span> : (
                      <div className="space-y-2">
                        {docChunks.slice(0, 20).map((chunk) => (
                          <div key={chunk.id} className="px-2 py-1.5 rounded-lg bg-background/50 border border-border/20">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-bold text-pri-400">Page {chunk.pageNumber}</span>
                              {chunk.chunkIndex > 0 && <span className="text-[9px] text-muted-foreground">Chunk #{chunk.chunkIndex + 1}</span>}
                              <span className="text-[9px] text-muted-foreground ml-auto">{chunk.charCount.toLocaleString()} chars</span>
                            </div>
                            <p className="text-[10px] text-foreground/70 leading-relaxed line-clamp-4 font-mono">{chunk.content.slice(0, 300)}{chunk.content.length > 300 ? '...' : ''}</p>
                          </div>
                        ))}
                        {docChunks.length > 20 && <span className="text-[10px] text-muted-foreground text-center block">...and {docChunks.length - 20} more chunks</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SEARCH TAB ═══ */}
      {activeTab === 'search' && (
        <div className="space-y-3">
          <div className="flex gap-1 p-1 bg-secondary/20 rounded-lg">
            {searchModes.map(({ mode, label, icon }) => (
              <button key={mode} onClick={() => setSearchMode(mode)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[9px] font-bold rounded-md transition-all active:scale-95 ${
                  searchMode === mode ? 'bg-card text-pri-400 shadow-sm border border-border/30' : 'text-muted-foreground hover:text-foreground'
                }`}>{icon}{label}</button>
            ))}
          </div>

          <div className="px-2 py-1.5 rounded-lg bg-secondary/20 text-[10px] text-muted-foreground">
            {searchMode === 'fulltext' && 'Search individual words. Separate with spaces: firewall incident compliance'}
            {searchMode === 'phrase' && 'Exact phrase match: "firewall configuration"'}
            {searchMode === 'boolean' && 'Use operators: firewall AND access, vpn OR policy, backup NOT cloud'}
            {searchMode === 'fuzzy' && 'Partial & typo matching: config*, securty*'}
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearchKeyDown}
                placeholder={searchMode === 'boolean' ? 'firewall AND access' : searchMode === 'phrase' ? '"acceptable use policy"' : 'Search documents...'}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-secondary/50 border border-border/30 focus:border-pri-500/40 focus:outline-none text-foreground placeholder:text-muted-foreground/50" />
            </div>
            <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95 disabled:opacity-50">
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}Search
            </button>
          </div>

          {searchError && !searchResults && <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{searchError}</div>}

          {searchResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold text-muted-foreground">{searchResults.summary.totalMatches} result{searchResults.summary.totalMatches !== 1 ? 's' : ''} in {searchResults.summary.matchingDocuments} document{searchResults.summary.matchingDocuments !== 1 ? 's' : ''}</span>
              </div>
              {searchResults.results.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8"><Search className="w-8 h-8 text-muted-foreground/30" /><span className="text-xs text-muted-foreground">No matches found</span></div>
              ) : (
                <div className="space-y-2 max-h-[450px] overflow-y-auto">
                  {searchResults.results.map((result) => (
                    <div key={result.id} className="rounded-xl bg-secondary/30 border border-border/30 p-3 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-3.5 h-3.5 text-pri-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-foreground truncate">{result.document.title}</span>
                        <span className="text-[9px] text-muted-foreground ml-auto">Page {result.pageNumber}{result.chunkIndex > 0 ? ` • Chunk ${result.chunkIndex + 1}` : ''}</span>
                      </div>
                      <p className="text-[11px] text-foreground/80 leading-relaxed font-mono whitespace-pre-wrap">{result.snippet}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!searchResults && !searching && (
            <div className="px-3 py-3 rounded-xl bg-secondary/20 border border-border/20">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Search Tips</h4>
              <div className="space-y-1.5 text-[10px] text-muted-foreground">
                <div className="flex items-start gap-2"><Type className="w-3 h-3 mt-0.5 flex-shrink-0" /><span><strong className="text-foreground">Full Text:</strong> firewall incident compliance</span></div>
                <div className="flex items-start gap-2"><FileText className="w-3 h-3 mt-0.5 flex-shrink-0" /><span><strong className="text-foreground">Phrase:</strong> &quot;firewall configuration&quot;</span></div>
                <div className="flex items-start gap-2"><Hash className="w-3 h-3 mt-0.5 flex-shrink-0" /><span><strong className="text-foreground">Boolean:</strong> vpn AND policy, backup NOT cloud</span></div>
                <div className="flex items-start gap-2"><Filter className="w-3 h-3 mt-0.5 flex-shrink-0" /><span><strong className="text-foreground">Fuzzy:</strong> config*, securty* (typo-tolerant)</span></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

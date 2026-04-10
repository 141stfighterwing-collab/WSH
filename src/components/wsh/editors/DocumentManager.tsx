'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, File, Loader2, Trash2, AlertCircle, CheckCircle,
  Search, ChevronDown, ChevronRight, Database, Filter, BookOpen,
  Hash, Type, RefreshCw,
} from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

// ── Types ──────────────────────────────────────────────────────

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

/** Get auth headers — reuse the store's token */
function getAuth(): Record<string, string> {
  const token = useWSHStore.getState().user.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Component ──────────────────────────────────────────────────

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

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('fulltext');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const token = user.token;

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
      const res = await fetch('/api/documents', { headers: getAuth() });
      if (res.ok) { const data = await res.json(); setDocuments(data.documents || []); }
    } catch { /* silent */ }
    setLoadingDocs(false);
  }, [token]);

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

  const handleTabChange = (tab: TabState) => { setActiveTab(tab); if (tab === 'library' && documents.length === 0) loadDocuments(); };

  // ── Render ──────────────────────────────────────────────────

  const searchModes: { mode: SearchMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'fulltext', label: 'Full Text', icon: <Type className="w-3 h-3" /> },
    { mode: 'phrase', label: 'Phrase', icon: <FileText className="w-3 h-3" /> },
    { mode: 'boolean', label: 'Boolean', icon: <Hash className="w-3 h-3" /> },
    { mode: 'fuzzy', label: 'Fuzzy', icon: <Filter className="w-3 h-3" /> },
  ];

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
                accept=".pdf,.txt,.md,.docx,.doc,.rtf,.html,.htm,.csv,.json,.xml,.yaml,.yml,.log" className="hidden" />
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-pri-500/10 flex items-center justify-center"><Upload className="w-7 h-7 text-pri-400" /></div>
                <div>
                  <span className="text-sm font-bold text-foreground block">Drop document here or click to upload</span>
                  <span className="text-xs text-muted-foreground mt-1 block">PDF, TXT, MD, DOCX, CSV, JSON, XML, and more</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50 border border-border/30"><File className="w-3 h-3 text-muted-foreground" /><span className="text-[9px] text-muted-foreground">Save to Disk</span></div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50 border border-border/30"><BookOpen className="w-3 h-3 text-muted-foreground" /><span className="text-[9px] text-muted-foreground">Extract & Chunk</span></div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50 border border-border/30"><Search className="w-3 h-3 text-muted-foreground" /><span className="text-[9px] text-muted-foreground">Full-Text Index</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-pri-400 animate-spin" />
              <span className="text-sm text-muted-foreground">{uploadProgress || 'Processing document...'}</span>
              <span className="text-[10px] text-muted-foreground">Extracting text, building chunks, indexing...</span>
            </div>
          )}
          {uploadError && <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{uploadError}</div>}
          {uploadSuccess && <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-400"><CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />{uploadSuccess}</div>}

          <div className="px-3 py-3 rounded-xl bg-secondary/30 border border-border/30">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Processing Pipeline</h4>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {['Upload PDF', 'Save to Disk', 'Extract Text', 'Chunk & Index'].map((step, i) => (
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
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Document Library ({documents.length})</span>
            <button onClick={loadDocuments} disabled={loadingDocs} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95">
              <RefreshCw className={`w-3 h-3 ${loadingDocs ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>

          {!loadingDocs && documents.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Database className="w-10 h-10 text-muted-foreground/30" />
              <span className="text-sm text-muted-foreground">No documents uploaded yet</span>
              <button onClick={() => handleTabChange('upload')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95"><Upload className="w-3 h-3" />Upload First Document</button>
            </div>
          )}

          {loadingDocs && <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-pri-400 animate-spin" /></div>}

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {documents.map((doc) => (
              <div key={doc.id} className="rounded-xl bg-secondary/30 border border-border/30 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button onClick={() => handleExpandDoc(doc.id)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                    {expandedDocId === doc.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  <File className="w-4 h-4 text-pri-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate block">{doc.title}</span>
                    <span className="text-[9px] text-muted-foreground">{formatFileSize(doc.fileSize)} • {doc.pageCount} pg • {doc.chunkCount} chunks • {formatDate(doc.createdAt)}</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColor(doc.status)}`}>
                    {doc.status === 'ready' ? 'Ready' : doc.status === 'processing' ? 'Processing' : 'Error'}
                  </span>
                  <button onClick={() => handleDeleteDoc(doc.id)} disabled={deletingDocId === doc.id} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                    {deletingDocId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {expandedDocId === doc.id && (
                  <div className="border-t border-border/30 px-3 py-2 max-h-[300px] overflow-y-auto">
                    {loadingChunks ? <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 text-pri-400 animate-spin" /></div> :
                    docChunks.length === 0 ? <span className="text-[10px] text-muted-foreground">No chunks.</span> : (
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

'use client';

import { useState } from 'react';
import { Code2, Copy, Check } from 'lucide-react';

interface CodeEditorProps {
  title: string;
  setTitle: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
}

export default function CodeEditor({ title, setTitle, content, setContent }: CodeEditorProps) {
  const [subject, setSubject] = useState(() => {
    try { return JSON.parse(content).subject || ''; } catch { return ''; }
  });
  const [description, setDescription] = useState(() => {
    try { return JSON.parse(content).description || ''; } catch { return ''; }
  });
  const [code, setCode] = useState(() => {
    try { return JSON.parse(content).code || ''; } catch { return ''; }
  });
  const [language, setLanguage] = useState(() => {
    try { return JSON.parse(content).language || 'plaintext'; } catch { return 'plaintext'; }
  });
  const [copied, setCopied] = useState(false);

  const sync = (updates: Partial<{ subject: string; description: string; code: string; language: string }>) => {
    const next = { subject, description, code, language, ...updates };
    setSubject(next.subject);
    setDescription(next.description);
    setCode(next.code);
    setLanguage(next.language);
    setContent(JSON.stringify(next));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langOptions = [
    'plaintext','javascript','typescript','python','rust','go','java','csharp','cpp','c',
    'ruby','php','swift','kotlin','sql','bash','powershell','html','css','json','yaml',
    'dockerfile','markdown',
  ];

  return (
    <div className="space-y-3 px-3 py-2 animate-fadeIn">
      {/* Subject */}
      <div>
        <label className="micro-label text-muted-foreground mb-1 block">Subject / Topic</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => sync({ subject: e.target.value })}
          placeholder="e.g. React hooks, API design, Algorithm..."
          className="w-full px-3 py-2 rounded-xl text-sm bg-secondary/50 border border-border/30 focus:border-pri-500/40 focus:outline-none text-foreground placeholder:text-muted-foreground/40 transition-all"
        />
      </div>

      {/* Description */}
      <div>
        <label className="micro-label text-muted-foreground mb-1 block">Description</label>
        <textarea
          value={description}
          onChange={(e) => sync({ description: e.target.value })}
          placeholder="Describe what this code does, its purpose, and key details..."
          rows={3}
          className="w-full px-3 py-2 rounded-xl text-sm bg-secondary/50 border border-border/30 focus:border-pri-500/40 focus:outline-none text-foreground placeholder:text-muted-foreground/40 transition-all resize-y"
        />
      </div>

      {/* Language selector + Copy button */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={language}
            onChange={(e) => sync({ language: e.target.value })}
            className="px-2 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/30 focus:border-pri-500/40 focus:outline-none text-foreground cursor-pointer"
          >
            {langOptions.map(l => (
              <option key={l} value={l}>{l === 'plaintext' ? 'Plain Text' : l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95 border border-border/30"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Code Editor */}
      <div className="relative">
        <div className={`text-[9px] font-bold uppercase tracking-widest px-2 pt-1.5 ${language !== 'plaintext' ? 'text-pri-400' : 'text-muted-foreground'}`}>
          {language !== 'plaintext' ? language.toUpperCase() : 'SOURCE CODE'}
        </div>
        <textarea
          value={code}
          onChange={(e) => sync({ code: e.target.value })}
          placeholder={"// Paste or write your code here...\n// Syntax language selected above"}
          spellCheck={false}
          className="w-full min-h-[300px] px-3 py-2 rounded-xl text-[13px] font-mono leading-relaxed bg-[#0d1117] text-[#c9d1d9] border border-[#30363d] focus:border-pri-500/50 focus:outline-none placeholder:text-[#484f58] resize-y selection:bg-pri-500/30"
        />
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

const TYPE_COLORS: Record<string, string> = {
  quick: '#60a5fa',
  notebook: '#4ade80',
  deep: '#c084fc',
  code: '#fb923c',
  project: '#f472b6',
  document: '#22d3ee',
};

const TYPE_GLOW_COLORS: Record<string, string> = {
  quick: 'rgba(96, 165, 250, 0.6)',
  notebook: 'rgba(74, 222, 128, 0.6)',
  deep: 'rgba(192, 132, 252, 0.6)',
  code: 'rgba(251, 146, 60, 0.6)',
  project: 'rgba(244, 114, 182, 0.6)',
  document: 'rgba(34, 211, 238, 0.6)',
};

interface SimNode {
  id: string;
  title: string;
  type: string;
  tags: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface SimEdge {
  source: string;
  target: string;
  weight: number;
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default function MindMap() {
  const { mindMapOpen, setMindMapOpen, notes, setActiveNoteId, setEditorTitle, setEditorContent, setEditorRawContent, setActiveNoteType, setEditorTags } = useWSHStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<SimEdge[]>([]);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ nodeId: string | null; offsetX: number; offsetY: number }>({ nodeId: null, offsetX: 0, offsetY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const panningRef = useRef<{ active: boolean; startX: number; startY: number; panStartX: number; panStartY: number }>({
    active: false, startX: 0, startY: 0, panStartX: 0, panStartY: 0,
  });
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  const activeNotes = useMemo(() => notes.filter((n) => !n.isDeleted), [notes]);

  // Calculate edges from shared tags
  const calculatedEdges = useMemo(() => {
    const edgeMap = new Map<string, SimEdge>();
    for (let i = 0; i < activeNotes.length; i++) {
      for (let j = i + 1; j < activeNotes.length; j++) {
        const shared = activeNotes[i].tags.filter((t) => activeNotes[j].tags.includes(t));
        if (shared.length > 0) {
          const key = [activeNotes[i].id, activeNotes[j].id].sort().join('--');
          edgeMap.set(key, {
            source: activeNotes[i].id,
            target: activeNotes[j].id,
            weight: shared.length,
          });
        }
      }
    }
    return Array.from(edgeMap.values());
  }, [activeNotes]);

  // Initialize nodes
  useEffect(() => {
    if (!mindMapOpen) return;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    nodesRef.current = activeNotes.map((note, i) => {
      const angle = (2 * Math.PI * i) / activeNotes.length;
      const radius = Math.min(dimensions.width, dimensions.height) * 0.25;
      return {
        id: note.id,
        title: note.title || 'Untitled',
        type: note.type,
        tags: note.tags,
        x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
        y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
      };
    });
    edgesRef.current = calculatedEdges;
  }, [mindMapOpen, activeNotes, calculatedEdges, dimensions]);

  // Resize handler
  useEffect(() => {
    if (!mindMapOpen) return;
    const updateSize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [mindMapOpen]);

  // Physics simulation
  useEffect(() => {
    if (!mindMapOpen) return;

    const sim = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      if (nodes.length === 0) return;

      const alpha = 0.3;
      const repulsionStrength = 5000;
      const attractionStrength = 0.005;
      const centerStrength = 0.001;
      const damping = 0.85;
      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2;

      // Reset accelerations
      for (const node of nodes) {
        node.vx = 0;
        node.vy = 0;
      }

      // Repulsion between all pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = repulsionStrength / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) continue;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idealDist = 150;
        const force = (dist - idealDist) * attractionStrength * edge.weight;
        const fx = (dx / Math.max(dist, 1)) * force;
        const fy = (dy / Math.max(dist, 1)) * force;
        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      }

      // Center gravity
      for (const node of nodes) {
        node.vx += (cx - node.x) * centerStrength;
        node.vy += (cy - node.y) * centerStrength;
      }

      // Update positions
      for (const node of nodes) {
        if (dragRef.current.nodeId === node.id) continue;
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx * alpha;
        node.y += node.vy * alpha;
        // Keep in bounds
        node.x = Math.max(50, Math.min(dimensions.width - 50, node.x));
        node.y = Math.max(50, Math.min(dimensions.height - 50, node.y));
      }

      // Re-render SVG content
      updateSVG();

      animRef.current = requestAnimationFrame(sim);
    };

    const updateSVG = () => {
      const svg = svgRef.current;
      if (!svg) return;

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const z = zoomRef.current;
      const pan = panRef.current;

      // Build edge lines
      let edgesHTML = '';
      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) continue;
        const opacity = Math.min(0.15 + edge.weight * 0.15, 0.6);
        const strokeWidth = Math.min(1 + edge.weight * 0.5, 3);
        edgesHTML += `<line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke="rgba(148,163,184,${opacity})" stroke-width="${strokeWidth}" stroke-dasharray="${edge.weight > 1 ? 'none' : '4,4'}"/>`;
      }

      // Build node circles + labels
      let nodesHTML = '';
      for (const node of nodes) {
        const color = TYPE_COLORS[node.type] || TYPE_COLORS.quick;
        const glowColor = TYPE_GLOW_COLORS[node.type] || TYPE_GLOW_COLORS.quick;
        const isHovered = hoveredNode === node.id;
        const radius = isHovered ? 22 : 16;

        nodesHTML += `<g data-node-id="${node.id}">`;
        // Glow
        nodesHTML += `<circle cx="${node.x}" cy="${node.y}" r="${radius + 8}" fill="none" stroke="${glowColor}" stroke-width="2" opacity="${isHovered ? 0.8 : 0.3}"/>`;
        // Main circle
        nodesHTML += `<circle cx="${node.x}" cy="${node.y}" r="${radius}" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2" style="cursor:pointer"/>`;
        // Type initial
        nodesHTML += `<text x="${node.x}" y="${node.y + 1}" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-size="11" font-weight="900" style="pointer-events:none">${node.type.charAt(0).toUpperCase()}</text>`;
        // Title label
        nodesHTML += `<text x="${node.x}" y="${node.y + radius + 14}" text-anchor="middle" fill="rgba(226,232,240,${isHovered ? 1 : 0.7})" font-size="9" font-weight="700" style="pointer-events:none">${escapeHtml(node.title.length > 20 ? node.title.slice(0, 20) + '...' : node.title)}</text>`;
        nodesHTML += `</g>`;
      }

      // Build the inner SVG
      const innerHTML = `<g transform="translate(${pan.x},${pan.y}) scale(${z})">${edgesHTML}${nodesHTML}</g>`;

      // Update SVG content elements
      const container = svg.querySelector('#mindmap-content');
      if (container) {
        container.innerHTML = innerHTML;
      }
    };

    animRef.current = requestAnimationFrame(sim);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [mindMapOpen, dimensions, hoveredNode]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const target = (e.target as Element).closest('[data-node-id]');
    if (target) {
      const nodeId = target.getAttribute('data-node-id');
      if (nodeId) {
        const node = nodesRef.current.find((n) => n.id === nodeId);
        if (node) {
          dragRef.current = {
            nodeId,
            offsetX: e.clientX / zoomRef.current - node.x,
            offsetY: e.clientY / zoomRef.current - node.y,
          };
          setIsDragging(true);
        }
      }
    } else {
      panningRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        panStartX: panRef.current.x,
        panStartY: panRef.current.y,
      };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current.nodeId) {
      const node = nodesRef.current.find((n) => n.id === dragRef.current.nodeId);
      if (node) {
        node.x = e.clientX / zoomRef.current - dragRef.current.offsetX;
        node.y = e.clientY / zoomRef.current - dragRef.current.offsetY;
        node.vx = 0;
        node.vy = 0;
      }
    } else if (panningRef.current.active) {
      panRef.current.x = panningRef.current.panStartX + (e.clientX - panningRef.current.startX) / zoomRef.current;
      panRef.current.y = panningRef.current.panStartY + (e.clientY - panningRef.current.startY) / zoomRef.current;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = { nodeId: null, offsetX: 0, offsetY: 0 };
    panningRef.current.active = false;
    setIsDragging(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = (e.target as Element).closest('[data-node-id]');
    if (target) {
      const nodeId = target.getAttribute('data-node-id');
      if (nodeId) {
        const note = notes.find((n) => n.id === nodeId);
        if (note) {
          setActiveNoteId(note.id);
          setEditorTitle(note.title);
          setEditorContent(note.content);
          setEditorRawContent(note.rawContent || '');
          setActiveNoteType(note.type);
          setEditorTags(note.tags);
          setMindMapOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }
  }, [notes, setActiveNoteId, setEditorTitle, setEditorContent, setEditorRawContent, setActiveNoteType, setEditorTags, setMindMapOpen]);

  const handleZoomIn = useCallback(() => {
    zoomRef.current = Math.min(zoomRef.current * 1.2, 3);
    setZoom(zoomRef.current);
  }, []);

  const handleZoomOut = useCallback(() => {
    zoomRef.current = Math.max(zoomRef.current / 1.2, 0.3);
    setZoom(zoomRef.current);
  }, []);

  const handleReset = useCallback(() => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setZoom(1);
  }, []);

  if (!mindMapOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/95"
        onClick={() => setMindMapOpen(false)}
      />

      {/* Mind Map Container */}
      <div className="relative w-full h-full">
        {/* Header */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
          <span className="micro-label text-pri-400">Mind Map</span>
          <span className="text-[10px] text-muted-foreground">
            {activeNotes.length} nodes · {calculatedEdges.length} connections
          </span>
        </div>

        {/* Close button */}
        <button
          onClick={() => setMindMapOpen(false)}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 text-muted-foreground hover:text-foreground hover:bg-slate-700 transition-all active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Zoom controls */}
        <div className="absolute top-14 right-4 z-10 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-xl bg-slate-800/80 text-muted-foreground hover:text-foreground hover:bg-slate-700 transition-all active:scale-95"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-xl bg-slate-800/80 text-muted-foreground hover:text-foreground hover:bg-slate-700 transition-all active:scale-95"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-800/80 text-muted-foreground hover:text-foreground hover:bg-slate-700 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
          <span className="micro-label text-muted-foreground block mb-2">Legend</span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[9px] font-bold text-muted-foreground uppercase">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zoom indicator */}
        <div className="absolute bottom-4 right-4 z-10 px-3 py-1.5 rounded-full bg-slate-800/80 text-[10px] font-mono text-muted-foreground">
          {Math.round(zoom * 100)}%
        </div>

        {/* SVG Canvas */}
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="absolute inset-0"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <defs>
            <radialGradient id="mindmap-glow">
              <stop offset="0%" stopColor="rgba(99,102,241,0.15)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#mindmap-glow)" />
          <g id="mindmap-content" />
        </svg>

        {/* Empty state */}
        {activeNotes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg text-muted-foreground/60">No notes to visualize</p>
              <p className="text-xs text-muted-foreground/40 mt-1">Create notes with tags to see connections</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

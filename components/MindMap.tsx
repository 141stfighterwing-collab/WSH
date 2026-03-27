'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

interface Node {
  id: string;
  title: string;
  type: string;
  folder: { id: string; name: string } | null;
  tags: string[];
  color: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  relation: string;
  tag?: string;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
  stats: {
    totalNotes: number;
    totalEdges: number;
    byType: Record<string, number>;
    byFolder: Record<string, number>;
  };
}

interface MindMapProps {
  notes: any[];
  folders: any[];
  onNoteClick: (note: any) => void;
  onClose: () => void;
}

// Node colors by type
const TYPE_COLORS: Record<string, string> = {
  quick: '#f59e0b',      // amber
  deep: '#3b82f6',       // blue
  project: '#22c55e',    // green
  notebook: '#8b5cf6',   // purple
};

// Edge colors by relation
const EDGE_COLORS: Record<string, string> = {
  explicit: '#ef4444',   // red
  tag: '#f59e0b',        // amber
  folder: '#6b7280',     // gray
};

const MindMap: React.FC<MindMapProps> = ({ notes, folders, onNoteClick, onClose }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filterFolder, setFilterFolder] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [clusterMode, setClusterMode] = useState<'none' | 'folder' | 'tag' | 'type'>('none');
  
  // Node positions for simulation
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Get all unique tags from notes
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(n => n.tags?.forEach((t: string) => tags.add(t)));
    return Array.from(tags);
  }, [notes]);

  // Convert notes to graph data
  useEffect(() => {
    if (notes.length === 0) return;

    // Build nodes
    const nodes: Node[] = notes.map((note, index) => ({
      id: note.id,
      title: note.title,
      type: note.type || 'quick',
      folder: note.folderId ? folders.find(f => f.id === note.folderId) : null,
      tags: note.tags || [],
      color: TYPE_COLORS[note.type] || TYPE_COLORS.quick,
      x: 0,
      y: 0,
    }));

    // Build edges from shared tags
    const edges: Edge[] = [];
    const edgeSet = new Set<string>();

    // Shared tags
    notes.forEach((note1, i) => {
      notes.forEach((note2, j) => {
        if (i >= j) return;
        
        const sharedTags = (note1.tags || []).filter((t: string) => (note2.tags || []).includes(t));
        if (sharedTags.length > 0) {
          const key = `${note1.id}-${note2.id}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({
              id: `tag-${i}-${j}`,
              source: note1.id,
              target: note2.id,
              type: 'shared_tag',
              weight: sharedTags.length,
              relation: 'tag',
              tag: sharedTags[0],
            });
          }
        }
      });
    });

    // Same folder
    notes.forEach((note1, i) => {
      notes.forEach((note2, j) => {
        if (i >= j) return;
        if (note1.folderId && note1.folderId === note2.folderId) {
          const key = `${note1.id}-${note2.id}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({
              id: `folder-${i}-${j}`,
              source: note1.id,
              target: note2.id,
              type: 'same_folder',
              weight: 0.5,
              relation: 'folder',
            });
          }
        }
      });
    });

    // Stats
    const stats = {
      totalNotes: nodes.length,
      totalEdges: edges.length,
      byType: nodes.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byFolder: nodes.reduce((acc, n) => {
        const name = n.folder?.name || 'Uncategorized';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    setGraphData({ nodes, edges, stats });

    // Initialize positions using force-directed layout simulation
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    const centerX = width / 2;
    const centerY = height / 2;

    // Simple circular layout with clustering
    const positions = new Map<string, { x: number; y: number }>();
    const clusterGroups: Record<string, Node[]> = {};

    if (clusterMode !== 'none') {
      nodes.forEach(node => {
        const key = clusterMode === 'folder' 
          ? (node.folder?.name || 'Uncategorized')
          : clusterMode === 'tag'
          ? (node.tags[0] || 'No Tag')
          : node.type;
        
        if (!clusterGroups[key]) clusterGroups[key] = [];
        clusterGroups[key].push(node);
      });

      const clusterKeys = Object.keys(clusterGroups);
      const clusterRadius = Math.min(width, height) * 0.35;
      
      clusterKeys.forEach((key, clusterIndex) => {
        const clusterAngle = (clusterIndex / clusterKeys.length) * 2 * Math.PI;
        const clusterX = centerX + clusterRadius * Math.cos(clusterAngle);
        const clusterY = centerY + clusterRadius * Math.sin(clusterAngle);
        
        clusterGroups[key].forEach((node, i) => {
          const angle = (i / clusterGroups[key].length) * 2 * Math.PI;
          const radius = Math.min(50, 150 / clusterGroups[key].length);
          positions.set(node.id, {
            x: clusterX + radius * Math.cos(angle),
            y: clusterY + radius * Math.sin(angle),
          });
        });
      });
    } else {
      // Circular layout
      nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI;
        const radius = Math.min(width, height) * 0.35;
        positions.set(node.id, {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });
      });
    }

    setNodePositions(positions);
  }, [notes, folders, clusterMode]);

  // Filter nodes
  const filteredNodes = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes.filter(node => {
      if (filterFolder && node.folder?.id !== filterFolder) return false;
      if (filterTag && !node.tags.includes(filterTag)) return false;
      if (filterType && node.type !== filterType) return false;
      return true;
    });
  }, [graphData, filterFolder, filterTag, filterType]);

  // Filter edges
  const filteredEdges = useMemo(() => {
    if (!graphData) return [];
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    return graphData.edges.filter(edge => 
      filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );
  }, [graphData, filteredNodes]);

  // Zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.1, Math.min(4, z * delta)));
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Node click
  const handleNodeClick = useCallback((node: Node, e: React.MouseEvent) => {
    e.stopPropagation();
    const note = notes.find(n => n.id === node.id);
    if (note) {
      onNoteClick(note);
    }
  }, [notes, onNoteClick]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Reset view
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Get node position
  const getNodePosition = (nodeId: string) => {
    const pos = nodePositions.get(nodeId);
    return pos || { x: 400, y: 300 };
  };

  if (!graphData) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <div className="text-slate-400">Loading mind map...</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-slate-900 overflow-hidden"
      style={{ minHeight: '600px' }}
    >
      {/* Top Filter Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center gap-3 flex-wrap">
        {/* Folder Filter */}
        <select
          value={filterFolder || ''}
          onChange={(e) => setFilterFolder(e.target.value || null)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
        >
          <option value="">All Folders</option>
          {folders.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        {/* Tag Filter */}
        <select
          value={filterTag || ''}
          onChange={(e) => setFilterTag(e.target.value || null)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
        >
          <option value="">All Tags</option>
          {allTags.map(t => (
            <option key={t} value={t}>#{t}</option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={filterType || ''}
          onChange={(e) => setFilterType(e.target.value || null)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
        >
          <option value="">All Types</option>
          <option value="quick">Quick</option>
          <option value="deep">Deep</option>
          <option value="project">Project</option>
          <option value="notebook">Notebook</option>
        </select>

        {/* Cluster Mode */}
        <select
          value={clusterMode}
          onChange={(e) => setClusterMode(e.target.value as any)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
        >
          <option value="none">No Clustering</option>
          <option value="folder">Cluster by Folder</option>
          <option value="tag">Cluster by Tag</option>
          <option value="type">Cluster by Type</option>
        </select>

        {/* Toggle Labels */}
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`px-3 py-1.5 rounded-lg text-sm ${
            showLabels ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          Labels
        </button>

        <div className="flex-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg">
          <button onClick={() => setZoom(z => Math.max(0.1, z / 1.2))} className="text-slate-300 hover:text-white">−</button>
          <span className="text-slate-400 text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(4, z * 1.2))} className="text-slate-300 hover:text-white">+</button>
          <button onClick={resetView} className="text-slate-400 hover:text-white ml-2">↺</button>
        </div>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
        >
          {isFullscreen ? '⤓' : '⤢'}
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium"
        >
          Exit Mind Map
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-xl p-4">
        <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">Legend</h4>
        
        {/* Node Types */}
        <div className="space-y-2 mb-4">
          <div className="text-xs text-slate-500 font-medium">Node Types</div>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-slate-300 capitalize">{type}</span>
            </div>
          ))}
        </div>

        {/* Edge Types */}
        <div className="space-y-2">
          <div className="text-xs text-slate-500 font-medium">Connections</div>
          {Object.entries(EDGE_COLORS).map(([relation, color]) => (
            <div key={relation} className="flex items-center gap-2">
              <div className="w-6 h-0.5" style={{ backgroundColor: color }} />
              <span className="text-xs text-slate-300 capitalize">{relation}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="text-xs text-slate-500 font-medium mb-2">Statistics</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400">Nodes:</span>
              <span className="text-slate-200 ml-1">{filteredNodes.length}</span>
            </div>
            <div>
              <span className="text-slate-400">Edges:</span>
              <span className="text-slate-200 ml-1">{filteredEdges.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          {/* Arrow marker for directed edges */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="20"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
          </marker>
          
          {/* Glow filter for hovered nodes */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {filteredEdges.map(edge => {
            const sourcePos = getNodePosition(edge.source);
            const targetPos = getNodePosition(edge.target);
            
            return (
              <line
                key={edge.id}
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={targetPos.x}
                y2={targetPos.y}
                stroke={EDGE_COLORS[edge.relation] || '#6b7280'}
                strokeWidth={edge.weight * 0.5}
                strokeOpacity={0.4}
                className="transition-all duration-200"
              />
            );
          })}

          {/* Nodes */}
          {filteredNodes.map(node => {
            const pos = getNodePosition(node.id);
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNode?.id === node.id;
            
            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={(e) => handleNodeClick(node, e)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
                style={{ filter: isHovered ? 'url(#glow)' : 'none' }}
              >
                {/* Node circle */}
                <circle
                  r={isHovered ? 24 : 20}
                  fill={node.color}
                  stroke={isSelected ? '#fff' : 'transparent'}
                  strokeWidth={2}
                  className="transition-all duration-200"
                />
                
                {/* Label */}
                {showLabels && (
                  <text
                    y={32}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize="11"
                    fontWeight="500"
                    className="pointer-events-none select-none"
                  >
                    {node.title.length > 15 ? `${node.title.slice(0, 15)}...` : node.title}
                  </text>
                )}

                {/* Type indicator */}
                <text
                  y={5}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="10"
                  fontWeight="bold"
                  className="pointer-events-none select-none"
                >
                  {node.type.charAt(0).toUpperCase()}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Empty state */}
      {filteredNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <p className="text-slate-400 text-lg font-medium">No notes to display</p>
            <p className="text-slate-500 text-sm mt-1">Create some notes to see them on the mind map</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MindMap;

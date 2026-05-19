'use client';

import { useMemo, type ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  Briefcase,
  Clock3,
  Database,
  FileText,
  FolderOpen,
  Gauge,
  Hash,
  Layers,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  RefreshCw,
  Sparkles,
  Tag,
  Timer,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useWSHStore, type Note } from '@/store/wshStore';

interface DayPoint {
  label: string;
  created: number;
  updated: number;
  words: number;
}

interface TypePoint {
  name: string;
  count: number;
  words: number;
}

interface FolderPoint {
  name: string;
  keeps: number;
}

interface ReviewBucket {
  label: string;
  keeps: number;
}

interface TagPoint {
  tag: string;
  count: number;
}

const TYPE_COLORS: Record<string, string> = {
  quick: '#60a5fa',
  notebook: '#34d399',
  deep: '#c084fc',
  code: '#fb923c',
  project: '#f472b6',
  document: '#22d3ee',
  'ai-prompts': '#a78bfa',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function countWords(value: string | undefined): number {
  return value?.split(/\s+/).filter(Boolean).length || 0;
}

function getAgeDays(dateValue: string): number {
  const time = new Date(dateValue).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function buildDailySeries(notes: Note[]): DayPoint[] {
  const today = new Date();

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));
    const key = toLocalDateKey(date);
    const dayNotes = notes.filter((note) => toLocalDateKey(new Date(note.createdAt)) === key);
    const updated = notes.filter((note) => toLocalDateKey(new Date(note.updatedAt)) === key).length;

    return {
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      created: dayNotes.length,
      updated,
      words: dayNotes.reduce((sum, note) => sum + countWords(note.rawContent || note.content), 0),
    };
  });
}

function buildTypeSeries(notes: Note[]): TypePoint[] {
  const counts = notes.reduce<Record<string, TypePoint>>((acc, note) => {
    const item = acc[note.type] || { name: note.type, count: 0, words: 0 };
    item.count += 1;
    item.words += countWords(note.rawContent || note.content);
    acc[note.type] = item;
    return acc;
  }, {});

  return Object.values(counts).sort((a, b) => b.count - a.count);
}

function buildFolderSeries(notes: Note[], folders: { id: string; name: string }[]): FolderPoint[] {
  const folderNames = new Map(folders.map((folder) => [folder.id, folder.name]));
  const counts = new Map<string, number>();

  notes.forEach((note) => {
    const name = note.folderId ? folderNames.get(note.folderId) || 'Unknown folder' : 'Unfiled';
    counts.set(name, (counts.get(name) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, keeps]) => ({ name, keeps }));
}

function buildReviewBuckets(notes: Note[]): ReviewBucket[] {
  const buckets: ReviewBucket[] = [
    { label: '0-2d', keeps: 0 },
    { label: '3-7d', keeps: 0 },
    { label: '8-14d', keeps: 0 },
    { label: '15-30d', keeps: 0 },
    { label: '30d+', keeps: 0 },
  ];

  notes.forEach((note) => {
    const age = getAgeDays(note.updatedAt);
    if (age <= 2) buckets[0].keeps += 1;
    else if (age <= 7) buckets[1].keeps += 1;
    else if (age <= 14) buckets[2].keeps += 1;
    else if (age <= 30) buckets[3].keeps += 1;
    else buckets[4].keeps += 1;
  });

  return buckets;
}

function getTopTags(notes: Note[]): TagPoint[] {
  const counts = new Map<string, number>();
  notes.forEach((note) => {
    note.tags.forEach((tagName) => counts.set(tagName, (counts.get(tagName) || 0) + 1));
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tagName, count]) => ({ tag: tagName, count }));
}

function buildWeekdaySeries(notes: Note[]): { day: string; keeps: number }[] {
  const counts = WEEKDAYS.map((day) => ({ day, keeps: 0 }));
  notes.forEach((note) => {
    counts[new Date(note.createdAt).getDay()].keeps += 1;
  });
  return counts;
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-black text-foreground tabular-nums">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${tone}`}>{icon}</div>
      </div>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">{detail}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-foreground">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="rounded-lg bg-secondary/60 p-2 text-pri-400">{icon}</div>
      </div>
      {children}
    </section>
  );
}

function ChartTooltip() {
  return (
    <Tooltip
      contentStyle={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        color: 'var(--foreground)',
      }}
      labelStyle={{ color: 'var(--foreground)' }}
    />
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-secondary/20 text-center">
      <div>
        <LineChartIcon className="mx-auto mb-3 h-7 w-7 text-muted-foreground/50" />
        <p className="text-sm font-bold text-muted-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground/70">Create or sync Keeps to populate this chart.</p>
      </div>
    </div>
  );
}

export default function WSHKeepsDashboard() {
  const { notes, folders, aiUsageCount, isSyncing } = useWSHStore();

  const activeNotes = useMemo(() => notes.filter((note) => !note.isDeleted), [notes]);
  const deletedNotes = notes.length - activeNotes.length;
  const totalWords = useMemo(
    () => activeNotes.reduce((sum, note) => sum + countWords(note.rawContent || note.content), 0),
    [activeNotes]
  );
  const totalChars = useMemo(
    () => activeNotes.reduce((sum, note) => sum + (note.rawContent || note.content || '').length, 0),
    [activeNotes]
  );
  const dailySeries = useMemo(() => buildDailySeries(activeNotes), [activeNotes]);
  const typeSeries = useMemo(() => buildTypeSeries(activeNotes), [activeNotes]);
  const folderSeries = useMemo(() => buildFolderSeries(activeNotes, folders), [activeNotes, folders]);
  const reviewBuckets = useMemo(() => buildReviewBuckets(activeNotes), [activeNotes]);
  const topTags = useMemo(() => getTopTags(activeNotes), [activeNotes]);
  const weekdaySeries = useMemo(() => buildWeekdaySeries(activeNotes), [activeNotes]);

  const recentlyUpdated = useMemo(
    () =>
      [...activeNotes]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6),
    [activeNotes]
  );

  const analytics = useMemo(() => {
    const uniqueTags = new Set(activeNotes.flatMap((note) => note.tags)).size;
    const linkedKeeps = activeNotes.filter((note) => note.tags.length > 0 || note.folderId).length;
    const staleKeeps = activeNotes.filter((note) => getAgeDays(note.updatedAt) >= 14).length;
    const lastSevenCreated = dailySeries.slice(-7).reduce((sum, point) => sum + point.created, 0);
    const previousSevenCreated = dailySeries.slice(-14, -7).reduce((sum, point) => sum + point.created, 0);
    const lastSevenUpdates = dailySeries.slice(-7).reduce((sum, point) => sum + point.updated, 0);
    const lastSevenWords = dailySeries.slice(-7).reduce((sum, point) => sum + point.words, 0);
    const velocityTrend = previousSevenCreated === 0
      ? lastSevenCreated * 100
      : Math.round(((lastSevenCreated - previousSevenCreated) / previousSevenCreated) * 100);
    const keepHealth = activeNotes.length === 0
      ? 0
      : Math.round(((activeNotes.length - staleKeeps) / activeNotes.length) * 100);
    const linkCoverage = activeNotes.length === 0
      ? 0
      : Math.round((linkedKeeps / activeNotes.length) * 100);
    const avgWords = activeNotes.length === 0 ? 0 : Math.round(totalWords / activeNotes.length);
    const readingMinutes = Math.max(0, Math.ceil(totalWords / 200));
    const largestKeep = activeNotes.reduce<Note | null>((largest, note) => {
      if (!largest) return note;
      return countWords(note.rawContent || note.content) > countWords(largest.rawContent || largest.content)
        ? note
        : largest;
    }, null);

    return {
      uniqueTags,
      staleKeeps,
      lastSevenCreated,
      lastSevenUpdates,
      lastSevenWords,
      velocityTrend,
      keepHealth,
      linkCoverage,
      avgWords,
      readingMinutes,
      largestKeep,
      storageEstimate: formatBytes(totalChars * 2),
    };
  }, [activeNotes, dailySeries, totalChars, totalWords]);

  const lastUpdated = recentlyUpdated[0]?.updatedAt
    ? new Date(recentlyUpdated[0].updatedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Waiting for sync';

  const hasData = activeNotes.length > 0;

  return (
    <div className="space-y-5 pb-6">
      <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-pri-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-pri-400">
                WSH Keeps Analytics
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
              Keeps Dashboard
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Stable workspace analytics from notes, folders, tags, updates, content size, and AI usage.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:min-w-[34rem]">
            <div className="rounded-lg bg-secondary/40 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Sync</p>
              <p className="mt-1 font-bold text-foreground">{isSyncing ? 'Refreshing' : 'Current'}</p>
            </div>
            <div className="rounded-lg bg-secondary/40 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Updated</p>
              <p className="mt-1 truncate font-bold text-foreground">{lastUpdated}</p>
            </div>
            <div className="rounded-lg bg-secondary/40 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Window</p>
              <p className="mt-1 font-bold text-foreground">30 days</p>
            </div>
            <div className="rounded-lg bg-secondary/40 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Storage</p>
              <p className="mt-1 font-bold text-foreground">{analytics.storageEstimate}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Keeps"
          value={activeNotes.length.toLocaleString()}
          detail={`${deletedNotes} in trash or archived`}
          icon={<Database className="h-5 w-5" />}
          tone="bg-blue-500/15 text-blue-300"
        />
        <MetricCard
          label="Words"
          value={totalWords.toLocaleString()}
          detail={`${analytics.avgWords.toLocaleString()} average words per Keep`}
          icon={<BookOpen className="h-5 w-5" />}
          tone="bg-green-500/15 text-green-300"
        />
        <MetricCard
          label="Link Coverage"
          value={`${analytics.linkCoverage}%`}
          detail={`${analytics.uniqueTags} tags across ${folders.length} folders`}
          icon={<Hash className="h-5 w-5" />}
          tone="bg-cyan-500/15 text-cyan-300"
        />
        <MetricCard
          label="Keep Health"
          value={`${analytics.keepHealth}%`}
          detail={`${analytics.staleKeeps} Keeps need review`}
          icon={<Gauge className="h-5 w-5" />}
          tone="bg-amber-500/15 text-amber-300"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="7-Day Creates"
          value={analytics.lastSevenCreated.toLocaleString()}
          detail={`${analytics.velocityTrend >= 0 ? '+' : ''}${analytics.velocityTrend}% versus prior week`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="bg-emerald-500/15 text-emerald-300"
        />
        <MetricCard
          label="7-Day Updates"
          value={analytics.lastSevenUpdates.toLocaleString()}
          detail={`${analytics.lastSevenWords.toLocaleString()} new words this week`}
          icon={<RefreshCw className="h-5 w-5" />}
          tone="bg-indigo-500/15 text-indigo-300"
        />
        <MetricCard
          label="Reading Time"
          value={`${analytics.readingMinutes}m`}
          detail="Estimated at 200 words per minute"
          icon={<Timer className="h-5 w-5" />}
          tone="bg-purple-500/15 text-purple-300"
        />
        <MetricCard
          label="AI Usage"
          value={aiUsageCount.toLocaleString()}
          detail="Synthesis usage units tracked locally"
          icon={<Sparkles className="h-5 w-5" />}
          tone="bg-pink-500/15 text-pink-300"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Panel
          title="30-Day Activity"
          subtitle="Created Keeps, updated Keeps, and new words by day"
          icon={<LineChartIcon className="h-4 w-4" />}
        >
          {hasData ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySeries} margin={{ top: 8, right: 16, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="wordsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={18} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip />
                  <Area type="monotone" dataKey="created" stroke="#60a5fa" fill="url(#createdGradient)" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="updated" stroke="#f59e0b" strokeWidth={2.25} dot={false} />
                  <Area type="monotone" dataKey="words" stroke="#34d399" fill="url(#wordsGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart label="No activity data yet" />
          )}
        </Panel>

        <Panel
          title="Type Mix"
          subtitle="Keeps by workspace mode"
          icon={<PieChartIcon className="h-4 w-4" />}
        >
          {typeSeries.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-[1fr_1.1fr] xl:grid-cols-1">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeSeries} dataKey="count" nameKey="name" innerRadius={48} outerRadius={86} paddingAngle={3}>
                      {typeSeries.map((item) => (
                        <Cell key={item.name} fill={TYPE_COLORS[item.name] || '#818cf8'} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {typeSeries.map((item) => (
                  <div key={item.name} className="flex items-center gap-3 rounded-lg bg-secondary/30 p-2.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: TYPE_COLORS[item.name] || '#818cf8' }}
                    />
                    <span className="flex-1 text-xs font-black capitalize text-foreground">{item.name}</span>
                    <span className="text-xs font-bold text-muted-foreground">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart label="No type data yet" />
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Content Composition"
          subtitle="Keeps and word volume by type"
          icon={<Layers className="h-4 w-4" />}
        >
          {typeSeries.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeSeries} margin={{ top: 8, right: 14, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip />
                  <Bar dataKey="count" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="words" fill="#34d399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart label="No content composition yet" />
          )}
        </Panel>

        <Panel
          title="Folder Distribution"
          subtitle="Top folders by Keep count"
          icon={<FolderOpen className="h-4 w-4" />}
        >
          {folderSeries.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={folderSeries} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={86} />
                  <ChartTooltip />
                  <Bar dataKey="keeps" fill="#22d3ee" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart label="No folder data yet" />
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr_1fr]">
        <Panel
          title="Review Age"
          subtitle="How long Keeps have gone without updates"
          icon={<Clock3 className="h-4 w-4" />}
        >
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reviewBuckets} margin={{ top: 6, right: 12, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip />
                <Bar dataKey="keeps" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Weekday Pattern"
          subtitle="Creation volume by day of week"
          icon={<Activity className="h-4 w-4" />}
        >
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdaySeries} margin={{ top: 6, right: 12, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip />
                <Bar dataKey="keeps" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Top Tags"
          subtitle="Most used organization labels"
          icon={<Tag className="h-4 w-4" />}
        >
          <div className="space-y-2">
            {topTags.length === 0 ? (
              <p className="rounded-lg bg-secondary/20 p-4 text-center text-xs text-muted-foreground">
                Tags will appear here as Keeps get labeled.
              </p>
            ) : (
              topTags.map(({ tag, count }) => (
                <div key={tag} className="flex items-center gap-3">
                  <span className="w-28 truncate text-xs font-bold text-foreground">#{tag}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-pri-500"
                      style={{ width: `${Math.max(8, (count / topTags[0].count) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-bold text-muted-foreground">{count}</span>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Panel
          title="Notable Keeps"
          subtitle="Largest and most recently updated"
          icon={<Brain className="h-4 w-4" />}
        >
          <div className="space-y-3">
            <div className="rounded-lg bg-secondary/30 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Largest Keep</p>
              <p className="mt-2 line-clamp-2 text-sm font-bold text-foreground">
                {analytics.largestKeep?.title || 'No Keeps yet'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {analytics.largestKeep
                  ? `${countWords(analytics.largestKeep.rawContent || analytics.largestKeep.content).toLocaleString()} words`
                  : 'Create a Keep to begin tracking content size'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-secondary/30 p-3">
                <FileText className="mb-2 h-4 w-4 text-cyan-300" />
                <p className="text-xl font-black text-foreground">{(typeSeries.find((type) => type.name === 'document')?.count || 0).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">documents</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-3">
                <Briefcase className="mb-2 h-4 w-4 text-pink-300" />
                <p className="text-xl font-black text-foreground">{(typeSeries.find((type) => type.name === 'project')?.count || 0).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">projects</p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Recent Updates"
          subtitle="Latest Keeps touched in the workspace"
          icon={<RefreshCw className="h-4 w-4" />}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentlyUpdated.length === 0 ? (
              <p className="rounded-lg bg-secondary/20 p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                No recent Keeps are available yet.
              </p>
            ) : (
              recentlyUpdated.map((note) => (
                <div key={note.id} className="rounded-lg border border-border/40 bg-secondary/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                      style={{
                        color: TYPE_COLORS[note.type] || '#818cf8',
                        backgroundColor: `${TYPE_COLORS[note.type] || '#818cf8'}20`,
                      }}
                    >
                      {note.type}
                    </span>
                    <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-9 text-sm font-bold text-foreground">
                    {note.title || 'Untitled Keep'}
                  </p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Updated {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

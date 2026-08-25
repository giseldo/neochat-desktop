import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function TrajectoryTimeline({ 
  timelineSegments = [], 
  onSelectSegment,
  activeSegmentId = null 
}) {
  const { t } = useLanguage();
  const [hoveredSegment, setHoveredSegment] = useState(null);

  const totalDurationMs = timelineSegments.reduce((acc, seg) => acc + (seg.durationMs || 1000), 0);

  // Group durations by type
  const typeDurations = timelineSegments.reduce((acc, seg) => {
    const type = seg.type || 'model';
    acc[type] = (acc[type] || 0) + (seg.durationMs || 1000);
    return acc;
  }, {});

  const formatDuration = (ms) => {
    if (!ms && ms !== 0) return '';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="w-full bg-card/60 backdrop-blur-xs border border-border/80 rounded-xl p-3 shadow-xs space-y-2.5">
      {/* Top Legend and Metrics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 select-none">
          {/* Input Legend */}
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-xs bg-sky-500 shadow-2xs" />
            <span>{t('trajectory.input')}</span>
            {typeDurations.input > 0 && (
              <span className="text-[11px] text-muted-foreground/80 font-normal">
                ({formatDuration(typeDurations.input)})
              </span>
            )}
          </div>

          {/* Model Legend */}
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-xs bg-purple-500 shadow-2xs" />
            <span>{t('trajectory.model')}</span>
            {typeDurations.model > 0 && (
              <span className="text-[11px] text-muted-foreground/80 font-normal">
                ({formatDuration(typeDurations.model)})
              </span>
            )}
          </div>

          {/* Tools Legend */}
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 shadow-2xs" />
            <span>{t('trajectory.tools')}</span>
            {typeDurations.tool > 0 && (
              <span className="text-[11px] text-muted-foreground/80 font-normal">
                ({formatDuration(typeDurations.tool)})
              </span>
            )}
          </div>

          {/* Errors Legend (if any) */}
          {typeDurations.error > 0 && (
            <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-xs bg-red-500 shadow-2xs" />
              <span>{t('trajectory.errors')}</span>
              <span className="text-[11px] text-muted-foreground/80 font-normal">
                ({formatDuration(typeDurations.error)})
              </span>
            </div>
          )}
        </div>

        {totalDurationMs > 0 && (
          <div className="text-[11px] text-muted-foreground font-mono">
            {t('trajectory.totalTime', { time: formatDuration(totalDurationMs) })}
          </div>
        )}
      </div>

      {/* Segmented Timeline Bar */}
      <div className="relative">
        <div className="h-6 w-full bg-muted/40 rounded-lg p-0.5 flex gap-0.5 overflow-hidden border border-border/60 shadow-inner">
          {timelineSegments.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground/60 italic">
              —
            </div>
          ) : (
            timelineSegments.map((seg, idx) => {
              const duration = seg.durationMs || 1000;
              const pct = totalDurationMs > 0 ? Math.max((duration / totalDurationMs) * 100, 2) : 100 / timelineSegments.length;
              const isSelected = activeSegmentId === seg.id;
              
              let bgClass = 'bg-purple-500 hover:bg-purple-400';
              if (seg.type === 'input') {
                bgClass = 'bg-sky-500 hover:bg-sky-400';
              } else if (seg.type === 'tool') {
                if (seg.isError || seg.status === 'error' || seg.status === 'aborted') {
                  bgClass = 'bg-red-500 hover:bg-red-400';
                } else if (seg.status === 'running') {
                  bgClass = 'bg-amber-500 animate-pulse';
                } else {
                  bgClass = 'bg-amber-500 hover:bg-amber-400';
                }
              } else if (seg.isError) {
                bgClass = 'bg-red-500 hover:bg-red-400';
              }

              return (
                <div
                  key={seg.id || `seg-${idx}`}
                  style={{ width: `${pct}%`, minWidth: '8px' }}
                  className={`h-full rounded-xs transition-all cursor-pointer relative group ${bgClass} ${
                    isSelected ? 'ring-2 ring-foreground ring-offset-1 ring-offset-background' : 'opacity-90 hover:opacity-100'
                  }`}
                  onClick={() => onSelectSegment && onSelectSegment(seg)}
                  onMouseEnter={() => setHoveredSegment(seg)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              );
            })
          )}
        </div>

        {/* Hover Tooltip Overlay */}
        {hoveredSegment && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-8 z-30 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="bg-popover text-popover-foreground border border-border text-xs rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap flex items-center gap-2">
              <span className="font-semibold">{hoveredSegment.title || hoveredSegment.name}</span>
              {hoveredSegment.durationMs && (
                <span className="text-muted-foreground font-mono text-[11px]">
                  {formatDuration(hoveredSegment.durationMs)}
                </span>
              )}
              {hoveredSegment.subtitle && (
                <span className="text-muted-foreground/80 max-w-[200px] truncate text-[11px]">
                  {hoveredSegment.subtitle}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

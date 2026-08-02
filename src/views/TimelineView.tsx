import { useMemo } from 'react';
import type { Task } from '@/lib/supabase';
import { cn, isOverdue, formatRelative } from '@/lib/utils';
import { CheckCircle2, Circle, Calendar } from 'lucide-react';

type TimelineViewProps = {
  tasks: Task[];
  projectColor: string;
  onToggleComplete: (task: Task) => void;
};

export function TimelineView({ tasks, projectColor, onToggleComplete }: TimelineViewProps) {
  const { weeks, taskPositions } = useMemo(() => {
    const tasksWithDates = tasks.filter((t) => t.due_date);
    if (tasksWithDates.length === 0) {
      return { weeks: [], taskPositions: [] };
    }

    const dates = tasksWithDates.map((t) => new Date(t.due_date!));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Expand range to start on a Monday and end on a Sunday
    minDate.setDate(minDate.getDate() - minDate.getDay());
    maxDate.setDate(maxDate.getDate() + (6 - maxDate.getDay()));

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const numWeeks = Math.ceil((totalDays + 1) / 7);

    const weeks: { label: string; days: { date: Date; label: string; isToday: boolean }[] }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let w = 0; w < numWeeks; w++) {
      const days: { date: Date; label: string; isToday: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(minDate);
        date.setDate(date.getDate() + w * 7 + d);
        days.push({
          date,
          label: date.getDate().toString(),
          isToday: date.getTime() === today.getTime(),
        });
      }
      const monthLabel = days[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      weeks.push({ label: monthLabel, days });
    }

    const positions = tasksWithDates.map((task) => {
      const dueDate = new Date(task.due_date!);
      const dayOffset = Math.floor((dueDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(dayOffset / 7);
      const dayInWeek = dayOffset % 7;
      return { task, weekIndex, dayInWeek };
    });

    return { weeks, taskPositions: positions };
  }, [tasks]);

  if (weeks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No tasks with due dates yet. Add due dates to see the timeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto scrollbar-thin bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="flex">
          <div className="w-48 flex-shrink-0 border-r border-slate-200 p-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasks</span>
          </div>
          <div className="flex-1 flex">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex-1 min-w-[280px] border-r border-slate-100 last:border-r-0">
                <div className="px-3 py-2 text-xs font-semibold text-slate-600 border-b border-slate-100">
                  {week.label}
                </div>
                <div className="flex">
                  {week.days.map((day, di) => (
                    <div
                      key={di}
                      className={cn(
                        'flex-1 text-center py-1.5 text-[11px] border-r border-slate-50 last:border-r-0',
                        day.isToday ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-400'
                      )}
                    >
                      {day.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rows */}
      <div>
        {taskPositions.map(({ task, weekIndex, dayInWeek }) => (
          <div key={task.id} className="flex border-b border-slate-100 hover:bg-slate-50 transition-colors group">
            <div className="w-48 flex-shrink-0 border-r border-slate-200 px-3 py-2.5 flex items-center gap-2">
              <button onClick={() => onToggleComplete(task)} className="flex-shrink-0">
                {task.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                )}
              </button>
              <span className={cn(
                'text-sm truncate',
                task.completed ? 'line-through text-slate-400' : 'text-slate-700'
              )}>
                {task.title}
              </span>
            </div>
            <div className="flex-1 flex relative">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex-1 min-w-[280px] border-r border-slate-100 last:border-r-0 relative h-12">
                  <div className="flex h-full">
                    {week.days.map((day, di) => (
                      <div key={di} className="flex-1 border-r border-slate-50 last:border-r-0" />
                    ))}
                  </div>
                  {wi === weekIndex && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[11px] font-medium text-white shadow-soft whitespace-nowrap max-w-[200px] truncate"
                      style={{
                        backgroundColor: task.completed ? '#94a3b8' : projectColor,
                        left: `${(dayInWeek / 7) * 100}%`,
                      }}
                    >
                      {task.title}
                      {!task.completed && isOverdue(task.due_date) && (
                        <span className="ml-1 text-rose-200">overdue</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

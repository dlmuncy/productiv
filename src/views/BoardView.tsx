import { useState } from 'react';
import type { Task, Section, Agent } from '@/lib/supabase';
import { cn, isOverdue, formatRelative } from '@/lib/utils';
import { CheckCircle2, Circle, Plus, Bot, Calendar, Trash2 } from 'lucide-react';

type BoardViewProps = {
  tasks: Task[];
  sections: Section[];
  agents: Agent[];
  onToggleComplete: (task: Task) => void;
  onUpdateTask: (task: Task, updates: Partial<Task>) => void;
  onAddTask: (sectionId: string | null, title: string) => void;
  onMoveTask: (task: Task, newSectionId: string | null) => void;
  onDeleteTask: (task: Task) => void;
};

const PRIORITY_DOTS: Record<string, string> = {
  low: 'bg-slate-300',
  medium: 'bg-blue-400',
  high: 'bg-amber-400',
  urgent: 'bg-rose-500',
};

export function BoardView({
  tasks, sections, agents, onToggleComplete, onUpdateTask, onAddTask, onMoveTask, onDeleteTask,
}: BoardViewProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  const columns = sections.length > 0 ? sections : [
    { id: 'todo', name: 'To Do', order_index: 0 },
    { id: 'in-progress', name: 'In Progress', order_index: 1 },
    { id: 'done', name: 'Done', order_index: 2 },
  ];

  const getTasksForColumn = (colId: string) => {
    if (sections.length > 0) return tasks.filter((t) => t.section_id === colId);
    return tasks.filter((t) => t.status === colId);
  };

  const handleDrop = (colId: string) => {
    if (draggedTask) {
      if (sections.length > 0) {
        onMoveTask(draggedTask, colId);
      } else {
        const newStatus = colId === 'done' ? 'done' : colId === 'in-progress' ? 'in-progress' : 'todo';
        onUpdateTask(draggedTask, { status: newStatus, completed: colId === 'done' });
      }
      setDraggedTask(null);
      setDragOverSection(null);
    }
  };

  return (
    <div className="flex-1 overflow-x-auto scrollbar-thin bg-slate-50 p-4">
      <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
        {columns.map((col) => {
          const colTasks = getTasksForColumn(col.id);
          return (
            <div
              key={col.id}
              className={cn(
                'w-72 flex-shrink-0 flex flex-col rounded-xl bg-slate-100/80 transition-colors',
                dragOverSection === col.id && 'bg-brand-50 ring-2 ring-brand-300'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOverSection(col.id); }}
              onDragLeave={() => setDragOverSection(null)}
              onDrop={() => handleDrop(col.id)}
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-700">{col.name}</h3>
                  <span className="text-xs text-slate-400 bg-white px-1.5 py-0.5 rounded">{colTasks.length}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2 space-y-2">
                {colTasks.map((task) => {
                  const agent = task.assignee_agent_id ? agentMap.get(task.assignee_agent_id) : null;
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedTask(task)}
                      onDragEnd={() => { setDraggedTask(null); setDragOverSection(null); }}
                      className="group bg-white rounded-lg p-3 shadow-card border border-slate-200/60 cursor-grab active:cursor-grabbing hover:shadow-soft transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <button onClick={() => onToggleComplete(task)} className="flex-shrink-0 mt-0.5">
                          {task.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                          )}
                        </button>
                        <p className={cn(
                          'text-sm font-medium flex-1',
                          task.completed ? 'line-through text-slate-400' : 'text-slate-700'
                        )}>
                          {task.title}
                        </p>
                        <button
                          onClick={() => onDeleteTask(task)}
                          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center gap-2 mt-2.5">
                        <span className={cn('w-2 h-2 rounded-full', PRIORITY_DOTS[task.priority])} title={`${task.priority} priority`} />
                        {task.due_date && (
                          <span className={cn(
                            'text-[11px] flex items-center gap-0.5',
                            isOverdue(task.due_date) && !task.completed ? 'text-rose-600' : 'text-slate-400'
                          )}>
                            <Calendar className="w-3 h-3" />
                            {formatRelative(task.due_date)}
                          </span>
                        )}
                        {agent && (
                          <div
                            className="ml-auto w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
                            style={{ backgroundColor: agent.color }}
                            title={agent.name}
                          >
                            <Bot className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {addingTo === col.id ? (
                  <div className="bg-white rounded-lg p-2 border border-brand-300">
                    <textarea
                      autoFocus
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && newTaskTitle.trim()) {
                          e.preventDefault();
                          if (sections.length > 0) {
                            onAddTask(col.id, newTaskTitle.trim());
                          } else {
                            onAddTask(null, newTaskTitle.trim());
                          }
                          setNewTaskTitle('');
                          setAddingTo(null);
                        }
                        if (e.key === 'Escape') { setAddingTo(null); setNewTaskTitle(''); }
                      }}
                      placeholder="Task name..."
                      className="w-full text-sm resize-none focus:outline-none"
                      rows={2}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTo(col.id)}
                    className="w-full text-sm text-slate-500 hover:text-brand-600 hover:bg-white rounded-lg p-2 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add task
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

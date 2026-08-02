import { useState } from 'react';
import type { Task, Section, Agent } from '@/lib/supabase';
import { cn, PRIORITY_COLORS, isOverdue, formatRelative } from '@/lib/utils';
import { CheckCircle2, Circle, Plus, GripVertical, Bot, Flag, Calendar, Trash2 } from 'lucide-react';

type ListViewProps = {
  tasks: Task[];
  sections: Section[];
  agents: Agent[];
  onToggleComplete: (task: Task) => void;
  onUpdateTask: (task: Task, updates: Partial<Task>) => void;
  onAddTask: (sectionId: string | null, title: string) => void;
  onAddSection: (name: string) => void;
  onDeleteTask: (task: Task) => void;
};

export function ListView({
  tasks, sections, agents, onToggleComplete, onUpdateTask, onAddTask, onAddSection, onDeleteTask,
}: ListViewProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSection, setNewTaskSection] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [showSectionInput, setShowSectionInput] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  const renderTask = (task: Task) => (
    <div
      key={task.id}
      className="group flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors"
    >
      <GripVertical className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab" />

      <button onClick={() => onToggleComplete(task)} className="flex-shrink-0">
        {task.completed ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <Circle className="w-4 h-4 text-slate-300 hover:text-slate-400" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        {editingTask === task.id ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => {
              if (editTitle.trim()) onUpdateTask(task, { title: editTitle.trim() });
              setEditingTask(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (editTitle.trim()) onUpdateTask(task, { title: editTitle.trim() });
                setEditingTask(null);
              }
              if (e.key === 'Escape') setEditingTask(null);
            }}
            className="input py-0.5 text-sm"
          />
        ) : (
          <span
            className={cn(
              'text-sm text-slate-700 cursor-pointer',
              task.completed && 'line-through text-slate-400'
            )}
            onClick={() => {
              setEditingTask(task.id);
              setEditTitle(task.title);
            }}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Priority */}
      <select
        value={task.priority}
        onChange={(e) => onUpdateTask(task, { priority: e.target.value })}
        className="text-xs border-0 bg-transparent text-slate-500 cursor-pointer focus:outline-none"
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>

      {/* Assignee */}
      {task.assignee_agent_id && agentMap.get(task.assignee_agent_id) && (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
          style={{ backgroundColor: agentMap.get(task.assignee_agent_id)!.color }}
          title={agentMap.get(task.assignee_agent_id)!.name}
        >
          <Bot className="w-3 h-3" />
        </div>
      )}

      {/* Due date */}
      {task.due_date && (
        <span className={cn(
          'text-xs flex items-center gap-1 flex-shrink-0',
          isOverdue(task.due_date) && !task.completed ? 'text-rose-600' : 'text-slate-400'
        )}>
          <Calendar className="w-3 h-3" />
          {formatRelative(task.due_date)}
        </span>
      )}

      <button
        onClick={() => onDeleteTask(task)}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all flex-shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const unsectionedTasks = tasks.filter((t) => !t.section_id);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin bg-white">
      {/* Unsectioned tasks */}
      {unsectionedTasks.length > 0 && sections.length === 0 && (
        <div className="border border-slate-200 rounded-lg mx-6 mt-4 overflow-hidden">
          {unsectionedTasks.map(renderTask)}
        </div>
      )}

      {/* Sections */}
      {sections.map((section) => {
        const sectionTasks = tasks.filter((t) => t.section_id === section.id);
        return (
          <div key={section.id} className="mx-6 mt-4 mb-2">
            <div className="flex items-center gap-2 mb-1 px-1">
              <h3 className="text-sm font-semibold text-slate-700">{section.name}</h3>
              <span className="text-xs text-slate-400">{sectionTasks.length}</span>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {sectionTasks.map(renderTask)}
              <div className="px-4 py-2">
                <input
                  type="text"
                  placeholder="+ Add task"
                  value={newTaskSection === section.id ? newTaskTitle : ''}
                  onChange={(e) => {
                    setNewTaskSection(section.id);
                    setNewTaskTitle(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTaskTitle.trim() && newTaskSection === section.id) {
                      onAddTask(section.id, newTaskTitle.trim());
                      setNewTaskTitle('');
                      setNewTaskSection(null);
                    }
                  }}
                  className="w-full text-sm text-slate-600 placeholder:text-slate-400 bg-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Add section */}
      <div className="mx-6 mt-4 mb-6">
        {showSectionInput ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              placeholder="Section name"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSectionName.trim()) {
                  onAddSection(newSectionName.trim());
                  setNewSectionName('');
                  setShowSectionInput(false);
                }
                if (e.key === 'Escape') setShowSectionInput(false);
              }}
              className="input text-sm"
            />
            <button onClick={() => setShowSectionInput(false)} className="btn-ghost text-xs">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setShowSectionInput(true)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add section
          </button>
        )}
      </div>

      {/* Quick add task (no section) */}
      {sections.length === 0 && (
        <div className="mx-6 mb-6">
          <input
            type="text"
            placeholder="+ Add task"
            value={newTaskSection === 'none' ? newTaskTitle : ''}
            onChange={(e) => {
              setNewTaskSection('none');
              setNewTaskTitle(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTaskTitle.trim()) {
                onAddTask(null, newTaskTitle.trim());
                setNewTaskTitle('');
                setNewTaskSection(null);
              }
            }}
            className="w-full text-sm text-slate-600 placeholder:text-slate-400 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-400"
          />
        </div>
      )}
    </div>
  );
}

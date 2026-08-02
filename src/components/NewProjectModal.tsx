import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn, PROJECT_COLORS } from '@/lib/utils';
import { X, Briefcase, Rocket, Target, Users, Calendar, Palette } from 'lucide-react';

const ICONS = ['Briefcase', 'Rocket', 'Target', 'Users', 'Calendar', 'Palette'];

type NewProjectModalProps = {
  onClose: () => void;
  onCreated: (projectId: string) => void;
};

export function NewProjectModal({ onClose, onCreated }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS.blue);
  const [icon, setIcon] = useState('Briefcase');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const { data } = await supabase.from('projects').insert({
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
      due_date: dueDate || null,
    }).select().single();
    setCreating(false);
    if (data) onCreated(data.id);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="card p-6 w-[480px] animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Create New Project</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Project Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Product Launch Q4" autoFocus />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input resize-none" rows={2} placeholder="What's this project about?" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Color</label>
              <div className="flex flex-wrap gap-2">
                {Object.values(PROJECT_COLORS).map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn('w-7 h-7 rounded-lg transition-all', color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105')}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Icon</label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center transition-all border',
                      icon === ic ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-400 hover:border-slate-300'
                    )}
                  >
                    {ic === 'Briefcase' && <Briefcase className="w-3.5 h-3.5" />}
                    {ic === 'Rocket' && <Rocket className="w-3.5 h-3.5" />}
                    {ic === 'Target' && <Target className="w-3.5 h-3.5" />}
                    {ic === 'Users' && <Users className="w-3.5 h-3.5" />}
                    {ic === 'Calendar' && <Calendar className="w-3.5 h-3.5" />}
                    {ic === 'Palette' && <Palette className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Due Date (optional)</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={create} disabled={!name.trim() || creating} className="btn-primary flex-1">
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

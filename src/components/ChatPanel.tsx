import { useState, useEffect, useRef } from 'react';
import { supabase, type Message, type Agent } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Send, Bot, User, MessageSquare, X, Sparkles } from 'lucide-react';

type ChatPanelProps = {
  projectId: string;
  agents: Agent[];
  isOpen: boolean;
  onClose: () => void;
};

export function ChatPanel({ projectId, agents, isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      setMessages(data ?? []);
      setLoading(false);
    }
    if (isOpen) load();
  }, [projectId, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  const sendMessage = async () => {
    if (!input.trim()) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    await supabase.from('messages').insert({
      project_id: projectId,
      author_type: 'user',
      content,
      message_type: 'chat',
    });
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
    setSending(false);

    // Real agent replies are persisted only when an authenticated runtime posts them.
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 h-full flex flex-col bg-white border-l border-slate-200/80 flex-shrink-0 animate-slide-in-right">
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-600" />
          <h2 className="font-bold text-slate-900 text-sm">Collaboration Space</h2>
        </div>
        <button onClick={onClose} className="btn-ghost p-1.5">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Start the conversation</p>
            <p className="text-xs text-slate-400 mt-1">Chat with your team and AI agents here</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.author_type === 'user';
            const agent = msg.author_agent_id ? agentMap.get(msg.author_agent_id) : null;
            return (
              <div key={msg.id} className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0',
                  )}
                  style={{ backgroundColor: isUser ? '#3563ff' : agent?.color ?? '#94a3b8' }}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className={cn('max-w-[75%]', isUser && 'text-right')}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-slate-700">
                      {isUser ? 'You' : agent?.name ?? 'Agent'}
                    </span>
                    {!isUser && agent && (
                      <span className="text-[10px] text-slate-400">{agent.role}</span>
                    )}
                  </div>
                  <div className={cn(
                    'inline-block px-3 py-2 rounded-2xl text-sm',
                    isUser ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-700 rounded-tl-sm'
                  )}>
                    {msg.content}
                  </div>
                  <p className={cn('text-[10px] text-slate-400 mt-0.5', isUser && 'text-right')}>
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-slate-200/80">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 text-sm bg-slate-100 rounded-lg border border-transparent focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
          />
          <button onClick={sendMessage} disabled={!input.trim() || sending} className="btn-primary p-2">
            <Send className="w-4 h-4" />
          </button>
        </div>
        {agents.length > 0 && (
          <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            {agents.length} linked agent profile{agents.length !== 1 ? 's' : ''}; only verified runtime replies are shown
          </p>
        )}
      </div>
    </div>
  );
}

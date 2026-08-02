import { cn } from '@/lib/utils';

export function Logo({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
          <defs>
            <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40">
              <stop offset="0%" stopColor="#3563ff" />
              <stop offset="50%" stopColor="#1d42f5" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
          {/* Flow symbol - three converging streams into a node */}
          <path d="M6 8 L20 20" stroke="url(#logo-grad)" strokeWidth="3" strokeLinecap="round" />
          <path d="M6 32 L20 20" stroke="url(#logo-grad)" strokeWidth="3" strokeLinecap="round" />
          <path d="M34 8 L20 20" stroke="url(#logo-grad)" strokeWidth="3" strokeLinecap="round" />
          <path d="M34 32 L20 20" stroke="url(#logo-grad)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="20" cy="20" r="6" fill="url(#logo-grad)" />
          <circle cx="6" cy="8" r="3" fill="#3563ff" />
          <circle cx="6" cy="32" r="3" fill="#1d42f5" />
          <circle cx="34" cy="8" r="3" fill="#14b8a6" />
          <circle cx="34" cy="32" r="3" fill="#0d9488" />
        </svg>
      </div>
      <span className="font-bold text-lg tracking-tight text-slate-900">
        Agent<span className="text-brand-600">Flow</span>
      </span>
    </div>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
        <defs>
          <linearGradient id="logo-mark-grad" x1="0" y1="0" x2="40" y2="40">
            <stop offset="0%" stopColor="#3563ff" />
            <stop offset="50%" stopColor="#1d42f5" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
        <path d="M6 8 L20 20" stroke="url(#logo-mark-grad)" strokeWidth="3" strokeLinecap="round" />
        <path d="M6 32 L20 20" stroke="url(#logo-mark-grad)" strokeWidth="3" strokeLinecap="round" />
        <path d="M34 8 L20 20" stroke="url(#logo-mark-grad)" strokeWidth="3" strokeLinecap="round" />
        <path d="M34 32 L20 20" stroke="url(#logo-mark-grad)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="20" cy="20" r="6" fill="url(#logo-mark-grad)" />
        <circle cx="6" cy="8" r="3" fill="#3563ff" />
        <circle cx="6" cy="32" r="3" fill="#1d42f5" />
        <circle cx="34" cy="8" r="3" fill="#14b8a6" />
        <circle cx="34" cy="32" r="3" fill="#0d9488" />
      </svg>
    </div>
  );
}

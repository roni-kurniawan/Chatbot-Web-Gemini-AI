import { Menu, Plus, Moon, Sun, RotateCcw, Bot } from 'lucide-react';
import { PersonaOption } from '../types';

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onResetChat: () => void;
  currentTitle: string;
  hasMessages: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  currentPersona: PersonaOption;
}

export function ChatHeader({
  onToggleSidebar,
  onNewChat,
  onResetChat,
  currentTitle,
  hasMessages,
  isDarkMode,
  onToggleTheme,
  currentPersona,
}: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-20 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-6 py-2.5 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          id="toggle-sidebar-btn"
          type="button"
          onClick={onToggleSidebar}
          className="p-2 -ml-1 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-2">
            <span className="truncate">{currentTitle || 'Percakapan Baru'}</span>
          </h2>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <Bot className="w-3 h-3 text-blue-500" />
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {currentPersona.name}
            </span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {hasMessages && (
          <button
            id="reset-current-chat-btn"
            type="button"
            onClick={onResetChat}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Bersihkan percakapan ini"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Bersihkan</span>
          </button>
        )}

        <button
          id="quick-new-chat-btn"
          type="button"
          onClick={onNewChat}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-semibold transition-colors cursor-pointer"
          title="Mulai obrolan baru"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Obrolan Baru</span>
        </button>

        <button
          id="toggle-theme-btn"
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
          title={isDarkMode ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
          aria-label={isDarkMode ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
        >
          {isDarkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium hidden md:inline">Mode Terang</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
              <span className="text-xs font-medium hidden md:inline">Mode Gelap</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}

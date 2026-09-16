import { Plus, MessageSquare, Trash2, Bot, Sparkles, X, Sun, Moon } from 'lucide-react';
import { ChatSession, PersonaOption } from '../types';
import { PERSONAS } from '../data/personas';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onClearAllSessions: () => void;
  isOpen: boolean;
  onClose: () => void;
  currentPersonaId: string;
  onSelectPersona: (personaId: string) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  activeModel?: string;
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClearAllSessions,
  isOpen,
  onClose,
  currentPersonaId,
  onSelectPersona,
  isDarkMode,
  onToggleTheme,
  activeModel,
}: ChatSidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="chat-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 sm:w-80 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex flex-col border-r border-zinc-200 dark:border-zinc-800 transition-colors duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5">
                Roni Chatbot
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/20 dark:border-blue-500/30">
                  Real-Time
                </span>
              </h1>
            </div>
          </div>

          <button
            id="close-sidebar-btn"
            type="button"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Tutup sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions: New Chat & AI Image Studio */}
        <div className="p-3 space-y-2">
          <button
            id="new-chat-btn"
            type="button"
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Percakapan Baru</span>
          </button>
        </div>

        {/* Persona Preset Selector */}
        <div className="px-3 pt-1 pb-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 flex items-center gap-1.5 px-1">
            <Bot className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            Persona Asisten
          </label>
          <select
            id="persona-selector"
            value={currentPersonaId}
            onChange={(e) => onSelectPersona(e.target.value)}
            className="w-full bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
          >
            {PERSONAS.map((p: PersonaOption) => (
              <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200">
                {p.name} — {p.tagline}
              </option>
            ))}
          </select>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1 mb-1">
            Riwayat Percakapan ({sessions.length})
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-zinc-400 dark:text-zinc-500">
              Belum ada percakapan. Mulai obrolan baru dengan mengajukan pertanyaan.
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === currentSessionId;
              return (
                <div
                  key={session.id}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 dark:bg-zinc-800 text-blue-700 dark:text-white font-medium border border-blue-200/70 dark:border-zinc-700/80 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <MessageSquare
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'
                      }`}
                    />
                    <span className="truncate text-xs sm:text-sm">
                      {session.title || 'Percakapan Baru'}
                    </span>
                  </div>

                  {/* Delete conversation button */}
                  <button
                    id={`delete-chat-${session.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="p-1 rounded-md text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-zinc-200 dark:hover:bg-zinc-700/60 transition-all cursor-pointer opacity-100"
                    title="Hapus percakapan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info, Theme Toggle & Clear History */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="flex items-center justify-between px-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span
              className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium"
              title="Fitur auto-failover aktif: 3.5-flash-lite sebagai utama, jika limit beralih ke yang lain"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Auto Multi-Model
            </span>
            <span
              className="text-zinc-400 dark:text-zinc-500 font-mono truncate max-w-[130px] text-right"
              title={activeModel ? `Model aktif saat ini: ${activeModel}` : "Pilihan otomatis rotasi pool"}
            >
              {activeModel || "Default: 3.5-flash-lite"}
            </span>
          </div>

          {onToggleTheme && (
            <button
              id="sidebar-toggle-theme-btn"
              type="button"
              onClick={onToggleTheme}
              className="w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 shadow-2xs"
            >
              <span className="flex items-center gap-2">
                {isDarkMode ? (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
                )}
                <span>Tema Tampilan</span>
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {isDarkMode ? 'Mode Gelap' : 'Mode Terang'}
              </span>
            </button>
          )}

          {sessions.length > 0 && (
            <button
              id="clear-all-chats-btn"
              type="button"
              onClick={() => {
                if (window.confirm('Hapus seluruh riwayat percakapan?')) {
                  onClearAllSessions();
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua Riwayat</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

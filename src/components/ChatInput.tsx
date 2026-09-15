import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import {
  Square,
  Sparkles,
  Image as ImageIcon,
  X,
  Plus,
  ArrowUp,
} from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string, imageUrl?: string) => void;
  onStopGeneration: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

interface UpgradeFeatureSlot {
  id: string;
  title: string;
  description: string;
  icon: any;
  badge?: string;
  action: () => void;
}

export function ChatInput({
  onSendMessage,
  onStopGeneration,
  isGenerating,
  disabled,
}: ChatInputProps) {
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-resize textarea according to text height (responsive across mobile & desktop)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Cap maximum height: 130px on small screens, 175px on desktop
      const maxHeight = window.innerWidth < 640 ? 130 : 175;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputText]);

  // Focus input on mount (desktop only to prevent mobile keyboard jumping)
  useEffect(() => {
    if (window.innerWidth >= 768) {
      textareaRef.current?.focus();
    }
  }, []);

  // Close plus menu when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        plusButtonRef.current &&
        !plusButtonRef.current.contains(event.target as Node)
      ) {
        setIsPlusMenuOpen(false);
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsPlusMenuOpen(false);
      }
    }

    if (isPlusMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlusMenuOpen]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedImage(event.target?.result as string);
        setIsPlusMenuOpen(false);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSubmit = () => {
    const trimmed = inputText.trim();
    if ((!trimmed && !attachedImage) || isGenerating || disabled) return;

    onSendMessage(
      trimmed || (attachedImage ? 'Mohon analisis gambar ini' : ''),
      attachedImage || undefined
    );
    setInputText('');
    setAttachedImage(null);
    setIsPlusMenuOpen(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Tools inside the Gemini "+" menu
  const featureItems: UpgradeFeatureSlot[] = [
    {
      id: 'upload-image',
      title: 'Unggah Gambar',
      description: 'Analisis foto, diagram, atau tangkapan layar',
      icon: ImageIcon,
      badge: 'Aktif',
      action: () => {
        setIsPlusMenuOpen(false);
        fileInputRef.current?.click();
      },
    },
  ];

  const hasContent = Boolean(inputText.trim() || attachedImage);

  return (
    <div className="w-full max-w-4xl mx-auto px-2.5 sm:px-4 pb-2.5 sm:pb-5 pt-1 relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Gemini-Style Input Container */}
      <div className="relative rounded-[24px] sm:rounded-[28px] border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/90 dark:bg-zinc-900/95 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all duration-150">
        {/* Attached image preview banner */}
        {attachedImage && (
          <div className="px-3.5 sm:px-4 pt-3 flex items-center gap-2">
            <div className="relative inline-flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              <img
                src={attachedImage}
                alt="Lampiran"
                className="w-11 h-11 object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Gambar Terlampir
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Siap dianalisis / dikirim
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="ml-1 p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                title="Hapus gambar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Text Input Area (16px base on mobile avoids iOS auto-zoom; auto-expanding) */}
        <div className="px-3 sm:px-4 pt-2.5 sm:pt-3">
          <textarea
            ref={textareaRef}
            id="chat-message-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              attachedImage
                ? 'Tulis pertanyaan atau instruksi terkait gambar ini...'
                : 'Tanya apa saja kepada Roni...'
            }
            rows={1}
            disabled={disabled}
            className="w-full resize-none bg-transparent text-base sm:text-[15px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none leading-relaxed min-h-[44px] max-h-[175px] pb-1"
          />
        </div>

        {/* Gemini-Style Bottom Action Bar */}
        <div className="px-2.5 sm:px-3 pb-2 pt-1 flex items-center justify-between">
          {/* Left Controls: The Gemini "+" Button & Quick Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 relative">
            {/* Gemini "+" Action Button */}
            <div className="relative">
              <button
                ref={plusButtonRef}
                id="gemini-plus-features-btn"
                type="button"
                onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                className={`flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-full transition-all active:scale-95 cursor-pointer touch-manipulation ${
                  isPlusMenuOpen
                    ? 'bg-blue-600 text-white shadow-sm rotate-45'
                    : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
                title="Fitur & Alat Tambahan (+)"
                aria-label="Fitur & Alat Tambahan"
                aria-expanded={isPlusMenuOpen}
              >
                <Plus className="w-5 h-5 transition-transform duration-200" />
              </button>

              {/* Gemini "+" Features Menu Dropdown / Sheet */}
              {isPlusMenuOpen && (
                <div
                  ref={menuRef}
                  id="gemini-plus-menu"
                  className="absolute bottom-12 left-0 z-50 w-72 sm:w-80 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100"
                >
                  <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/80 mb-1 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        Alat & Fitur Tambahan
                      </h4>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        Pilih alat atau fitur untuk digunakan
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPlusMenuOpen(false)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 max-h-72 overflow-y-auto pr-0.5">
                    {featureItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.action}
                          className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition-all cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/40 text-zinc-800 dark:text-zinc-200 group"
                        >
                          <div className="p-2 rounded-xl shrink-0 transition-colors bg-blue-100/70 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold truncate">
                                {item.title}
                              </span>
                              {item.badge && (
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick action: Direct Image Upload shortcut (visible on tablet/desktop) */}
            <button
              id="quick-attach-image-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-xs font-medium transition-colors cursor-pointer"
              title="Unggah gambar"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="text-[12px]">Gambar</span>
            </button>
          </div>

          {/* Right Controls: Stop Generating or Gemini-Style Send Button */}
          <div className="flex items-center gap-1.5">
            {isGenerating ? (
              <button
                id="stop-generation-btn"
                type="button"
                onClick={onStopGeneration}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer min-h-[38px]"
                title="Hentikan pembuatan respon"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span className="text-[11px] sm:text-xs">Hentikan</span>
              </button>
            ) : (
              <button
                id="send-message-btn"
                type="button"
                onClick={handleSubmit}
                disabled={!hasContent || disabled}
                className={`flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-full transition-all active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed cursor-pointer touch-manipulation ${
                  hasContent && !disabled
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600'
                }`}
                title="Kirim pesan"
                aria-label="Kirim pesan"
              >
                <ArrowUp className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 px-2">
        Roni AI dapat membuat kesalahan. Periksa kembali informasi penting.
      </p>
    </div>
  );
}


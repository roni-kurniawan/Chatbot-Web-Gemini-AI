import { useState } from 'react';
import { motion } from 'motion/react';
import { Bot, User, Copy, Check, RotateCcw, AlertCircle, Volume2, Square } from 'lucide-react';
import Markdown from 'react-markdown';
import { ChatMessage } from '../types';

interface ChatMessageItemProps {
  message: ChatMessage;
  isLastAssistantMessage?: boolean;
  onRegenerate?: () => void;
  isGenerating?: boolean;
}

export function ChatMessageItem({
  message,
  isLastAssistantMessage,
  onRegenerate,
  isGenerating,
}: ChatMessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const isUser = message.role === 'user';

  const handlePlaySound = () => {
    if (!message.content) return;
    
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Bersihkan semua antrean sebelumnya
    window.speechSynthesis.cancel();

    // Hapus simbol markdown agar tidak dibacakan (misal: **, *, #, `, _, dll)
    const cleanText = message.content.replace(/[*#`_~>]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Wajibkan bahasa Indonesia
    utterance.lang = 'id-ID';
    
    // Cari suara dan coba temukan suara pria Indonesia jika memungkinkan
    const voices = window.speechSynthesis.getVoices();
    
    // Prioritas 1: Suara pria Indonesia eksplisit (seperti Microsoft Andika)
    let selectedVoice = voices.find((v) => 
      (v.lang === 'id-ID' || v.lang === 'id_ID' || v.lang === 'id') && 
      (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('pria') || v.name.toLowerCase().includes('andika'))
    );
    
    // Cadangan 1: Suara Indonesia apa saja, TAPI hindari nama wanita yang jelas jika memungkinkan (seperti Damayanti/Gadis)
    if (!selectedVoice) {
      selectedVoice = voices.find((v) => 
        (v.lang === 'id-ID' || v.lang === 'id_ID' || v.lang === 'id' || v.name.includes('Indonesia')) &&
        !v.name.toLowerCase().includes('female') && 
        !v.name.toLowerCase().includes('wanita') &&
        !v.name.toLowerCase().includes('gadis') &&
        !v.name.toLowerCase().includes('damayanti')
      );
    }

    // Cadangan 2: Suara Indonesia apa saja (jika memang hanya itu yang ada di perangkat)
    if (!selectedVoice) {
      selectedVoice = voices.find((v) => 
        v.lang === 'id-ID' || v.lang === 'id_ID' || v.lang === 'id' || v.name.includes('Indonesia')
      );
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Memanipulasi nada dan kecepatan agar terdengar seperti pria biasa dengan intonasi tegas dan cepat
    utterance.pitch = 0.88; 
    utterance.rate = 1.20; 

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group w-full py-4 px-3 sm:px-5 flex gap-3 sm:gap-4 transition-colors ${
        isUser
          ? 'bg-transparent justify-end'
          : 'bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80'
      }`}
    >
      {!isUser && (
        <div className="shrink-0 pt-0.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm ring-2 ring-blue-500/20">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      )}

      <div
        className={`flex-1 min-w-0 flex flex-col ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            {isUser ? 'Anda' : 'Roni'}
          </span>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {formattedTime}
          </span>
        </div>

        {isUser ? (
          <div className="flex flex-col items-end gap-2 max-w-[85%] sm:max-w-[75%]">
            {message.imageUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-blue-400/30 bg-zinc-900 shadow-sm max-w-sm">
                <img
                  src={message.imageUrl}
                  alt="Unggahan Pengguna"
                  className="max-h-60 w-auto object-contain rounded-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            {message.content && (
              <div
                id={`user-message-${message.id}`}
                className="rounded-2xl rounded-tr-sm bg-blue-600 text-white px-4 py-3 text-[15px] leading-relaxed shadow-sm break-words whitespace-pre-wrap selection:bg-blue-800"
              >
                {message.content}
              </div>
            )}
          </div>
        ) : (
          <div
            id={`assistant-message-${message.id}`}
            className="w-full text-zinc-800 dark:text-zinc-100 text-[15px] leading-relaxed"
          >
            {message.error ? (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Gagal memuat tanggapan</p>
                  <p className="text-xs opacity-90 mt-0.5">{message.error}</p>
                </div>
              </div>
            ) : (
              <div className="markdown-body space-y-3 prose-zinc max-w-none break-words">
                <Markdown
                  components={{
                    p({ children }) {
                      return <p className="mb-2.5 last:mb-0">{children}</p>;
                    },
                    ul({ children }) {
                      return <ul className="list-disc pl-5 mb-2.5 space-y-1">{children}</ul>;
                    },
                    ol({ children }) {
                      return <ol className="list-decimal pl-5 mb-2.5 space-y-1">{children}</ol>;
                    },
                    li({ children }) {
                      return <li className="leading-relaxed">{children}</li>;
                    },
                    h1({ children }) {
                      return <h1 className="text-xl font-bold mt-4 mb-2 text-zinc-900 dark:text-zinc-50">{children}</h1>;
                    },
                    h2({ children }) {
                      return <h2 className="text-lg font-bold mt-3 mb-2 text-zinc-900 dark:text-zinc-50">{children}</h2>;
                    },
                    h3({ children }) {
                      return <h3 className="text-base font-semibold mt-2.5 mb-1.5 text-zinc-900 dark:text-zinc-100">{children}</h3>;
                    },
                    blockquote({ children }) {
                      return (
                        <blockquote className="border-l-3 border-blue-500 pl-3 py-1 my-2 bg-blue-50/50 dark:bg-blue-950/20 rounded-r text-zinc-700 dark:text-zinc-300 italic text-sm">
                          {children}
                        </blockquote>
                      );
                    },
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');
                      const isInline = !match && !String(children).includes('\n');

                      if (isInline) {
                        return (
                          <code
                            className="bg-zinc-200/80 dark:bg-zinc-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded text-sm font-mono font-medium"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }

                      const codeId = Math.random();
                      const language = match ? match[1] : 'code';

                      return (
                        <div className="relative my-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-zinc-100 font-mono text-xs sm:text-sm shadow-sm">
                          <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-800/90 border-b border-zinc-700 text-zinc-400 text-xs">
                            <span className="font-semibold lowercase tracking-wide text-zinc-300">
                              {language}
                            </span>
                            <button
                              id={`copy-code-btn-${message.id}`}
                              type="button"
                              onClick={() => handleCopyCode(codeString, codeId)}
                              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-zinc-700/80 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                              title="Salin kode"
                            >
                              {copiedCodeIndex === codeId ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-[11px] text-emerald-400">Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="text-[11px]">Salin</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="p-3.5 overflow-x-auto">
                            <pre className="!bg-transparent !p-0 !m-0 font-mono leading-relaxed">
                              <code>{children}</code>
                            </pre>
                          </div>
                        </div>
                      );
                    },
                  }}
                >
                  {message.content}
                </Markdown>

                {message.isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 align-middle bg-blue-600 dark:bg-blue-400 animate-pulse rounded-sm" />
                )}
              </div>
            )}

            {/* Action Bar for Assistant Message */}
            {!message.isStreaming && !message.error && message.content && (
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/60">
                <button
                  id={`copy-response-btn-${message.id}`}
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 rounded-lg transition-colors cursor-pointer"
                  title="Salin pesan ini"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>

                <button
                  id={`play-sound-btn-${message.id}`}
                  type="button"
                  onClick={handlePlaySound}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 rounded-lg transition-colors cursor-pointer"
                  title={isPlaying ? "Hentikan Suara" : "Putar Suara"}
                >
                  {isPlaying ? (
                    <>
                      <Square className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 fill-current" />
                      <span className="text-blue-600 dark:text-blue-400">Hentikan</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Putar Suara</span>
                    </>
                  )}
                </button>

                {isLastAssistantMessage && onRegenerate && (
                  <button
                    id={`regenerate-btn-${message.id}`}
                    type="button"
                    onClick={onRegenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Generate ulang jawaban"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Ulangi Jawaban</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="shrink-0 pt-0.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-semibold text-xs shadow-sm">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      )}
    </motion.div>
  );
}

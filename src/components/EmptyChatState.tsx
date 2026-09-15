import { Sparkles, Bot, Code, HelpCircle, Lightbulb, ArrowUpRight } from 'lucide-react';
import { STARTER_PROMPTS, PERSONAS } from '../data/personas';

interface EmptyChatStateProps {
  onSelectPrompt: (promptText: string) => void;
  currentPersonaId: string;
}

export function EmptyChatState({ onSelectPrompt, currentPersonaId }: EmptyChatStateProps) {
  const currentPersona = PERSONAS.find((p) => p.id === currentPersonaId) || PERSONAS[0];

  return (
    <div className="w-full max-w-2xl mx-auto my-auto py-8 px-4 flex flex-col items-center text-center animate-fade-in">
      {/* Icon Badge */}
      <div className="relative mb-5">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10">
          <Bot className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-zinc-900">
          <Sparkles className="w-3 h-3" />
        </div>
      </div>

      {/* Headings */}
      <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-2">
        Halo! Saya Roni, apa yang bisa saya bantu hari ini?
      </h2>
      <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-lg mb-6 leading-relaxed">
        Asisten AI chatbot pintar siap membantu Anda menjawab pertanyaan, bertukar pikiran, dan menulis kode.
      </p>

      {/* Current Active Persona Pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-medium mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
        <span>Mode Aktif: <strong>{currentPersona.name}</strong></span>
        <span className="text-blue-400 dark:text-blue-500">•</span>
        <span className="opacity-80">{currentPersona.tagline}</span>
      </div>

      {/* Prompt Suggestions Grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        {STARTER_PROMPTS.map((starter, index) => (
          <button
            key={index}
            id={`starter-prompt-${index}`}
            type="button"
            onClick={() => onSelectPrompt(starter.text)}
            className="group flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 hover:border-blue-400 dark:hover:border-blue-500/70 hover:shadow-sm transition-all duration-200 text-left cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                {index === 0 && <Lightbulb className="w-3.5 h-3.5" />}
                {index === 1 && <Code className="w-3.5 h-3.5" />}
                {index === 2 && <Sparkles className="w-3.5 h-3.5" />}
                {index === 3 && <HelpCircle className="w-3.5 h-3.5" />}
                {starter.title}
              </span>
              <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
              "{starter.text}"
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

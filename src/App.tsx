/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowDown, AlertTriangle } from 'lucide-react';
import { ChatMessage, ChatSession } from './types';
import { PERSONAS } from './data/personas';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessageItem } from './components/ChatMessageItem';
import { ChatInput } from './components/ChatInput';
import { EmptyChatState } from './components/EmptyChatState';

const STORAGE_KEY = 'gemini_chatbot_sessions_v1';
const THEME_KEY = 'gemini_chatbot_theme';
const PERSONA_KEY = 'gemini_chatbot_persona';

function createNewSession(personaId = 'general'): ChatSession {
  const timestamp = Date.now();
  return {
    id: `session-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
    title: 'Percakapan Baru',
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
    personaId,
  };
}

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved !== null) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Persona state
  const [currentPersonaId, setCurrentPersonaId] = useState<string>(() => {
    return localStorage.getItem(PERSONA_KEY) || 'general';
  });

  // Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load saved sessions', e);
    }
    return [createNewSession('general')];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return sessions[0]?.id || '';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [activeModel, setActiveModel] = useState<string>('Default: 3.5-flash-lite');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync dark mode class
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDarkMode]);

  // Persist sessions
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  // Persist persona
  useEffect(() => {
    localStorage.setItem(PERSONA_KEY, currentPersonaId);
  }, [currentPersonaId]);

  // Find active session
  const currentSession =
    sessions.find((s) => s.id === currentSessionId) || sessions[0] || createNewSession(currentPersonaId);

  const currentPersona =
    PERSONAS.find((p) => p.id === currentPersonaId) || PERSONAS[0];

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  // Handle user scroll detection for "Scroll to Bottom" button
  const handleScroll = () => {
    const container = chatScrollContainerRef.current;
    if (!container) return;
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBottom(distanceToBottom > 150);
  };

  // Create new session
  const handleNewSession = () => {
    if (isGenerating) {
      handleStopGeneration();
    }
    const newSession = createNewSession(currentPersonaId);
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  // Select session
  const handleSelectSession = (id: string) => {
    if (isGenerating) {
      handleStopGeneration();
    }
    setCurrentSessionId(id);
    setTimeout(() => scrollToBottom(false), 50);
  };

  // Delete session
  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const fresh = createNewSession(currentPersonaId);
        setCurrentSessionId(fresh.id);
        return [fresh];
      }
      if (currentSessionId === id) {
        setCurrentSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Clear all sessions
  const handleClearAllSessions = () => {
    if (isGenerating) {
      handleStopGeneration();
    }
    const fresh = createNewSession(currentPersonaId);
    setSessions([fresh]);
    setCurrentSessionId(fresh.id);
  };

  // Reset current chat
  const handleResetCurrentChat = () => {
    if (isGenerating) {
      handleStopGeneration();
    }
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? { ...s, messages: [], title: 'Percakapan Baru', updatedAt: Date.now() }
          : s
      )
    );
  };

  // Stop generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);

    // Stop streaming flag on any currently streaming message
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== currentSessionId) return session;
        return {
          ...session,
          messages: session.messages.map((m) =>
            m.isStreaming ? { ...m, isStreaming: false } : m
          ),
        };
      })
    );
  };

  // Send message and stream response from Gemini API
  const handleSendMessage = async (text: string, imageUrl?: string) => {
    if ((!text.trim() && !imageUrl) || isGenerating) return;

    const userMessageId = `usr-${Date.now()}`;
    const assistantMessageId = `bot-${Date.now() + 1}`;

    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: text,
      imageUrl: imageUrl,
      timestamp: Date.now(),
    };

    const newAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'model',
      content: '',
      timestamp: Date.now() + 1,
      isStreaming: true,
    };

    // Calculate updated title if this is the first message
    const isFirstMessage = currentSession.messages.length === 0;
    const titleSource = text || 'Analisis Gambar';
    const sessionTitle = isFirstMessage
      ? titleSource.length > 35
        ? `${titleSource.slice(0, 35)}...`
        : titleSource
      : currentSession.title;

    // Optimistically update session with user message and placeholder assistant message
    const updatedMessages = [
      ...currentSession.messages,
      newUserMessage,
      newAssistantMessage,
    ];

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? {
              ...s,
              title: sessionTitle,
              updatedAt: Date.now(),
              messages: updatedMessages,
            }
          : s
      )
    );

    setIsGenerating(true);
    setTimeout(() => scrollToBottom(true), 50);

    // Setup abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Prepare payload with prior conversation context
      const messagesPayload = updatedMessages
        .slice(0, -1) // exclude the empty streaming assistant message
        .map((m) => ({
          role: m.role,
          content: m.content,
          imageUrl: m.imageUrl,
        }));

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesPayload,
          systemInstruction: currentPersona.systemInstruction,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMsg = '';
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message;
          } else {
            const rawText = await response.text();
            if (rawText && rawText.length < 500 && !rawText.includes('<!DOCTYPE')) {
              errorMsg = rawText.trim();
            }
          }
        } catch {
          // ignore parsing error
        }

        if (!errorMsg) {
          if (response.status === 500) {
            errorMsg =
              'Koneksi server gagal (Status 500). Pastikan variabel lingkungan GEMINI_API_KEY sudah ditambahkan pada Vercel Dashboard (Settings > Environment Variables) lalu lakukan Redeploy pada project Anda.';
          } else if (response.status === 404) {
            errorMsg =
              'Endpoint API tidak ditemukan (Status 404). Pastikan endpoint /api/chat/stream terpasang.';
          } else {
            errorMsg = `Koneksi gagal dengan status ${response.status}.`;
          }
        }

        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Aliran respon tidak dapat dibaca dari server.');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.error) {
              const errMsg = typeof data.error === 'string' ? data.error : data.error?.message || JSON.stringify(data.error);
              throw new Error(errMsg);
            }

            if (data.model) {
              setActiveModel(data.model);
            }

            if (data.text) {
              accumulatedContent += data.text;
              const currentContent = accumulatedContent;

              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id !== currentSessionId) return s;
                  return {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: currentContent, isStreaming: true }
                        : m
                    ),
                  };
                })
              );

              // Scroll while streaming
              scrollToBottom(false);
            }

            if (data.done) {
              // Final chunk received
            }
          } catch (err: any) {
            // Re-throw genuine errors or API failures so the chat message displays the error state
            if (err?.message && !err.message.startsWith('Unexpected token')) {
              throw err;
            }
            console.warn('Non-fatal parse issue on chunk:', jsonStr);
          }
        }
      }

      // Finalize assistant message
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== currentSessionId) return s;
          return {
            ...s,
            messages: s.messages.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: accumulatedContent || '(Tidak ada balasan yang dihasilkan)',
                    isStreaming: false,
                  }
                : m
            ),
          };
        })
      );
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream dihentikan oleh pengguna.');
      } else {
        console.error('Error streaming chat:', error);
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== currentSessionId) return s;
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      isStreaming: false,
                      error:
                        error.message ||
                        'Terjadi gangguan saat mengambil respon dari Gemini API.',
                    }
                  : m
              ),
            };
          })
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      setTimeout(() => scrollToBottom(true), 100);
    }
  };

  // Regenerate last assistant response
  const handleRegenerate = () => {
    if (isGenerating || currentSession.messages.length === 0) return;

    const messages = currentSession.messages;
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.role === 'model') {
      // Find the last user message before this model message
      const userMessage = messages[messages.length - 2];
      if (!userMessage || userMessage.role !== 'user') return;

      // Remove the last model message and re-send the prompt
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: s.messages.slice(0, -1) }
            : s
        )
      );

      // Trigger generation with user message
      setTimeout(() => {
        handleSendMessage(userMessage.content);
      }, 50);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased">
      {/* Responsive Collapsible Sidebar */}
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onClearAllSessions={handleClearAllSessions}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentPersonaId={currentPersonaId}
        onSelectPersona={(id) => setCurrentPersonaId(id)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        activeModel={activeModel}
      />

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative bg-zinc-50/50 dark:bg-zinc-950">
        {/* Sticky Header */}
        <ChatHeader
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNewChat={handleNewSession}
          onResetChat={handleResetCurrentChat}
          currentTitle={currentSession.title}
          hasMessages={currentSession.messages.length > 0}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          currentPersona={currentPersona}
        />

        {/* Scrollable Message List or Empty State */}
        <div
          ref={chatScrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 flex flex-col"
        >
          {currentSession.messages.length === 0 ? (
            <EmptyChatState
              onSelectPrompt={(prompt) => handleSendMessage(prompt)}
              currentPersonaId={currentPersonaId}
            />
          ) : (
            <div className="w-full max-w-4xl mx-auto space-y-4 pb-4">
              {currentSession.messages.map((msg, index) => {
                const isLastAssistant =
                  msg.role === 'model' &&
                  index === currentSession.messages.length - 1;
                return (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    isLastAssistantMessage={isLastAssistant}
                    onRegenerate={handleRegenerate}
                    isGenerating={isGenerating}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Scroll to Bottom Floating Button */}
        {showScrollBottom && (
          <button
            id="scroll-bottom-btn"
            type="button"
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-24 right-6 sm:right-8 z-30 p-2.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-all active:scale-95 cursor-pointer"
            title="Gulir ke bawah"
            aria-label="Gulir ke bawah"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Input Bar */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          isGenerating={isGenerating}
        />
      </main>
    </div>
  );
}

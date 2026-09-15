export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  error?: string;
  imageUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  personaId?: string;
}

export interface PersonaOption {
  id: string;
  name: string;
  tagline: string;
  systemInstruction: string;
  iconName: string;
}

export interface HealthStatus {
  status: string;
  hasApiKey: boolean;
  model: string;
}

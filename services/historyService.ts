
import { ChatSession, Message, ModelConfig } from '../types';

// Configuration
// If environment variable is set, use it.
// Otherwise, detect if running on localhost. If yes, use localhost:8000.
// If running on app.leximera.com (or any other prod domain), default to api.leximera.com.

const ENV_API_URL = process.env.REACT_APP_API_URL || (import.meta as any).env?.VITE_API_URL;

const isLocalhost = 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE_URL = ENV_API_URL || (isLocalhost ? 'http://localhost:8000' : 'https://api.leximera.com');
const USE_BACKEND = true; 
const LOCAL_STORAGE_KEY = 'leximera_sessions';

class HistoryService {
  
  // --- Public API ---

  async getSessions(): Promise<ChatSession[]> {
    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/sessions`);
        if (!res.ok) throw new Error('Backend error');
        return await res.json();
      } catch (e) {
        // Silent fail to local storage
        console.warn("Backend unavailable, falling back to local storage");
        return this.getLocalSessions();
      }
    }
    return this.getLocalSessions();
  }

  async createSession(session: ChatSession): Promise<ChatSession> {
    if (USE_BACKEND) {
        try {
            await fetch(`${API_BASE_URL}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(session)
            });
        } catch (e) { console.warn("Backend unavailable for create"); }
    }
    // Always save local for redundancy/cache
    const sessions = this.getLocalSessions();
    const updated = [session, ...sessions];
    this.saveLocalSessions(updated);
    return session;
  }

  async updateSession(session: ChatSession): Promise<void> {
     if (USE_BACKEND) {
         try {
             await fetch(`${API_BASE_URL}/sessions/${session.id}`, {
                 method: 'PUT',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(session)
             });
         } catch (e) { console.warn("Backend unavailable for update"); }
     }
     const sessions = this.getLocalSessions();
     const updated = sessions.map(s => s.id === session.id ? session : s);
     this.saveLocalSessions(updated);
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (USE_BACKEND) {
        try {
            await fetch(`${API_BASE_URL}/sessions/${sessionId}`, { method: 'DELETE' });
        } catch (e) { console.warn("Backend unavailable for delete"); }
    }
    const sessions = this.getLocalSessions();
    const updated = sessions.filter(s => s.id !== sessionId);
    this.saveLocalSessions(updated);
  }

  async clearAll(): Promise<void> {
    if (USE_BACKEND) {
        try {
            await fetch(`${API_BASE_URL}/sessions`, { method: 'DELETE' });
        } catch (e) { console.warn("Backend unavailable for clear"); }
    }
    this.saveLocalSessions([]);
  }

  // --- Local Storage Helpers ---

  private getLocalSessions(): ChatSession[] {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error("Corrupt history data", e);
      return [];
    }
  }

  private saveLocalSessions(sessions: ChatSession[]) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  }
}

export const historyService = new HistoryService();

import { ChatSession } from '../types';

/**
 * Validate imported JSON data
 */
export function validateImportedJSON(data: any): boolean {
  // Check if data exists
  if (!data) return false;

  // Check version
  if (!data.version) return false;

  // Check if single session or multiple sessions
  if (data.session) {
    return validateSession(data.session);
  } else if (data.sessions && Array.isArray(data.sessions)) {
    return data.sessions.every((session: any) => validateSession(session));
  }

  return false;
}

/**
 * Validate a single session object
 */
function validateSession(session: any): boolean {
  return (
    session &&
    typeof session.id === 'string' &&
    typeof session.title === 'string' &&
    Array.isArray(session.messages) &&
    typeof session.updatedAt === 'number'
  );
}

/**
 * Import conversation from JSON string
 */
export function importConversation(jsonData: string): ChatSession | null {
  try {
    const data = JSON.parse(jsonData);
    
    if (!validateImportedJSON(data)) {
      throw new Error('Invalid conversation data');
    }

    // Return single session
    if (data.session) {
      return data.session as ChatSession;
    }

    return null;
  } catch (error) {
    console.error('Failed to import conversation:', error);
    return null;
  }
}

/**
 * Import multiple conversations from JSON string
 */
export function importConversations(jsonData: string): ChatSession[] | null {
  try {
    const data = JSON.parse(jsonData);
    
    if (!validateImportedJSON(data)) {
      throw new Error('Invalid conversation data');
    }

    // Return multiple sessions
    if (data.sessions && Array.isArray(data.sessions)) {
      return data.sessions as ChatSession[];
    }

    // Return single session as array
    if (data.session) {
      return [data.session as ChatSession];
    }

    return null;
  } catch (error) {
    console.error('Failed to import conversations:', error);
    return null;
  }
}

/**
 * Merge imported conversations with existing ones
 * Handles duplicates by ID
 */
export function mergeConversations(
  existing: ChatSession[],
  imported: ChatSession[]
): ChatSession[] {
  const existingIds = new Set(existing.map(s => s.id));
  const uniqueImported = imported.filter(s => !existingIds.has(s.id));
  
  return [...existing, ...uniqueImported];
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

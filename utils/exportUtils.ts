import { ChatSession, Message } from '../types';

/**
 * Export conversation as Markdown format
 */
export function exportConversationAsMarkdown(session: ChatSession): string {
  const date = new Date(session.updatedAt).toLocaleString();
  const provider = session.modelConfig?.provider || 'Unknown';
  const model = session.modelConfig?.model || 'Unknown';
  const messageCount = session.messages.length;

  let markdown = `# ${session.title}\n\n`;
  markdown += `**Date**: ${date}  \n`;
  markdown += `**Provider**: ${provider}  \n`;
  markdown += `**Model**: ${model}  \n`;
  markdown += `**Total Messages**: ${messageCount}\n\n`;
  markdown += `---\n\n`;

  session.messages.forEach((message) => {
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    const role = message.role === 'user' ? '👤 User' : '🤖 Assistant';
    
    markdown += `## ${role} (${timestamp})\n\n`;
    markdown += `${message.content}\n\n`;
    
    if (message.attachment) {
      markdown += `*[Attached image]*\n\n`;
    }
    
    if (message.groundingMetadata?.groundingChunks) {
      markdown += `**Sources**:\n`;
      message.groundingMetadata.groundingChunks.forEach((chunk) => {
        if (chunk.web) {
          markdown += `- [${chunk.web.title}](${chunk.web.uri})\n`;
        }
      });
      markdown += `\n`;
    }
  });

  markdown += `---\n\n`;
  markdown += `*Exported from LEXIMERA on ${new Date().toLocaleString()}*\n`;

  return markdown;
}

/**
 * Export conversation as JSON format
 */
export function exportConversationAsJSON(session: ChatSession): string {
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    session: session
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export all conversations as JSON
 */
export function exportAllConversationsAsJSON(sessions: ChatSession[]): string {
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    totalSessions: sessions.length,
    sessions: sessions
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download file to user's computer
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(sessionTitle: string, extension: string): string {
  const sanitizedTitle = sessionTitle
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .substring(0, 50);
  
  const timestamp = new Date().toISOString().split('T')[0];
  
  return `${sanitizedTitle}_${timestamp}.${extension}`;
}

/**
 * Export conversation as Markdown file
 */
export function exportAsMarkdown(session: ChatSession): void {
  const markdown = exportConversationAsMarkdown(session);
  const filename = generateFilename(session.title, 'md');
  downloadFile(markdown, filename, 'text/markdown');
}

/**
 * Export conversation as JSON file
 */
export function exportAsJSON(session: ChatSession): void {
  const json = exportConversationAsJSON(session);
  const filename = generateFilename(session.title, 'json');
  downloadFile(json, filename, 'application/json');
}

/**
 * Export all conversations as JSON file
 */
export function exportAllAsJSON(sessions: ChatSession[]): void {
  const json = exportAllConversationsAsJSON(sessions);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `leximera_all_conversations_${timestamp}.json`;
  downloadFile(json, filename, 'application/json');
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  chatContent?: string;
  message_type: 'text' | 'thinking' | 'file' | 'error';
  file_references?: Array<{
    id: string;
    file_name: string;
    thumbnail_url?: string;
    file_type: string;
  }>;
  created_at: string;
  displayContent?: string;
  userResponses?: string[];
  shouldDisplay?: boolean;
}
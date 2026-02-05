export type ChatMessage = {
  id: string;
  timestamp: string;
} & (
    | {
      role: 'user';
      content: string;
    }
    | {
      role: 'assistant';
      content: Array<AssistantMessage>;
    }
  );

export interface TextAssistantMessage {
  type: 'text';
  reasoning?: string;
  text?: string;
  userResponse: string;
}

interface ToolCallAssistantMessage {
  type: 'toolCall';
  toolCall: {
    action: string;
    reasoning: string;
    userResponse: string;
  }
}

interface ToolCallResponseAssistantMessage {
  type: 'toolCallResponse';
  toolCallResponse: {
    action: string;
    reasoning: string;
    userResponse: string;
  }
}

export type AssistantMessage = ToolCallAssistantMessage |
  TextAssistantMessage | ToolCallResponseAssistantMessage;
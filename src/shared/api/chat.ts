export type ChatRole = 'system' | 'user' | 'assistant'
export interface ChatMessage {
  role: ChatRole
  content: string
}

interface StreamChatOptions {
  /** Called for each token as it streams in. */
  onToken?: (token: string) => void
  /** Abort signal to cancel the request (e.g. on unmount). */
  signal?: AbortSignal
}

export class ChatStreamError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ChatStreamError'
    this.status = status
  }
}

/** Standalone homepage: local demo reply, no external model or credentials. */
export async function streamChat(
  _messages: ChatMessage[],
  { onToken, signal }: StreamChatOptions = {},
): Promise<string> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const reply = '当前为独立首页演示，已保留首页数据展示和交互；AI 对话服务未接入。'
  onToken?.(reply)
  return reply
}

export type ProductIntentTarget = 'ai-avatar' | 'wiki' | 'suibian' | 'workshop'
export type ProductIntent = ProductIntentTarget | 'none'
export async function classifyProductIntent(_text: string, _options: { signal?: AbortSignal } = {}): Promise<ProductIntent> {
 if (_options.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
 return 'none'
}

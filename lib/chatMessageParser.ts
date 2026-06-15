import type { ChatProduct } from '@/lib/chatProducts';

export type ParsedChatPart =
  | { type: 'text'; content: string }
  | { type: 'PRODUCT_CARD'; data: ChatProduct }
  | { type: 'ADDRESS_CONFIRMATION'; data: Record<string, string> };

function parsePrice(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value.replace(/[^\d]/g, '')) || 0;
  return 0;
}

function normalizeCardData(data: Record<string, unknown>): ChatProduct {
  return {
    id: String(data.id || ''),
    name: String(data.name || ''),
    price: parsePrice(data.price),
    originalPrice: data.originalPrice ? parsePrice(data.originalPrice) : undefined,
    image: String(data.image || ''),
    category: String(data.category || ''),
    rating: Number(data.rating) || 0,
    stock: Number(data.stock) || 0,
    stockStatus: String(data.stockStatus || 'in-stock'),
    featured: !!data.featured,
    isCargo: !!data.isCargo,
    description: String(data.description || ''),
  };
}

function extractFromRecommendationsBlock(text: string): ChatProduct[] {
  const products: ChatProduct[] = [];
  const regex = /\[PRODUCT_RECOMMENDATIONS:(\[[\s\S]*?\])\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => products.push(normalizeCardData(item)));
      }
    } catch {
      // skip malformed block
    }
  }
  return products;
}

function extractFromToolParts(parts: Array<{ type: string; [key: string]: unknown }>): ChatProduct[] {
  const products: ChatProduct[] = [];

  for (const part of parts) {
    const type = part.type || '';
    if (!type.startsWith('tool-')) continue;

    const output = part.output ?? part.result;
    if (!output) continue;

    const collect = (items: unknown) => {
      if (!Array.isArray(items)) return;
      items.forEach((item) => {
        if (item && typeof item === 'object' && 'id' in item && 'name' in item) {
          products.push(normalizeCardData(item as Record<string, unknown>));
        }
      });
    };

    if (Array.isArray(output)) {
      collect(output);
    } else if (typeof output === 'object' && output !== null) {
      const obj = output as Record<string, unknown>;
      if (Array.isArray(obj.products)) collect(obj.products);
    }
  }

  return products;
}

export function parseChatMessageContent(
  textContent: string,
  parts?: Array<{ type: string; [key: string]: unknown }>,
): ParsedChatPart[] {
  const cleanContent = (textContent || '')
    .replace(/\[ACTION:.*?:END_ACTION\]/g, '')
    .replace(/\[PRODUCT_RECOMMENDATIONS:[\s\S]*?\]/g, '');

  const result: ParsedChatPart[] = [];
  const seenIds = new Set<string>();

  const addProduct = (product: ChatProduct) => {
    if (!product.id || seenIds.has(product.id)) return;
    seenIds.add(product.id);
    result.push({ type: 'PRODUCT_CARD', data: product });
  };

  // Tool outputs (most reliable)
  if (parts?.length) {
    extractFromToolParts(parts).forEach(addProduct);
  }

  // Recommendation JSON blocks
  extractFromRecommendationsBlock(textContent).forEach(addProduct);

  // Inline PRODUCT_CARD markers
  const cardRegex = /\[(PRODUCT_CARD|ADDRESS_CONFIRMATION):\s*([\s\S]*?)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = cardRegex.exec(cleanContent)) !== null) {
    if (match.index > lastIndex) {
      const slice = cleanContent.slice(lastIndex, match.index).trim();
      if (slice) result.push({ type: 'text', content: slice });
    }

    try {
      const type = match[1];
      const rawData = match[2].trim();
      let data: Record<string, unknown> = {};

      if (rawData.startsWith('{')) {
        data = JSON.parse(rawData);
      } else {
        const attrRegex = /(\w+)="([^"]*)"/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(rawData)) !== null) {
          data[attrMatch[1]] = attrMatch[2];
        }
      }

      if (type === 'PRODUCT_CARD') {
        addProduct(normalizeCardData(data));
      } else if (type === 'ADDRESS_CONFIRMATION') {
        result.push({ type: 'ADDRESS_CONFIRMATION', data: data as Record<string, string> });
      }
    } catch {
      result.push({ type: 'text', content: match[0] });
    }

    lastIndex = cardRegex.lastIndex;
  }

  if (lastIndex < cleanContent.length) {
    const slice = cleanContent.slice(lastIndex).trim();
    if (slice) result.push({ type: 'text', content: slice });
  }

  // If only products from tools, keep any leading text from original minus markers
  if (!result.some((p) => p.type === 'text') && cleanContent.trim()) {
    const stripped = cleanContent
      .replace(/\[(PRODUCT_CARD|ADDRESS_CONFIRMATION):[\s\S]*?\]/g, '')
      .trim();
    if (stripped) result.unshift({ type: 'text', content: stripped });
  }

  return result;
}

export function getProductsFromParts(parts: ParsedChatPart[]): ChatProduct[] {
  return parts.filter((p): p is { type: 'PRODUCT_CARD'; data: ChatProduct } => p.type === 'PRODUCT_CARD').map((p) => p.data);
}

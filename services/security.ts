// Security utilities for content sanitization

export const customSanitizeSchema = {
  tagNames: [
    'a', 'abbr', 'acronym', 'address', 'article', 'aside', 'b', 'bdi', 'bdo',
    'big', 'blockquote', 'body', 'br', 'caption', 'center', 'cite', 'code',
    'col', 'colgroup', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt',
    'em', 'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'head', 'header', 'hgroup', 'hr', 'html', 'i', 'img', 'ins', 'kbd',
    'li', 'main', 'mark', 'nav', 'ol', 'p', 'pre', 'q', 'rp', 'rt', 'ruby',
    's', 'samp', 'section', 'small', 'span', 'strike', 'strong', 'sub',
    'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time',
    'title', 'tr', 'tt', 'u', 'ul', 'var', 'wbr',
    // Markdown specific
    'input', // For task lists
  ],
  attributes: {
    '*': ['className', 'class', 'id', 'title', 'lang', 'dir'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    input: ['type', 'checked', 'disabled'],
    td: ['colSpan', 'rowSpan'],
    th: ['colSpan', 'rowSpan', 'scope'],
    time: ['dateTime'],
  },
  // Allow data attributes
  protocols: {
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https', 'data'],
  },
};

export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization
  // In production, use a proper sanitizer library
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

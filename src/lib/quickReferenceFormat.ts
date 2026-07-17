import { sanitizeHTML } from '@/lib/sanitize';

function escapeEditorText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatInlineMarkdown(text: string): string {
  return escapeEditorText(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

export function quickReferenceToEditorHtml(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (!listType) return;
    blocks.push(`</${listType}>`);
    listType = null;
  };

  for (const sourceLine of lines) {
    const line = sourceLine.trimEnd();
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const unorderedItem = line.match(/^[-*]\s+(.+)$/);
    const orderedItem = line.match(/^\d+[.)]\s+(.+)$/);

    if (heading) {
      closeList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${formatInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if (unorderedItem || orderedItem) {
      const nextListType = unorderedItem ? 'ul' : 'ol';
      if (listType !== nextListType) {
        closeList();
        listType = nextListType;
        blocks.push(`<${listType}>`);
      }
      blocks.push(`<li>${formatInlineMarkdown((unorderedItem || orderedItem)![1])}</li>`);
      continue;
    }

    closeList();
    blocks.push(line.trim() ? `<p>${formatInlineMarkdown(line)}</p>` : '<p><br></p>');
  }

  closeList();
  return sanitizeHTML(blocks.join(''));
}

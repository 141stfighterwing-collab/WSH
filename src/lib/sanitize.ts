/** Sanitize HTML content for safe rendering via innerHTML */
export function sanitizeHTML(html: string): string {
  try {
    if (typeof window === 'undefined') return String(html || '');
    const tmp = document.createElement('div');
    tmp.innerHTML = String(html || '');
    // Remove dangerous elements
    tmp.querySelectorAll('script, iframe, object, embed, form, svg, base').forEach((el) => el.remove());
    // Remove dangerous attributes from all elements
    tmp.querySelectorAll('*').forEach((el) => {
      [...el.attributes].forEach((attr) => {
        if (attr.name.startsWith('on') || attr.name === 'srcdoc') el.removeAttribute(attr.name);
        // Strip javascript: and data: URIs from href/src/action attributes
        const val = (attr.value || '').trim().toLowerCase();
        if (val.startsWith('javascript:') || val.startsWith('data:')) {
          el.removeAttribute(attr.name);
        }
      });
    });
    return tmp.innerHTML;
  } catch {
    return String(html || '').replace(/<[^>]+>/g, '');
  }
}

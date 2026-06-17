import Fuse from 'fuse.js';

  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-search-root]'));

  roots.forEach((root) => {
    const dataEl = root.querySelector<HTMLScriptElement>('.search-data');
    const searchData = JSON.parse(dataEl?.textContent || '[]');

    const fuse = new Fuse(searchData, {
      keys: [
        { name: 'title', weight: 0.5 },
        { name: 'body', weight: 0.3 },
        { name: 'tags', weight: 0.2 },
      ],
      threshold: 0.4,
      includeMatches: true,
    });

    const overlay = root.querySelector<HTMLElement>('[data-search-overlay]');
    const input = root.querySelector<HTMLInputElement>('[data-search-input]');
    const results = root.querySelector<HTMLElement>('[data-search-results]');
    const empty = root.querySelector<HTMLElement>('[data-search-empty]');
    const label = root.querySelector<HTMLElement>('[data-search-label]');
    const trigger = root.querySelector<HTMLElement>('[data-search-trigger]');
    const closeBtn = root.querySelector<HTMLElement>('[data-search-close]');

    if (!overlay || !input || !results || !empty || !label || !trigger || !closeBtn) return;

    function open() {
      overlay.classList.add('open');
      input.value = '';
      renderResults('');
      requestAnimationFrame(() => input.focus());
    }

    function close() {
      overlay.classList.remove('open');
    }

    trigger.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        overlay.classList.contains('open') ? close() : open();
      }
      if (e.key === 'Escape' && overlay.classList.contains('open')) {
        close();
      }
    });

    input.addEventListener('input', () => {
      renderResults(input.value);
    });

    input.addEventListener('keydown', (e) => {
      const items = results.querySelectorAll('.search-result-item');
      if (items.length === 0) return;

      const active = results.querySelector('.search-result-item.active');
      let index = Array.from(items).indexOf(active);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (active) active.classList.remove('active');
        index = (index + 1) % items.length;
        items[index]?.classList.add('active');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (active) active.classList.remove('active');
        index = index <= 0 ? items.length - 1 : index - 1;
        items[index]?.classList.add('active');
      } else if (e.key === 'Enter') {
        const selected = results.querySelector('.search-result-item.active') as HTMLElement;
        if (selected) selected.click();
      }
    });

    function renderResults(query: string) {
      const q = query.trim();

      if (q === '') {
        results.innerHTML = '';
        empty.style.display = 'none';
        label.style.display = 'none';
        return;
      }

      const matched = fuse.search(q);

      if (matched.length === 0) {
        results.innerHTML = '';
        empty.style.display = 'block';
        label.style.display = 'none';
        return;
      }

      empty.style.display = 'none';
      label.style.display = 'block';
      results.innerHTML = matched.map((result, i) => {
        const post = result.item;
        return `
          <li class="search-result-item ${i === 0 ? 'active' : ''}" data-href="${post.href}" data-external="${post.external}">
            <span class="search-result-title">${highlightMatches(post.title, result.matches, 'title')}</span>
            <span class="search-result-desc">${getSnippet(post.body, q)}</span>
          </li>
        `;
      }).join('');

      results.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const href = (item as HTMLElement).dataset.href;
          const external = (item as HTMLElement).dataset.external === 'true';
          if (href) {
            close();
            if (external) window.open(href, '_blank');
            else window.location.href = href;
          }
        });
      });
    }

    function getSnippet(body: string, query: string): string {
      const idx = body.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) return body.slice(0, 80) + '...';
      const start = Math.max(0, idx - 40);
      const end = Math.min(body.length, idx + query.length + 60);
      let snippet = (start > 0 ? '...' : '') + body.slice(start, end) + (end < body.length ? '...' : '');
      const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return snippet.replace(re, '<strong>$1</strong>');
    }

    function highlightMatches(text: string, matches: any[], key: string): string {
      const match = matches?.find(m => m.key === key);
      if (!match) return text;

      const chars = [...text];
      const highlighted = chars.map((c) => c);
      for (const [start, end] of match.indices.reverse()) {
        highlighted.splice(end + 1, 0, '</mark>');
        highlighted.splice(start, 0, '<mark>');
      }
      return highlighted.join('');
    }
  });

import { classx, derived, For, Link, mutable, navigate, query, render, setup, Show, Snippet } from '@airlib/react';
import MiniSearch, { type SearchResult } from 'minisearch';
import type { KeyboardEventHandler } from 'react';

interface SearchDocument {
  id: string;
  title: string;
  content?: string;
  url: string;
}

export interface SearchProps {
  className?: string;
}

/**
 * Client-side search over the `index.json` emitted by the `airSearch` plugin.
 * The index auto-loads via `query` at mount; dropdown visibility is pure CSS
 * (`:focus-within`); results are derived reactively from the query.
 */
export const Search = setup<SearchProps>((props) => {
  // All primitives — no deep observation needed. `open` exists only to keep
  // `aria-expanded` honest; it's read solely inside the input's `<Snippet>`,
  // so focus changes re-render just the input, never the results list.
  const state = mutable({
    query: '',
    active: -1,
    open: false,
  });

  // Auto-starts on the client (no-op during SSR); `data` flips from undefined
  // to the search facade once the index is fetched and the engine is built.
  const indexes = query(async () => {
    const res = await fetch('/index.json');
    const docs = (res.ok ? await res.json() : []) as SearchDocument[];

    const engine = new MiniSearch<SearchDocument>({
      fields: ['title', 'content'],
      storeFields: ['title', 'content', 'url'],
      searchOptions: { prefix: true, boost: { title: 2 } },
    });
    engine.addAll(docs);

    // Facade keeps the engine a private closure — never proxied as reactive state.
    return { search: (query: string) => engine.search(query) };
  });

  const results = derived(() => {
    const query = state.query.trim();
    if (!query || !indexes.data) return [];

    return indexes.data.search(query).slice(0, 8);
  });

  const go = (url: string) => {
    navigate(url);
    state.active = -1;
  };

  const handleInput = (e: { currentTarget: { value: string } }) => {
    state.query = e.currentTarget.value;
    state.active = -1;
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    const items = results.value;

    if (e.key === 'Escape') {
      e.currentTarget.blur();
      state.active = -1;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.active = items.length ? (state.active + 1) % items.length : -1;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.active = items.length ? (state.active - 1 + items.length) % items.length : -1;
    } else if (e.key === 'Enter' && state.active >= 0 && items[state.active]) {
      e.preventDefault();
      go(items[state.active].url);
      e.currentTarget.blur();
    }
  };

  return render(() => (
    <div className={classx('air-search air-mdx', props.className)}>
      <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
        <path d="M378-329q-108.16 0-183.08-75Q120-479 120-585t75-181q75-75 181.5-75t181 75Q632-691 632-584.85 632-542 618-502q-14 40-42 75l242 240q9 8.56 9 21.78T818-143q-9 9-22.22 9-13.22 0-21.78-9L533-384q-30 26-69.96 40.5Q423.08-329 378-329Zm-1-60q81.25 0 138.13-57.5Q572-504 572-585t-56.87-138.5Q458.25-781 377-781q-82.08 0-139.54 57.5Q180-666 180-585t57.46 138.5Q294.92-389 377-389Z" />
      </svg>

      {/* Isolated boundary: typing only re-renders the input, not the dropdown. */}
      <Snippet>
        {() => (
          <input
            type="search"
            value={state.query}
            onInput={handleInput}
            onFocus={() => (state.open = true)}
            onBlur={() => (state.open = false)}
            onKeyDown={handleKeyDown}
            placeholder="Search docs…"
            role="combobox"
            aria-expanded={state.open}
            aria-controls="air-search-results"
            aria-activedescendant={state.active >= 0 ? `air-search-item-${state.active}` : undefined}
          />
        )}
      </Snippet>

      <Show when={() => (results.value.length && results.value) as SearchResult[]}>
        {(items) => (
          <div id="air-search-results" className="air-search-results" role="listbox">
            <For each={() => items}>
              {(hit, index) => (
                <Link
                  href={hit.url}
                  id={`air-search-item-${index}`}
                  role="option"
                  aria-selected={state.active === index}
                  className={classx('air-search-item', { active: state.active === index })}
                  onClick={() => (state.active = -1)}
                >
                  <strong className="air-search-item-title">{hit.title || hit.url}</strong>
                  <Excerpt content={hit.content} terms={hit.terms} />
                  <span className="air-search-item-url">{hit.url}</span>
                </Link>
              )}
            </For>
          </div>
        )}
      </Show>
    </div>
  ));
});

interface ExcerptProps {
  content?: string;
  terms: string[];
}

/**
 * Windows the content around the first matched term and highlights the
 * matches. Keeps the result compact — ~40 chars of lead-in, ~90 after.
 */
const Excerpt = ({ content, terms }: ExcerptProps) => {
  const text = (content ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const patterns = terms.filter(Boolean).map((term) => escapeRegExp(term));
  if (!patterns.length) {
    return <span className="air-search-item-excerpt">{truncate(text, 120)}</span>;
  }

  const re = new RegExp(patterns.join('|'), 'gi');
  const match = text.match(re);
  if (!match || typeof match.index !== 'number') {
    return <span className="air-search-item-excerpt">{truncate(text, 120)}</span>;
  }

  const start = Math.max(0, match.index - 40);
  const end = Math.min(text.length, match.index + match[0].length + 90);
  const lead = start > 0 ? '…' : '';
  const trail = end < text.length ? '…' : '';
  const window = `${lead}${text.slice(start, end)}${trail}`;

  return <span className="air-search-item-excerpt">{highlight(window, re)}</span>;
};

function highlight(text: string, re: RegExp) {
  const parts = text.split(re);
  return parts.map((part, index) => (index === parts.length - 1 ? part : <mark key={index}>{part}</mark>));
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

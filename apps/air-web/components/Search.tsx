import { classx, derived, effect, For, Link, mutable, navigate, query, Show, Snippet, setup } from '@airlib/react';
import { LIVE_KEYBOARD } from '@airlib/react/browser';
import MiniSearch, { type SearchResult } from 'minisearch';
import type { KeyboardEventHandler, ReactNode } from 'react';

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
 * Client-side documentation search component with keyboard navigation and instant indexing.
 */
export const Search = setup<SearchProps>((props) => {
  const state = mutable({
    query: '',
    active: -1,
    open: false,
  });
  let inputRef: HTMLInputElement | null = null;

  effect.client(() => {
    if (LIVE_KEYBOARD.is('ctrl', 'k') || LIVE_KEYBOARD.is('meta', 'k')) {
      if (inputRef && document.activeElement !== inputRef) {
        inputRef.focus();
        inputRef.select();
      }
    }
  });

  const indexes = query(async () => {
    const res = await fetch('/index.json');
    const docs = (res.ok ? await res.json() : []) as SearchDocument[];

    const engine = new MiniSearch<SearchDocument>({
      fields: ['title', 'content'],
      storeFields: ['title', 'content', 'url'],
      searchOptions: { prefix: true, boost: { title: 2 } },
    });
    engine.addAll(docs);

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
      const next = items.length ? (state.active + 1) % items.length : -1;
      state.active = next;
      document.getElementById(`air-search-item-${next}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = items.length ? (state.active - 1 + items.length) % items.length : -1;
      state.active = next;
      document.getElementById(`air-search-item-${next}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && state.active >= 0 && items[state.active]) {
      e.preventDefault();
      go(items[state.active].url);
      e.currentTarget.blur();
    }
  };

  return () => (
    <div className={classx('air-search air-mdx', props.className)}>
      <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
        <path d="M378-329q-108.16 0-183.08-75Q120-479 120-585t75-181q75-75 181.5-75t181 75Q632-691 632-584.85 632-542 618-502q-14 40-42 75l242 240q9 8.56 9 21.78T818-143q-9 9-22.22 9-13.22 0-21.78-9L533-384q-30 26-69.96 40.5Q423.08-329 378-329Zm-1-60q81.25 0 138.13-57.5Q572-504 572-585t-56.87-138.5Q458.25-781 377-781q-82.08 0-139.54 57.5Q180-666 180-585t57.46 138.5Q294.92-389 377-389Z" />
      </svg>

      <Snippet>
        {() => (
          <input
            ref={(el) => {
              inputRef = el;
            }}
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

      <kbd className="air-search-kbd">⌘K</kbd>

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
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => {
                    state.active = -1;
                    state.query = '';
                  }}
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
  );
}, 'Search');

interface ExcerptProps {
  content?: string;
  terms: string[];
}

/**
 * Extracts and highlights the complete sentence matching the search terms.
 */
const Excerpt = ({ content, terms }: ExcerptProps) => {
  const clean = stripMarkdown(content ?? '');
  if (!clean) return null;

  const patterns = terms.filter(Boolean).map((term) => escapeRegExp(term));
  if (!patterns.length) {
    return <span className="air-search-item-excerpt">{truncate(clean, 130)}</span>;
  }

  const re = new RegExp(patterns.join('|'), 'i');
  const match = clean.match(re);
  if (!match || typeof match.index !== 'number') {
    return <span className="air-search-item-excerpt">{truncate(clean, 130)}</span>;
  }

  const sentence = extractSentence(clean, match.index, match[0].length);
  return <span className="air-search-item-excerpt">{highlight(sentence, patterns)}</span>;
};

/**
 * Strips raw markdown syntax, headings, and code fences.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/:::[^\n]*\n?/g, ' ')
    .replace(/:::/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/^[\s>*-+]+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts the natural sentence containing the matched term.
 */
function extractSentence(text: string, matchIndex: number, matchLength: number): string {
  const prevBoundary = Math.max(
    text.lastIndexOf('. ', matchIndex),
    text.lastIndexOf('? ', matchIndex),
    text.lastIndexOf('! ', matchIndex),
    text.lastIndexOf('\n', matchIndex)
  );
  const start = prevBoundary === -1 ? 0 : prevBoundary + 2;

  const afterMatch = matchIndex + matchLength;
  const nextCandidates = [
    text.indexOf('. ', afterMatch),
    text.indexOf('? ', afterMatch),
    text.indexOf('! ', afterMatch),
    text.indexOf('\n', afterMatch),
  ].filter((idx) => idx !== -1);

  const nextBoundary = nextCandidates.length ? Math.min(...nextCandidates) : -1;
  const end = nextBoundary === -1 ? Math.min(text.length, start + 180) : nextBoundary + 1;

  let sentence = text.slice(start, end).trim();

  if (sentence.length > 200) {
    const relMatch = matchIndex - start;
    const sStart = Math.max(0, relMatch - 30);
    const sEnd = Math.min(sentence.length, relMatch + matchLength + 80);
    const lead = sStart > 0 ? '…' : '';
    const trail = sEnd < sentence.length ? '…' : '';
    sentence = `${lead}${sentence.slice(sStart, sEnd)}${trail}`;
  }

  return sentence;
}

/**
 * Wraps matched term occurrences with `<mark>` tags.
 */
function highlight(text: string, patterns: string[]) {
  const re = new RegExp(`(${patterns.join('|')})`, 'gi');
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<mark key={match.index}>{match[0]}</mark>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

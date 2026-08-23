import { For, Head, Link, page } from '@airlib/react';
import { Badge } from '@airlib/react/mdx';
import releasesMeta from '@airlib-cache/metadata/(docs)/releases/index.js';
import { releasesIndexRoute } from './route.js';

export default page(releasesIndexRoute).render(() => {
  return (
    <article className="air-mdx-outlet">
      <Head
        meta={{
          title: 'Releases — AirLib',
          description: 'Release notes, changelogs, and announcements for the AirLib ecosystem.',
        }}
      />
      <h1>Releases</h1>
      <p>Stay up to date with the latest releases, features, and improvements across the AirLib ecosystem.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <For each={() => releasesMeta}>
          {({ path, meta }) => (
            <Link
              href={path}
              className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:border-blue-500 transition-all no-underline"
            >
              <article className="flex flex-col gap-4 h-full">
                <div className="flex items-center justify-between mb-2">
                  <Badge>{meta.category || 'Release'}</Badge>
                  <Badge variant={'tip'}>{meta.date ? <time>{meta.date}</time> : null}</Badge>
                </div>
                <h3 className="text-xl font-semibold mt-0! mb-2 text-slate-900 dark:text-slate-100">{meta.title}</h3>
                {meta.description ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">{meta.description}</p>
                ) : null}
                <span className="flex-1" />
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 inline-block">
                  {meta.category === 'Announcement' ? 'Read announcement →' : 'Read release notes →'}
                </span>
              </article>
            </Link>
          )}
        </For>
      </div>
    </article>
  );
});

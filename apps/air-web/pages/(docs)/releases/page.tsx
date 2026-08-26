import { For, Head, Link, page } from '@airlib/react';
import { Badge } from '@airlib/react/mdx';
import releasesMeta from '@airlib-cache/metadata/(docs)/releases/index.js';
import { releasesIndexRoute } from './route.js';

const posts = releasesMeta.sort((left, right) => {
  return right.meta.version?.toLowerCase().localeCompare(left.meta.version?.toLowerCase());
});

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
        <For each={() => posts}>
          {({ path, meta }) => (
            <Link href={path} className="air-card no-underline">
              <article className="air-card-content h-full">
                <div className="flex items-center justify-between">
                  <Badge>{meta.category || 'Release'}</Badge>
                  <Badge variant={'tip'}>{meta.date ? <time>{meta.date}</time> : null}</Badge>
                </div>
                <h3 className="air-card-title mt-2! mb-2">{meta.title}</h3>
                {meta.description ? <p className="air-card-body">{meta.description}</p> : null}
                <span className="air-card-more">{meta.category === 'Announcement' ? 'Read announcement →' : 'Read release notes →'}</span>
              </article>
            </Link>
          )}
        </For>
      </div>
    </article>
  );
});

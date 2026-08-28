import { For, Head, Link, page } from '@airlib/react';
import { Badge } from '@airlib/react/mdx';
import { releaseSections } from './layout.js';
import { releasesIndexRoute } from './route.js';

export default page(releasesIndexRoute).render(() => (
  <article className="air-mdx-outlet mx-auto max-w-4xl">
    <Head
      meta={{
        title: 'Releases & Announcements — AirLib',
        description: 'Release notes, changelogs, and announcements for the AirLib ecosystem.',
      }}
    />
    <h1>Releases</h1>
    <p>Stay up to date with the latest releases, features, and improvements across the AirLib ecosystem.</p>

    <For each={() => releaseSections}>
      {({ info, items }) => {
        if (!items.length) return null;

        return (
          <div key={info.category}>
            <h2>{info.title}</h2>
            <p>{info.description}</p>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <For each={() => items}>
                {({ href, meta }) => (
                  <Link href={href} className="air-card no-underline">
                    <article className="air-card-content h-full">
                      <div className="flex items-center justify-between">
                        <Badge>{meta.category || info.category}</Badge>
                        {meta.date ? (
                          <Badge variant="tip">
                            <time>{meta.date}</time>
                          </Badge>
                        ) : null}
                      </div>
                      <h3 className="air-card-title mt-2! mb-2">{meta.title}</h3>
                      {meta.description ? <p className="air-card-body">{meta.description}</p> : null}
                      <span className="air-card-more">{info.readMoreLabel}</span>
                    </article>
                  </Link>
                )}
              </For>
            </div>
          </div>
        );
      }}
    </For>
  </article>
));

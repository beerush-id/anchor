import { For, Head, Link, page } from '@airlib/react';
import { Badge } from '@airlib/react/mdx';
import { postSections } from './layout.js';
import { postsIndexRoute } from './route.js';

export default page(postsIndexRoute).render(() => (
  <article className="air-mdx-outlet mx-auto max-w-4xl">
    <Head
      meta={{
        title: 'Articles, Benchmarks, & Architecture Comparisons',
        description:
          'In-depth articles, architectural comparisons, and benchmarks comparing AirLib with Next.js, SolidStart, tRPC, and traditional state management across React and SolidJS.',
        keywords: [
          'React Framework Comparison',
          'Next.js Alternative',
          'SolidStart Alternative',
          'React Signals Benchmark',
          'Isomorphic RPC Guide',
          'Full-Stack TypeScript',
          'AirLib Articles',
        ],
      }}
    />
    <h1>Posts</h1>
    <p>Explore articles, architectural comparisons, and deep dives into AirLib.</p>

    <For each={() => postSections}>
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

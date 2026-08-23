import { For, Head, Link, page } from '@airlib/react';
import { Badge } from '@airlib/react/mdx';
import postsMeta from '@airlib-cache/metadata/(docs)/posts/index.js';
import { postsIndexRoute } from './route.js';

interface Section {
  title: string;
  description: string;
  category: string;
  readMoreLabel: string;
}

const sections: Section[] = [
  {
    title: 'Tutorials',
    description: 'Step-by-step guides that walk through building real features with AirLib libraries.',
    category: 'Tutorials',
    readMoreLabel: 'Read tutorial →',
  },
  {
    title: 'AirLib Posts',
    description:
      'Explore in-depth comparisons between AirLib and popular meta-frameworks and routing libraries in the React ecosystem.',
    category: 'AirLib Posts',
    readMoreLabel: 'Read article →',
  },
  {
    title: 'IRPC Posts',
    description:
      'Explore in-depth comparisons between IRPC and popular alternatives in the TypeScript ecosystem, including tRPC, Elysia, and NestJS.',
    category: 'IRPC Posts',
    readMoreLabel: 'Read article →',
  },
  {
    title: 'AirLib Form Posts',
    description:
      'Explore in-depth comparisons between AirLib Form and the most popular form validation and management libraries in the React and SolidJS ecosystems.',
    category: 'AirLib Form Posts',
    readMoreLabel: 'Read article →',
  },
];

export default page(postsIndexRoute).render(() => {
  return (
    <article className="air-mdx-outlet">
      <Head
        meta={{
          title: 'Posts & Comparisons — AirLib',
          description: 'Articles, comparisons, and deep dives into AirLib.',
        }}
      />
      <h1>Posts</h1>
      <p>Explore articles, architectural comparisons, and deep dives into AirLib.</p>

      <For each={() => sections}>
        {(section) => {
          const items = postsMeta.filter((item) => item.meta.category === section.category);

          if (items.length === 0) return null;

          return (
            <div key={section.category}>
              <h2>{section.title}</h2>
              <p>{section.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <For each={() => items}>
                  {({ path, meta }) => (
                    <Link
                      href={path}
                      className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:border-blue-500 transition-all no-underline"
                    >
                      <article className="flex flex-col gap-4 h-full">
                        <div className="flex items-center justify-between mb-2">
                          <Badge>{meta.category || section.category}</Badge>
                          {meta.date ? (
                            <Badge variant={'tip'}>
                              <time>{meta.date}</time>
                            </Badge>
                          ) : null}
                        </div>
                        <h3 className="text-xl font-semibold mt-0! mb-2 text-slate-900 dark:text-slate-100">
                          {meta.title}
                        </h3>
                        {meta.description ? (
                          <p className="text-sm text-slate-600 dark:text-slate-400">{meta.description}</p>
                        ) : null}
                        <span className="flex-1" />
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 inline-block mt-4">
                          {section.readMoreLabel}
                        </span>
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
  );
});

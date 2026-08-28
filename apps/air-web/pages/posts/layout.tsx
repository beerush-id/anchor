import { page } from '@airlib/react';
import postsMeta from '@airlib-cache/metadata/posts/index.js';
import { ArticleLayout } from '@/components/ArticleLayout.js';
import { ArticleIcon } from '@/components/icons.js';
import postsRoute from './route.js';

interface Section {
  title: string;
  description: string;
  category: string;
  readMoreLabel: string;
}

const sections: Section[] = [
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
  {
    title: 'Tutorials',
    description: 'Step-by-step guides that walk through building real features with AirLib libraries.',
    category: 'Tutorials',
    readMoreLabel: 'Read tutorial →',
  },
];

export const postSections = sections.map((section) => {
  const items = postsMeta
    .filter(({ meta }) => meta.category === section.category)
    .map(({ path, meta }) => ({
      text: meta.nav,
      href: path,
      meta,
    }));

  return {
    info: section,
    text: section.title,
    icon: () => <ArticleIcon />,
    items,
    collapsed: false,
  };
});

export default page(postsRoute).render(({ children }) => <ArticleLayout navs={postSections}>{children}</ArticleLayout>);

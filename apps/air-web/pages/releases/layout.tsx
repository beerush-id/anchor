import { page } from '@airlib/react';
import releasesMeta from '@airlib-cache/metadata/releases/index.js';
import { ArticleLayout } from '@/components/ArticleLayout.js';
import { NewspaperIcon } from '@/components/icons.js';
import releasesRoute from './route.js';

interface Section {
  title: string;
  description: string;
  category: string;
  readMoreLabel: string;
}

const sections: Section[] = [
  {
    title: 'Releases',
    description: 'Version release notes, new features, improvements, and migration guides across the AirLib ecosystem.',
    category: 'Release',
    readMoreLabel: 'Read release notes →',
  },
  {
    title: 'Announcements',
    description: 'Major architecture announcements, ecosystem updates, and framework milestones.',
    category: 'Announcement',
    readMoreLabel: 'Read announcement →',
  },
];

export const releaseSections = sections.map((section) => {
  const items = releasesMeta
    .filter(({ meta }) => (meta.category || 'Release') === section.category)
    .sort((left, right) => {
      if (right.meta.date && left.meta.date) {
        return right.meta.date.localeCompare(left.meta.date);
      }
      return (right.meta.version || '').localeCompare(left.meta.version || '', undefined, { numeric: true });
    })
    .map(({ path, meta }) => ({
      text: meta.nav,
      href: path,
      meta,
    }));

  return {
    info: section,
    text: section.title,
    icon: () => <NewspaperIcon />,
    items,
    collapsed: false,
  };
});

export default page(releasesRoute).render(({ children }) => (
  <ArticleLayout navs={releaseSections}>{children}</ArticleLayout>
));

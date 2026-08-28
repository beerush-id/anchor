import { template } from '@airlib/react';
import { Layout, type NavItem, Sidebar } from '@airlib/react/mdx';
import type { HTMLAttributes, ReactNode } from 'react';

export interface ArticleLayoutProps extends HTMLAttributes<HTMLElement> {
  navs?: NavItem[];
  children?: ReactNode;
}

/**
 * Centered article and release layout with TOC for air-web.
 */
export const ArticleLayout = template<ArticleLayoutProps>(
  (props) => (
    <Layout nav={props.navs} className="air-article-container">
      <Layout.Snippet for="sidebar">{() => <Sidebar nav={props.navs} collapsible />}</Layout.Snippet>
      {props.children}
    </Layout>
  ),
  'ArticleLayout'
);

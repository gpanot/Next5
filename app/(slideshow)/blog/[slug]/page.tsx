import type { Metadata } from 'next';
import { ArticlePage } from '../../../../src/components/guides/ArticlePage';
import { articleMetadata, loadArticle, staticSlugs } from '../../../../src/components/guides/articleRoute';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export const generateStaticParams = () => staticSlugs('blog');

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => articleMetadata(await loadArticle('blog', params));

export default async function BlogPostPage({ params }: Props) {
  return <ArticlePage article={await loadArticle('blog', params)} />;
}

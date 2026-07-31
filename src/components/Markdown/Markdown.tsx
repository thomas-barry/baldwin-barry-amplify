import { useImageUrls } from '@/lib/imageUrl';
import { extractImageKeys, isS3Key } from '@/lib/markdown';
import { useMemo } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './Markdown.module.css';

interface MarkdownProps {
  /** Raw markdown source. */
  children: string;
}

/**
 * Renders a musing. Images written as bare S3 keys are resolved through
 * `useImageUrls`, which means the same source works against the CDN in
 * production and against presigned sandbox URLs locally — nothing
 * environment-specific is ever stored in a post.
 *
 * Output is real React elements, so there is no `dangerouslySetInnerHTML` in
 * this path and raw HTML in a post is inert (react-markdown ignores it unless
 * `rehype-raw` is added).
 */
const Markdown = ({ children }: MarkdownProps) => {
  // One batch for the whole document — `useImageUrls` keys its query on the
  // array, so it has to be referentially stable across renders.
  const imageKeys = useMemo(() => extractImageKeys(children), [children]);
  const imageUrls = useImageUrls(imageKeys);

  const components: Components = useMemo(
    () => ({
      img: ({ src, alt, title }) => {
        const target = typeof src === 'string' ? src : '';
        const resolved = isS3Key(target) ? imageUrls[target] : target;

        // Presigned URLs arrive asynchronously in the sandbox. Render nothing
        // rather than a broken image for the frame before they land.
        if (!resolved) return null;

        const image = (
          <img
            src={resolved}
            alt={alt ?? ''}
            loading='lazy'
          />
        );

        // The title slot doubles as the caption: `![alt](key "caption")`.
        return title ? (
          <figure className={styles.figure}>
            {image}
            <figcaption className={styles.caption}>{title}</figcaption>
          </figure>
        ) : (
          image
        );
      },

      // A lone image still arrives wrapped in a paragraph, and `<figure>`
      // inside `<p>` is invalid. Unwrap those; leave real paragraphs alone.
      p: ({ node, children: content }) => {
        const only = node?.children.length === 1 ? node.children[0] : undefined;
        const isLoneImage = only?.type === 'element' && only.tagName === 'img';
        return isLoneImage ? <>{content}</> : <p>{content}</p>;
      },
    }),
    [imageUrls],
  );

  return (
    <div className={styles.prose}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
};

export default Markdown;

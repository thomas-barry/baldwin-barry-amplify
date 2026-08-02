import ImagePicker from '@/components/ImagePicker';
import Markdown from '@/components/Markdown';
import type { Schema } from '@/schema';
import { useQueryClient } from '@tanstack/react-query';
import { useBlocker, useNavigate } from '@tanstack/react-router';
import { generateClient } from 'aws-amplify/data';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { useRef, useState } from 'react';
import type { BlogPost } from '../../types';
import styles from './BlogPostForm.module.css';

const client = generateClient<Schema>({ authMode: 'userPool' });

interface BlogPostFormProps {
  initialValues?: BlogPost;
  isEdit?: boolean;
}

const tagsToInput = (tags?: BlogPost['tags']) => tags?.filter((t): t is string => t !== null).join(', ') ?? '';

const BlogPostForm = ({ initialValues, isEdit = false }: BlogPostFormProps) => {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [content, setContent] = useState(initialValues?.content ?? '');
  const [excerpt, setExcerpt] = useState(initialValues?.excerpt ?? '');
  const [tagsInput, setTagsInput] = useState(tagsToInput(initialValues?.tags));
  const [published, setPublished] = useState(initialValues?.published ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const toast = useRef<Toast>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isDirty =
    title !== (initialValues?.title ?? '') ||
    content !== (initialValues?.content ?? '') ||
    excerpt !== (initialValues?.excerpt ?? '') ||
    tagsInput !== tagsToInput(initialValues?.tags) ||
    published !== (initialValues?.published ?? false);

  // Set on the save path so the guard below doesn't ask you to confirm
  // discarding the very changes that were just written. A ref, not state:
  // `navigate` runs in the same tick and would not see a queued setState.
  const isLeavingAfterSave = useRef(false);

  // A dialog had one obvious exit. A page has Back, the sidebar, and the
  // address bar, so leaving mid-edit has to be caught explicitly.
  useBlocker({
    shouldBlockFn: () => {
      if (!isDirty || isLeavingAfterSave.current) return false;
      return !window.confirm('Discard your changes to this musing?');
    },
    enableBeforeUnload: () => isDirty && !isLeavingAfterSave.current,
  });

  const validate = (): boolean => {
    if (!title.trim()) {
      setTitleError('Title is required');
      return false;
    }
    setTitleError('');
    return true;
  };

  const leaveTo = (postId?: string) => {
    isLeavingAfterSave.current = true;
    if (postId) {
      navigate({ to: '/blog/$postId', params: { postId } });
    } else {
      navigate({ to: '/blog' });
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);

      if (isEdit && initialValues?.id) {
        const wasPublished = !!initialValues.publishedDate;
        const publishedDate =
          published && !wasPublished ? new Date().toISOString() : (initialValues.publishedDate ?? null);

        await client.models.BlogPost.update({
          id: initialValues.id,
          title: title.trim(),
          content,
          excerpt: excerpt.trim() || null,
          tags: tags.length ? tags : null,
          published,
          publishedDate,
        });
      } else {
        await client.models.BlogPost.create({
          title: title.trim(),
          content,
          excerpt: excerpt.trim() || null,
          tags: tags.length ? tags : null,
          published,
          publishedDate: published ? new Date().toISOString() : null,
        });
      }

      toast.current?.show({
        severity: 'success',
        summary: isEdit ? 'Musing Updated' : 'Musing Created',
        detail: isEdit ? 'Musing updated successfully' : 'New musing created',
        life: 3000,
      });

      queryClient.invalidateQueries({ queryKey: ['blogPosts'] });
      if (isEdit && initialValues?.id) {
        queryClient.invalidateQueries({ queryKey: ['blogPost', initialValues.id] });
      }

      // Straight to the article after an edit; back to the list after a create,
      // since the new id only arrives inside the mutation response and the list
      // is where you would go looking for it anyway.
      leaveTo(isEdit ? initialValues?.id : undefined);
    } catch (error) {
      console.error('Error saving blog post:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error instanceof Error ? error.message : 'An unexpected error occurred',
        life: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Toast ref={toast} />
      <div className={styles.page}>
        <div className={styles.pageHeaderRow}>
          <h1 className={styles.pageHeading}>{isEdit ? 'Edit Musing' : 'New Musing'}</h1>
          <div className={styles.pageActions}>
            <Button
              label='Cancel'
              icon='pi pi-times'
              outlined
              className='p-button-text'
              onClick={() => navigate({ to: '/blog' })}
            />
            <Button
              label={isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              icon='pi pi-check'
              onClick={handleSubmit}
              disabled={isSubmitting}
              loading={isSubmitting}
            />
          </div>
        </div>

        <div className={styles.formContainer}>
          <div className={styles.formField}>
            <label
              htmlFor='post-title'
              className={styles.formLabel}>
              Title <span className={styles.requiredMark}>*</span>
            </label>
            <InputText
              id='post-title'
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={titleError ? 'p-invalid w-full' : 'w-full'}
              placeholder='Post title'
            />
            {titleError && <small className='p-error'>{titleError}</small>}
          </div>

          <div className={styles.formField}>
            <label
              htmlFor='post-excerpt'
              className={styles.formLabel}>
              Excerpt
            </label>
            <InputTextarea
              id='post-excerpt'
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              className='w-full'
              placeholder='Short summary (optional — auto-generated from content if omitted)'
              rows={2}
              autoResize
            />
          </div>

          <div className={styles.formField}>
            <div className={styles.contentHeader}>
              <label
                htmlFor='post-content'
                className={styles.formLabel}>
                Content <span className={styles.formatHint}>Markdown</span>
              </label>
              <div className={styles.contentTools}>
                {!showPreview && (
                  <Button
                    label='Insert image'
                    icon='pi pi-image'
                    text
                    size='small'
                    type='button'
                    onClick={() => setPickerVisible(true)}
                  />
                )}
                <Button
                  label={showPreview ? 'Write' : 'Preview'}
                  icon={showPreview ? 'pi pi-pencil' : 'pi pi-eye'}
                  text
                  size='small'
                  type='button'
                  onClick={() => setShowPreview(p => !p)}
                />
              </div>
            </div>
            {showPreview ? (
              <div className={styles.preview}>
                {content.trim() ? (
                  <Markdown>{content}</Markdown>
                ) : (
                  <p className={styles.previewEmpty}>Nothing to preview yet.</p>
                )}
              </div>
            ) : (
              <InputTextarea
                id='post-content'
                value={content}
                onChange={e => setContent(e.target.value)}
                className={`w-full ${styles.contentInput}`}
                placeholder={'Write in markdown.\n\nUse “Insert image” to copy an image snippet, then paste it here.'}
                rows={20}
                // Grows with the post so the page is the only thing that
                // scrolls — the whole reason for moving off the dialog.
                autoResize
              />
            )}
          </div>

          <div className={styles.formField}>
            <label
              htmlFor='post-tags'
              className={styles.formLabel}>
              Tags
            </label>
            <InputText
              id='post-tags'
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              className='w-full'
              placeholder='Comma-separated tags (e.g. travel, photography)'
            />
          </div>

          <div className={styles.formFieldInline}>
            <Checkbox
              inputId='post-published'
              checked={published}
              onChange={e => setPublished(!!e.checked)}
            />
            <label
              htmlFor='post-published'
              className={styles.formLabel}>
              Publish
            </label>
          </div>
        </div>
      </div>

      <ImagePicker
        visible={pickerVisible}
        onHide={() => setPickerVisible(false)}
      />
    </>
  );
};

export default BlogPostForm;

import facePalmImage from '@/assets/facepalm.jpg';
import { CurtainCard } from '@/components/CurtainCard';
import { QuipPanel } from '@/components/QuipPanel';
import { QUIPS, rotationQueryOptions } from '@/modules/quips';
import { useQuery } from '@tanstack/react-query';
import type { FocusEvent, KeyboardEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './Home.module.css';

/** Fisher-Yates on a copy — never mutates the source list. */
const shuffle = (source: string[]): string[] => {
  const out = [...source];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const Home = () => {
  /*
   * The rotation lives in DynamoDB, but the bundled list is what the very first
   * reveal draws from — the query has not resolved at mount and the curtain has
   * no acceptable loading state. See docs/adr/0001-bundled-quip-fallback.md.
   */
  const { data: rotation } = useQuery(rotationQueryOptions());
  const source = useRef<string[]>(QUIPS);

  /*
   * Reshuffle bag: draws pop off the end, so every quip is shown once before
   * any repeat. The bag boundary is the only place a back-to-back repeat can
   * appear, so a fresh bag whose next draw matches the last one shown swaps
   * that entry to the far end. A swap rather than a re-roll — with a
   * single-quip list there is nothing to swap to and a loop would never end.
   */
  const bag = useRef<string[]>([]);
  const lastShown = useRef('');

  const drawQuip = useCallback(() => {
    if (bag.current.length === 0) {
      bag.current = shuffle(source.current);
      const next = bag.current.length - 1;
      if (bag.current.length > 1 && bag.current[next] === lastShown.current) {
        [bag.current[0], bag.current[next]] = [bag.current[next], bag.current[0]];
      }
    }
    lastShown.current = bag.current.pop() ?? '';
    return lastShown.current;
  }, []);

  const [quip, setQuip] = useState(drawQuip);

  /*
   * Swap the source the moment the real rotation arrives and drop the partly
   * drained bundled bag, so edits show up from the second reveal rather than a
   * dozen hovers later. The quip already staged behind the curtain is left
   * alone — replacing it here is the one thing that would be visible.
   *
   * An empty or failed read leaves the bundled list in place rather than
   * emptying the rotation.
   */
  useEffect(() => {
    const texts = rotation?.map(entry => entry.text).filter(Boolean) ?? [];
    if (texts.length === 0) return;
    source.current = texts;
    bag.current = [];
  }, [rotation]);
  const [open, setOpen] = useState(false);

  /*
   * The next quip is staged once the curtain has fully closed, so the swap
   * always happens behind a covered panel. Drawing on open instead looks fine
   * from rest but breaks on re-entry: coming back mid-descent restarts the
   * transition, and `enterDelay` then holds the panel frozen half-open for
   * 250ms with the text visibly changing.
   *
   * Interrupted closes fire no `transitionend`, so a mid-descent re-entry
   * simply re-reveals the quip already showing — a repeat rather than a
   * visible swap.
   */
  const handleCloseComplete = useCallback(() => setQuip(drawQuip()), [drawQuip]);

  const handleOpen = useCallback(() => {
    /*
     * Under `prefers-reduced-motion` the panel has no transition, so no
     * `transitionend` ever arrives and the staged draw above would never run,
     * leaving one quip forever. There is also no animation to be caught
     * mid-swap, so drawing on open is safe exactly where it is necessary.
     */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setQuip(drawQuip());
    }
    setOpen(true);
  }, [drawQuip]);

  const handleClose = useCallback(() => setOpen(false), []);

  const handleToggle = useCallback(() => {
    if (open) {
      setOpen(false);
    } else {
      handleOpen();
    }
  }, [open, handleOpen]);

  /*
   * A pointer gesture on a focusable element fires focus *before* click, so an
   * ungated focus handler would open twice per gesture and, on iOS — which
   * synthesizes mouse events ahead of focus and click — leave a tap toggling
   * straight back to closed. Only keyboard focus should open the curtain.
   *
   * `:focus-visible` alone would nearly do it, but its heuristic for a
   * `tabIndex` div is not identical across engines, and the platform this
   * guards is the one hardest to check from here. Tracking the pointer gesture
   * directly is unambiguous everywhere; `:focus-visible` stays as a backstop.
   */
  const pointerGesture = useRef(false);

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const fromPointer = pointerGesture.current;
      pointerGesture.current = false;
      if (!fromPointer && event.currentTarget.matches(':focus-visible')) {
        handleOpen();
      }
    },
    [handleOpen],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        // Space would otherwise scroll the page.
        event.preventDefault();
        handleToggle();
      }
    },
    [handleToggle],
  );

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.overline}>Retired Gen-X Software Engineer · Borderline Misanthrope</p>
          <h1 className={styles.headline}>
            Building things.
            <br />
            Photographing stuff.
            <br />
            Coping with reality.
          </h1>
          <p className={styles.body}>
            This is my sandbox for playing with web technologies. Mostly built with Claude Code.
          </p>
        </div>
        <div
          className={styles.heroPhoto}
          role='button'
          tabIndex={0}
          /* role='button' would otherwise name the control from its subtree —
             the photo's alt text plus whichever quip happens to be mounted,
             an accessible name that changes on every reveal. */
          aria-label='Reveal a quip'
          aria-expanded={open}
          onPointerDown={() => {
            pointerGesture.current = true;
          }}
          onPointerUp={() => {
            pointerGesture.current = false;
          }}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
          onClick={handleToggle}
          onFocus={handleFocus}
          onBlur={handleClose}
          onKeyDown={handleKeyDown}>
          <CurtainCard
            className={styles.heroCard}
            height='auto'
            variant='default'
            padding='none'
            enterDelay='0.25s'
            open={open}
            onCloseComplete={handleCloseComplete}
            front={
              <img
                src={facePalmImage}
                alt='Thomas Baldwin Barry'
                className={styles.heroCardImage}
              />
            }
            back={<QuipPanel>{quip}</QuipPanel>}
          />
        </div>
      </section>
    </div>
  );
};

export default Home;

import { useCallback, useRef, useState } from 'react';
import styles from './ImageSquareSelector.module.css';

export interface SquareSelection {
  x: number; // left edge 0–1 (fraction of display width)
  y: number; // top edge 0–1 (fraction of display height)
  size: number; // side length 0–1 (fraction of display width)
}

interface ImageSquareSelectorProps {
  imageUrl: string;
  selection: SquareSelection | null;
  onSelectionChange: (sel: SquareSelection | null) => void;
}

type DragMode = 'draw' | 'move';

const MIN_SIDE_PX = 8;

const ImageSquareSelector = ({ imageUrl, selection, onSelectionChange }: ImageSquareSelectorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Shared drag state
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const dragModeRef = useRef<DragMode>('draw');

  // Move-mode state
  const moveOffsetRef = useRef<{ x: number; y: number } | null>(null); // pointer offset within box
  const moveSelRef = useRef<SquareSelection | null>(null); // selection at move start

  const [liveSel, setLiveSel] = useState<SquareSelection | null>(null);

  const getPos = (e: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    };
  };

  const computeDrawSel = (
    anchor: { x: number; y: number },
    pos: { x: number; y: number },
    cw: number,
    ch: number,
  ): SquareSelection => {
    const dx = pos.x - anchor.x;
    const dy = pos.y - anchor.y;
    const side = Math.min(Math.abs(dx), Math.abs(dy));
    let left = dx >= 0 ? anchor.x : anchor.x - side;
    let top = dy >= 0 ? anchor.y : anchor.y - side;
    left = Math.max(0, Math.min(left, cw - side));
    top = Math.max(0, Math.min(top, ch - side));
    return { x: left / cw, y: top / ch, size: side / cw };
  };

  const computeMoveSel = (
    pos: { x: number; y: number },
    offset: { x: number; y: number },
    sel: SquareSelection,
    cw: number,
    ch: number,
  ): SquareSelection => {
    const sidePx = sel.size * cw;
    const left = Math.max(0, Math.min(pos.x - offset.x, cw - sidePx));
    const top = Math.max(0, Math.min(pos.y - offset.y, ch - sidePx));
    return { x: left / cw, y: top / ch, size: sel.size };
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = containerRef.current!.getBoundingClientRect();
      const pos = getPos(e);

      anchorRef.current = pos;
      hasDraggedRef.current = false;

      // Determine mode: move if pointer lands inside the existing selection box
      if (selection && selection.size > 0) {
        const sidePx = selection.size * rect.width;
        const leftPx = selection.x * rect.width;
        const topPx = selection.y * rect.height;
        if (pos.x >= leftPx && pos.x <= leftPx + sidePx && pos.y >= topPx && pos.y <= topPx + sidePx) {
          dragModeRef.current = 'move';
          moveOffsetRef.current = { x: pos.x - leftPx, y: pos.y - topPx };
          moveSelRef.current = selection;
          setLiveSel(selection);
          return;
        }
      }

      dragModeRef.current = 'draw';
      moveOffsetRef.current = null;
      moveSelRef.current = null;
      setLiveSel(null);
    },
    [selection],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!anchorRef.current || !(e.buttons & 1)) return;
    const pos = getPos(e);
    const dx = pos.x - anchorRef.current.x;
    const dy = pos.y - anchorRef.current.y;
    if (!hasDraggedRef.current && Math.hypot(dx, dy) < 4) return;
    hasDraggedRef.current = true;

    const rect = containerRef.current!.getBoundingClientRect();

    if (dragModeRef.current === 'move' && moveOffsetRef.current && moveSelRef.current) {
      setLiveSel(computeMoveSel(pos, moveOffsetRef.current, moveSelRef.current, rect.width, rect.height));
    } else {
      setLiveSel(computeDrawSel(anchorRef.current, pos, rect.width, rect.height));
    }
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!anchorRef.current) return;
      const rect = containerRef.current!.getBoundingClientRect();

      if (dragModeRef.current === 'move') {
        if (hasDraggedRef.current && moveOffsetRef.current && moveSelRef.current) {
          onSelectionChange(
            computeMoveSel(getPos(e), moveOffsetRef.current, moveSelRef.current, rect.width, rect.height),
          );
        }
        // Click on selection (no drag) → leave selection unchanged
      } else {
        if (!hasDraggedRef.current) {
          // Click on background → reset
          onSelectionChange(null);
        } else {
          const sel = computeDrawSel(anchorRef.current, getPos(e), rect.width, rect.height);
          onSelectionChange(sel.size * rect.width < MIN_SIDE_PX ? null : sel);
        }
      }

      setLiveSel(null);
      anchorRef.current = null;
      moveOffsetRef.current = null;
      moveSelRef.current = null;
    },
    [onSelectionChange],
  );

  const displayedSel = liveSel ?? selection;

  return (
    <div className={styles.root}>
      <div
        ref={containerRef}
        className={styles.canvas}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}>
        <img
          src={imageUrl}
          className={styles.image}
          draggable={false}
          alt=''
        />
        {displayedSel && displayedSel.size > 0 && (
          <div
            className={styles.selectionBox}
            style={{
              left: `${displayedSel.x * 100}%`,
              top: `${displayedSel.y * 100}%`,
              width: `${displayedSel.size * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ImageSquareSelector;

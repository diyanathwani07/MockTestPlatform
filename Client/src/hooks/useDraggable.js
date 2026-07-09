import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook to make an element draggable.
 * Returns position + event handlers to attach to the draggable element.
 * Distinguishes between a click (< 5px movement) and a drag.
 */
const useDraggable = (initialBottom = 30, initialRight = 30) => {
  const [position, setPosition] = useState({ bottom: initialBottom, right: initialRight });
  const isDragging = useRef(false);
  const wasDragged = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ bottom: 0, right: 0 });

  const handlePointerDown = useCallback((e) => {
    isDragging.current = true;
    wasDragged.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    startOffset.current = { ...position };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      wasDragged.current = true;
    }

    const newRight = Math.max(0, Math.min(window.innerWidth - 70, startOffset.current.right - dx));
    const newBottom = Math.max(0, Math.min(window.innerHeight - 70, startOffset.current.bottom + dy * -1));

    setPosition({ bottom: newBottom, right: newRight });
  }, []);

  const handlePointerUp = useCallback((e) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  return {
    position,
    wasDragged,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  };
};

export default useDraggable;

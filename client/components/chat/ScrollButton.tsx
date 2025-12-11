/**
 * Agent Smith - Modern chat interface for Claude Agent SDK
 * Copyright (C) 2025 KenKai
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface ScrollButtonProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

export function ScrollButton({ scrollContainerRef }: ScrollButtonProps) {
  const [scrollState, setScrollState] = useState<'hidden' | 'show-bottom' | 'show-top'>('hidden');

  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const distanceFromTop = scrollTop;

    // Thresholds for showing buttons
    const BOTTOM_THRESHOLD = 200; // Show "scroll to bottom" when more than 200px from bottom
    const TOP_THRESHOLD = 300; // Show "scroll to top" when more than 300px from top

    // Determine which button to show based on scroll position
    if (distanceFromBottom > BOTTOM_THRESHOLD) {
      setScrollState('show-bottom');
    } else if (distanceFromTop > TOP_THRESHOLD) {
      setScrollState('show-top');
    } else {
      setScrollState('hidden');
    }
  }, [scrollContainerRef]);

  // Attach scroll listener with optimized debouncing
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let timeoutId: NodeJS.Timeout;
    let rafId: number | null = null;

    const handleScroll = () => {
      // Cancel any pending RAF/timeout
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);

      // Use requestAnimationFrame for better performance
      // Only run after scrolling stops (200ms debounce)
      rafId = requestAnimationFrame(() => {
        timeoutId = setTimeout(checkScrollPosition, 200);
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    checkScrollPosition(); // Initial check

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [scrollContainerRef, checkScrollPosition]);

  const scrollToBottom = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  };

  const scrollToTop = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (scrollState === 'hidden') return null;

  const isBottom = scrollState === 'show-bottom';

  return (
    <button
      onClick={isBottom ? scrollToBottom : scrollToTop}
      className={`scroll-button ${isBottom ? 'scroll-button-bottom' : 'scroll-button-top'}`}
      aria-label={isBottom ? 'Scroll to bottom' : 'Scroll to top'}
    >
      {isBottom ? (
        <ArrowDown size={18} strokeWidth={2.5} />
      ) : (
        <ArrowUp size={18} strokeWidth={2.5} />
      )}
    </button>
  );
}

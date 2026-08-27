'use client';

import React, { useEffect, useRef, useState } from 'react';
import { planLineTemplateService, PlanLineTemplate } from '@/services/planLineTemplateService';
import styles from '@/styles/plan-fields.module.css';

interface LineHintTextareaProps {
  value: string;
  onChange: (value: string) => void;
  fieldType?: string;
  className?: string;
  rows?: number;
  placeholder?: string;
}

function getLinePrefix(value: string, cursor: number) {
  const start = value.lastIndexOf('\n', Math.max(cursor - 1, 0)) + 1;
  return value.slice(start, cursor).trim();
}

export default function LineHintTextarea({
  value,
  onChange,
  fieldType = 'current_treatment',
  className,
  rows = 2,
  placeholder,
}: LineHintTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const lastSavedTextRef = useRef(value);
  const [suggestions, setSuggestions] = useState<PlanLineTemplate[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const closeDropdown = () => {
    setShowDropdown(false);
    setSuggestions([]);
    setHighlightIndex(0);
  };

  const searchCurrentLine = (prefix: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchAbortRef.current?.abort();

    const query = prefix.trim();
    if (query.length < 2 || query.length > 24) {
      closeDropdown();
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbortRef.current = controller;
      try {
        const response = await planLineTemplateService.search(fieldType, query, 8, controller.signal);
        if (controller.signal.aborted) return;
        if (response.success && response.data?.items) {
          const matches = response.data.items.filter(
            item => item.text.trim().toLowerCase() !== query.toLowerCase()
          );
          setSuggestions(matches);
          setShowDropdown(matches.length > 0);
          setHighlightIndex(0);
        } else {
          closeDropdown();
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Error searching treatment line hints:', error);
        closeDropdown();
      }
    }, 400);
  };

  const applySuggestion = (suggestion: PlanLineTemplate) => {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? value.length;
    const lineStart = value.lastIndexOf('\n', Math.max(cursor - 1, 0)) + 1;
    const nextBreak = value.indexOf('\n', cursor);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const nextValue = `${value.slice(0, lineStart)}${suggestion.text}${value.slice(lineEnd)}`;
    onChange(nextValue);
    closeDropdown();

    requestAnimationFrame(() => {
      if (!textarea) return;
      const nextCursor = lineStart + suggestion.text.length;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    const cursor = event.target.selectionStart ?? nextValue.length;
    onChange(nextValue);
    searchCurrentLine(getLinePrefix(nextValue, cursor));
  };

  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    closeDropdown();
    const nextTarget = event.relatedTarget as HTMLElement | null;
    if (nextTarget?.closest('button')) {
      return;
    }

    const nextText = textareaRef.current?.value ?? value;
    if (!nextText.trim() || nextText.trim() === lastSavedTextRef.current.trim()) {
      return;
    }

    void planLineTemplateService
      .saveLines(fieldType, nextText)
      .then(() => {
        lastSavedTextRef.current = nextText;
      })
      .catch(error => {
        console.error('Error saving line hints:', error);
      });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex(prev => (prev + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      applySuggestion(suggestions[highlightIndex]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeDropdown();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchAbortRef.current?.abort();
    };
  }, []);

  return (
    <div className={styles.lineHintWrap} ref={containerRef}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={className}
        rows={rows}
        placeholder={placeholder}
      />
      {showDropdown && suggestions.length > 0 && (
        <div className={styles.lineHintDropdown}>
          {suggestions.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.lineHintOption} ${index === highlightIndex ? styles.lineHintOptionActive : ''}`}
              onMouseDown={event => {
                event.preventDefault();
                applySuggestion(item);
              }}
            >
              {item.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

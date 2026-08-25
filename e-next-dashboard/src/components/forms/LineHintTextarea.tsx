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

function getCurrentLine(value: string, cursor: number) {
  const start = value.lastIndexOf('\n', Math.max(cursor - 1, 0)) + 1;
  const nextBreak = value.indexOf('\n', cursor);
  const end = nextBreak === -1 ? value.length : nextBreak;
  return { start, end, text: value.slice(start, end) };
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
  const [suggestions, setSuggestions] = useState<PlanLineTemplate[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const closeDropdown = () => {
    setShowDropdown(false);
    setSuggestions([]);
    setHighlightIndex(0);
  };

  const searchCurrentLine = (line: { start: number; end: number; text: string }) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const query = line.text.trim();
    if (query.length < 2) {
      closeDropdown();
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await planLineTemplateService.search(fieldType, query);
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
        console.error('Error searching treatment line hints:', error);
        closeDropdown();
      }
    }, 250);
  };

  const applySuggestion = (suggestion: PlanLineTemplate) => {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? value.length;
    const line = getCurrentLine(value, cursor);
    const nextValue = `${value.slice(0, line.start)}${suggestion.text}${value.slice(line.end)}`;
    onChange(nextValue);
    closeDropdown();

    requestAnimationFrame(() => {
      if (!textarea) return;
      const nextCursor = line.start + suggestion.text.length;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    const cursor = event.target.selectionStart ?? nextValue.length;
    onChange(nextValue);
    searchCurrentLine(getCurrentLine(nextValue, cursor));
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
    };
  }, []);

  return (
    <div className={styles.lineHintWrap} ref={containerRef}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
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

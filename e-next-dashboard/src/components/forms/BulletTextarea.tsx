'use client';

import React from 'react';
import { BULLET_PREFIX } from '@/utils/bulletText';

type BulletTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

function emitChange(
  el: HTMLTextAreaElement,
  next: string,
  cursor: number,
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>
) {
  onChange?.({
    target: { name: el.name, value: next },
    currentTarget: { name: el.name, value: next },
  } as React.ChangeEvent<HTMLTextAreaElement>);

  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(cursor, cursor);
  });
}

function lineHasBullet(line: string) {
  return /^\s*[•\-*]\s+/.test(line);
}

export default function BulletTextarea({
  value,
  onChange,
  onKeyDown,
  onFocus,
  onPaste,
  ...rest
}: BulletTextareaProps) {
  const text = typeof value === 'string' ? value : '';

  const handleFocus = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    if (!text.trim()) {
      emitChange(event.currentTarget, BULLET_PREFIX, BULLET_PREFIX.length, onChange);
    }
    onFocus?.(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = event.currentTarget;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? start;

    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const next = `${text.slice(0, start)}\n${BULLET_PREFIX}${text.slice(end)}`;
      emitChange(el, next, start + 1 + BULLET_PREFIX.length, onChange);
      return;
    }

    if (event.key === 'Backspace' && start === end) {
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const beforeCursor = text.slice(lineStart, start);
      if (beforeCursor === BULLET_PREFIX) {
        event.preventDefault();
        const removeFrom = lineStart === 0 ? 0 : lineStart - 1;
        const next = `${text.slice(0, removeFrom)}${text.slice(start)}`;
        emitChange(el, next, removeFrom, onChange);
        return;
      }
    }

    onKeyDown?.(event);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\r\n/g, '\n');
    if (!pasted.includes('\n')) {
      onPaste?.(event);
      return;
    }

    event.preventDefault();
    const el = event.currentTarget;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? start;
    const lines = pasted.split('\n').map((line) => line.trim()).filter(Boolean);
    const bulleted = lines
      .map((line) => (lineHasBullet(line) ? line.replace(/^\s*[*\-]\s+/, BULLET_PREFIX) : `${BULLET_PREFIX}${line}`))
      .join('\n');
    const next = `${text.slice(0, start)}${bulleted}${text.slice(end)}`;
    emitChange(el, next, start + bulleted.length, onChange);
  };

  return (
    <textarea
      {...rest}
      value={value}
      onChange={onChange}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
    />
  );
}

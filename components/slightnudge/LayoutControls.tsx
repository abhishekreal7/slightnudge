'use client';

import React from 'react';
import { LayoutMatrix } from './FramerControls';
import styles from './layout-controls.module.css';

export function LayoutControls({
  classes,
  computed = {},
  disabled = false,
  scope = '',
  onChange,
}: {
  classes: string;
  computed: Record<string, string>;
  disabled: boolean;
  scope?: string;
  onChange: (property: string, value: string) => void;
}) {
  return (
    <div className="pt-1 select-none" aria-label="Layout controls">
      <LayoutMatrix
        classes={classes}
        computed={computed}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

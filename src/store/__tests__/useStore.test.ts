import { describe, it, expect, beforeEach } from 'vitest';
import { getInitialTheme, useStore } from '../useStore';

describe('useStore theme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('usa el tema claro por defecto cuando no hay preferencia guardada', () => {
    expect(getInitialTheme()).toBe('light');
    expect(useStore.getState().theme).toBe('light');
  });

  it('respeta la preferencia guardada en localStorage y hace fallback a light si es inválida', () => {
    localStorage.setItem('theme', 'dark');
    expect(getInitialTheme()).toBe('dark');

    localStorage.setItem('theme', 'light');
    expect(getInitialTheme()).toBe('light');

    localStorage.setItem('theme', 'invalid');
    expect(getInitialTheme()).toBe('light');
  });

  it('alterna entre light y dark y guarda la elección en localStorage', () => {
    useStore.setState({ theme: 'light' });

    useStore.getState().toggleTheme();
    expect(useStore.getState().theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');

    useStore.getState().toggleTheme();
    expect(useStore.getState().theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});

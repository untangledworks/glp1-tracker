import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SupplementToggle } from './SupplementToggle';

describe('SupplementToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders unchecked by default', () => {
    render(<SupplementToggle />);
    expect(screen.getByText('Took supplements today')).toBeInTheDocument();
    expect(screen.getByRole('button')).not.toHaveClass('bg-sage-light');
  });

  it('toggles on click and persists to localStorage', () => {
    render(<SupplementToggle />);
    fireEvent.click(screen.getByRole('button'));
    const today = new Date().toISOString().split('T')[0];
    expect(localStorage.getItem(`supplementsToday_${today}`)).toBe('true');
  });

  it('reads persisted state on mount', () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`supplementsToday_${today}`, 'true');
    render(<SupplementToggle />);
    expect(screen.getByRole('button')).toHaveClass('bg-sage-light');
  });

  it('calls onToggle callback when toggled', () => {
    const onToggle = vi.fn();
    render(<SupplementToggle onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('removes localStorage entry when toggled off', () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`supplementsToday_${today}`, 'true');
    render(<SupplementToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem(`supplementsToday_${today}`)).toBeNull();
  });
});

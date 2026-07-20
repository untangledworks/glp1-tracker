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
  });

  it('toggles on click, persists to localStorage, and hides', () => {
    render(<SupplementToggle />);
    fireEvent.click(screen.getByRole('button'));
    const today = new Date().toISOString().split('T')[0];
    expect(localStorage.getItem(`supplementsToday_${today}`)).toBe('true');
    expect(screen.queryByText('Took supplements today')).not.toBeInTheDocument();
  });

  it('renders nothing when already taken today', () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`supplementsToday_${today}`, 'true');
    const { container } = render(<SupplementToggle />);
    expect(container).toBeEmptyDOMElement();
  });

  it('calls onToggle callback when toggled', () => {
    const onToggle = vi.fn();
    render(<SupplementToggle onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});

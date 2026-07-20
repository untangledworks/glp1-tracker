import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InjectionBadge } from './InjectionBadge';

describe('InjectionBadge', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders nothing when no injection day configured', () => {
    const { container } = render(<InjectionBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows injection day badge on injection day', () => {
    localStorage.setItem('injectionDayOfWeek', 'monday');
    // Mock today as Monday
    render(<InjectionBadge today={new Date('2026-07-20T10:00:00')} />);
    expect(screen.getByText(/Injection Day/)).toBeInTheDocument();
  });

  it('shows days post-injection', () => {
    localStorage.setItem('injectionDayOfWeek', 'monday');
    // Mock today as Wednesday (day 2)
    render(<InjectionBadge today={new Date('2026-07-22T10:00:00')} />);
    expect(screen.getByText(/Day 2 post-injection/)).toBeInTheDocument();
  });
});

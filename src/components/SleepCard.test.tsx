import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SleepCard } from './SleepCard';

describe('SleepCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders nothing when sleep tracking disabled', () => {
    const { container } = render(<SleepCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when already logged today', () => {
    localStorage.setItem('sleepTrackingEnabled', 'true');
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`sleepLoggedToday_${today}`, 'true');
    const { container } = render(<SleepCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders card when sleep tracking enabled and not logged', () => {
    localStorage.setItem('sleepTrackingEnabled', 'true');
    render(<SleepCard />);
    expect(screen.getByText("How'd you sleep?")).toBeInTheDocument();
  });

  it('dismisses card and marks as logged', () => {
    localStorage.setItem('sleepTrackingEnabled', 'true');
    const onDismiss = vi.fn();
    render(<SleepCard onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('Skip'));
    const today = new Date().toISOString().split('T')[0];
    expect(localStorage.getItem(`sleepLoggedToday_${today}`)).toBe('true');
    expect(onDismiss).toHaveBeenCalled();
  });

  it('saves sleep times to localStorage and calls onSave', () => {
    localStorage.setItem('sleepTrackingEnabled', 'true');
    const onSave = vi.fn();
    render(<SleepCard onSave={onSave} />);
    fireEvent.click(screen.getByText('Save'));
    const today = new Date().toISOString().split('T')[0];
    expect(localStorage.getItem(`sleepLoggedToday_${today}`)).toBe('true');
    expect(localStorage.getItem(`sleepBedTime_${today}`)).toBeTruthy();
    expect(localStorage.getItem(`sleepWakeTime_${today}`)).toBeTruthy();
    expect(onSave).toHaveBeenCalled();
  });
});

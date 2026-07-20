const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function getGreeting(displayName: string | null, now: Date = new Date()): string {
  const hour = now.getHours();
  let timeOfDay: string;
  if (hour < 12) timeOfDay = 'morning';
  else if (hour < 17) timeOfDay = 'afternoon';
  else timeOfDay = 'evening';

  return displayName
    ? `Good ${timeOfDay}, ${displayName}`
    : `Good ${timeOfDay}!`;
}

export function getInjectionCycleDay(
  injectionDayOfWeek: string | null,
  today: Date = new Date()
): { dayNumber: number; isInjectionDay: boolean } | null {
  if (!injectionDayOfWeek) return null;

  const targetDayIndex = DAYS.indexOf(injectionDayOfWeek.toLowerCase());
  if (targetDayIndex === -1) return null;

  const todayIndex = today.getDay();
  const daysSince = (todayIndex - targetDayIndex + 7) % 7;

  return {
    dayNumber: daysSince,
    isInjectionDay: daysSince === 0,
  };
}

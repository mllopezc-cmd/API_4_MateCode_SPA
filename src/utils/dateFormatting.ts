export function formatCalendarDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}
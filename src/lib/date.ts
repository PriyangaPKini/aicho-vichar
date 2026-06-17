export const sortByDateDesc = <T extends { data: { date?: string } }>(a: T, b: T) =>
  new Date(b.data.date ?? 0).getTime() - new Date(a.data.date ?? 0).getTime();

export const formatShortDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const formatLongDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

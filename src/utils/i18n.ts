export const getLocalizedTitle = (
  title: string | null | undefined,
  title_en: string | null | undefined,
  language: string
): string => {
  if (language === 'en') {
    return title_en || title || '';
  }
  return title || title_en || '';
};

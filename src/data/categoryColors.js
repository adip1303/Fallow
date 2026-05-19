export const CATEGORY_COLORS = {
  'UX Design': '#E6BF75',
  Robotics: '#A27FD3',
  'Everyday Life': '#E480A6',
  Speculative: '#84A4C9',
  Technology: '#6DBEB4',
  Music: '#F8968B',
  Sports: '#B8DDA8',
};

export const CUSTOM_CATEGORIES_KEY = 'fallow:customCategories';
export const CATEGORIES_CHANGED_EVENT = 'fallow:categoriesChanged';

export function readCustomCategories() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_CATEGORIES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((cat) => cat?.name) : [];
  } catch {
    return [];
  }
}

export function getCategoryColors() {
  return readCustomCategories().reduce(
    (colors, category) => ({
      ...colors,
      [category.name]: category.color || '#D5D0C5',
    }),
    { ...CATEGORY_COLORS },
  );
}

export function getCategoryNames() {
  return Object.keys(getCategoryColors());
}

export const SEED_COLORS = {
  'Custom NAS Home Server': CATEGORY_COLORS.Technology,
  'Wall-mounted Record Player': CATEGORY_COLORS.Music,
  'Wall-Mounted Record Player': CATEGORY_COLORS.Music,
  'AR Glasses for Astronauts': CATEGORY_COLORS.Speculative,
  'Non-Humanoid Robotics': CATEGORY_COLORS.Robotics,
};

export function categoryColor(category) {
  return getCategoryColors()[category] || '#D5D0C5';
}

export function seedColor(seedTitle) {
  return SEED_COLORS[seedTitle] || '#D5D0C5';
}

import { Filter } from './entities/filter.entity';

export const DEFAULT_ICON_COLOR = '#2563EB';
export const FALLBACK_ICON_COLOR = '#6B7280';
export const FALLBACK_ICON_LIBRARY = 'Feather';
export const FALLBACK_ICON_NAME = 'briefcase';
export const ICON_LIBRARIES = ['Feather', 'FontAwesome', 'FontAwesome5'] as const;

export type FilterIconMeta =
  | {
      source: 'library';
      library: string;
      name: string;
      color: string;
    }
  | {
      source: 'svg';
      svg: string;
      color: string;
    };

export function buildFilterIconMeta(filter: Filter): FilterIconMeta {
  if (filter.iconSource === 'svg' && filter.iconSvg) {
    return {
      source: 'svg',
      svg: filter.iconSvg,
      color: filter.iconColor || DEFAULT_ICON_COLOR,
    };
  }

  return {
    source: 'library',
    library: (ICON_LIBRARIES as readonly string[]).includes(
      filter.iconLibrary as any,
    )
      ? filter.iconLibrary
      : FALLBACK_ICON_LIBRARY,
    name: filter.iconName || filter.icon || FALLBACK_ICON_NAME,
    color: filter.iconColor || FALLBACK_ICON_COLOR,
  };
}

export function withFilterIconMeta(filter: Filter) {
  return {
    ...filter,
    iconMeta: buildFilterIconMeta(filter),
  };
}

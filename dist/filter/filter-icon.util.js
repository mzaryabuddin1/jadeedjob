"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICON_LIBRARIES = exports.FALLBACK_ICON_NAME = exports.FALLBACK_ICON_LIBRARY = exports.FALLBACK_ICON_COLOR = exports.DEFAULT_ICON_COLOR = void 0;
exports.buildFilterIconMeta = buildFilterIconMeta;
exports.withFilterIconMeta = withFilterIconMeta;
exports.DEFAULT_ICON_COLOR = '#2F6F73';
exports.FALLBACK_ICON_COLOR = '#6B7280';
exports.FALLBACK_ICON_LIBRARY = 'Feather';
exports.FALLBACK_ICON_NAME = 'briefcase';
exports.ICON_LIBRARIES = [
    'Feather',
    'FontAwesome',
    'FontAwesome5',
];
function buildFilterIconMeta(filter) {
    if (filter.iconSource === 'svg' && filter.iconSvg) {
        return {
            source: 'svg',
            svg: filter.iconSvg,
            color: filter.iconColor || exports.DEFAULT_ICON_COLOR,
        };
    }
    return {
        source: 'library',
        library: exports.ICON_LIBRARIES.includes(filter.iconLibrary)
            ? filter.iconLibrary
            : exports.FALLBACK_ICON_LIBRARY,
        name: filter.iconName || filter.icon || exports.FALLBACK_ICON_NAME,
        color: filter.iconColor || exports.FALLBACK_ICON_COLOR,
    };
}
function withFilterIconMeta(filter) {
    return {
        ...filter,
        iconMeta: buildFilterIconMeta(filter),
    };
}
//# sourceMappingURL=filter-icon.util.js.map
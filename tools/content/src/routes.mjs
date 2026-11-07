// Page keys, their routes and the full route list derived from the content tree.
export const PAGE_ROUTES = Object.freeze({
  home: '/',
  biography: '/biography',
  'current-role': '/current-role',
  portfolio: '/portfolio',
  cv: '/portfolio/cv',
  'career-history': '/portfolio/career-history',
  projects: '/portfolio/projects',
  blog: '/blog',
  'social-media': '/social-media',
  'tech-stack': '/tech-stack',
  'special-awards': '/special-awards',
  certifications: '/certifications',
  'public-speaking': '/public-speaking',
});

export const PAGE_KEYS = Object.keys(PAGE_ROUTES);

/** Split `speaking/events/<event>/<edition>.yaml` style paths into a "<event>/<edition>" key. */
export function recordKey(path, folder) {
  return path.slice(folder.length + 1, -'.yaml'.length);
}

/**
 * Every route the site prerenders: the static pages plus one route per event, gallery and certificate detail.
 * @param {Record<string, any>} files parsed YAML by relative path
 */
export function routeList(files) {
  const routes = Object.values(PAGE_ROUTES);
  for (const path of Object.keys(files)) {
    if (path.startsWith('speaking/events/')) {
      routes.push(`/public-speaking/${recordKey(path, 'speaking/events')}`);
    } else if (path.startsWith('speaking/galleries/')) {
      const [event, edition] = recordKey(path, 'speaking/galleries').split('/');
      routes.push(`/public-speaking/${event}/photos/${edition}`);
    } else if (path.startsWith('certifications/details/')) {
      routes.push(`/certifications/microsoft/${recordKey(path, 'certifications/details')}`);
    }
  }
  return routes.sort();
}

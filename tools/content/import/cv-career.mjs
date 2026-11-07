// CV and career history import (headline fields only until the full extraction lands).
export function importCv({ page, pageFile, read }) {
  pageFile('cv', page('cv', 'portfolio/cv', read('portfolio/cv/cv.html')));
}
export function importCareer({ page, pageFile, read }) {
  pageFile('career-history', page('career-history', 'portfolio/career-history', read('portfolio/career-history/career-history.html')));
}

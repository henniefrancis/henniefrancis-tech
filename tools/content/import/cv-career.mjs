// CV and career history import from the pre-extraction templates.
import { attr, clean, elements, hasClass, parseHtml, textOf } from './lib.mjs';

const tag = (node, name) => elements(node).filter((e) => e.tagName === name);
const first = (node, name) => tag(node, name)[0];
const text = (node) => clean(textOf(node));
/** Text of a node split at the divider glyph spans, one string per part. */
function parts(node) {
  const out = [''];
  const walk = (n) => {
    for (const c of n.childNodes ?? []) {
      if (c.tagName === 'span' && hasClass(c, 'devider')) out.push('');
      else if (c.nodeName === '#text') out[out.length - 1] += c.value;
      else if (c.tagName === 'br') out[out.length - 1] += ' ';
      else walk(c);
    }
  };
  walk(node);
  return out.map(clean);
}
const rowsOf = (node) => node.childNodes.filter((n) => n.tagName === 'div');
const colsOf = (row) => row.childNodes.filter((n) => n.tagName === 'div');

/** Sections of the CV: comment name to its [heading row, content row]. */
function cvSections(html) {
  const root = elements(parseHtml(html)).find((e) => hasClass(e, 'container-fluid-content'));
  const sections = {};
  let name = null;
  let rows = [];
  for (const n of root.childNodes) {
    if (n.nodeName === '#comment') {
      if (name) sections[name] = rows;
      name = n.data.trim();
      rows = [];
    } else if (n.tagName === 'div') {
      rows.push(n);
    }
  }
  sections[name] = rows;
  return { root, sections };
}

export function importCv({ read, page, pageFile }) {
  const html = read('portfolio/cv/cv.html');
  const { root, sections } = cvSections(html);
  const intro = rowsOf(root).slice(0, 2);
  const body = (key) => sections[key][1].childNodes.find((n) => n.tagName === 'div' && hasClass(n, 'contact'));
  const heading = (key) => text(first(sections[key][0], 'h3'));
  const cells = (row) => colsOf(row).filter((c) => !(c.childNodes.length === 0));

  // contact
  const contactCells = rowsOf(body('CONTACT')).flatMap((r) => cells(r));
  const email = first(contactCells[0], 'a');
  const phone = first(contactCells[2], 'a');
  const contact = {
    heading: heading('CONTACT'),
    email: text(email),
    location: text(contactCells[1]).replace(/^\S+\s/, ''),
    phone: { display: text(phone), e164: attr(phone, 'href').replace(/^tel:/, '') },
    website: attr(first(contactCells[3], 'a'), 'href'),
  };

  // skills: rows of names
  const skills = { heading: heading('SKILLS'), rows: rowsOf(body('SKILLS')).map((r) => cells(r).map(text)) };

  // work experience
  const experience = { heading: heading('WORK EXPERIENCE'), employers: [] };
  let positions = [];
  for (const row of body('WORK EXPERIENCE').childNodes.filter((n) => n.tagName)) {
    if (row.tagName === 'hr') {
      positions = [];
    } else if (hasClass(row, 'pt-3')) {
      const h5 = first(row, 'h5');
      const period = text(first(h5, 'sub'));
      const clone = { ...h5, childNodes: h5.childNodes.filter((c) => c.tagName !== 'sub') };
      const before = h5.childNodes.filter((c) => c !== first(h5, 'sub')).map(textOf).join('');
      const position = { titles: parts(clone), period };
      if (/\s$/.test(before)) position.gap = 'outside';
      positions.push(position);
    } else {
      experience.employers.push({ name: text(first(row, 'p')), positions });
    }
  }

  // awards
  const awardRows = rowsOf(body('AWARDS'));
  const awardNames = cells(awardRows[0]).map((c) => first(c, 'h5'));
  const awardDetails = cells(awardRows[1]);
  const awards = {
    heading: heading('AWARDS'),
    items: awardNames.map((h5, i) => {
      const sup = first(h5, 'sup');
      const item = { name: text({ childNodes: h5.childNodes.filter((c) => c.tagName !== 'sup') }) };
      if (sup) item.flag = text(sup);
      const link = first(awardDetails[i], 'a');
      if (link) item.link = { text: text(link), url: attr(link, 'href') };
      else item.note = text(awardDetails[i]);
      return item;
    }),
  };

  // organizations (with the volunteer descriptions merged in)
  const orgCells = rowsOf(body('ORGANIZATIONS')).flatMap((r) => cells(r));
  const descriptionCells = rowsOf(body('VOLUNTEER EXPERIENCE'))
    .filter((r) => !first(r, 'a') && !first(r, 'hr'))
    .flatMap((r) => cells(r));
  const organizations = {
    heading: heading('ORGANIZATIONS'),
    items: orgCells.map((c, i) => {
      const p = first(c, 'p');
      const periodMatch = text(p).match(/\s*\(([^)]*)\)\s*$/);
      const roleNode = { childNodes: p.childNodes };
      const roles = parts(roleNode).map((t, k, all) => (k === all.length - 1 ? t.replace(/\s*\([^)]*\)\s*$/, '') : t));
      const item = { name: text(first(c, 'h5')), url: attr(first(c, 'a'), 'href'), roles, period: periodMatch[1] };
      const d = descriptionCells[i];
      item.description = text(d);
      if (!first(d, 'p')) item.bare = true;
      return item;
    }),
  };
  const volunteer = { heading: heading('VOLUNTEER EXPERIENCE') };

  // education
  const education = {
    heading: heading('EDUCATION'),
    items: rowsOf(body('EDUCATION')).flatMap((r) => cells(r)).map((c) => ({ title: text(first(c, 'h5')), institution: text(first(c, 'p')) })),
  };

  // languages
  const langRows = rowsOf(body('LANGUAGES'));
  const names = cells(langRows[0]).map(text);
  const levels = cells(langRows[1]).map(text);
  const languages = { heading: heading('LANGUAGES'), items: names.map((name, i) => ({ name, level: levels[i] })) };

  const interests = { heading: heading('INTERESTS'), rows: rowsOf(body('INTERESTS')).map((r) => cells(r).map(text)) };

  pageFile('cv', {
    ...page('cv', 'portfolio/cv', html),
    name: text(first(intro[0], 'h3')),
    summary: [text(first(intro[1], 'p'))],
    contact,
    skills,
    experience,
    awards,
    organizations,
    volunteer,
    education,
    languages,
    interests,
  }, { blocks: ['summary'] });
}

export function importCareer({ read, page, pageFile }) {
  const html = read('portfolio/career-history/career-history.html');
  const root = elements(parseHtml(html)).find((e) => hasClass(e, 'container-fluid-content'));
  const kids = root.childNodes.filter((n) => n.tagName === 'div');
  const employers = [];
  const firstDetails = elements(kids[1]).filter((e) => e.tagName === 'div' && hasClass(e, 'careerdetails'))[0];
  const firstRows = rowsOf(firstDetails);
  const labels = {
    positionDetails: text(first(firstRows[0], 'h4')),
    responsibilities: text(first(firstRows[2], 'h5')),
    reason: text(first(firstRows[3], 'h5')).replace(/:$/, ''),
    references: text(first(firstRows[4], 'h5')),
  };
  for (let i = 0; i < kids.length; i += 2) {
    const header = kids[i];
    const details = kids[i + 1];
    const h4 = first(header, 'h4');
    const loc = text(first(header, 'p')).replace(/^\S+\s/, '');
    const positions = elements(details)
      .filter((e) => e.tagName === 'div' && hasClass(e, 'careerdetails'))
      .map((d) => {
        const rows = rowsOf(d);
        const titleP = first(rows[1], 'p');
        const brAt = titleP.childNodes.findIndex((c) => c.tagName === 'br');
        const titles = parts({ childNodes: titleP.childNodes.slice(0, brAt) });
        const period = clean(titleP.childNodes.slice(brAt + 1).map(textOf).join(''));
        const respCol = colsOf(rows[2])[1];
        const widthClass = attr(colsOf(rows[2])[1], 'class');
        const ul = first(respCol, 'ul');
        const responsibilities = [];
        const kidsOfUl = ul.childNodes.filter((n) => n.tagName);
        for (const k of kidsOfUl) {
          if (k.tagName === 'li') responsibilities.push(text(k));
          else {
            const last = responsibilities.pop();
            responsibilities.push({ group: last, items: tag(k, 'li').map(text) });
          }
        }
        const position = { titles, period, columns: { 'col-10': 'wide', 'col-6': 'medium', 'col-5': 'narrow' }[widthClass.split(' ')[0]], responsibilities };
        position.reason = text(first(rows[3], 'p'));
        const reasonLabel = text(first(rows[3], 'h5'));
        if (reasonLabel !== labels.reason) position.reasonLabel = reasonLabel;
        if (rows[4]) {
          const p = first(rows[4], 'p');
          const lines = [];
          let cur = '';
          for (const c of p.childNodes) {
            if (c.tagName === 'br') {
              lines.push(clean(cur));
              cur = '';
            } else cur += textOf(c);
          }
          lines.push(clean(cur));
          position.referee = { name: lines[0], phone: lines[1], email: lines[2] };
        }
        return position;
      });
    const id = attr(header, 'data-bs-target').replace(/^#/, '');
    employers.push({ id, names: parts(h4), location: loc, positions });
  }
  pageFile('career-history', { ...page('career-history', 'portfolio/career-history', html), labels, employers });
}

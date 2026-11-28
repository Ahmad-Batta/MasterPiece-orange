export const cvRows = {
  experience: { max: 30, fields: { title: 255, organization: 255, location: 150, start_date: 50, end_date: 50, bullets: 0 } },
  education: { max: 20, fields: { institution: 255, degree: 255, field: 100, location: 150, start_date: 50, end_date: 50, details: 2000, honors: 150 } },
  projects: { max: 30, fields: { title: 255, organization: 255, date_range: 100, tools: 255, url: 255, bullets: 0 } },
  skills_grouped: { max: 30, fields: { category: 100, items: 0 } },
  certifications: { max: 30, fields: { title: 255, issuer: 255, year: 50 } },
  languages: { max: 30, fields: { language: 100, proficiency: 100 } },
};

const personalFields = ['name', 'headline', 'email', 'phone', 'city', 'image_url', 'linkedin_url', 'github_url', 'portfolio_url'];
const serverFields = {
  education: ['degree', 'institution', 'location', 'start_date', 'end_date', 'details'],
  experience: ['title', 'organization', 'location', 'start_date', 'end_date', 'bullets'],
  projects: ['title', 'organization', 'date_range', 'bullets'],
  skills_grouped: ['category', 'items'],
};

export function newCvRow(section, data = {}) {
  const fields = Object.entries(cvRows[section].fields).map(([key, limit]) => [
    key, limit === 0 ? (Array.isArray(data[key]) ? data[key].map(String) : []) : String(data[key] ?? ''),
  ]);
  const id = crypto.randomUUID?.() ?? crypto.getRandomValues(new Uint32Array(4)).join('-');
  return { ...Object.fromEntries(fields), id, ...(section === 'experience' && { current: Boolean(data.current) }) };
}

export function cvFromProfile(profile, skillLabel) {
  const personal = personalFields.map((key) => [key, String(profile[key] ?? '')]);
  const rows = Object.keys(cvRows).map((section) => [
    section, (Array.isArray(profile[section]) ? profile[section] : []).map((row) => newCvRow(section, row)),
  ]);
  const draft = {
    ...Object.fromEntries(personal), ...Object.fromEntries(rows),
    phone: String(profile.phone ?? profile.phone_number ?? ''),
    city: profile.city ?? profile.location ?? '',
    bio: profile.bio ?? profile.biography ?? '', showPhoto: false,
  };
  if (!draft.skills_grouped.length && profile.skills?.length) {
    draft.skills_grouped = [newCvRow('skills_grouped', { category: skillLabel, items: profile.skills })];
  }
  return draft;
}

export function cvServerPayload(draft, present) {
  const body = Object.fromEntries(['bio', 'phone', 'city', 'linkedin_url', 'github_url'].map((key) => [key, draft[key].trim()]));
  const rowIndices = {};
  for (const [section, fields] of Object.entries(serverFields)) {
    rowIndices[section] = [];
    body[section] = draft[section].flatMap((row, index) => {
      const entry = Object.fromEntries(fields.map((key) => [key, key === 'bullets' || key === 'items' ? row[key].map((item) => item.trim()).filter(Boolean) : row[key].trim()]));
      if (section === 'experience' && row.current) entry.end_date = present;
      if (!Object.values(entry).some((value) => value.length)) return [];
      rowIndices[section].push(index);
      return [entry];
    });
  }
  return { body, rowIndices };
}

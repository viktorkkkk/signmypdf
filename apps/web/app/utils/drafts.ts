import { TextField } from '../components/PDFTextEditor';

export interface Draft {
  id: string;
  name: string;
  savedAt: string;
  fields: TextField[];
  fieldCount: number;
}

const DRAFTS_KEY = 'signmypdf_drafts_v1';
const MAX_DRAFTS = 10;

export function saveDraft(name: string, fields: TextField[]): Draft {
  const existing = getDrafts();
  const draft: Draft = {
    id: Math.random().toString(36).slice(2),
    name,
    savedAt: new Date().toISOString(),
    fields,
    fieldCount: fields.filter(f => f.text?.trim()).length,
  };
  const updated = [draft, ...existing.filter(d => d.name !== name)].slice(0, MAX_DRAFTS);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
  return draft;
}

export function getDrafts(): Draft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function deleteDraft(id: string) {
  const updated = getDrafts().filter(d => d.id !== id);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
}

export function getDraftById(id: string): Draft | null {
  return getDrafts().find(d => d.id === id) ?? null;
}

export function setPendingDraft(draft: Draft) {
  sessionStorage.setItem('signmypdf_pending_draft', JSON.stringify(draft));
}

export function consumePendingDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem('signmypdf_pending_draft');
    if (!raw) return null;
    sessionStorage.removeItem('signmypdf_pending_draft');
    return JSON.parse(raw);
  } catch { return null; }
}

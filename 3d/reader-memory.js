/** Separate from legacy Atlas progress. Every mutation rereads storage to preserve other notes. */
export const READER_MEMORY_KEY = 'reading-atlas-reader-memory-v1';
const LIMIT = 10000;
const empty = () => ({notes: Object.create(null), journey: null});
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f]/.test(value);
const validJourney = value => value === null || (value && typeof value === 'object' && validId(value.id) && Number.isInteger(value.index) && value.index >= 0 && value.index <= 10000);

function read() {
  try {
    const raw = localStorage.getItem(READER_MEMORY_KEY);
    if (raw === null) return empty();
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !data.notes || typeof data.notes !== 'object' || Array.isArray(data.notes) || !validJourney(data.journey)) throw new Error('invalid');
    const notes = Object.create(null);
    for (const [uid, note] of Object.entries(data.notes)) {
      if (!validId(uid) || typeof note !== 'string' || note.length > LIMIT) throw new Error('invalid');
      notes[uid] = note;
    }
    return {notes, journey: data.journey ? {id: data.journey.id, index: data.journey.index} : null};
  } catch (error) {
    return {...empty(), error: error instanceof SyntaxError || error.message === 'invalid'
      ? 'Saved reader notes could not be read. They have been left unchanged.'
      : 'Your browser cannot access reader notes. Check its storage settings.'};
  }
}

export function loadMemory() { return read(); }
function change(update) {
  const data = read();
  if (data.error) return {ok: false, error: data.error};
  update(data);
  try { localStorage.setItem(READER_MEMORY_KEY, JSON.stringify({version: 1, ...data})); return {ok: true}; }
  catch { return {ok: false, error: 'Your browser could not save this change. Your existing notes have been kept.'}; }
}
export function saveNote(uid, text) {
  if (!validId(uid) || typeof text !== 'string') return {ok: false, error: 'Choose a valid book and write a text note.'};
  if (text.length > LIMIT) return {ok: false, error: 'Please keep this note within 10,000 characters.'};
  return change(data => { if (text.trim()) data.notes[uid] = text; else delete data.notes[uid]; });
}
export function saveJourney(value) {
  if (!validJourney(value)) return {ok: false, error: 'This reading journey position is invalid.'};
  return change(data => { data.journey = value ? {id: value.id, index: value.index} : null; });
}
export function clearNotes() { return change(data => {data.notes = Object.create(null);}); }
export function exportReaderMemory(desk = []) {
  const data = read();
  return JSON.stringify({format: 'Reading Atlas personal reading desk', version: 1, exportedAt: new Date().toISOString(), desk: [...new Set((Array.isArray(desk) ? desk : []).filter(validId))], ...data}, null, 2);
}

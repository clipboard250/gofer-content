// scripts/ingest-submissions.js
// Reads data/formspree.csv and appends rows into
// community-bulletin-board/spots.json and events.json

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CSV_PATH = path.join(process.cwd(), 'data', 'formspree.csv');
const SPOTS = path.join('community-bulletin-board', 'spots.json');
const EVENTS = path.join('community-bulletin-board', 'events.json');

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return []; }
}
function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
function slugify(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}
function toLines(s) {
  if (!s) return [];
  return String(s).split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0, 6);
}
function normUrl(u) {
  if (!u) return '';
  const t = String(u).trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(t)) return 'https://' + t;
  return t;
}
function tryIso(s) {
  if (!s) return '';
  const d = new Date(s);
  return isFinite(d) ? d.toISOString() : '';
}
function col(row, ...names) {
  for (const name of names) {
    // exact or case-insensitive match
    if (row[name] != null) return row[name];
    const k = Object.keys(row).find(k => k.trim().toLowerCase() === name.toLowerCase());
    if (k) return row[k];
  }
  return '';
}

if (!fs.existsSync(CSV_PATH)) {
  console.error('CSV not found at', CSV_PATH);
  process.exit(0);
}

const csvText = fs.readFileSync(CSV_PATH, 'utf8');
const rows = parse(csvText, { columns: true, skip_empty_lines: true });

const spots = readJson(SPOTS);
const events = readJson(EVENTS);
const spotSlugs = new Set(spots.map(x=>x.slug));
const eventSlugs = new Set(events.map(x=>x.slug));

let addedSpots = 0, addedEvents = 0;

for (const row of rows) {
  const listingType = String(col(row, 'listing_type','Listing type','Type')).trim() || 'Listing';
  const name   = String(col(row, 'name','Name','title','Title')).trim();
  if (!name) continue;

  const tagline = String(col(row, 'tagline','Tag line','Tagline')).trim();
  const when    = String(col(row, 'when','When')).trim();
  const where   = String(col(row, 'where','Where','City')).trim();
  const website = normUrl(col(row, 'website','Website'));
  const instagram = normUrl(col(row, 'instagram','Instagram'));
  const email   = String(col(row, 'email','Email','requester_email')).trim();
  const phone   = String(col(row, 'phone','Phone')).trim();
  const perks   = toLines(col(row, 'perks','Perks or features (one per line)','perks/features'));
  const notes   = String(col(row, 'notes','Anything else?','Notes')).trim();
  const flyer   = normUrl(col(row, 'flyer_url','Flyer image URL','Flyer'));

  const start_at = String(col(row, 'start_at','Start','start date','start_at_iso')).trim() || tryIso(when);
  const end_at   = String(col(row, 'end_at','End','end date','end_at_iso')).trim();

  const created_at = new Date().toISOString();

  const links = [];
  if (website)   links.push({ type:'website', href:website });
  if (instagram) links.push({ type:'instagram', href:instagram });
  if (email)     links.push({ type:'email', href:`mailto:${email}` });
  if (phone) {
    const digits = phone.replace(/\D+/g,'');
    links.push({ type:'phone', href: digits ? `tel:${digits}` : phone });
  }

  const base = {
    title: name,
    tagline,
    industry: listingType.toLowerCase()==='event'
      ? (col(row,'industry','Industry') || 'Events')
      : (col(row,'industry','Industry') || ''),
    where,
    audience: '',
    perks,
    when,
    links,
    created_at
  };
  if (flyer) base.image = flyer;

  if (listingType.toLowerCase() === 'event') {
    const slug = slugify(`${name}-${when || ''}`) || slugify(name);
    if (eventSlugs.has(slug)) continue;
    const rec = { ...base, type:'Event', slug };
    if (start_at) rec.start_at = start_at;
    if (end_at)   rec.end_at = end_at;
    events.push(rec); eventSlugs.add(slug); addedEvents++;
  } else {
    const slug = slugify(name);
    if (spotSlugs.has(slug)) continue;
    const rec = { ...base, type:'Business/Service', slug };
    spots.push(rec); spotSlugs.add(slug); addedSpots++;
  }
}

// sort: newest first
spots.sort((a,b)=> new Date(b.created_at||0)-new Date(a.created_at||0));
events.sort((a,b)=>{
  const aa = a.start_at ? new Date(a.start_at) : new Date(a.created_at||0);
  const bb = b.start_at ? new Date(b.start_at) : new Date(b.created_at||0);
  return bb-aa;
});

writeJson(SPOTS, spots);
writeJson(EVENTS, events);

console.log(`Added ${addedSpots} businesses, ${addedEvents} events.`);

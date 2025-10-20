// scripts/ingest-submissions.js
// Zero-dependency CSV → JSON ingester.
// Reads data/formspree.csv and appends rows into
// community-bulletin-board/spots.json and events.json

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(process.cwd(), 'data', 'formspree.csv');
const SPOTS = path.join('community-bulletin-board', 'spots.json');
const EVENTS = path.join('community-bulletin-board', 'events.json');

// --- tiny CSV reader (handles quotes + commas) ---
function parseCSV(text){
  const rows = [];
  let i=0, field='', row=[], inQ=false;
  const pushField = () => { row.push(field); field=''; };
  const pushRow = () => { rows.push(row); row=[]; };
  while(i<text.length){
    const c = text[i++];
    if(inQ){
      if(c==='"' && text[i]==='"'){ field+='"'; i++; }
      else if(c === '"'){ inQ=false; }
      else field += c;
    }else{
      if(c === '"'){ inQ = true; }
      else if(c === ','){ pushField(); }
      else if(c === '\n'){ pushField(); pushRow(); }
      else if(c === '\r'){ /* ignore */ }
      else field += c;
    }
  }
  pushField(); if(row.length>1 || row[0] !== '') pushRow();

  const header = rows.shift() || [];
  return rows.map(r => {
    const o = {};
    header.forEach((h,idx)=> o[(h||'').trim()] = (r[idx]||'').trim());
    return o;
  });
}

// --- helpers ---
const readJson = p => { try{ return JSON.parse(fs.readFileSync(p,'utf8')); } catch{ return []; } };
const writeJson = (p,d) => fs.writeFileSync(p, JSON.stringify(d,null,2)+'\n','utf8');
const slugify = s => (s||'').toLowerCase().replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-').slice(0,80);
const toLines = s => String(s||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,6);
const normUrl = u => !u ? '' : (/^https?:\/\//i.test(u.trim()) ? u.trim() : (/^[\w.-]+\.[a-z]{2,}/i.test(u.trim()) ? 'https://'+u.trim() : u.trim()));
const tryIso  = s => { if(!s) return ''; const d = new Date(s); return isFinite(d)?d.toISOString():''; };
function col(row,...names){
  for(const name of names){
    if(row[name]!=null) return row[name];
    const k = Object.keys(row).find(k => k.trim().toLowerCase()===name.toLowerCase());
    if(k) return row[k];
  }
  return '';
}

// --- main ---
if(!fs.existsSync(CSV_PATH)){
  console.log('CSV not found at', CSV_PATH, '(skipping)');
  process.exit(0);
}
const csvText = fs.readFileSync(CSV_PATH,'utf8');
const rows = parseCSV(csvText);

const spots = readJson(SPOTS);
const events = readJson(EVENTS);
const spotSlugs = new Set(spots.map(x=>x.slug));
const eventSlugs = new Set(events.map(x=>x.slug));

let addedSpots=0, addedEvents=0;

for(const row of rows){
  const listingType = String(col(row,'listing_type','Listing type','Type')).trim() || 'Listing';
  const name = String(col(row,'name','Name','title','Title')).trim();
  if(!name) continue;

  const tagline = col(row,'tagline','Tag line','Tagline')||'';
  const when    = col(row,'when','When')||'';
  const where   = col(row,'where','Where','City')||'';
  const website = normUrl(col(row,'website','Website'));
  const instagram = normUrl(col(row,'instagram','Instagram'));
  const email   = (col(row,'email','Email','requester_email')||'').trim();
  const phone   = (col(row,'phone','Phone')||'').trim();
  const perks   = toLines(col(row,'perks','Perks or features (one per line)','perks/features'));
  const flyer   = normUrl(col(row,'flyer_url','Flyer image URL','Flyer'));
  const industry = col(row,'industry','Industry') || (listingType.toLowerCase()==='event' ? 'Events' : '');

  const start_at = (col(row,'start_at','Start','start date','start_at_iso')||'').trim() || tryIso(when);
  const end_at   = (col(row,'end_at','End','end date','end_at_iso')||'').trim();
  const created_at = new Date().toISOString();

  const links = [];
  if(website)   links.push({type:'website',href:website});
  if(instagram) links.push({type:'instagram',href:instagram});
  if(email)     links.push({type:'email',href:`mailto:${email}`});
  if(phone){ const d=phone.replace(/\D+/g,''); links.push({type:'phone',href:d?`tel:${d}`:phone}); }

  const base = { title:name, tagline, industry, where, audience:'', perks, when, links, created_at };
  if(flyer) base.image = flyer;

  if(/^event$/i.test(listingType)){
    const slug = slugify(`${name}-${when||''}`) || slugify(name);
    if(eventSlugs.has(slug)) continue;
    const rec = { ...base, type:'Event', slug };
    if(start_at) rec.start_at = start_at;
    if(end_at)   rec.end_at = end_at;
    events.push(rec); eventSlugs.add(slug); addedEvents++;
  }else{
    const slug = slugify(name);
    if(spotSlugs.has(slug)) continue;
    const rec = { ...base, type:'Business/Service', slug };
    spots.push(rec); spotSlugs.add(slug); addedSpots++;
  }
}

spots.sort((a,b)=> new Date(b.created_at||0)-new Date(a.created_at||0));
events.sort((a,b)=> (new Date(b.start_at||b.created_at||0))-(new Date(a.start_at||a.created_at||0)));

writeJson(SPOTS, spots);
writeJson(EVENTS, events);

console.log(`Added ${addedSpots} businesses, ${addedEvents} events.`);

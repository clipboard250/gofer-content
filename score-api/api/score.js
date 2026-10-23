// Gofer website score: reads a public site and returns a 0-100 score
// plus green / yellow / red. Reasons are intentionally NOT returned.
// Deployed on Vercel as the "gofer-score" project.

const ALLOWED_ORIGINS = ['https://gofercontent.com', 'https://www.gofercontent.com'];
const AI_BOTS = ['gptbot', 'oai-searchbot', 'claudebot', 'perplexitybot', 'google-extended'];
const UA = 'Mozilla/5.0 (compatible; GoferScore/1.0; +https://gofercontent.com)';

function isPrivateHost(host) {
  return (
    /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(host) ||
    host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.')
  );
}

async function get(url, ms = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'user-agent': UA } });
    const text = r.ok ? (await r.text()).slice(0, 2_000_000) : '';
    return { ok: r.ok, text, url: r.url };
  } catch {
    return { ok: false, text: '', url };
  } finally {
    clearTimeout(t);
  }
}

// True if robots.txt blocks a named AI bot (or everyone) from the whole site.
function robotsBlocksAI(robots) {
  const groups = [];
  let cur = null;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^(user-agent|disallow)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim().toLowerCase();
    if (key === 'user-agent') {
      if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val);
    } else if (cur) {
      cur.rules.push(val);
    }
  }
  return groups.some((g) =>
    g.rules.includes('/') && g.agents.some((a) => a === '*' || AI_BOTS.includes(a))
  );
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  let target;
  try {
    let raw = String(req.query.url || '').trim();
    if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
    target = new URL(raw);
    if (!/^https?:$/.test(target.protocol) || isPrivateHost(target.hostname)) throw 0;
  } catch {
    return res.status(400).json({ error: 'bad_url' });
  }

  const home = await get(target.origin + target.pathname);
  if (!home.ok || !home.text) {
    return res.status(200).json({ score: 0, grade: 'red', reachable: false });
  }

  const base = new URL(home.url).origin;
  const [robots, sitemap, llms] = await Promise.all([
    get(base + '/robots.txt', 5000),
    get(base + '/sitemap.xml', 5000),
    get(base + '/llms.txt', 5000),
  ]);

  const html = home.text;
  const head = (html.match(/<head[\s\S]*?<\/head>/i) || [html])[0];
  const meta = (name) =>
    new RegExp(`<meta[^>]+(name|property)=["']${name}["'][^>]*content=["'][^"']+`, 'i').test(head) ||
    new RegExp(`<meta[^>]+content=["'][^"']+["'][^>]*(name|property)=["']${name}["']`, 'i').test(head);

  const title = (head.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
  const h1s = (html.match(/<h1[\s>]/gi) || []).length;
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const withAlt = imgs.filter((i) => /\balt\s*=\s*["'][^"']+/i.test(i)).length;
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const words = (bodyText.match(/[a-z]{2,}/gi) || []).length;

  const checks = [
    [15, robots.ok ? !robotsBlocksAI(robots.text) : true],
    [10, sitemap.ok && /<(urlset|sitemapindex)/i.test(sitemap.text)],
    [20, /application\/ld\+json/i.test(html)],
    [10, title.trim().length >= 10],
    [10, meta('description')],
    [10, meta('og:image')],
    [5, h1s === 1],
    [5, imgs.length === 0 || withAlt / imgs.length >= 0.8],
    [5, llms.ok && /^#\s/m.test(llms.text)],
    [5, meta('viewport')],
    [5, words >= 200],
  ];

  const score = checks.reduce((s, [pts, pass]) => s + (pass ? pts : 0), 0);
  const grade = score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red';

  res.setHeader('Cache-Control', 's-maxage=3600');
  return res.status(200).json({ score, grade, reachable: true });
};

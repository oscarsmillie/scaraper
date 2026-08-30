const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// =======================
// SUPABASE
// =======================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =======================
// CONFIG
// =======================
const API_URL =
  process.env.ARBEITNOW_API ||
  "https://www.arbeitnow.com/api/job-board-api";

const CHUNK_SIZE = 50;

const MAX_PAGES = Number(process.env.ARBEITNOW_MAX_PAGES || 5);
const REQUEST_DELAY = Number(process.env.ARBEITNOW_DELAY || 1500);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =======================
// FILTERS
// =======================
const ALLOWED_LOCATION_KEYWORDS = [
  "remote",
  "worldwide",
  "global",
  "anywhere",
  "africa",
  "african",
  "emea"
 ];

const BLOCKED_LOCATION_KEYWORDS = [
  "us",
  "usa",
  "united states",
  "canada",
  "uk",
  "united kingdom",
  "australia",
  "india",
  "philippines",
  "germany",
  "europe",
  "singapore"
];

const AFRICAN_COUNTRIES = [
  "kenya",
  "uganda",
  "tanzania",
  "rwanda",
  "ethiopia",
  "ghana",
  "nigeria",
  "south africa",
  "zambia",
  "zimbabwe",
  "botswana",
  "namibia",
  "malawi",
  "mozambique",
  "cameroon",
  "senegal",
  "egypt",
  "morocco",
  "tunisia",
  "algeria",
  "angola",
  "mauritius"
];

const BLOCKED_TITLE_KEYWORDS = [
  "expression of interest",
  "join our team",
  "other areas"
];

function contains(text = "", words) {
  text = text.toLowerCase();
  return words.some(word => text.includes(word));
}

// =======================
// HTML CLEANER
// =======================
function stripHtml(html = "") {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|ul|ol|br|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n\s+\n/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// =======================
// CHUNK
// =======================
function chunkArray(arr, size) {
  const chunks = [];

  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }

  return chunks;
}

// =======================
// MAP JOB
// =======================
function mapJob(job) {
  return {
    external_id: job.slug,

    title: job.title,

    company: job.company_name,

    description: stripHtml(job.description),

    location: job.location || "Remote",

    job_type: job.job_types?.join(", ") || null,

    salary: null,

    experience_level: null,

    skills: job.tags || [],

    requirements: [],

    posted_date: new Date(job.created_at * 1000).toISOString(),

    application_url: job.url,

    source: "Arbeitnow",

    category: null,

    raw_data: job,

    country: null,

    expiry_date: null,

    metadata: JSON.stringify({
      remote: job.remote,
      tags: job.tags
    }),

    scraped_at: new Date().toISOString(),

    url: job.url,

    is_remote: job.remote,

    slug: job.slug
  };
}

// =======================
// MAIN
// =======================
async function run() {

  try {

    console.log("Fetching Arbeitnow jobs...");

    let nextUrl = API_URL;
let jobs = [];
let page = 1;

while (nextUrl && page <= MAX_PAGES) {

  let res;

  while (true) {

    res = await fetch(nextUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "KaziNest Bot (+https://kazinest.co.ke)"
      }
    });

    if (res.status === 429) {
      console.log("⚠️ Rate limited. Waiting 30 seconds...");
      await sleep(30000);
      continue;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    break;
  }

  const json = await res.json();

  jobs.push(...json.data);

  console.log(
    `✅ Page ${page}: ${json.data.length} jobs (Total: ${jobs.length})`
  );

  nextUrl = json.links?.next || null;

  page++;

  if (nextUrl && page <= MAX_PAGES) {
    await sleep(REQUEST_DELAY);
  }
}

    console.log(`Found ${jobs.length} jobs`);

   const filtered = jobs
  .filter(job => {

    if (!job.url)
      return false;

    if (contains(job.title, BLOCKED_TITLE_KEYWORDS))
      return false;

    const location = (job.location || "").toLowerCase().trim();

    // Reject location-restricted jobs
    if (contains(location, BLOCKED_LOCATION_KEYWORDS))
      return false;

    // Explicitly remote
    if (job.remote)
      return true;

    // African countries
    if (contains(location, AFRICAN_COUNTRIES))
      return true;

    // Worldwide / Global / Anywhere / EMEA
    if (
      contains(location, [
        "remote",
        "worldwide",
        "global",
        "anywhere",
        "africa",
        "african",
        "emea"
      ])
    )
      return true;

    return false;

  })
  .map(mapJob);

// ==========================================
// Remove duplicate jobs
// ==========================================
const uniqueJobs = Array.from(
  new Map(
    filtered.map(job => [
      `${job.source}:${job.external_id}`,
      job
    ])
  ).values()
);

console.log(
  `${filtered.length} jobs passed filters`
);

console.log(
  `Removed ${filtered.length - uniqueJobs.length} duplicate jobs`
);

const chunks = chunkArray(uniqueJobs, CHUNK_SIZE);

    for (let i = 0; i < chunks.length; i++) {

      const { error } = await supabase
        .from("external_jobs")
        .upsert(chunks[i], {
          onConflict: "source,external_id"
        });

      if (error) {
        console.error(`❌ Chunk ${i + 1}`);
        console.dir(error, { depth: null });
      } else {
        console.log(`✅ Chunk ${i + 1}/${chunks.length}`);
      }

    }

    console.log("🏁 Done.");

  } catch (err) {
    console.error(err);
  }

}

if (require.main === module) {
  run();
}

module.exports = run;
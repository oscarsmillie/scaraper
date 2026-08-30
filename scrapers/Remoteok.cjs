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
const API_URL = process.env.REMOTE_OK_API;
const CHUNK_SIZE = 50;

// =======================
// FILTERS
// =======================
const ALLOWED_LOCATION_KEYWORDS = [
  "worldwide",
  "global",
  "remote",
  "anywhere",
  "africa",
  "emea",
  "europe",
  "utc",
  "gmt"
];

const BLOCKED_LOCATION_KEYWORDS = [
  "united states only",
  "us only",
  "usa only",
  "canada only",
  "australia only",
  "india only",
  "philippines only",
  "singapore only"
];

const BLOCKED_TITLE_KEYWORDS = [
  "expression of interest",
  "join our team",
  "other areas"
];

function contains(text = "", words) {
  text = text.toLowerCase();
  return words.some(w => text.includes(w));
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
    external_id: String(job.id),

    title: job.position,

    company: job.company,

    description: stripHtml(job.description || ""),

    location: job.location || "Remote",

    job_type: null,

    salary: job.salary_min || job.salary_max
      ? `${job.salary_min || ""}${job.salary_min && job.salary_max ? " - " : ""}${job.salary_max || ""}`
      : null,

    experience_level: null,

    skills: job.tags || [],

    requirements: [],

    posted_date: job.date || null,

    application_url: job.apply_url,

    source: "RemoteOK",

    category: null,

    raw_data: job,

    country: null,

    expiry_date: null,

    metadata: JSON.stringify({
      tags: job.tags,
      logo: job.logo,
      company_logo: job.company_logo
    }),

    scraped_at: new Date().toISOString(),

    url: job.url,

    is_remote: true,

    slug: String(job.id)
  };
}

// =======================
// MAIN
// =======================
async function run() {

  try {

    console.log("Fetching Remote OK jobs...");

    const res = await fetch(API_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!res.ok)
      throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    const jobs = data.filter(j => j.id);

    console.log(`Found ${jobs.length} jobs`);

    const filtered = jobs
      .filter(job => {

        if (!job.apply_url)
          return false;

        if (contains(job.position || "", BLOCKED_TITLE_KEYWORDS))
          return false;

        if (contains(job.location || "", BLOCKED_LOCATION_KEYWORDS))
          return false;

        return (
          contains(job.location || "", ALLOWED_LOCATION_KEYWORDS) ||
          contains(job.description || "", ALLOWED_LOCATION_KEYWORDS)
        );

      })
      .map(mapJob);

    console.log(`${filtered.length} jobs passed filters`);

    const chunks = chunkArray(filtered, CHUNK_SIZE);

    for (let i = 0; i < chunks.length; i++) {

      const { error } = await supabase
        .from("external_jobs")
        .upsert(chunks[i], {
          onConflict: "external_id"
        });

      if (error) {
        console.error(`❌ Chunk ${i + 1}:`);
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
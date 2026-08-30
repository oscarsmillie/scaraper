const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");
const { shouldKeepJob } = require("./filters.cjs");

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
  process.env.REMOTIVE_API ||
  "https://remotive.com/api/remote-jobs";

const CHUNK_SIZE = 50;

// =======================
// HELPERS
// =======================
function stripHtml(html = "") {
  return String(html)
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
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkArray(arr, size) {
  const chunks = [];

  for (let i = 0; i < arr.length; i += size)
    chunks.push(arr.slice(i, i + size));

  return chunks;
}

// =======================
// MAP
// =======================
function mapJob(job) {

  return {

    external_id: String(job.id),

    title: job.title,

    company: job.company_name,

    description: stripHtml(job.description),

    location: job.candidate_required_location || "Remote",

    job_type: job.job_type || null,

    salary: job.salary || null,

    experience_level: null,

    skills: [],

    requirements: [],

    posted_date: job.publication_date || null,

    application_url: job.url,

    source: "Remotive",

    category: job.category || null,

    raw_data: job,

    country: null,

    expiry_date: null,

    metadata: JSON.stringify({
      logo: job.company_logo
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

    console.log("Fetching Remotive jobs...");

    const res = await fetch(API_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "KaziNest Bot"
      }
    });

    if (!res.ok)
      throw new Error(`HTTP ${res.status}`);

    const json = await res.json();

    console.log(`API returned ${json["job-count"]} jobs`);

    let jobs = json.jobs || [];

    console.log(`Found ${jobs.length} jobs`);

    const filtered = jobs
      .filter(job => {

        if (!job.url)
          return false;

        return shouldKeepJob({
          title: job.title,
          location: job.candidate_required_location,
          remote: true
        });

      })
      .map(mapJob);

    const uniqueJobs = Array.from(
      new Map(
        filtered.map(job => [
          `${job.source}:${job.external_id}`,
          job
        ])
      ).values()
    );

    console.log(`${uniqueJobs.length} jobs passed filters`);

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

if (require.main === module)
  run();

module.exports = run;
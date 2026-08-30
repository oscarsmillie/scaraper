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
const SLUG = "talentsafari";
const BASE_URL =
  `https://api.ashbyhq.com/posting-api/job-board/${SLUG}?includeCompensation=true`;

const RETRY_COUNT = 3;
const CHUNK_SIZE = 50;

// =======================
// HELPERS
// =======================
const sleep = (ms) =>
  new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, retries = RETRY_COUNT) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.warn(
        `⚠️ Retry ${i + 1}/${retries}: ${err.message}`
      );

      await sleep((i + 1) * 1000);
    }
  }

  return null;
}

// =======================
// CLEAN HTML (optional)
// =======================
function stripHtml(html = "") {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// =======================
// MAP JOB
// =======================
function mapJob(job) {
  return {
    external_id: job.id,

    title: job.title,
    company: job.team || "Talent Safari",

    description: stripHtml(job.descriptionPlain || job.descriptionHtml || ""),

    location: job.location || null,

    job_type: job.employmentType || null,

    salary: job.compensation?.salary || null,

    experience_level: job.level || null,

    skills: [],

    requirements: [],

    posted_date: job.publishedAt || null,

    application_url: job.applyUrl || job.jobUrl,

    company_logo: null,

    source: "TalentSafari",

    category: job.department || null,

    raw_data: job,

    country:
      job.address?.postalAddress?.addressCountry || null,

    expiry_date:
      job.compensation?.applicationDeadline || null,

    metadata: JSON.stringify({
      team: job.team,
      secondary_locations: job.secondaryLocations,
      compensation: job.compensation
    }),

    scraped_at: new Date().toISOString(),

    url: job.jobUrl || job.applyUrl,

    is_premium: false,
    slug: job.id,
    is_remote: job.workplaceType === "REMOTE"
  };
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
// MAIN SCRAPER
// =======================
async function scrapeTalentSafari() {
  console.log("📡 Fetching Talent Safari jobs...");

  const data = await fetchWithRetry(BASE_URL);

  if (!data) {
    console.error("❌ Failed to fetch Ashby API");
    return [];
  }

  const jobs = data.jobs || [];

  if (!jobs.length) {
    console.warn("⚠️ No jobs found");
    return [];
  }

  console.log(`📄 Found ${jobs.length} jobs`);

  const normalized = jobs.map(mapJob);

  console.log(`📦 Normalized ${normalized.length} jobs`);

  // =======================
  // UPSERT
  // =======================
  const chunks = chunkArray(normalized, CHUNK_SIZE);

  for (let i = 0; i < chunks.length; i++) {
    const { error } = await supabase
      .from("external_jobs")
      .upsert(chunks[i], {
        onConflict: "external_id",
      });

    if (error) {
      console.error(
        `❌ Chunk ${i + 1} error:`,
        error.message
      );
    } else {
      console.log(
        `✅ Chunk ${i + 1}/${chunks.length} inserted`
      );
    }
  }

  console.log("🏁 Done");
  return normalized;
}

// =======================
// EXPORT
// =======================
module.exports = scrapeTalentSafari;

// =======================
// RUN
// =======================
if (require.main === module) {
  (async () => {
    await scrapeTalentSafari();
    process.exit(0);
  })();
}
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
const COMPANIES = [
  "TaptapSend",
  "maple",
  "codex",
  "capimoney",
  "M-KOPA",
  "luopay"
];

const CHUNK_SIZE = 50;
const RETRY_COUNT = 3;

// =======================
// AFRICA FILTER
// =======================
const AFRICAN_KEYWORDS = [
  "kenya", "nairobi",
  "nigeria", "lagos", "abuja",
  "ghana", "accra",
  "uganda", "kampala",
  "tanzania", "dar es salaam",
  "rwanda", "kigali",
  "south africa", "cape town", "johannesburg",
  "egypt", "cairo",
  "morocco", "casablanca",
  "senegal", "dakar",
  "ethiopia", "addis ababa"
];

function isAfricaOrRemote(job) {
  const text = `
    ${job.location || ""}
    ${job.locationName || ""}
    ${job.descriptionHtml || ""}
  `.toLowerCase();

  const isRemote =
    job.workplaceType === "REMOTE" ||
    text.includes("remote") ||
    text.includes("anywhere") ||
    text.includes("utc");

  const isAfrica = AFRICAN_KEYWORDS.some(k =>
    text.includes(k)
  );

  return isRemote || isAfrica;
}

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
// CLEAN HTML
// =======================
function stripHtml(html = "") {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// =======================
// FETCH COMPANY JOBS
// =======================
async function fetchCompanyJobs(slug) {
  const url =
    `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`;

  const data = await fetchWithRetry(url);

  return data?.jobs || [];
}

// =======================
// MAP JOB
// =======================
function mapJob(job, companySlug) {
  return {
    external_id: job.id,

    title: job.title,
    company: job.team || companySlug,

    description: stripHtml(
      job.descriptionPlain || job.descriptionHtml || ""
    ),

    location: job.location || null,

    job_type: job.employmentType || null,

    salary: job.compensation?.salary || null,

    experience_level: job.level || null,

    skills: [],
    requirements: [],

    posted_date: job.publishedAt || null,

    application_url: job.applyUrl || job.jobUrl,

    source: "Ashby",

    category: job.department || null,

    raw_data: job,

    country: null,

    expiry_date:
      job.compensation?.applicationDeadline || null,

    metadata: JSON.stringify({
      company: companySlug,
      workplaceType: job.workplaceType,
      team: job.team,
      compensation: job.compensation
    }),

    scraped_at: new Date().toISOString(),

    url: job.jobUrl || job.applyUrl,

    is_remote: job.workplaceType === "REMOTE",
    slug: job.id
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
async function run() {
  console.log("📡 Starting Ashby Africa scraper...");

  let allJobs = [];

  for (const company of COMPANIES) {
    console.log(`\n🔎 Scraping ${company}...`);

    const jobs = await fetchCompanyJobs(company);

    console.log(`Found ${jobs.length} jobs`);

    const filtered = jobs
      .filter(isAfricaOrRemote)
      .map(job => mapJob(job, company));

    console.log(
      `🌍 After filter: ${filtered.length}`
    );

    allJobs.push(...filtered);

    await sleep(500);
  }

  console.log(`\n📦 Total jobs: ${allJobs.length}`);

  // =======================
  // UPSERT TO SUPABASE
  // =======================
  const chunks = chunkArray(allJobs, CHUNK_SIZE);

  for (let i = 0; i < chunks.length; i++) {
    const { error } = await supabase
      .from("external_jobs")
      .upsert(chunks[i], {
        onConflict: "external_id"
      });

    if (error) {
      console.error(
        `❌ Chunk ${i + 1} error:`,
        error.message
      );
    } else {
      console.log(
        `✅ Chunk ${i + 1}/${chunks.length}`
      );
    }
  }

  console.log("\n🏁 Done.");
}

// =======================
// RUN
// =======================
if (require.main === module) {
  run();
}

module.exports = run;
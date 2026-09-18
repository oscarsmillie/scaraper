
const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// ======================================
// SHARED FILTERS
// ======================================

const {
  shouldKeepJob
} = require("./filters");

// ======================================
// SUPABASE
// ======================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ======================================
// CONFIG
// ======================================

const API_URL = process.env.REMOTE_OK_API;
const CHUNK_SIZE = 50;

// ======================================
// HTML CLEANER
// ======================================

function stripHtml(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/?(p|div|li|ul|ol|br|h1|h2|h3|h4|h5|h6)>/gi, "\n")
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

// ======================================
// CHUNK
// ======================================

function chunkArray(arr, size) {
  const chunks = [];

  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }

  return chunks;
}

// ======================================
// MAP JOB
// ======================================

function mapJob(job) {
  return {
    external_id: String(job.id),

    title: job.position,

    company: job.company,

    description: stripHtml(job.description || ""),

    location: job.location || "Remote",

    job_type: null,

    salary:
      job.salary_min || job.salary_max
        ? `${job.salary_min || ""}${
            job.salary_min && job.salary_max ? " - " : ""
          }${job.salary_max || ""}`
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

// ======================================
// MAIN
// ======================================

async function run() {
  try {
    console.log("Fetching Remote OK jobs...");

    const res = await fetch(API_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    const jobs = data.filter(job => job.id);

    console.log(`Found ${jobs.length} jobs`);

    // ======================================
    // SHARED KAZINEST FILTER
    // ======================================

    const filtered = jobs
      .filter(job => {
        if (!job.apply_url) {
          return false;
        }

        const location = job.location || "";

        const description = stripHtml(
          job.description || ""
        );

        const title = job.position || "";

        // ------------------------------------------------
        // IMPORTANT:
        //
        // RemoteOK often says:
        //
        // location: "Remote"
        //
        // while the actual restriction is inside:
        //
        // description:
        // "Must be located in the United States"
        //
        // Therefore we check BOTH location AND description.
        // ------------------------------------------------

        const geographicText = `${location} ${description}`;

        // The shared filter normally receives location.
        // We deliberately pass the combined geographic text
        // so hidden geographic restrictions are caught.
        return shouldKeepJob({
          location: geographicText,
          remote: true,
          title
        });
      })
      .map(mapJob);

    console.log(
      `${filtered.length} jobs passed KaziNest Africa-only filters`
    );

    // ======================================
    // OPTIONAL DEBUGGING
    // ======================================

    console.log(
      `Rejected ${jobs.length - filtered.length} jobs`
    );

    // ======================================
    // UPSERT
    // ======================================

    const chunks = chunkArray(filtered, CHUNK_SIZE);

    for (let i = 0; i < chunks.length; i++) {
      const { error } = await supabase
        .from("external_jobs")
        .upsert(chunks[i], {
          onConflict: "source,external_id"
        });

      if (error) {
        console.error(`❌ Chunk ${i + 1}:`);
        console.dir(error, { depth: null });
      } else {
        console.log(
          `✅ Chunk ${i + 1}/${chunks.length}`
        );
      }
    }

    console.log("🏁 RemoteOK done.");

  } catch (err) {
    console.error("❌ RemoteOK scraper failed:");
    console.error(err);
  }
}

if (require.main === module) {
  run();
}

module.exports = run;

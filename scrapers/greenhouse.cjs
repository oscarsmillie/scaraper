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
// Greenhouse requires a client/board token in the URL.
// Pass a list of board names in GREENHOUSE_CLIENTS (comma-separated), or defaults will be used.
const GREENHOUSE_CLIENTS = process.env.GREENHOUSE_CLIENTS
  ? process.env.GREENHOUSE_CLIENTS.split(",").map(c => c.trim())
  : ["gitlab", "canonical"]; // Default fallback boards to test

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
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// =======================
// MAPPER
// =======================
function mapJob(job, clientName) {
  // Greenhouse job objects return location inside a nested object or string
  const locationName = job.location?.name || "Remote";

  // Check if location or title implies remote
  const isRemote =
    locationName.toLowerCase().includes("remote") ||
    job.title.toLowerCase().includes("remote");

  return {
    external_id: String(job.id),
    title: job.title,
    company: clientName, // Greenhouse doesn't always send the company name explicitly in the job object
    description: stripHtml(job.content),
    location: locationName,
    job_type: null, // Greenhouse board API doesn't provide job_type in standard fields
    salary: null,
    experience_level: null,
    skills: [],
    requirements: [],
    posted_date: job.updated_at || new Date().toISOString(),
    expiry_date: null,
    application_url: job.absolute_url,
    source: `Greenhouse-${clientName}`,
    category: job.departments?.[0]?.name || null,
    raw_data: job,
    country: null,
    metadata: JSON.stringify({
      internal_job_id: job.internal_job_id,
      offices: job.offices || [],
      departments: job.departments || []
    }),
    scraped_at: new Date().toISOString(),
    url: job.absolute_url,
    is_remote: isRemote,
    slug: String(job.id)
  };
}

// =======================
// FETCH FOR SINGLE CLIENT
// =======================
async function fetchJobsForClient(clientName) {
  const url = `https://api.greenhouse.io/v1/boards/${clientName}/jobs?content=true`;

  try {
    console.log(`Fetching Greenhouse jobs for [${clientName}]...`);

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "KaziNest Bot"
      }
    });

    if (!res.ok) {
      console.warn(`⚠️ Failed to fetch [${clientName}]: HTTP ${res.status}`);
      return [];
    }

    const json = await res.json();
    const jobs = json.jobs || [];

    console.log(`Found ${jobs.length} raw jobs for [${clientName}]`);

    return jobs
      .filter(job => {
        if (!job.absolute_url) return false;

        return shouldKeepJob({
          title: job.title,
          location: job.location?.name || "",
          remote: true
        });
      })
      .map(job => mapJob(job, clientName));

  } catch (err) {
    console.error(`Error fetching Greenhouse board [${clientName}]:`, err.message);
    return [];
  }
}

// =======================
// MAIN
// =======================
async function run() {
  try {
    let allMappedJobs = [];

    // Cycle through provided client board names
    for (const client of GREENHOUSE_CLIENTS) {
      const clientJobs = await fetchJobsForClient(client);
      allMappedJobs = allMappedJobs.concat(clientJobs);
    }

    // Deduplicate jobs by source + external_id
    const uniqueJobs = Array.from(
      new Map(
        allMappedJobs.map(job => [
          `${job.source}:${job.external_id}`,
          job
        ])
      ).values()
    );

    console.log(`\n Total ${uniqueJobs.length} jobs passed filters across all clients.`);

    if (uniqueJobs.length === 0) {
      console.log("No jobs to insert.");
      return;
    }

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
    console.error("Error running Greenhouse scraper:", err);
  }
}

if (require.main === module) {
  run();
}

module.exports = run;
const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");
const { shouldKeepJob } = require("./filters.cjs");
require("dotenv").config();

// =======================
// CONFIG & SUPABASE
// =======================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CHUNK_SIZE = 50;

// 1. Greenhouse Companies
const GREENHOUSE_COMPANIES = [
  "gitlab", "zapier", "automattic", "stripe", "elastic", 
  "sourcegraph", "canonical", "grafana", "figma", "airtable", "github"
];

// 2. Lever Companies
const LEVER_COMPANIES = [
  "postman", "1password", "buffer", "hotjar", "doximity", 
  "vanta", "brex", "webflow", "datadog", "docker"
];

// 3. Workable API V2 Companies (JSON API Endpoint)
const WORKABLE_COMPANIES = [
  "toggl", "taxjar", "invision", "harness"
];

// 4. SmartRecruiters Companies
const SMARTRECRUITERS_COMPANIES = [
  "square", "spotify", "visa"
];

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
    .replace(/&apos;/g, "'")
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
// ATS FETCH FUNCTIONS
// =======================

// 1. Greenhouse API
async function fetchGreenhouseJobs(company) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || []).map(job => {
      const location = job.location?.name || "Remote";
      return {
        external_id: String(job.id),
        title: job.title,
        company: company.toUpperCase(),
        description: stripHtml(job.content || ""),
        location: location,
        job_type: null,
        salary: null,
        experience_level: null,
        skills: [],
        requirements: [],
        posted_date: job.updated_at || new Date().toISOString(),
        application_url: job.absolute_url,
        source: "Greenhouse",
        category: null,
        raw_data: job,
        country: null,
        expiry_date: null,
        metadata: JSON.stringify({ company }),
        scraped_at: new Date().toISOString(),
        url: job.absolute_url,
        is_remote: location.toLowerCase().includes("remote"),
        slug: String(job.id)
      };
    });
  } catch (err) {
    return [];
  }
}

// 2. Lever API
async function fetchLeverJobs(company) {
  const url = `https://api.lever.co/v0/postings/${company}?mode=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const jobs = await res.json();
    return jobs.map(job => {
      const location = job.categories?.location || "Remote";
      return {
        external_id: String(job.id),
        title: job.text,
        company: company.toUpperCase(),
        description: stripHtml(job.descriptionPlain || job.description || ""),
        location: location,
        job_type: job.categories?.commitment || null,
        salary: null,
        experience_level: job.categories?.level || null,
        skills: [],
        requirements: [],
        posted_date: new Date(job.createdAt).toISOString(),
        application_url: job.hostedUrl,
        source: "Lever",
        category: job.categories?.team || null,
        raw_data: job,
        country: null,
        expiry_date: null,
        metadata: JSON.stringify({ company }),
        scraped_at: new Date().toISOString(),
        url: job.hostedUrl,
        is_remote: location.toLowerCase().includes("remote") || job.workplaceType === "remote",
        slug: String(job.id)
      };
    });
  } catch (err) {
    return [];
  }
}

// 3. Workable API V2 (JSON endpoint)
async function fetchWorkableJobs(company) {
  const url = `https://apply.workable.com/api/v2/accounts/${company}/jobs`;
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || []).map(job => {
      const location = job.location?.city ? `${job.location.city}, ${job.location.country}` : "Remote";
      return {
        external_id: String(job.shortcode),
        title: job.title,
        company: company.toUpperCase(),
        description: stripHtml(job.description || ""),
        location: location,
        job_type: job.type || null,
        salary: null,
        experience_level: null,
        skills: [],
        requirements: [],
        posted_date: job.published || new Date().toISOString(),
        application_url: `https://apply.workable.com/${company}/j/${job.shortcode}/`,
        source: "Workable",
        category: job.department || null,
        raw_data: job,
        country: job.location?.country || null,
        expiry_date: null,
        metadata: JSON.stringify({ company }),
        scraped_at: new Date().toISOString(),
        url: `https://apply.workable.com/${company}/j/${job.shortcode}/`,
        is_remote: job.telecommuting || location.toLowerCase().includes("remote"),
        slug: String(job.shortcode)
      };
    });
  } catch (err) {
    return [];
  }
}

// 4. SmartRecruiters API
async function fetchSmartRecruitersJobs(company) {
  const url = `https://api.smartrecruiters.com/v1/companies/${company}/postings`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.content || []).map(job => {
      const location = job.location?.city ? `${job.location.city}, ${job.location.country}` : "Remote";
      return {
        external_id: String(job.id),
        title: job.name,
        company: company.toUpperCase(),
        description: "",
        location: location,
        job_type: job.typeOfEmployment?.label || null,
        salary: null,
        experience_level: job.experienceLevel?.label || null,
        skills: [],
        requirements: [],
        posted_date: job.releasedDate || new Date().toISOString(),
        application_url: `https://jobs.smartrecruiters.com/${company}/${job.id}`,
        source: "SmartRecruiters",
        category: job.department?.label || null,
        raw_data: job,
        country: job.location?.country || null,
        expiry_date: null,
        metadata: JSON.stringify({ company }),
        scraped_at: new Date().toISOString(),
        url: `https://jobs.smartrecruiters.com/${company}/${job.id}`,
        is_remote: job.location?.remote || location.toLowerCase().includes("remote"),
        slug: String(job.id)
      };
    });
  } catch (err) {
    return [];
  }
}

// =======================
// MAIN PIPELINE
// =======================
async function run() {
  try {
    console.log("🚀 Running multi-source ATS scraper pipeline...");
    let allJobs = [];

    // 1. Greenhouse
    for (const company of GREENHOUSE_COMPANIES) {
      console.log(`[Greenhouse] Fetching ${company}...`);
      const jobs = await fetchGreenhouseJobs(company);
      allJobs.push(...jobs);
    }

    // 2. Lever
    for (const company of LEVER_COMPANIES) {
      console.log(`[Lever] Fetching ${company}...`);
      const jobs = await fetchLeverJobs(company);
      allJobs.push(...jobs);
    }

    // 3. Workable API V2
    for (const company of WORKABLE_COMPANIES) {
      console.log(`[Workable V2] Fetching ${company}...`);
      const jobs = await fetchWorkableJobs(company);
      allJobs.push(...jobs);
    }

    // 4. SmartRecruiters
    for (const company of SMARTRECRUITERS_COMPANIES) {
      console.log(`[SmartRecruiters] Fetching ${company}...`);
      const jobs = await fetchSmartRecruitersJobs(company);
      allJobs.push(...jobs);
    }

    console.log(`\nCollected ${allJobs.length} total raw postings.`);

    // Apply rule filter
    const filteredJobs = allJobs.filter(job => {
      if (!job.application_url || !job.title) return false;
      return shouldKeepJob({
        title: job.title,
        location: job.location,
        remote: job.is_remote
      });
    });

    // Deduplicate array
    const uniqueJobs = Array.from(
      new Map(filteredJobs.map(job => [`${job.source}:${job.external_id}`, job])).values()
    );

    console.log(`${uniqueJobs.length} jobs survived filtering.`);
    if (uniqueJobs.length === 0) return;

    // Upload to Supabase
    const chunks = chunkArray(uniqueJobs, CHUNK_SIZE);
    for (let i = 0; i < chunks.length; i++) {
      const { error } = await supabase
        .from("external_jobs")
        .upsert(chunks[i], { onConflict: "source,external_id" });

      if (error) {
        console.error(`❌ Upload Error chunk ${i + 1}:`, error);
      } else {
        console.log(`✅ Uploaded chunk ${i + 1}/${chunks.length}`);
      }
    }

    console.log("\n🏁 Multi-ATS Sync finished.");
  } catch (err) {
    console.error("Critical failure during sync:", err);
  }
}

run();

const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// ======================================
// SHARED KAZINEST FILTER
// ======================================

const {
  shouldKeepJob
} = require("./filters");

// ======================================
// SUPABASE CLIENT
// ======================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ======================================
// CONFIG & TARGET COMPANIES
// ======================================

const COMPANIES = [
  "TaptapSend",
  "maple",
  "codex",
  "capimoney",
  "M-KOPA",
  "luopay",
  "lemfi",
  "andela",
  "ramp",
  "openai",
  "vercel",
  "deel",
  "gitbook",
  "linear",
  "sentry",
  "resend",
  "supabase"
];

const CHUNK_SIZE = 50;
const RETRY_COUNT = 3;

// ======================================
// AFRICAN COUNTRY MAP
// ======================================
//
// Used only to populate the `country` field.
// Filtering itself is handled by filters.cjs.
//

const AFRICAN_COUNTRY_MAP = {
  algeria: "Algeria",
  algiers: "Algeria",

  angola: "Angola",
  luanda: "Angola",

  benin: "Benin",
  cotonou: "Benin",

  botswana: "Botswana",
  gaborone: "Botswana",

  burkina: "Burkina Faso",
  "burkina faso": "Burkina Faso",
  ouagadougou: "Burkina Faso",

  burundi: "Burundi",
  bujumbura: "Burundi",

  cameroon: "Cameroon",
  yaounde: "Cameroon",
  douala: "Cameroon",

  "cape verde": "Cape Verde",
  "cabo verde": "Cape Verde",

  "central african republic": "Central African Republic",

  chad: "Chad",
  ndjamena: "Chad",
  "n'djamena": "Chad",

  comoros: "Comoros",

  congo: "Republic of the Congo",

  "democratic republic of the congo":
    "Democratic Republic of the Congo",

  drc: "Democratic Republic of the Congo",

  djibouti: "Djibouti",

  "equatorial guinea": "Equatorial Guinea",

  eritrea: "Eritrea",
  asmara: "Eritrea",

  eswatini: "Eswatini",
  swaziland: "Eswatini",

  ethiopia: "Ethiopia",
  addis: "Ethiopia",
  "addis ababa": "Ethiopia",

  gabon: "Gabon",
  libreville: "Gabon",

  gambia: "Gambia",
  banjul: "Gambia",

  ghana: "Ghana",
  accra: "Ghana",
  kumasi: "Ghana",

  guinea: "Guinea",
  conakry: "Guinea",

  "guinea-bissau": "Guinea-Bissau",
  "guinea bissau": "Guinea-Bissau",

  "ivory coast": "Ivory Coast",
  "cote d'ivoire": "Ivory Coast",
  "côte d'ivoire": "Ivory Coast",
  abidjan: "Ivory Coast",

  kenya: "Kenya",
  nairobi: "Kenya",
  mombasa: "Kenya",
  kisumu: "Kenya",

  lesotho: "Lesotho",
  maseru: "Lesotho",

  liberia: "Liberia",
  monrovia: "Liberia",

  libya: "Libya",
  tripoli: "Libya",

  madagascar: "Madagascar",
  antananarivo: "Madagascar",

  malawi: "Malawi",
  lilongwe: "Malawi",
  blantyre: "Malawi",

  mali: "Mali",
  bamako: "Mali",

  mauritania: "Mauritania",
  nouakchott: "Mauritania",

  mauritius: "Mauritius",
  "port louis": "Mauritius",

  morocco: "Morocco",
  rabat: "Morocco",
  casablanca: "Morocco",
  marrakesh: "Morocco",
  marrakech: "Morocco",

  mozambique: "Mozambique",
  maputo: "Mozambique",

  namibia: "Namibia",
  windhoek: "Namibia",

  niger: "Niger",
  niamey: "Niger",

  nigeria: "Nigeria",
  lagos: "Nigeria",
  abuja: "Nigeria",
  ibadan: "Nigeria",

  rwanda: "Rwanda",
  kigali: "Rwanda",

  "sao tome": "São Tomé and Príncipe",
  "são tomé": "São Tomé and Príncipe",

  senegal: "Senegal",
  dakar: "Senegal",

  seychelles: "Seychelles",
  victoria: "Seychelles",

  "sierra leone": "Sierra Leone",
  freetown: "Sierra Leone",

  somalia: "Somalia",
  mogadishu: "Somalia",

  "south africa": "South Africa",
  "cape town": "South Africa",
  johannesburg: "South Africa",
  durban: "South Africa",
  pretoria: "South Africa",

  "south sudan": "South Sudan",
  juba: "South Sudan",

  sudan: "Sudan",
  khartoum: "Sudan",

  tanzania: "Tanzania",
  "dar es salaam": "Tanzania",
  dodoma: "Tanzania",
  arusha: "Tanzania",

  togo: "Togo",
  lome: "Togo",
  lomé: "Togo",

  tunisia: "Tunisia",
  tunis: "Tunisia",

  uganda: "Uganda",
  kampala: "Uganda",

  zambia: "Zambia",
  lusaka: "Zambia",

  zimbabwe: "Zimbabwe",
  harare: "Zimbabwe"
};

// ======================================
// COMMON SKILLS
// ======================================

const COMMON_SKILLS = [
  "JavaScript",
  "TypeScript",
  "Node.js",
  "React",
  "React Native",
  "Vue",
  "Angular",
  "Python",
  "Django",
  "Flask",
  "FastAPI",
  "Go",
  "Golang",
  "Java",
  "Spring",
  "Ruby",
  "Rails",
  "PHP",
  "Laravel",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Supabase",
  "GraphQL",
  "REST API",
  "AWS",
  "GCP",
  "Azure",
  "Docker",
  "Kubernetes",
  "CI/CD",
  "DevOps",
  "Terraform",
  "Figma",
  "UI/UX",
  "SEO",
  "Content Strategy",
  "Google Analytics",
  "Product Management",
  "Data Engineering",
  "Machine Learning"
];

// ======================================
// HELPERS
// ======================================

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function stripHtml(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSkills(text = "") {
  const lowercaseText = text.toLowerCase();

  return COMMON_SKILLS.filter((skill) => {
    const escaped = skill.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const pattern = new RegExp(`\\b${escaped}\\b`, "i");

    return pattern.test(lowercaseText);
  });
}

function extractRequirements(html = "") {
  if (!html) return [];

  const matches = html.match(
    /<li[^>]*>(.*?)<\/li>/gi
  );

  if (!matches) return [];

  return matches
    .map((li) => stripHtml(li))
    .filter(
      (req) =>
        req.length > 10 &&
        req.length < 300
    )
    .slice(0, 10);
}

// ======================================
// COUNTRY DETECTION
// ======================================
//
// This does NOT decide whether the job is eligible.
// Eligibility is handled by filters.cjs.
//

function detectCountry(text = "") {
  const lower = text.toLowerCase();

  for (const [keyword, country] of Object.entries(
    AFRICAN_COUNTRY_MAP
  )) {
    if (lower.includes(keyword)) {
      return country;
    }
  }

  return null;
}

// ======================================
// COMPENSATION
// ======================================

function formatCompensation(comp) {
  if (!comp) return null;

  const {
    salary,
    min,
    max,
    currency,
    period
  } = comp;

  if (salary) return salary;

  if (min || max) {
    const symbol = currency || "USD";

    const interval = period
      ? `/${period.toLowerCase()}`
      : "";

    if (min && max) {
      return `${symbol} ${min.toLocaleString()} - ${max.toLocaleString()}${interval}`;
    }

    if (min) {
      return `From ${symbol} ${min.toLocaleString()}${interval}`;
    }

    if (max) {
      return `Up to ${symbol} ${max.toLocaleString()}${interval}`;
    }
  }

  return null;
}

// ======================================
// BUILD LOCATION TEXT
// ======================================
//
// Ashby can have:
// - location
// - locationName
// - secondaryLocations
//
// Keep all of them.
//

function buildLocationText(job) {
  const secondaryLocations = (
    job.secondaryLocations || []
  )
    .map((location) =>
      [
        location?.location,
        location?.name
      ]
        .filter(Boolean)
        .join(" ")
    )
    .filter(Boolean);

  return [
    job.location,
    job.locationName,
    ...secondaryLocations
  ]
    .filter(Boolean)
    .join(" | ");
}

// ======================================
// AFRICA-ONLY FILTER
// ======================================
//
// IMPORTANT:
// Ashby previously had its own:
//
// isAfricaOrRemote()
//
// That function has been REMOVED.
//
// All geographic eligibility now goes through:
//
// filters.cjs
//
// This prevents Ashby from accepting:
// - Remote US
// - Remote UK
// - Remote Europe
// - Remote India
// - APAC
// - etc.
//
// We also inspect the description because Ashby
// may expose "Remote" as the location while putting
// the actual restriction inside the job description.
//

function passesAfricaFilter(job) {
  const locationText =
    buildLocationText(job);

  const descriptionText =
    stripHtml(
      job.descriptionPlain ||
      job.descriptionHtml ||
      ""
    );

  const title =
    job.title || "";

  const remote =
    job.workplaceType === "REMOTE" ||
    locationText
      .toLowerCase()
      .includes("remote");

  // IMPORTANT:
  // The shared filter sees location + relevant
  // geographic text from the description.
  //
  // This allows it to catch things such as:
  //
  // "Remote"
  // +
  // "Must be located in the United States"
  //
  // without Ashby having its own competing filter.

  const geographicText = [
    locationText,
    descriptionText
  ].join(" ");

  return shouldKeepJob({
    location: geographicText,
    remote,
    title
  });
}

// ======================================
// FETCH & RETRY API
// ======================================

async function fetchWithRetry(
  url,
  retries = RETRY_COUNT
) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

          Accept: "application/json"
        }
      });

      if (res.status === 404) {
        console.warn(
          `⚠️ Board not found (404): ${url}`
        );

        return null;
      }

      if (!res.ok) {
        throw new Error(
          `HTTP ${res.status}`
        );
      }

      return await res.json();

    } catch (err) {
      if (i === retries - 1) {
        console.error(
          `❌ Failed fetching ${url}: ${err.message}`
        );

        return null;
      }

      await sleep(
        (i + 1) * 1200
      );
    }
  }

  return null;
}

// ======================================
// FETCH COMPANY JOBS
// ======================================

async function fetchCompanyJobs(slug) {
  const url =
    `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`;

  const data =
    await fetchWithRetry(url);

  return data?.jobs || [];
}

// ======================================
// MAP JOB DATA
// ======================================

function mapJob(job, companySlug) {
  const rawDescHtml =
    job.descriptionHtml || "";

  const plainTextDesc =
    stripHtml(
      job.descriptionPlain ||
      rawDescHtml
    );

  const fullLocationText =
    buildLocationText(job);

  const country =
    detectCountry(
      `${fullLocationText} ${plainTextDesc}`
    );

  const isRemote =
    job.workplaceType === "REMOTE" ||
    fullLocationText
      .toLowerCase()
      .includes("remote");

  return {
    external_id: String(job.id),

    title: job.title,

    company:
      job.team ||
      companySlug,

    description:
      plainTextDesc,

    location:
      fullLocationText ||
      (isRemote
        ? "Remote"
        : "Unspecified"),

    job_type:
      job.employmentType ||
      null,

    salary:
      formatCompensation(
        job.compensation
      ),

    experience_level:
      job.level ||
      null,

    skills:
      extractSkills(
        plainTextDesc
      ),

    requirements:
      extractRequirements(
        rawDescHtml
      ),

    posted_date:
      job.publishedAt
        ? new Date(
            job.publishedAt
          ).toISOString()
        : new Date().toISOString(),

    application_url:
      job.applyUrl ||
      job.jobUrl,

    source:
      "Ashby",

    category:
      job.department ||
      job.team ||
      null,

    country,

    expiry_date:
      job.compensation
        ?.applicationDeadline ||
      null,

    raw_data:
      job,

    metadata:
      JSON.stringify({
        company_slug:
          companySlug,

        workplaceType:
          job.workplaceType,

        team:
          job.team,

        department:
          job.department,

        secondaryLocations:
          job.secondaryLocations ||
          [],

        isRemote
      }),

    scraped_at:
      new Date().toISOString(),

    url:
      job.jobUrl ||
      job.applyUrl,

    is_remote:
      isRemote,

    slug:
      String(job.id)
  };
}

// ======================================
// CHUNK HELPER
// ======================================

function chunkArray(
  arr,
  size
) {
  const chunks = [];

  for (
    let i = 0;
    i < arr.length;
    i += size
  ) {
    chunks.push(
      arr.slice(i, i + size)
    );
  }

  return chunks;
}

// ======================================
// MAIN EXECUTOR
// ======================================

async function run() {
  console.log(
    "📡 Starting Ashby Job Scraper..."
  );

  let allJobs = [];

  for (const company of COMPANIES) {
    console.log(
      `\n🔎 Scraping ${company}...`
    );

    const jobs =
      await fetchCompanyJobs(
        company
      );

    if (
      !jobs ||
      jobs.length === 0
    ) {
      console.log(
        `  └ No active jobs found for ${company}.`
      );

      continue;
    }

    console.log(
      `  └ Found ${jobs.length} total jobs.`
    );

    // ======================================
    // SHARED AFRICA-ONLY FILTER
    // ======================================

    const filtered = jobs
      .filter((job) => {
        // Must have an application URL.
        if (
          !job.applyUrl &&
          !job.jobUrl
        ) {
          return false;
        }

        return passesAfricaFilter(
          job
        );
      })
      .map((job) =>
        mapJob(
          job,
          company
        )
      );

    console.log(
      `  └ 🌍 Passed KaziNest Africa-only filter: ${filtered.length}`
    );

    console.log(
      `  └ ❌ Rejected: ${
        jobs.length -
        filtered.length
      }`
    );

    allJobs.push(
      ...filtered
    );

    // Friendly delay between target companies
    await sleep(400);
  }

  console.log(
    `\n📦 Total filtered jobs to upsert: ${allJobs.length}`
  );

  if (
    allJobs.length === 0
  ) {
    console.log(
      "🏁 No jobs to save. Exiting."
    );

    return;
  }

  // ======================================
  // UPSERT TO SUPABASE
  // ======================================

  const chunks =
    chunkArray(
      allJobs,
      CHUNK_SIZE
    );

  for (
    let i = 0;
    i < chunks.length;
    i++
  ) {
    const {
      error
    } = await supabase
      .from("external_jobs")
      .upsert(
        chunks[i],
        {
          onConflict:
            "source,external_id"
        }
      );

    if (error) {
      console.error(
        `❌ Chunk ${i + 1}/${chunks.length} failed: ${error.message}`
      );
    } else {
      console.log(
        `✅ Upserted chunk ${i + 1}/${chunks.length} (${chunks[i].length} jobs)`
      );
    }
  }

  console.log(
    "\n🏁 Ashby scraping completed successfully."
  );
}

// ======================================
// STANDALONE EXECUTION
// ======================================

if (
  require.main === module
) {
  run();
}

module.exports = run;
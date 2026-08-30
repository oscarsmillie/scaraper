const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");
const { XMLParser } = require("fast-xml-parser");
const { shouldKeepJob } = require("./filters.cjs");
require("dotenv").config();

// ============================================================
// SUPABASE
// ============================================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// CONFIG
// ============================================================

// We Work Remotely official RSS feeds.
//
// IMPORTANT:
// The external_id remains EXACTLY the same strategy as your
// previous scraper:
//
//   external_id = item.link || item.guid
//
// This prevents existing WWR jobs from being duplicated.
//
// We simply collect jobs from multiple WWR feeds now.

const WWR_FEEDS = [
  {
    name: "All Jobs",
    url: "https://weworkremotely.com/remote-jobs.rss",
  },

  {
    name: "Customer Support",
    url: "https://weworkremotely.com/categories/remote-customer-support-jobs.rss",
  },

  {
    name: "Product",
    url: "https://weworkremotely.com/categories/remote-product-jobs.rss",
  },

  {
    name: "Full-Stack Programming",
    url: "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
  },

  {
    name: "Back-End Programming",
    url: "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
  },

  {
    name: "Front-End Programming",
    url: "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
  },

  {
    name: "Programming",
    url: "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  },

  {
    name: "Sales & Marketing",
    url: "https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss",
  },

  {
    name: "Management & Finance",
    url: "https://weworkremotely.com/categories/remote-management-and-finance-jobs.rss",
  },

  {
    name: "Design",
    url: "https://weworkremotely.com/categories/remote-design-jobs.rss",
  },

  {
    name: "DevOps & Sysadmin",
    url: "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
  },

  {
    name: "All Other",
    url: "https://weworkremotely.com/categories/all-other-remote-jobs.rss",
  },
];

// Optional custom feed.
//
// If WWR_RSS_URL is already in your .env, we preserve it.
// It is ADDED to the official feeds instead of replacing them.

if (process.env.WWR_RSS_URL) {
  const customUrl = process.env.WWR_RSS_URL.trim();

  if (
    customUrl &&
    !WWR_FEEDS.some((feed) => feed.url === customUrl)
  ) {
    WWR_FEEDS.push({
      name: "Custom WWR Feed",
      url: customUrl,
    });
  }
}

const CHUNK_SIZE = 50;

const USER_AGENT =
  process.env.WWR_USER_AGENT ||
  "KaziNest Job Aggregator/1.0";

// ============================================================
// XML PARSER
// ============================================================

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: true,
  parseAttributeValue: false,
  cdataPropName: "__cdata",
});

// ============================================================
// HELPERS
// ============================================================

function asString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (typeof value === "object") {
    if (value.__cdata !== undefined) {
      return asString(value.__cdata);
    }

    if (value["#text"] !== undefined) {
      return asString(value["#text"]);
    }

    if (value._ !== undefined) {
      return asString(value._);
    }

    if (value["@_href"] !== undefined) {
      return asString(value["@_href"]);
    }

    return "";
  }

  return String(value).trim();
}

// ============================================================
// GET LINK
// ============================================================
//
// IMPORTANT:
//
// This preserves the original scraper's behavior:
//
// const linkUrl = item.link || item.guid;
//
// Therefore external_id continues to be based on the WWR URL.
// ============================================================

function getLink(item) {
  const link = item?.link;

  if (typeof link === "string") {
    return link.trim();
  }

  if (link && typeof link === "object") {
    return asString(
      link["@_href"] ||
        link.href ||
        link.__cdata ||
        link["#text"] ||
        link._
    );
  }

  return "";
}

// ============================================================
// GET GUID
// ============================================================

function getGuid(item) {
  const guid = item?.guid;

  if (typeof guid === "string") {
    return guid.trim();
  }

  if (guid && typeof guid === "object") {
    return asString(
      guid.__cdata ||
        guid["#text"] ||
        guid._ ||
        guid["@_href"]
    );
  }

  return "";
}

// ============================================================
// EXISTING EXTERNAL ID STRATEGY
// ============================================================
//
// DO NOT CHANGE THIS.
//
// Old code:
//
// const linkUrl = item.link || item.guid;
//
// external_id: String(linkUrl)
//
// We maintain exactly that logic.
// ============================================================

function getExternalId(item) {
  const linkUrl = getLink(item);

  if (linkUrl) {
    return linkUrl;
  }

  return getGuid(item);
}

// ============================================================
// HTML CLEANER
// ============================================================

function stripHtml(html = "") {
  let text = asString(html);

  if (!text) {
    return "";
  }

  return text
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(
      /<\/?(p|div|section|article|li|ul|ol|br|h1|h2|h3|h4|h5|h6)[^>]*>/gi,
      "\n"
    )
    .replace(
      /<li[^>]*>/gi,
      "• "
    )
    .replace(
      /<[^>]+>/g,
      " "
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;/gi,
      "'"
    )
    .replace(
      /&apos;/gi,
      "'"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /&#(\d+);/g,
      (_, code) => {
        try {
          return String.fromCharCode(
            Number(code)
          );
        } catch {
          return " ";
        }
      }
    )
    .replace(
      /[ \t]+/g,
      " "
    )
    .replace(
      /\n[ \t]+/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}

// ============================================================
// ARRAYS
// ============================================================

function normalizeArray(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map(asString)
      .filter(Boolean);
  }

  const stringValue = asString(value);

  return stringValue
    ? [stringValue]
    : [];
}

// ============================================================
// DATE PARSER
// ============================================================

function parseDate(value) {
  const text = asString(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

// ============================================================
// CHUNK ARRAY
// ============================================================

function chunkArray(arr, size) {
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

// ============================================================
// FETCH ONE WWR FEED
// ============================================================

async function fetchFeed(feed) {
  console.log("");
  console.log(`📡 Fetching: ${feed.name}`);
  console.log(`   ${feed.url}`);

  try {
    const response = await fetch(
      feed.url,
      {
        method: "GET",

        headers: {
          Accept:
            "application/rss+xml, application/xml, text/xml, */*",

          "User-Agent": USER_AGENT,

          "Cache-Control":
            "no-cache",
        },

        timeout: 30000,
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText}`
      );
    }

    const xmlText =
      await response.text();

    if (
      !xmlText ||
      !xmlText.trim()
    ) {
      throw new Error(
        "Empty RSS response"
      );
    }

    const parsed =
      xmlParser.parse(xmlText);

    // Standard RSS
    let items =
      parsed?.rss?.channel?.item ||
      [];

    // Safety for Atom-style feeds
    if (
      !items ||
      (Array.isArray(items) &&
        items.length === 0)
    ) {
      items =
        parsed?.feed?.entry ||
        [];
    }

    if (!Array.isArray(items)) {
      items = items
        ? [items]
        : [];
    }

    console.log(
      `   ✅ Found ${items.length} jobs`
    );

    return {
      feed,
      items,
      error: null,
    };
  } catch (error) {
    console.error(
      `   ❌ ${feed.name} failed:`,
      error?.message || error
    );

    return {
      feed,
      items: [],
      error,
    };
  }
}

// ============================================================
// MAP JOB
// ============================================================

function mapJob(
  item,
  feedName
) {
  // ----------------------------------------------------------
  // KEEP ORIGINAL LINK/GUID LOGIC
  // ----------------------------------------------------------

  const linkUrl =
    getLink(item);

  const guid =
    getGuid(item);

  const externalId =
    getExternalId(item);

  // ----------------------------------------------------------
  // TITLE / COMPANY
  // ----------------------------------------------------------

  const rawTitle =
    asString(item.title);

  let company =
    "Unknown";

  let title =
    rawTitle;

  // WWR normally uses:
  //
  // Company Name: Job Title
  //
  // Keep the original parsing behavior.

  if (
    rawTitle.includes(":")
  ) {
    const parts =
      rawTitle.split(":");

    company =
      parts[0].trim();

    title =
      parts
        .slice(1)
        .join(":")
        .trim();
  }

  // If RSS exposes company separately,
  // use it.

  const explicitCompany =
    asString(item.company) ||
    asString(item["dc:creator"]);

  if (
    explicitCompany
  ) {
    company =
      explicitCompany;
  }

  // ----------------------------------------------------------
  // DESCRIPTION
  // ----------------------------------------------------------

  const description =
    stripHtml(
      item.description ||
        item.summary ||
        item.content ||
        ""
    );

  // ----------------------------------------------------------
  // LOCATION
  // ----------------------------------------------------------

  const location =
    asString(item.region) ||
    asString(item.location) ||
    "Remote";

  // ----------------------------------------------------------
  // COUNTRY
  // ----------------------------------------------------------

  const country =
    asString(item.country) ||
    null;

  // ----------------------------------------------------------
  // CATEGORY
  // ----------------------------------------------------------

  const category =
    asString(item.category) ||
    feedName ||
    null;

  // ----------------------------------------------------------
  // SKILLS
  // ----------------------------------------------------------

  const skills =
    normalizeArray(
      item.skills ||
        item.skill
    );

  // ----------------------------------------------------------
  // METADATA
  // ----------------------------------------------------------

  const metadata =
    JSON.stringify({
      region:
        asString(item.region) ||
        null,

      country,

      state:
        asString(item.state) ||
        null,

      feed:
        feedName,

      guid:
        guid || null,
    });

  // ----------------------------------------------------------
  // RETURN
  // ----------------------------------------------------------

  return {
    // SAME external_id strategy
    // as the old scraper
    external_id:
      String(externalId),

    title:
      title ||
      "Untitled Job",

    company,

    description,

    location,

    job_type:
      asString(item.type) ||
      asString(item.job_type) ||
      null,

    salary:
      null,

    experience_level:
      null,

    skills,

    requirements:
      [],

    posted_date:
      parseDate(
        item.pubDate ||
          item.published ||
          item["dc:date"]
      ),

    expiry_date:
      parseDate(
        item.expires_at ||
          item.expiry_date
      ),

    application_url:
      linkUrl ||
      guid,

    source:
      "WeWorkRemotely",

    category,

    raw_data:
      item,

    country,

    metadata,

    scraped_at:
      new Date().toISOString(),

    url:
      linkUrl ||
      guid,

    is_remote:
      true,

    // Keep slug based on the same
    // external ID.
    slug:
      String(externalId),
  };
}

// ============================================================
// MAIN
// ============================================================

async function run() {
  console.log("");
  console.log(
    "=================================================="
  );
  console.log(
    "🚀 KaziNest - We Work Remotely Scraper"
  );
  console.log(
    "=================================================="
  );

  console.log(
    `📚 Feeds configured: ${WWR_FEEDS.length}`
  );

  try {
    // ========================================================
    // 1. FETCH ALL FEEDS
    // ========================================================

    const results =
      await Promise.all(
        WWR_FEEDS.map(
          fetchFeed
        )
      );

    const successfulFeeds =
      results.filter(
        (result) =>
          !result.error
      );

    const failedFeeds =
      results.filter(
        (result) =>
          result.error
      );

    // ========================================================
    // FEED SUMMARY
    // ========================================================

    console.log("");
    console.log(
      "=================================================="
    );
    console.log(
      "📊 FEED SUMMARY"
    );
    console.log(
      "=================================================="
    );

    for (
      const result of results
    ) {
      console.log(
        `${result.error ? "❌" : "✅"} ${
          result.feed.name
        }: ${result.items.length} jobs`
      );
    }

    console.log("");
    console.log(
      `Successful feeds: ${successfulFeeds.length}/${WWR_FEEDS.length}`
    );

    console.log(
      `Failed feeds: ${failedFeeds.length}`
    );

    // ========================================================
    // 2. COMBINE ALL RSS ITEMS
    // ========================================================

    const allItems = [];

    for (
      const result of successfulFeeds
    ) {
      for (
        const item of result.items
      ) {
        allItems.push({
          item,
          feedName:
            result.feed.name,
        });
      }
    }

    console.log("");
    console.log(
      `📦 Total raw RSS jobs: ${allItems.length}`
    );

    // ========================================================
    // 3. DEDUPLICATE
    // ========================================================
    //
    // IMPORTANT:
    //
    // Deduplication uses the SAME identity strategy:
    //
    // item.link || item.guid
    //
    // This means the same WWR job appearing in:
    //
    // All Jobs
    // Programming
    // Full Stack
    //
    // becomes ONE job.
    //
    // ========================================================

    const uniqueByExternalId =
      new Map();

    for (
      const record of allItems
    ) {
      const externalId =
        getExternalId(
          record.item
        );

      if (!externalId) {
        continue;
      }

      if (
        !uniqueByExternalId.has(
          externalId
        )
      ) {
        uniqueByExternalId.set(
          externalId,
          record
        );
      }
    }

    const uniqueRecords =
      Array.from(
        uniqueByExternalId.values()
      );

    console.log(
      `🔑 Unique jobs after deduplication: ${uniqueRecords.length}`
    );

    // ========================================================
    // 4. MAP
    // ========================================================

    const mappedJobs =
      uniqueRecords
        .map(
          (record) =>
            mapJob(
              record.item,
              record.feedName
            )
        )
        .filter(
          (job) =>
            job.external_id &&
            job.title &&
            job.application_url
        );

    console.log(
      `📝 Successfully mapped: ${mappedJobs.length}`
    );

    // ========================================================
    // 5. KAZINEST FILTER
    // ========================================================

    const filteredJobs =
      [];

    let rejectedCount =
      0;

    for (
      const job of mappedJobs
    ) {
      try {
        const keep =
          shouldKeepJob({
            title:
              job.title,

            location:
              job.location ||
              "Remote",

            remote:
              true,

            description:
              job.description ||
              "",

            company:
              job.company ||
              "",

            category:
              job.category ||
              "",
          });

        if (keep) {
          filteredJobs.push(
            job
          );
        } else {
          rejectedCount++;
        }
      } catch (error) {
        console.error(
          `⚠️ Filter error for "${job.title}":`,
          error?.message ||
            error
        );
      }
    }

    console.log("");
    console.log(
      `🎯 Jobs passed KaziNest filter: ${filteredJobs.length}`
    );

    console.log(
      `🚫 Jobs rejected by filter: ${rejectedCount}`
    );

    // ========================================================
    // 6. FINAL DEDUPLICATION
    // ========================================================

    const uniqueJobs =
      Array.from(
        new Map(
          filteredJobs.map(
            (job) => [
              job.external_id,
              job,
            ]
          )
        ).values()
      );

    console.log(
      `💎 Final unique jobs: ${uniqueJobs.length}`
    );

    // ========================================================
    // 7. NOTHING TO SAVE
    // ========================================================

    if (
      uniqueJobs.length === 0
    ) {
      console.log("");
      console.log(
        "⚠️ No jobs passed the filter."
      );

      console.log("");
      console.log(
        "Diagnostics:"
      );

      console.log(
        `Raw RSS jobs: ${allItems.length}`
      );

      console.log(
        `Unique jobs: ${uniqueRecords.length}`
      );

      console.log(
        `Mapped jobs: ${mappedJobs.length}`
      );

      console.log(
        `Rejected by filter: ${rejectedCount}`
      );

      console.log("");
      console.log(
        "The RSS feeds are being reached."
      );

      console.log(
        "If Raw RSS jobs > 0 but Passed filter = 0,"
      );

      console.log(
        "the restriction is in filters.cjs."
      );

      return;
    }

    // ========================================================
    // 8. SUPABASE UPSERT
    // ========================================================

    const chunks =
      chunkArray(
        uniqueJobs,
        CHUNK_SIZE
      );

    console.log("");
    console.log(
      `💾 Saving ${uniqueJobs.length} jobs in ${chunks.length} chunks...`
    );

    let savedCount =
      0;

    let failedCount =
      0;

    for (
      let i = 0;
      i < chunks.length;
      i++
    ) {
      const chunk =
        chunks[i];

      const {
        error,
      } = await supabase
        .from(
          "external_jobs"
        )
        .upsert(
          chunk,
          {
            // SAME database conflict
            // rule as your existing scraper.
            onConflict:
              "source,external_id",
          }
        );

      if (error) {
        failedCount +=
          chunk.length;

        console.error("");
        console.error(
          `❌ Chunk ${i + 1}/${chunks.length} failed`
        );

        console.error(
          error
        );
      } else {
        savedCount +=
          chunk.length;

        console.log(
          `✅ Chunk ${i + 1}/${chunks.length} saved (${chunk.length} jobs)`
        );
      }
    }

    // ========================================================
    // FINAL REPORT
    // ========================================================

    console.log("");
    console.log(
      "=================================================="
    );
    console.log(
      "🏁 WWR SCRAPER COMPLETE"
    );
    console.log(
      "=================================================="
    );

    console.log(
      `Feeds attempted:    ${WWR_FEEDS.length}`
    );

    console.log(
      `Feeds successful:   ${successfulFeeds.length}`
    );

    console.log(
      `Feeds failed:       ${failedFeeds.length}`
    );

    console.log(
      `Raw RSS jobs:       ${allItems.length}`
    );

    console.log(
      `Unique jobs:        ${uniqueRecords.length}`
    );

    console.log(
      `Mapped jobs:        ${mappedJobs.length}`
    );

    console.log(
      `Passed filter:      ${filteredJobs.length}`
    );

    console.log(
      `Final unique jobs:  ${uniqueJobs.length}`
    );

    console.log(
      `Saved successfully: ${savedCount}`
    );

    console.log(
      `Failed to save:     ${failedCount}`
    );

    console.log(
      "=================================================="
    );
    console.log("");
  } catch (error) {
    console.error("");
    console.error(
      "❌ WWR scraper crashed:"
    );

    console.error(
      error?.stack ||
        error?.message ||
        error
    );

    throw error;
  }
}

// ============================================================
// EXECUTION
// ============================================================

if (
  require.main === module
) {
  run()
    .then(() => {
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = run;
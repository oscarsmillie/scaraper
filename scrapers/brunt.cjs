const fetch = require("node-fetch");
const cheerio = require("cheerio");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SEARCH_URL = "https://www.bruntworkcareers.co/search?priority=High";

function clean(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Extract clean HTML while preserving structure (<p>, <ul>, <li>, <br>, <strong>)
 * and stripping unwanted inline styling / script tags.
 */
function cleanDescriptionHtml($, selector) {
  const $el = $(selector);

  if (!$el.length) return "";

  // 1. Remove unwanted tags like scripts, styles, or hidden inputs
  $el.find("script, style, input, button, iframe, svg").remove();

  // 2. Remove inline attributes (style, class, id) that mess up frontend styling or dark mode
  $el.find("*").each((_, elem) => {
    $(elem).removeAttr("style");
    $(elem).removeAttr("class");
    $(elem).removeAttr("id");
  });

  // 3. Get the HTML content
  let rawHtml = $el.html() || "";

  // 4. Fallback: If no HTML tags were present, convert line breaks into <p> tags
  if (!/<(p|ul|ol|li|br|div)\b[^>]*>/i.test(rawHtml)) {
    const plainText = $el.text().trim();
    return plainText
      .split(/\n{2,}/)
      .map(p => `<p>${clean(p)}</p>`)
      .join("");
  }

  // Trim extra spaces between tags
  return rawHtml.replace(/>\s+</g, "><").trim();
}

async function getJobLinks() {
  const res = await fetch(SEARCH_URL, {
    headers: {
      "user-agent": "Mozilla/5.0"
    }
  });

  const html = await res.text();

  const ids = [
    ...new Set(
      [...html.matchAll(/\/jobs\/(\d+)/g)]
        .map(m => m[1])
    )
  ];

  return ids.map(id => ({
    id,
    url: `https://www.bruntworkcareers.co/jobs/${id}`
  }));
}

async function getJobDetails(job) {
  const res = await fetch(job.url, {
    headers: {
      "user-agent": "Mozilla/5.0"
    }
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  const title =
    clean($("h1").first().text()) ||
    clean($("p.text-4xl").first().text());

  // ✅ Extract structured HTML instead of plain squashed text
  const description =
    cleanDescriptionHtml($, ".job-description") ||
    cleanDescriptionHtml($, "main") ||
    cleanDescriptionHtml($, "article");

  const applyPath = $("a[href*='/apply']")
    .first()
    .attr("href");

  return {
    external_id: job.id,
    source: "BruntWork",
    title,
    company: "BruntWork",
    description, // Now stores clean HTML with paragraphs, bullet points, and headers!
    location: "Remote",
    job_type: "Contract",
    application_url: applyPath
      ? `https://www.bruntworkcareers.co${applyPath}`
      : job.url,
    url: job.url,
    raw_data: {
      html
    },
    scraped_at: new Date().toISOString(),
    is_remote: true
  };
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function scrapeBruntwork() {
  console.log("Fetching BruntWork jobs...");

  const jobs = await getJobLinks();
  console.log(`Found ${jobs.length} jobs`);

  const normalized = [];

  for (const job of jobs) {
    try {
      const details = await getJobDetails(job);
      normalized.push(details);

      console.log(`✓ ${details.title}`);

      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`Failed ${job.id}`, err.message);
    }
  }

  const chunks = chunkArray(normalized, 50);

  for (let i = 0; i < chunks.length; i++) {
    const { error } = await supabase
      .from("external_jobs")
      .upsert(chunks[i], {
        onConflict: "external_id"
      });

    if (error) {
      console.error(`Chunk ${i + 1} failed`, error.message);
    } else {
      console.log(`Inserted chunk ${i + 1}/${chunks.length}`);
    }
  }

  console.log("Done");
}

if (require.main === module) {
  scrapeBruntwork();
}

module.exports = scrapeBruntwork;
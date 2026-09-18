// index.cjs
const fs = require("fs");
const path = require("path");

const scrapersDir = path.resolve("./scrapers");

// Files that are NOT standalone scrapers
const EXCLUDED_FILES = new Set([
  "index.cjs",
  "filters.cjs",
]);

/**
 * Runs all scrapers in the ./scrapers folder, or a specific one if provided
 * @param {string|null} specificScraper Name of the scraper to run
 */
const runScrapers = async (specificScraper = null) => {
  const allJobs = [];

  // Get all .cjs scraper files
  let files = fs
    .readdirSync(scrapersDir)
    .filter(file => file.endsWith(".cjs"))
    .filter(file => !EXCLUDED_FILES.has(file.toLowerCase()));

  if (specificScraper) {
    files = files.filter(f =>
      f.toLowerCase().includes(specificScraper.toLowerCase())
    );

    if (files.length === 0) {
      console.error(`Scraper "${specificScraper}" not found.`);
      return allJobs;
    }
  }

  console.log(`📋 Scrapers to run: ${files.length}`);
  console.log(`📂 ${files.join(", ")}`);

  for (const file of files) {
    const filePath = path.join(scrapersDir, file);

    console.log(`\n🚀 Running scraper: ${file}`);

    try {
      const scraperModule = require(filePath);

      let jobs = [];

      if (typeof scraperModule === "function") {
        jobs = await scraperModule();

      } else if (scraperModule.scrapeRemoteOK) {
        jobs = await scraperModule.scrapeRemoteOK();

      } else if (scraperModule.scrapeRemoteAfrica) {
        jobs = await scraperModule.scrapeRemoteAfrica();

      } else {
        console.warn(`⚠️ No recognized export in ${file}. Skipping.`);
        continue;
      }

      if (jobs?.length) {
        allJobs.push(...jobs);
      }

      console.log(
        `✅ Finished scraper: ${file}, jobs found: ${jobs?.length || 0}`
      );

    } catch (err) {
      console.error(`❌ Error running scraper ${file}:`, err);
    }
  }

  console.log("\n🏁 All scrapers finished.");
  console.log("Total jobs scraped from all scrapers:", allJobs.length);

  return allJobs;
};

const scraperName = process.argv[2];

(async () => {
  const jobs = await runScrapers(scraperName);

  if (jobs.length) {
    const outputPath = path.resolve("./all_jobs.json");

    fs.writeFileSync(
      outputPath,
      JSON.stringify(jobs, null, 2),
      "utf-8"
    );

    console.log(`\n💾 All jobs saved to ${outputPath}`);
  }
})();
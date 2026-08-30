// index.cjs
const fs = require("fs");
const path = require("path");

const scrapersDir = path.resolve("./scrapers");

/**
 * Runs all scrapers in the ./scrapers folder, or a specific one if provided
 * @param {string|null} specificScraper Name of the scraper to run
 */
const runScrapers = async (specificScraper = null) => {
  const allJobs = [];

  // Get all .cjs scraper files
  let files = fs.readdirSync(scrapersDir).filter(file => file.endsWith(".cjs"));

  if (specificScraper) {
    // Only run the specific scraper
    files = files.filter(f => f.toLowerCase().includes(specificScraper.toLowerCase()));
    if (files.length === 0) {
      console.error(`Scraper "${specificScraper}" not found.`);
      return allJobs;
    }
  }

  for (const file of files) {
    const filePath = path.join(scrapersDir, file);
    console.log(`\n🚀 Running scraper: ${file}`);

    try {
      const scraperModule = require(filePath);

      // Determine which function to call
      let jobs = [];
      if (typeof scraperModule === "function") {
        // module.exports = async function() { ... }
        jobs = await scraperModule();
      } else if (scraperModule.scrapeRemoteOK) {
        // module.exports = { scrapeRemoteOK }
        jobs = await scraperModule.scrapeRemoteOK();
      } else if (scraperModule.scrapeRemoteAfrica) {
        // module.exports = { scrapeRemoteAfrica }
        jobs = await scraperModule.scrapeRemoteAfrica();
      } else {
        console.warn(`⚠️ No recognized export in ${file}. Skipping.`);
      }

      if (jobs?.length) allJobs.push(...jobs);
      console.log(`✅ Finished scraper: ${file}, jobs found: ${jobs?.length || 0}`);
    } catch (err) {
      console.error(`❌ Error running scraper ${file}:`, err);
    }
  }

  console.log("\n🏁 All scrapers finished.");
  console.log("Total jobs scraped from all scrapers:", allJobs.length);
  return allJobs;
};

// Optional: get a specific scraper name from command line arguments
const scraperName = process.argv[2];

(async () => {
  const jobs = await runScrapers(scraperName);
  // Optional: save all jobs to a JSON file
  if (jobs.length) {
    const outputPath = path.resolve("./all_jobs.json");
    fs.writeFileSync(outputPath, JSON.stringify(jobs, null, 2), "utf-8");
    console.log(`\n💾 All jobs saved to ${outputPath}`);
  }
})();

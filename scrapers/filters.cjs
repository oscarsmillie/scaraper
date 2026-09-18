
// ======================================
// SHARED FILTERS — KAZINEST
// RUTHLESS AFRICA-ELIGIBILITY FILTER
// ======================================
//
// RULE:
// A job is kept only if Africans can genuinely apply.
//
// KEEP:
// - Explicit African country
// - Africa / African
// - Sub-Saharan Africa / SSA
// - EMEA (because Africa is included)
// - Worldwide / global / work from anywhere
// - Plain "Remote" ONLY when there is no conflicting
//   geographic evidence elsewhere in the location
//
// REJECT:
// - US / UK / Canada / Europe / EU / Asia / APAC etc.
// - Any non-African country
// - Any non-African city
// - Any non-African work authorization restriction
// - Mixed locations containing blocked regions
// - Empty / unknown locations
// - Generic talent pools / applications
//
// ======================================


// ======================================
// ACCEPTABLE GLOBAL / AFRICA KEYWORDS
// ======================================

const ALLOWED_LOCATION_KEYWORDS = [

  // Africa
  "africa",
  "african",
  "sub-saharan africa",
  "sub saharan africa",
  "sub-saharan",
  "ssa",

  // Regional grouping that includes Africa
  "emea",
  "europe middle east and africa",
  "europe, middle east and africa",
  "europe middle east africa",

  // Truly global eligibility
  "worldwide",
  "world wide",
  "global",
  "globally",
  "work from anywhere",
  "work-from-anywhere",
  "anywhere in the world",
  "anywhere worldwide",
  "worldwide remote",
  "global remote",
  "remote worldwide",

  // Generic remote — handled separately below.
  // DO NOT put "remote" here.
];


// ======================================
// AFRICAN COUNTRIES
// ======================================

const AFRICAN_COUNTRIES = [

  "algeria",
  "angola",
  "benin",
  "botswana",
  "burkina faso",
  "burundi",
  "cameroon",
  "cape verde",
  "cabo verde",
  "central african republic",
  "chad",
  "comoros",
  "congo",
  "republic of the congo",
  "democratic republic of the congo",
  "democratic republic of congo",
  "drc",
  "djibouti",
  "egypt",
  "equatorial guinea",
  "eritrea",
  "eswatini",
  "swaziland",
  "ethiopia",
  "gabon",
  "gambia",
  "ghana",
  "guinea",
  "guinea-bissau",
  "guinea bissau",
  "ivory coast",
  "côte d'ivoire",
  "cote d'ivoire",
  "kenya",
  "lesotho",
  "liberia",
  "libya",
  "madagascar",
  "malawi",
  "mali",
  "mauritania",
  "mauritius",
  "morocco",
  "mozambique",
  "namibia",
  "niger",
  "nigeria",
  "rwanda",
  "sao tome and principe",
  "são tomé and príncipe",
  "senegal",
  "seychelles",
  "sierra leone",
  "somalia",
  "south africa",
  "south sudan",
  "sudan",
  "tanzania",
  "togo",
  "tunisia",
  "uganda",
  "zambia",
  "zimbabwe"

];


// ======================================
// BLOCKED REMOTE / REGIONAL RESTRICTIONS
// ======================================
//
// These are checked BEFORE "remote", "global", etc.
// This prevents:
//   Remote - US
//   Remote UK
//   Remote - Europe
//   Worldwide - US residents only
// etc.
// from slipping through.
//

const BLOCKED_REMOTE_REGIONS = [

  // --------------------------------------
  // UNITED STATES
  // --------------------------------------

  "us only",
  "usa only",
  "u.s. only",
  "u.s only",
  "united states only",

  "us based only",
  "usa based only",
  "u.s. based only",
  "united states based only",

  "based in the us",
  "based in usa",
  "based in the usa",
  "based in united states",

  "us residents only",
  "usa residents only",
  "u.s. residents only",
  "united states residents only",

  "us work authorization required",
  "usa work authorization required",
  "u.s. work authorization required",
  "united states work authorization required",

  "must be based in the us",
  "must be based in usa",
  "must be located in the us",
  "must be located in usa",

  "authorized to work in the us",
  "authorized to work in usa",
  "legally authorized to work in the us",

  "us work permit",
  "usa work permit",

  // --------------------------------------
  // CANADA
  // --------------------------------------

  "canada only",
  "canadian residents only",
  "based in canada",
  "canada based",
  "canada based only",
  "canada work authorization required",
  "authorized to work in canada",
  "canada work permit",

  // --------------------------------------
  // UNITED KINGDOM
  // --------------------------------------

  "uk only",
  "u.k. only",
  "united kingdom only",
  "uk residents only",
  "british residents only",

  "based in the uk",
  "based in uk",
  "uk based",
  "uk based only",

  "must be based in the uk",
  "must be located in the uk",

  "uk work authorization required",
  "authorized to work in the uk",
  "right to work in the uk",
  "uk work permit",

  // --------------------------------------
  // EUROPE / EU
  // --------------------------------------

  "europe only",
  "eu only",
  "european union only",
  "eu residents only",
  "european residents only",

  "based in europe",
  "europe based",
  "europe based only",

  "eu work authorization required",
  "europe work authorization required",
  "authorized to work in the eu",
  "right to work in the eu",

  // --------------------------------------
  // LATIN AMERICA
  // --------------------------------------

  "latam only",
  "latin america only",
  "latin american residents only",
  "based in latin america",

  // --------------------------------------
  // ASIA / APAC
  // --------------------------------------

  "asia only",
  "apac only",
  "asia pacific only",
  "apac residents only",
  "based in asia",
  "based in apac",

  "india only",
  "indian residents only",
  "based in india",

  "singapore only",
  "singapore residents only",

  "philippines only",
  "filipino residents only",

  "japan only",
  "japanese residents only",

  "china only",
  "chinese residents only",

  // --------------------------------------
  // OCEANIA
  // --------------------------------------

  "australia only",
  "australian residents only",
  "based in australia",

  "new zealand only",
  "new zealand residents only",
  "based in new zealand",

  // --------------------------------------
  // OTHER WORK-AUTHORIZATION RESTRICTIONS
  // --------------------------------------

  "work authorization required",
  "work permit required",
  "right to work required"

];


// ======================================
// BLOCKED LOCATIONS
// ======================================
//
// These catch jobs where the location itself reveals
// a non-African geographic restriction.
//
// IMPORTANT:
// "remote" is intentionally NOT allowed here.
// It is handled by shouldKeepJob().
//

const BLOCKED_LOCATION_KEYWORDS = [

  // ======================================
  // UNITED STATES
  // ======================================

  "united states",
  "usa",
  "u.s.",
  "us-remote",
  "us remote",
  "remote us",
  "remote, us",
  "remote, united states",
  "remote - us",
  "remote - usa",
  "remote - united states",

  "new york",
  "nyc",
  "san francisco",
  "los angeles",
  "seattle",
  "boston",
  "chicago",
  "austin",
  "miami",
  "denver",
  "atlanta",
  "washington dc",
  "washington, dc",
  "dallas",
  "houston",
  "phoenix",
  "philadelphia",
  "san diego",
  "portland",
  "minneapolis",
  "detroit",

  // ======================================
  // CANADA
  // ======================================

  "canada",
  "remote, canada",
  "remote - canada",
  "remote canada",

  "toronto",
  "vancouver",
  "montreal",
  "ottawa",
  "calgary",
  "edmonton",
  "winnipeg",

  // ======================================
  // UNITED KINGDOM
  // ======================================

  "united kingdom",
  "uk",
  "u.k.",
  "england",
  "london",
  "manchester",
  "birmingham",
  "scotland",
  "wales",
  "edinburgh",
  "glasgow",
  "bristol",
  "leeds",
  "liverpool",
  "cambridge",
  "oxford",

  // ======================================
  // GERMANY
  // ======================================

  "germany",
  "deutschland",
  "german",
  "berlin",
  "hamburg",
  "munich",
  "münchen",
  "frankfurt",
  "frankfurt am main",
  "cologne",
  "köln",
  "düsseldorf",
  "stuttgart",
  "leipzig",
  "mannheim",
  "bielefeld",
  "münster",
  "aachen",
  "freiburg",
  "darmstadt",
  "bad homburg",
  "homburg",
  "konstanz",
  "heilbronn",
  "heidelberg",
  "karlsruhe",
  "augsburg",
  "bonn",
  "bremen",
  "dresden",
  "essen",
  "hannover",
  "hanover",
  "dortmund",
  "duisburg",
  "bochum",
  "wiesbaden",
  "mainz",
  "kassel",
  "regensburg",
  "rostock",
  "saarbrücken",
  "potsdam",
  "erfurt",
  "lübeck",
  "kiel",
  "magdeburg",
  "chemnitz",
  "wuppertal",
  "mönchengladbach",
  "braunschweig",
  "ingolstadt",
  "ulm",
  "würzburg",
  "jena",
  "osnabrück",
  "oldenburg",

  // ======================================
  // FRANCE
  // ======================================

  "france",
  "french residents",
  "paris",
  "lyon",
  "marseille",
  "toulouse",
  "bordeaux",
  "nice",

  // ======================================
  // NETHERLANDS
  // ======================================

  "netherlands",
  "amsterdam",
  "rotterdam",
  "the hague",
  "utrecht",

  // ======================================
  // SPAIN
  // ======================================

  "spain",
  "madrid",
  "barcelona",
  "valencia",
  "seville",

  // ======================================
  // ITALY
  // ======================================

  "italy",
  "rome",
  "milan",
  "turin",
  "naples",

  // ======================================
  // PORTUGAL
  // ======================================

  "portugal",
  "lisbon",
  "porto",

  // ======================================
  // BELGIUM
  // ======================================

  "belgium",
  "brussels",
  "antwerp",

  // ======================================
  // SWITZERLAND
  // ======================================

  "switzerland",
  "zurich",
  "geneva",

  // ======================================
  // AUSTRIA
  // ======================================

  "austria",
  "vienna",

  // ======================================
  // NORDICS
  // ======================================

  "sweden",
  "stockholm",
  "norway",
  "oslo",
  "denmark",
  "copenhagen",
  "finland",
  "helsinki",
  "iceland",
  "reykjavik",

  // ======================================
  // IRELAND
  // ======================================

  "ireland",
  "dublin",
  "cork",

  // ======================================
  // EASTERN EUROPE
  // ======================================

  "poland",
  "warsaw",
  "krakow",
  "romania",
  "bucharest",
  "hungary",
  "budapest",
  "czech republic",
  "czechia",
  "prague",
  "slovakia",
  "bratislava",

  // ======================================
  // ASIA
  // ======================================

  "india",
  "bangalore",
  "bengaluru",
  "mumbai",
  "delhi",
  "new delhi",
  "hyderabad",
  "chennai",
  "pune",

  "philippines",
  "manila",
  "cebu",

  "singapore",

  "china",
  "beijing",
  "shanghai",
  "shenzhen",
  "hong kong",

  "japan",
  "tokyo",
  "osaka",

  "south korea",
  "seoul",

  // ======================================
  // OCEANIA
  // ======================================

  "australia",
  "sydney",
  "melbourne",
  "brisbane",
  "perth",
  "adelaide",

  "new zealand",
  "auckland",
  "wellington",

  // ======================================
  // LATIN AMERICA
  // ======================================

  "latin america",
  "latam",
  "mexico",
  "mexico city",
  "brazil",
  "são paulo",
  "sao paulo",
  "argentina",
  "buenos aires",
  "chile",
  "colombia"

];


// ======================================
// BLOCKED TITLE KEYWORDS
// ======================================

const BLOCKED_TITLE_KEYWORDS = [

  "expression of interest",
  "join our team",
  "other areas",
  "talent pool",
  "future opportunities",
  "future opportunity",
  "speculative application",
  "general application",
  "open application",
  "open applications",
  "unsolicited application"

];


// ======================================
// NORMALIZATION
// ======================================

function normalizeText(text = "") {

  return String(text)
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

}


// ======================================
// KEYWORD MATCHING
// ======================================

function contains(text = "", keywords = []) {

  const normalizedText = normalizeText(text);

  return keywords.some(keyword =>
    normalizedText.includes(normalizeText(keyword))
  );

}


// ======================================
// AFRICA-ONLY JOB DECISION
// ======================================

function shouldKeepJob({

  location = "",
  remote = false,
  title = ""

}) {

  const normalizedLocation = normalizeText(location);
  const normalizedTitle = normalizeText(title);


  // ======================================
  // 1. BLOCK GENERIC / NON-JOB TITLES
  // ======================================

  if (
    contains(normalizedTitle, BLOCKED_TITLE_KEYWORDS)
  ) {
    return false;
  }


  // ======================================
  // 2. LOCATION IS REQUIRED
  // ======================================

  if (!normalizedLocation) {
    return false;
  }


  // ======================================
  // 3. HARD BLOCK GEOGRAPHIC RESTRICTIONS
  // ======================================
  //
  // This MUST happen before checking:
  // - remote
  // - global
  // - worldwide
  // - anywhere
  //
  // Example:
  //
  // "Worldwide - US residents only"
  //
  // MUST be rejected.
  //

  if (
    contains(
      normalizedLocation,
      BLOCKED_REMOTE_REGIONS
    )
  ) {
    return false;
  }


  // ======================================
  // 4. HARD BLOCK NON-AFRICAN LOCATIONS
  // ======================================

  if (
    contains(
      normalizedLocation,
      BLOCKED_LOCATION_KEYWORDS
    )
  ) {
    return false;
  }


  // ======================================
  // 5. EXPLICIT AFRICAN COUNTRY
  // ======================================

  if (
    contains(
      normalizedLocation,
      AFRICAN_COUNTRIES
    )
  ) {
    return true;
  }


  // ======================================
  // 6. EXPLICIT AFRICA / EMEA / GLOBAL
  // ======================================

  if (
    contains(
      normalizedLocation,
      ALLOWED_LOCATION_KEYWORDS
    )
  ) {
    return true;
  }


  // ======================================
  // 7. PLAIN GENERIC "REMOTE"
  // ======================================
  //
  // Only allow a genuinely generic Remote value.
  //
  // Examples:
  //
  // "Remote"       -> KEEP
  // "Remote, US"   -> already rejected above
  // "Remote UK"    -> already rejected above
  // "Remote Europe"-> already rejected above
  //
  // We intentionally do NOT accept arbitrary text
  // merely because it contains the word "remote".
  //

  if (
    remote === true &&
    (
      normalizedLocation === "remote" ||
      normalizedLocation === "fully remote" ||
      normalizedLocation === "100% remote" ||
      normalizedLocation === "remote worldwide"
    )
  ) {
    return true;
  }


  // ======================================
  // 8. EVERYTHING ELSE = REJECT
  // ======================================

  return false;

}


// ======================================
// EXPORTS
// ======================================

module.exports = {

  contains,
  normalizeText,
  shouldKeepJob,

  ALLOWED_LOCATION_KEYWORDS,
  BLOCKED_REMOTE_REGIONS,
  BLOCKED_LOCATION_KEYWORDS,
  AFRICAN_COUNTRIES,
  BLOCKED_TITLE_KEYWORDS

};
     
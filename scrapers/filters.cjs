// ======================================
// SHARED FILTERS
// ======================================

const ALLOWED_LOCATION_KEYWORDS = [
  "remote",
  "worldwide",
  "global",
  "anywhere",
  "africa",
  "african",
  "emea"
];

const BLOCKED_REMOTE_REGIONS = [
  "us only",
  "usa only",
  "north america only",
  "canada only",
  "uk only",
  "united kingdom only",
  "europe only",
  "eu only",
  "latam only",
  "asia only",
  "apac only",
  "india only",
  "australia only",
  "new zealand only"
];

const AFRICAN_COUNTRIES = [
  "algeria",
  "angola",
  "benin",
  "botswana",
  "burkina faso",
  "burundi",
  "cameroon",
  "cape verde",
  "central african republic",
  "chad",
  "comoros",
  "congo",
  "democratic republic of the congo",
  "djibouti",
  "egypt",
  "equatorial guinea",
  "eritrea",
  "eswatini",
  "ethiopia",
  "gabon",
  "gambia",
  "ghana",
  "guinea",
  "guinea-bissau",
  "ivory coast",
  "côte d'ivoire",
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

const BLOCKED_LOCATION_KEYWORDS = [

  // USA
  "united states",
  "usa",
  "USA",
  "u.s.",
  "america",
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

  // Canada
  "canada",
  "toronto",
  "vancouver",
  "montreal",
  "ottawa",
  "calgary",

  // UK
  "united kingdom",
  "england",
  "london",
  "manchester",
  "birmingham",
  "scotland",
  "wales",

  // Germany
  "germany",
  "berlin",
  "munich",
  "hamburg",
  "frankfurt",
  "cologne",

  // France
  "france",
  "paris",
  "lyon",
  "marseille",

  // Netherlands
  "netherlands",
  "amsterdam",
  "rotterdam",
  "the hague",

  // Spain
  "spain",
  "madrid",
  "barcelona",
  "valencia",

  // Italy
  "italy",
  "rome",
  "milan",
  "turin",

  // Portugal
  "portugal",
  "lisbon",
  "porto",

  // Belgium
  "belgium",
  "brussels",

  // Switzerland
  "switzerland",
  "zurich",
  "geneva",

  // Austria
  "austria",
  "vienna",

  // Nordics
  "sweden",
  "stockholm",
  "norway",
  "oslo",
  "denmark",
  "copenhagen",
  "finland",
  "helsinki",

  // Ireland
  "ireland",
  "dublin",

  // Eastern Europe
  "poland",
  "warsaw",
  "krakow",
  "romania",
  "bucharest",
  "hungary",
  "budapest",
  "czech republic",
  "prague",
  "slovakia",

  // Asia
  "india",
  "bangalore",
  "bengaluru",
  "mumbai",
  "delhi",
  "hyderabad",
  "philippines",
  "manila",
  "singapore",
  "china",
  "beijing",
  "shanghai",
  "hong kong",
  "japan",
  "tokyo",
  "south korea",
  "seoul",

  // Oceania
  "australia",
  "sydney",
  "melbourne",
  "brisbane",
  "perth",
  "new zealand",
  "auckland",

  // Latin America
  "latin america",
  "latam",
  "mexico",
  "brazil",
  "argentina",
  "chile",
  "colombia"
];

const BLOCKED_TITLE_KEYWORDS = [
  "expression of interest",
  "join our team",
  "other areas",
  "talent pool",
  "future opportunities",
  "speculative application"
];

function contains(text = "", keywords = []) {
  text = String(text).toLowerCase();
  return keywords.some(keyword => text.includes(keyword));
}

function shouldKeepJob({
  location = "",
  remote = false,
  title = ""
}) {

  location = String(location).toLowerCase();

  if (contains(title, BLOCKED_TITLE_KEYWORDS))
    return false;

  if (contains(location, BLOCKED_REMOTE_REGIONS))
    return false;

  if (remote)
    return true;

  if (contains(location, AFRICAN_COUNTRIES))
    return true;

  if (contains(location, ALLOWED_LOCATION_KEYWORDS))
    return true;

  if (contains(location, BLOCKED_LOCATION_KEYWORDS))
    return false;

  return false;
}

module.exports = {
  contains,
  shouldKeepJob,
  ALLOWED_LOCATION_KEYWORDS,
  BLOCKED_REMOTE_REGIONS,
  BLOCKED_LOCATION_KEYWORDS,
  AFRICAN_COUNTRIES,
  BLOCKED_TITLE_KEYWORDS
};
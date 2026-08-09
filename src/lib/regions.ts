/**
 * Region data for the address form. Nigeria is the primary market implied by the
 * existing `orders` documents (Paystack, `LGA` field, Nigerian states), so its
 * states are enumerated; other countries fall back to a free-text region field.
 */
export const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "South Africa", "United Kingdom", "United States"] as const;

export const DEFAULT_COUNTRY = "Nigeria";

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Abuja (FCT)", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
] as const;

/**
 * LGA suggestions for the busiest states. Deliberately partial - the field stays
 * a free-text input with a datalist so any LGA can be entered.
 */
export const LGA_SUGGESTIONS: Record<string, string[]> = {
  "Abuja (FCT)": ["Abuja Municipal", "Bwari", "Gwagwalada", "Kuje", "Kwali", "Abaji"],
  Lagos: [
    "Alimosho", "Ikeja", "Eti-Osa", "Surulere", "Lagos Island", "Lagos Mainland",
    "Ikorodu", "Oshodi-Isolo", "Mushin", "Agege", "Amuwo-Odofin", "Ajeromi-Ifelodun",
  ],
  Rivers: ["Port Harcourt", "Obio-Akpor", "Eleme", "Ikwerre", "Oyigbo"],
  Kano: ["Kano Municipal", "Fagge", "Dala", "Gwale", "Nassarawa", "Tarauni"],
  Oyo: ["Ibadan North", "Ibadan South-West", "Egbeda", "Akinyele", "Oluyole"],
  Enugu: ["Enugu East", "Enugu North", "Enugu South", "Nsukka", "Udi"],
};

/** Countries where a postal code is expected. */
export const POSTAL_CODE_COUNTRIES = new Set(["United Kingdom", "United States", "South Africa"]);

// Centralized form mappings for grade-based routing and legacy URL redirects

// Map forms that have different base names for elem vs middle school versions
export const FORM_PAIRS: Record<string, { elem: string; middleSchool: string }> = {
  "vape-free": {
    elem: "You And Me, Together Vape-Free(Elem)",
    middleSchool: "You And Me Vape Free (Middle School And Above)",
  },
  "smart-talk": {
    elem: "Smart Talk: Cannabis Prevention & Education Awareness(Elem)",
    middleSchool: "Smart Talk: Cannabis Prevention & Education Awareness",
  },
};

// Map old slug names to current form titles (base names)
export const SLUG_TO_FORM_TITLE: Record<string, string> = {
  VapeFree: "You And Me Vape Free",
  SmartTalk: "Smart Talk: Cannabis Prevention & Education Awareness",
  SafetyFirst: "Safety First",
  "HealthyFutures:Cannabis": "Healthy Futures: Cannabis",
  "HealthyFutures:Tobacco": "Healthy Futures: Tobacco/Nicotine/Vaping",
};

// Map old when parameter to new type
export const WHEN_TO_TYPE: Record<string, "pre" | "post"> = {
  before: "pre",
  after: "post",
};

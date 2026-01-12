import { redirect } from "next/navigation";
import { prisma } from "@/utils/db";

// Map old slug names to current form titles (base names)
const SLUG_TO_FORM_TITLE: Record<string, string> = {
  VapeFree: "You and Me Vape Free",
  SmartTalk: "Smart Talk: Cannabis Prevention & Education Awareness",
  SafetyFirst: "Safety First",
  "HealthyFutures:Cannabis": "Healthy Futures: Cannabis",
  "HealthyFutures:Tobacco": "Healthy Futures: Tobacco/Nicotine/Vaping",
};

// Map forms that have different base names for elem vs middle school versions
const FORM_PAIRS: Record<string, { elem: string; middleSchool: string }> = {
  "vape-free": {
    elem: "You and Me, Together Vape-Free(Elem)",
    middleSchool: "You and Me Vape Free (Middle School And Above)",
  },
  "smart-talk": {
    elem: "Smart Talk: Cannabis Prevention & Education Awareness(elem)",
    middleSchool: "Smart Talk: Cannabis Prevention & Education Awareness",
  },
  // Add more mappings here as needed for forms with different base names
};

// Map old when parameter to new type
const WHEN_TO_TYPE: Record<string, "pre" | "post"> = {
  before: "pre",
  after: "post",
};

const RedirectPage = async ({ params }: any) => {
  const { formSlug, when } = await params;

  // Decode the URL-encoded formSlug
  const decodedFormSlug = decodeURIComponent(formSlug);

  // Map slug to form title
  const baseFormTitle = SLUG_TO_FORM_TITLE[decodedFormSlug];
  if (!baseFormTitle) {
    redirect("/");
  }

  // Map when to type
  const formType = WHEN_TO_TYPE[when];
  if (!formType) {
    redirect("/");
  }

  // Filter manually to find a match (Prisma doesn't support complex string operations in findFirst)
  const allForms = await prisma.form.findMany({
    where: {
      active: true,
      type: formType,
    },
    select: {
      id: true,
      title: true,
    },
  });

  // Check if this form has an explicit mapping - prefer middle school version
  const pairKey = Object.keys(FORM_PAIRS).find(key => {
    const pair = FORM_PAIRS[key];
    const middleSchoolBase = pair.middleSchool
      .replace(/\s*\(middle school and above\)/i, "")
      .trim()
      .toLowerCase();
    return middleSchoolBase === baseFormTitle.toLowerCase();
  });

  let matchingForm;
  if (pairKey) {
    // Use the middle school version for forms with explicit mappings
    matchingForm = allForms.find((f: { id: string; title: string }) => f.title === FORM_PAIRS[pairKey].middleSchool);
  } else {
    // Fall back to dynamic matching
    matchingForm = allForms.find((f: { id: string; title: string }) => {
      const normalizedTitle = f.title
        .replace(/\s*\(elem\)/i, "")
        .replace(/\s*\(elementary\)/i, "")
        .replace(/\s*\(middle school and above\)/i, "")
        .trim()
        .toLowerCase();

      return normalizedTitle === baseFormTitle.toLowerCase();
    });
  }

  if (!matchingForm) {
    redirect("/");
  }

  // Redirect to the new enterCode page with formId
  redirect(`/student/enterCode/${matchingForm.id}`);
};

export default RedirectPage;

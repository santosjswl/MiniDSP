export type FindingType = "email" | "uk_phone" | "uk_nino" | "payment_card";
export type Risk = "None" | "Low" | "Medium" | "High" | "Critical";

export interface Finding {
  type: FindingType;
  risk: Exclude<Risk, "None">;
  count: number;
  maskedExample: string;
}

export interface Classification {
  overallRisk: Risk;
  findings: Finding[];
}

interface MatchSpan {
  start: number;
  end: number;
}

const RISK_BY_TYPE: Record<FindingType, Exclude<Risk, "None">> = {
  email: "Low",
  uk_phone: "Medium",
  uk_nino: "High",
  payment_card: "Critical",
};

const RISK_ORDER: Risk[] = ["None", "Low", "Medium", "High", "Critical"];
const FINDING_ORDER: FindingType[] = [
  "email",
  "uk_phone",
  "uk_nino",
  "payment_card",
];
const INVALID_NINO_PREFIXES = new Set([
  "BG",
  "GB",
  "KN",
  "NK",
  "NT",
  "TN",
  "ZZ",
]);
const NINO_FIRST_LETTER = "ABCEGHJKLMNPRSTWXYZ";
const NINO_SECOND_LETTER = "ABCEGHJKLMNOPRSTWXYZ";

function addFinding(
  findings: Map<FindingType, Finding>,
  type: FindingType,
  maskedExample: string,
) {
  const existing = findings.get(type);
  if (existing) {
    existing.count += 1;
    return;
  }

  findings.set(type, {
    type,
    risk: RISK_BY_TYPE[type],
    count: 1,
    maskedExample,
  });
}

function hasValidLuhnChecksum(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function maskEmail(email: string): string {
  const separator = email.indexOf("@");
  return `${email[0]}***${email.slice(separator)}`;
}

function maskPhone(phone: string): string {
  const compact = phone.replace(/[ \t()-]/g, "");
  const international = compact.startsWith("+44");
  const digits = compact.replace(/\D/g, "");
  const nationalDigits = international ? digits.slice(2) : digits;
  const prefix = international ? "+44" : nationalDigits.slice(0, 2);
  const hiddenCount = nationalDigits.length - (international ? 0 : 2) - 3;

  return `${prefix}${"*".repeat(hiddenCount)}${nationalDigits.slice(-3)}`;
}

function isValidUkPhone(phone: string): boolean {
  const compact = phone.replace(/[ \t()-]/g, "");
  const digits = compact.replace(/\D/g, "");

  if (compact.startsWith("+44")) {
    return digits.length === 12 && /^[1237]/.test(digits.slice(2));
  }

  return digits.length === 11 && /^0[1237]/.test(digits);
}

function isValidNinoPrefix(prefix: string): boolean {
  return (
    NINO_FIRST_LETTER.includes(prefix[0]) &&
    NINO_SECOND_LETTER.includes(prefix[1]) &&
    !INVALID_NINO_PREFIXES.has(prefix)
  );
}

function overlaps(span: MatchSpan, otherSpans: MatchSpan[]): boolean {
  return otherSpans.some(
    (other) => span.start < other.end && other.start < span.end,
  );
}

export function classifyContent(content: string): Classification {
  const findings = new Map<FindingType, Finding>();
  const cardCandidateSpans: MatchSpan[] = [];

  const cardPattern =
    /(?<![A-Za-z0-9])[0-9](?:[ \t-]?[0-9]){12,18}(?![A-Za-z0-9])/g;

  for (const match of content.matchAll(cardPattern)) {
    const candidate = match[0];
    const start = match.index;
    const span = { start, end: start + candidate.length };
    cardCandidateSpans.push(span);

    const digits = candidate.replace(/[ -]/g, "");
    if (hasValidLuhnChecksum(digits)) {
      addFinding(
        findings,
        "payment_card",
        `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`,
      );
    }
  }

  const phonePattern =
    /(?<![A-Za-z0-9])(?:0[1-9]|\+44[ \t()-]*[1-9])(?:[ \t()-]*[0-9]){9}(?![A-Za-z0-9])/g;

  for (const match of content.matchAll(phonePattern)) {
    const start = match.index;
    const span = { start, end: start + match[0].length };
    if (overlaps(span, cardCandidateSpans) || !isValidUkPhone(match[0])) {
      continue;
    }
    addFinding(findings, "uk_phone", maskPhone(match[0]));
  }

  const ninoPattern =
    /(?<![A-Za-z0-9])([A-Z])([A-Z])(?:[ \t]?[0-9]){6}(?:[ \t]?([A-Z]))?(?![A-Za-z0-9])/gi;

  for (const match of content.matchAll(ninoPattern)) {
    const prefix = `${match[1]}${match[2]}`.toUpperCase();
    const suffix = match[3]?.toUpperCase() ?? "";
    if (
      !isValidNinoPrefix(prefix) ||
      (suffix !== "" && !/[A-D]/.test(suffix))
    ) {
      continue;
    }

    addFinding(findings, "uk_nino", `${prefix}******${suffix}`);
  }

  const emailPattern =
    /(?<![A-Z0-9.!#$%&'*+/=?^_`{|}~@-])[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+(?![A-Z0-9_-])/gi;

  for (const match of content.matchAll(emailPattern)) {
    const [localPart] = match[0].split("@");
    if (
      localPart.startsWith(".") ||
      localPart.endsWith(".") ||
      localPart.includes("..")
    ) {
      continue;
    }
    addFinding(findings, "email", maskEmail(match[0]));
  }

  const orderedFindings = FINDING_ORDER.flatMap((type) => {
    const finding = findings.get(type);
    return finding ? [finding] : [];
  });
  const overallRisk =
    orderedFindings.reduce<Risk>(
      (highest, finding) =>
        RISK_ORDER.indexOf(finding.risk) > RISK_ORDER.indexOf(highest)
          ? finding.risk
          : highest,
      "None",
    );

  return { overallRisk, findings: orderedFindings };
}

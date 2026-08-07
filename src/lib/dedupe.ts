import { normalizeAddressParts, normalizeComparableText, normalizeDomain, normalizeEmail, normalizePhone } from "@/lib/normalizers";

export type DedupeInput = {
  googlePlaceId?: string | null;
  displayName?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  emails?: string[];
  formattedAddress?: string | null;
};

export type DedupeCandidate = DedupeInput & {
  id: string;
};

export type DedupeDecision = "exact" | "possible" | "distinct";

export type DedupeResult = {
  decision: DedupeDecision;
  score: number;
  reasons: string[];
  candidateId?: string;
};

export function scoreDuplicate(input: DedupeInput, candidate: DedupeCandidate): DedupeResult {
  const reasons: string[] = [];
  let score = 0;

  if (input.googlePlaceId && candidate.googlePlaceId && input.googlePlaceId === candidate.googlePlaceId) {
    return {
      decision: "exact",
      score: 100,
      reasons: ["Azonos Google Place ID."],
      candidateId: candidate.id
    };
  }

  const inputPhone = normalizePhone(input.phone);
  const candidatePhone = normalizePhone(candidate.phone);
  if (inputPhone && candidatePhone && inputPhone === candidatePhone) {
    score += 30;
    reasons.push("Azonos telefonszám.");
  }

  const inputDomain = normalizeDomain(input.websiteUrl);
  const candidateDomain = normalizeDomain(candidate.websiteUrl);
  if (inputDomain && candidateDomain && inputDomain === candidateDomain) {
    score += 25;
    reasons.push("Azonos weboldal-domain.");
  }

  const inputEmails = new Set((input.emails ?? []).map(normalizeEmail).filter(Boolean));
  const candidateEmails = new Set((candidate.emails ?? []).map(normalizeEmail).filter(Boolean));
  if ([...inputEmails].some((email) => candidateEmails.has(email))) {
    score += 25;
    reasons.push("Azonos e-mail-cím.");
  }

  const inputName = normalizeComparableText(input.displayName);
  const candidateName = normalizeComparableText(candidate.displayName);
  if (inputName && candidateName) {
    if (inputName === candidateName) {
      score += 20;
      reasons.push("Azonos normalizált név.");
    } else if (inputName.includes(candidateName) || candidateName.includes(inputName)) {
      score += 10;
      reasons.push("Nagyon hasonló név.");
    }
  }

  const inputAddress = normalizeAddressParts([input.formattedAddress]);
  const candidateAddress = normalizeAddressParts([candidate.formattedAddress]);
  if (inputAddress && candidateAddress && inputAddress === candidateAddress) {
    score += 20;
    reasons.push("Azonos normalizált cím.");
  }

  return {
    decision: score >= 70 ? "exact" : score >= 35 ? "possible" : "distinct",
    score,
    reasons,
    candidateId: candidate.id
  };
}

export function findBestDuplicate(input: DedupeInput, candidates: DedupeCandidate[]) {
  return candidates
    .map((candidate) => scoreDuplicate(input, candidate))
    .sort((left, right) => right.score - left.score)[0] ?? {
    decision: "distinct" as const,
    score: 0,
    reasons: []
  };
}

/**
 * The verdict engine: catalog + policy + observed findings → a conclusion.
 *
 *   findings + invariants + applicability + exceptions + attestations
 *       → BLOCKED_BY_INVARIANT | NOT_EVALUATED | NON_COMPLIANT
 *         | COMPLIANT_WITH_EXCEPTIONS | COMPLIANT
 *
 * Four properties of this module are load-bearing, and each exists because its absence produces a
 * confident wrong answer:
 *
 *   1. There is NO default-pass path. A rule reaches `passed` only by being examined with no
 *      adverse finding, or by a valid attestation on an attestable rule with nothing contradicting
 *      it. Every other route ends at insufficient-evidence, not-evaluated, failed, or an invariant
 *      violation (invariant.no-silent-pass).
 *
 *   2. "Nothing is known" is split in two, because the remediation differs. A rule the evaluator
 *      has a mechanism for, whose evidence is absent, is `insufficient-evidence` — go and gather
 *      it. A rule no mechanism can establish from repository text is `not-evaluated` — a human must
 *      judge it. Collapsing them tells an agent to keep searching for evidence that no amount of
 *      searching can produce.
 *
 *   3. Status is computed from rules, never from the score. There is no percentage at which
 *      compliance is granted.
 *
 *   4. An invariant violation outranks everything, including NON_COMPLIANT. The two answer
 *      different questions: non-compliant means the work does not meet the standard, blocked means
 *      the standard is not currently trustworthy as a measure. Reporting the former while the
 *      latter is true publishes a number derived from a tampered ruler.
 */

import { resolve } from "./catalog.mjs";

export const STATUS = {
  BLOCKED_BY_INVARIANT: "BLOCKED_BY_INVARIANT",
  NOT_EVALUATED: "NOT_EVALUATED",
  NON_COMPLIANT: "NON_COMPLIANT",
  COMPLIANT_WITH_EXCEPTIONS: "COMPLIANT_WITH_EXCEPTIONS",
  COMPLIANT: "COMPLIANT",
};

export const RESULT = { passed: "passed", failed: "failed", warning: "warning", skipped: "skipped" };

export const SCHEMA_VERSION = "1.0.0";

/**
 * @param catalog          from loadCatalog()
 * @param policy           a validated project policy, or null when the project declares none
 * @param findings         evaluator findings, each optionally carrying `rule` (a canonical id)
 * @param evaluated        the rule ids the evaluator actually examined. The crucial input: a rule
 *                         absent from this set was not checked, and reporting it as passing because
 *                         nothing failed is the false green this whole system exists to stop.
 * @param coverageGaps     Map of ruleId → why the detector had no subject to read on this target.
 *                         A rule listed here ran and found nothing, which is not the same as having
 *                         established the rule: absence of a finding is probative only where the
 *                         detector could have seen a violation had one been there.
 * @param invariantFindings violations of invariant.* rules, from the integrity and policy checks
 * @param today            ISO date, for expiry
 * @param digests          Map of ruleId → current digest of that attestation's reviewed paths
 */
export function evaluate({ catalog, policy, findings, evaluated, coverageGaps, invariantFindings, today, digests }) {
  const declaredRules = policy?.rules ?? {};
  const applicability = policy?.applicability ?? {};
  const exceptions = Array.isArray(policy?.exceptions) ? policy.exceptions : [];
  const attestations = policy?.attestations ?? {};
  const examined = new Set(evaluated ?? []);
  const gaps = coverageGaps instanceof Map ? coverageGaps : new Map(coverageGaps ?? []);
  const currentDigests = digests ?? new Map();
  const results = [];

  // ---- Invariants first. Nothing below is trustworthy if one of these has been broken. ----
  const violations = [...(invariantFindings ?? [])];

  // A policy may configure the framework; it may never redefine it. Naming an invariant anywhere in
  // a policy is an attempt to make an unadjustable rule adjustable, which is itself the weakening
  // INV-1 forbids — so it is detected here rather than politely ignored.
  for (const id of catalog.invariants.keys()) {
    const mentions = [];
    if (declaredRules[id]) mentions.push("rules");
    if (applicability[id]) mentions.push("applicability");
    if (attestations[id]) mentions.push("attestations");
    if (exceptions.some((e) => e.rule === id)) mentions.push("exceptions");
    if (mentions.length > 0) {
      violations.push({
        rule: "invariant.standards-integrity",
        message:
          `project-policy.yml addresses the invariant ${id} under ${mentions.join(", ")}. ` +
          "Invariants are not project-adjustable.",
        evidence: ["project-policy.yml"],
        remediation: `Remove every reference to ${id} from the policy.`,
      });
    }
  }

  // A policy that sets a rule below its catalog level has weakened the standard locally, which is
  // the same act as editing the catalog and is caught for the same reason.
  const RANK = { forbidden: 3, required: 3, recommended: 2, optional: 1 };
  for (const [id, setting] of Object.entries(declaredRules)) {
    const rule = catalog.rules.get(id);
    if (!rule || !setting?.level) continue;
    if ((RANK[setting.level] ?? 0) < (RANK[rule.level] ?? 0)) {
      violations.push({
        rule: "invariant.standards-integrity",
        message:
          `project-policy.yml sets ${id} to "${setting.level}" but the catalog defines it as ` +
          `"${rule.level}". A policy may raise an obligation, never lower it.`,
        evidence: ["project-policy.yml"],
        remediation:
          `Restore ${id} to "${rule.level}". If the rule has no subject here, declare it ` +
          "not-applicable with a reason; if it applies and is knowingly unmet, write an exception.",
      });
    }
  }

  for (const violation of violations) {
    const rule = resolve(catalog, violation.rule);
    results.push({
      ruleId: violation.rule,
      kind: "invariant",
      status: RESULT.failed,
      severity: "error",
      level: "required",
      verification: rule?.verification ?? "structural",
      assurance: rule?.assurance ?? "partial",
      disposition: "invariant-violation",
      message: violation.message,
      evidence: violation.evidence ?? [],
      remediation: violation.remediation ?? rule?.remediation ?? "Restore the standard you weakened.",
    });
  }

  // ---- Group findings by rule. ----
  const byRule = new Map();
  for (const finding of findings ?? []) {
    if (!finding.rule) continue;
    const rule = resolve(catalog, finding.rule);
    if (!rule || rule.kind === "invariant") continue;
    if (!byRule.has(rule.id)) byRule.set(rule.id, []);
    byRule.get(rule.id).push(finding);
  }

  // ---- Exceptions. Non-exemptibility is checked BEFORE expiry, deliberately: a waiver against a
  // non-exemptible rule is invalid whether or not it has lapsed, and reporting it as expired would
  // imply that renewing it would work. ----
  const activeExceptions = new Map();
  const rejectedExceptions = [];
  const expiredExceptions = [];
  for (const entry of exceptions) {
    const rule = catalog.rules.get(entry.rule);
    if (!rule) continue;
    if (rule.nonExemptible) rejectedExceptions.push(entry);
    else if (entry.expires && entry.expires < today) expiredExceptions.push(entry);
    else activeExceptions.set(rule.id, entry);
  }

  // ---- Per-rule evaluation. ----
  const evidenceRequests = [];
  for (const rule of catalog.rules.values()) {
    const level = declaredRules[rule.id]?.level ?? rule.level;
    const applies = applicability[rule.id];

    if (applies?.status === "not-applicable") {
      results.push(base(rule, level, RESULT.skipped, "not-applicable", applies.reason));
      continue;
    }

    const hits = byRule.get(rule.id) ?? [];

    // A recorded human judgement. Checked before the not-evaluated fallbacks, because an
    // attestation is exactly what turns "nobody looked" into "somebody looked" — but after findings
    // are collected, because it may never override one.
    const attestation = attestations[rule.id];
    if (attestation) {
      const verdict = judgeAttestation(rule, attestation, hits, today, currentDigests);
      if (verdict) {
        results.push(verdict);
        continue;
      }
      // Fell through: expired or stale. Evaluated normally below, never silently accepted.
    }

    // No mechanism exists for this rule. Distinct from having a mechanism and no evidence, and the
    // distinction is the whole point: this one cannot be resolved by producing more files.
    if (rule.verification === "manual-review" || !examined.has(rule.id)) {
      const result = base(rule, level, RESULT.skipped, "not-evaluated",
        `No automated mechanism can establish ${rule.id} from repository contents.`);
      result.evidenceExpected = rule.evidenceExpected;
      results.push(result);
      evidenceRequests.push({
        rule: rule.id,
        kind: rule.kind,
        standard: rule.standard,
        disposition: "not-evaluated",
        needs: rule.evidenceExpected,
        how: rule.attestable
          ? `Record an attestation for ${rule.id} in project-policy.yml, citing what was reviewed.`
          : `${rule.id} is not attestable; satisfy it and supply the evidence its verification requires.`,
      });
      continue;
    }

    if (hits.length === 0) {
      // Silence from a detector that had nothing to read is not a pass. "No violation was observed"
      // and "the rule was established as satisfied" are different propositions, and a detector
      // whose subject is absent from the target supports only the first. Routed to human judgement,
      // because no additional file will give the detector the dialect it reads.
      const gap = gaps.get(rule.id);
      if (gap) {
        const result = base(rule, level, RESULT.skipped, "not-evaluated",
          `No violation of ${rule.id} was observed, and the observation is not probative here: ${gap}.`);
        result.evidenceExpected = rule.evidenceExpected;
        results.push(result);
        evidenceRequests.push({
          rule: rule.id,
          kind: rule.kind,
          standard: rule.standard,
          disposition: "not-evaluated",
          needs: rule.evidenceExpected,
          how: rule.attestable
            ? `The mechanism could not see this rule's subject on this project. Record an attestation for ${rule.id}, citing what was reviewed.`
            : `${rule.id} is not attestable; satisfy it and supply the evidence its verification requires.`,
        });
        continue;
      }
      results.push(base(rule, level, RESULT.passed, "evaluated",
        `No violation of ${rule.id} was observed.`));
      continue;
    }

    // A finding whose detector reports absence of required evidence is not a violation — it is the
    // absence of proof, and it routes to gather-the-evidence rather than to failure.
    if (hits.every((h) => h.evidenceGap)) {
      const result = base(rule, level, RESULT.skipped, "insufficient-evidence", hits[0].message);
      result.evidence = hits.flatMap((h) => h.evidence ?? []);
      result.evidenceExpected = rule.evidenceExpected;
      results.push(result);
      evidenceRequests.push({
        rule: rule.id,
        kind: rule.kind,
        standard: rule.standard,
        disposition: "insufficient-evidence",
        needs: rule.evidenceExpected,
        how: hits[0].remediation ?? rule.remediation,
      });
      continue;
    }

    const exception = activeExceptions.get(rule.id);
    const outcome = level === "required" || level === "forbidden" ? RESULT.failed : RESULT.warning;
    const result = base(rule, level, outcome, exception ? "excepted" : "evaluated", hits[0].message);
    result.evidence = hits.flatMap((h) => h.evidence ?? []);
    if (exception) {
      result.exception = {
        reason: exception.reason,
        approvedBy: exception.approvedBy,
        approvedAt: exception.approvedAt,
        expires: exception.expires ?? null,
        reference: exception.reference ?? null,
      };
    }
    results.push(result);
  }

  for (const entry of rejectedExceptions) {
    results.push(policyFailure(entry.rule, "rejected-exception",
      `${entry.rule} is non-exemptible; the exception against it is rejected, not applied.`,
      "Remove the exception and satisfy the rule. If it genuinely has no subject here, declare it not-applicable instead."));
  }
  for (const entry of expiredExceptions) {
    results.push(policyFailure(entry.rule, "expired-exception",
      `The exception for ${entry.rule} expired on ${entry.expires}.`,
      "Renew the exception with a fresh approval, or satisfy the rule."));
  }

  return summarise(results, policy, evidenceRequests);
}

/**
 * Decide what an attestation establishes. Returns a result, or null to fall through to normal
 * evaluation — never a silent success.
 *
 * The ordering is the substance. Contradiction is checked before anything else, because a human
 * saying a rule is satisfied does not change what a check observed. That single ordering is also
 * why an attestation cannot bypass a non-exemptible rule: not as a separate prohibition, but
 * because the automated failure simply survives.
 */
export function judgeAttestation(rule, attestation, hits, today, digests) {
  const fail = (disposition, message, remediation) => ({
    ruleId: rule.id,
    kind: rule.kind,
    status: RESULT.failed,
    severity: "error",
    level: rule.level,
    verification: "configuration",
    assurance: "partial",
    disposition,
    message,
    evidence: ["project-policy.yml"],
    remediation,
  });

  if (!rule.attestable) {
    return fail("invalid-attestation",
      `${rule.id} is not attestable; the catalog evaluates it by ${rule.verification}, not by human review.`,
      "Remove the attestation. A rule the catalog does not mark attestable cannot be satisfied by assertion.");
  }

  if (hits.length > 0) {
    return fail("contradicted-attestation",
      `${rule.id} is attested as approved, but a check observed: ${hits[0].message}`,
      "Fix the finding. An attestation records human evidence; it never overrides what a check observed.");
  }

  if (attestation.status === "rejected") {
    return fail("attested-rejected",
      `${rule.id} was reviewed by ${attestation.reviewedBy} and found unmet.`,
      "Satisfy the rule, then re-attest. A recorded rejection is a failure, not silence.");
  }

  // Expired, or reviewing material that has since changed. Neither is a failure — both mean the
  // rule is unreviewed again, which is not-evaluated rather than passed.
  if (attestation.expires && attestation.expires < today) return null;
  const against = attestation.reviewedAgainst;
  if (against?.digest) {
    const current = digests.get(rule.id);
    if (current && current !== against.digest) return null;
  }

  return {
    ruleId: rule.id,
    kind: rule.kind,
    status: RESULT.passed,
    severity: rule.severity,
    level: rule.level,
    // Human judgement establishes the rule, and does so without a machine. The assurance breakdown
    // counts it under manualReview — never automated.
    verification: "manual-review",
    assurance: "full",
    disposition: "attested",
    message: `Attested by ${attestation.reviewedBy} on ${attestation.reviewedAt}: ${attestation.evidence}`,
    evidence: against?.paths ?? [],
    remediation: rule.remediation,
    attestation: {
      reviewedBy: attestation.reviewedBy,
      reviewedAt: attestation.reviewedAt,
      evidence: attestation.evidence,
      reference: attestation.reference ?? null,
      expires: attestation.expires ?? null,
      reviewedAgainst: against?.paths ?? null,
    },
  };
}

function base(rule, level, status, disposition, message) {
  return {
    ruleId: rule.id,
    kind: rule.kind,
    standard: rule.standard,
    requirement: rule.requirement,
    status,
    severity: rule.severity,
    level,
    verification: rule.verification,
    assurance: status === RESULT.skipped ? "none" : rule.assurance,
    disposition,
    message,
    evidence: [],
    remediation: rule.remediation,
  };
}

function policyFailure(ruleId, disposition, message, remediation) {
  return {
    ruleId,
    kind: "requirement",
    status: RESULT.failed,
    severity: "error",
    level: "required",
    verification: "configuration",
    assurance: "full",
    disposition,
    message,
    evidence: ["project-policy.yml"],
    remediation,
  };
}

function summarise(results, policy, evidenceRequests) {
  const counts = { passed: 0, failed: 0, warnings: 0, skipped: 0 };
  for (const r of results) {
    if (r.status === RESULT.passed) counts.passed++;
    else if (r.status === RESULT.failed) counts.failed++;
    else if (r.status === RESULT.warning) counts.warnings++;
    else counts.skipped++;
  }

  // Every applicable rule lands in exactly one assurance bucket, and the buckets must sum. The two
  // unknown dispositions share a bucket while keeping their separate reasons in the results.
  const assurance = { automated: 0, manualReview: 0, insufficientEvidence: 0, notEvaluated: 0 };
  for (const r of results) {
    if (r.disposition === "not-applicable") continue;
    if (r.disposition === "insufficient-evidence") assurance.insufficientEvidence++;
    else if (r.status === RESULT.skipped) assurance.notEvaluated++;
    else if (r.verification === "manual-review") assurance.manualReview++;
    else assurance.automated++;
  }

  const applicable = results.filter((r) => r.disposition !== "not-applicable");
  const scored = applicable.filter(
    (r) => r.status !== RESULT.skipped && (r.level === "required" || r.level === "forbidden"),
  );
  const passed = scored.filter((r) => r.status === RESULT.passed).length;
  const score = scored.length === 0 ? null : Math.round((passed / scored.length) * 100);

  const blocked = results.filter((r) => r.disposition === "invariant-violation");
  const failures = results.filter((r) => r.status === RESULT.failed && r.disposition !== "excepted");
  const excepted = results.filter((r) => r.disposition === "excepted");

  let status;
  if (blocked.length > 0) status = STATUS.BLOCKED_BY_INVARIANT;
  else if (!policy) status = STATUS.NOT_EVALUATED;
  else if (failures.length > 0) status = STATUS.NON_COMPLIANT;
  else if (excepted.length > 0) status = STATUS.COMPLIANT_WITH_EXCEPTIONS;
  else status = STATUS.COMPLIANT;

  return {
    status,
    // Blocked means unscored. Once an invariant has fired, the framework has declared this
    // evaluation unacceptable, and a percentage computed against a ruler it has just called
    // untrustworthy is worse than no number: it is the part a reader quotes. The first version
    // printed "BLOCKED_BY_INVARIANT" and "83%" on adjacent lines, which undercut the whole point.
    score: status === STATUS.BLOCKED_BY_INVARIANT ? null : score,
    summary: counts,
    assurance,
    denominator: {
      total: results.length,
      applicable: applicable.length,
      scored: scored.length,
      basis: "required- and forbidden-level rules that were evaluated",
    },
    evidenceRequests,
    results,
  };
}

/** The output envelope. `schemaVersion` is "1.0.0" in every emitter, from the first release. */
export function envelope({ verdict, project, standardVersion, evaluatedAt, frameworkCoverage }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    standardVersion: standardVersion ?? null,
    project: project ?? null,
    status: verdict.status,
    score: verdict.score,
    summary: verdict.summary,
    assurance: verdict.assurance,
    denominator: verdict.denominator,
    // Framework maturity, outside the verdict on purpose. It says how much of the framework has
    // been turned into examined rules — never how compliant this project is.
    frameworkCoverage: frameworkCoverage ?? null,
    evidenceRequests: verdict.evidenceRequests,
    evaluatedAt,
    results: verdict.results,
  };
}

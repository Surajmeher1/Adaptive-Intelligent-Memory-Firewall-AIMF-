# AIMF — Research Requirements Specification
# Phase 1, Task 1.3
# Last Updated: 2026-07-14
# Status: APPROVED

---

## OVERVIEW

Research requirements define constraints and protocols specific to the research
and evaluation nature of this system. These are distinct from functional and
non-functional requirements in that they govern experimental design, scientific
validity, and paper submission readiness.

Categories: EXPERIMENTAL | EVALUATION | BENCHMARK | STATISTICAL | DOCUMENTATION

---

## EXPERIMENTAL DESIGN REQUIREMENTS

### RR-01: Hypothesis Pre-Registration
**Priority:** MUST
**Requirement:** All 5 hypotheses (H1..H5) SHALL be defined and documented in
PHASE0_FOUNDATION.md BEFORE any experiment results are collected or analyzed.
No post-hoc hypothesis addition is permitted.
**Status:** SATISFIED — Hypotheses defined in research/PHASE0_FOUNDATION.md §3
**Rationale:** Prevents HARKing (Hypothesizing After Results are Known), which
              invalidates scientific claims.

---

### RR-02: Controlled Experimental Protocol
**Priority:** MUST
**Requirement:** All experiments comparing AMGS to baselines SHALL:
  (a) Use identical input data sets (same N items, same sequence)
  (b) Evaluate all 5 systems (AMGS + 4 baselines) on the same items
  (c) Use the same evaluation metrics for all systems
  (d) Run in the same isolated Docker environment
**Measurement:** Experiment script enforces identical input ordering for all systems.

---

### RR-03: Random Seed Control
**Priority:** MUST
**Requirement:** Any randomized operation in experiments (dataset sampling,
train/test splits, model initialization) SHALL use a seeded random number
generator. Seed value SHALL be logged with experiment results.
Default seed: 42. Alternative seeds for sensitivity analysis: 7, 100, 2024.
**Rationale:** Reproducibility.

---

### RR-04: Train/Validation/Test Split
**Priority:** MUST
**Requirement:** The benchmark dataset SHALL be split into:
  - Train set (used for any learning/calibration): 60%
  - Validation set (used for threshold tuning): 20%
  - Test set (used ONLY for final evaluation, touched ONCE): 20%
The test set SHALL NOT be inspected or used during development.
**Measurement:** Dataset split log recorded before any experiment runs.

---

### RR-05: Single Test Set Evaluation
**Priority:** MUST
**Requirement:** The final reported metrics (UMR-F1, SIER, MRR) SHALL be computed
on the test set EXACTLY ONCE, using the final AMGS configuration. No iterative
tuning on the test set is permitted.
**Rationale:** Prevents overfitting to test distribution.
**Implementation:** Test set evaluation wrapped in a separate script (evaluate_final.py)
                  that is run exactly once and logs results to a timestamped output file.

---

## BENCHMARK DATASET REQUIREMENTS

### RR-06: Dataset Composition
**Priority:** MUST
**Requirement:** The AIMF governance benchmark dataset SHALL contain:
  - Minimum 500 labeled memory items (target: 1000)
  - Minimum 50 items per governance decision category
  - Coverage of all 8 governance decision types
  - Coverage of all 13 memory categories (temporal, credential, preference, etc.)
  - Minimum 20% HIGH/CRITICAL sensitivity items
  - Ground truth labels: recommended_action, sensitivity_level, usefulness_lifetime
**Measurement:** Dataset statistics script verifies distribution before use.

---

### RR-07: Dataset Construction Protocol
**Priority:** MUST
**Requirement:** Dataset items SHALL be constructed from:
  (a) Manually authored synthetic items (target: 60%)
  (b) Publicly available conversational datasets with relabeling (target: 40%)
All items SHALL be reviewed to ensure label accuracy. No items from private
or proprietary data sources.
**Documentation:** Dataset construction methodology documented in
                  research/DATASET_CONSTRUCTION.md (Phase 9 deliverable)

---

### RR-08: Annotation Quality
**Priority:** MUST
**Requirement:** For the manually authored items, a minimum 20% sample (≥100 items)
SHALL be cross-annotated by the researcher and at least one other annotator
(advisor or peer). Inter-annotator agreement SHALL be reported as Cohen's Kappa ≥ 0.70.
**Measurement:** IAA script computes Cohen's Kappa on overlapping annotations.
**Fallback:** If second annotator is unavailable, report self-annotation with
             consistency check (two annotations 2 weeks apart), report limitation.

---

### RR-09: Dataset Release
**Priority:** SHOULD
**Requirement:** The final benchmark dataset SHALL be released alongside the
paper under a CC-BY 4.0 license (or compatible) to enable reproducibility.
Sensitive synthetic items SHALL be reviewed before release to ensure no
inadvertent real PII is included.

---

## EVALUATION METRIC REQUIREMENTS

### RR-10: Primary Metric — UMR-F1
**Priority:** MUST
**Requirement:** Useful Memory Retention F1 (UMR-F1) SHALL be the primary
evaluation metric. Definition:
  - Precision_UMR = (correctly retained useful memories) / (all retained memories)
  - Recall_UMR = (correctly retained useful memories) / (all useful memories in dataset)
  - UMR-F1 = 2 × (Precision_UMR × Recall_UMR) / (Precision_UMR + Recall_UMR)
**Classification:** Memory is "correctly retained" if the governance decision
matches the ground truth label (for STORE_* decisions) and is "correctly rejected"
if ground truth is REJECT and system outputs REJECT.

---

### RR-11: Privacy Metric — SIER
**Priority:** MUST
**Requirement:** Sensitive Information Exposure Rate (SIER) SHALL be computed as:
  SIER = (HIGH/CRITICAL sensitivity items stored in plaintext) / (all HIGH/CRITICAL items)
Lower SIER is better. Target: AMGS SIER < 0.05 (less than 5% of sensitive items exposed).
Baseline Store-All SIER is expected to be > 0.50 (baseline for comparison).

---

### RR-12: Efficiency Metric — MRR
**Priority:** MUST
**Requirement:** Memory Redundancy Rate (MRR) SHALL be computed as:
  MRR = (redundant memories stored) / (total memories stored)
Lower MRR is better. A memory is redundant if its cosine similarity to any
previously stored memory exceeds 0.85.

---

### RR-13: Retrieval Quality Metrics
**Priority:** SHOULD
**Requirement:** For semantic retrieval evaluation, compute:
  - Precision@K (P@K): fraction of top-K retrieved memories that are relevant
  - Recall@K (R@K): fraction of relevant memories in top-K retrieval
  - Evaluated at K = 1, 3, 5, 10
**Rationale:** Demonstrates that AMGS governance does not degrade retrieval quality.

---

### RR-14: Decision Latency Metric
**Priority:** MUST
**Requirement:** Decision latency SHALL be reported as:
  - Mean latency (ms)
  - 95th percentile latency (ms)
  - Maximum latency (ms)
  Measured across all test set items for AMGS and all 4 baselines.

---

### RR-15: Per-Class Metrics
**Priority:** MUST
**Requirement:** Per-decision-category precision, recall, and F1 SHALL be
reported for AMGS on the test set. This requires scikit-learn's
classification_report output for all 8 decision classes.
**Rationale:** Identifies which governance decisions are strong/weak —
             essential for honest research reporting.

---

## ABLATION STUDY REQUIREMENTS

### RR-16: Factor Ablation Protocol
**Priority:** MUST
**Requirement:** An ablation study SHALL remove each AMGS factor individually
and measure the impact on UMR-F1, SIER, and MRR. This requires training 7
ablated AMGS variants (one per factor removed).
Factor removal: set that factor's weight to 0 and re-normalize remaining weights.
**Output:** Table: 7 ablated variants × 3 metrics, + full model row.

---

### RR-17: Weight Sensitivity Analysis
**Priority:** SHOULD
**Requirement:** A sensitivity analysis SHALL vary each weight ±20% from its
default value and measure the change in UMR-F1 and SIER.
**Output:** Per-weight sensitivity plot (matplotlib).

---

## STATISTICAL REPORTING REQUIREMENTS

### RR-18: Confidence Intervals
**Priority:** MUST
**Requirement:** All reported metrics SHALL include 95% confidence intervals,
computed via bootstrap resampling (1000 bootstrap samples).
**Implementation:** scipy.stats or manual bootstrap in evaluation scripts.

---

### RR-19: Statistical Significance Testing
**Priority:** SHOULD
**Requirement:** The difference in UMR-F1 between AMGS and the best-performing
baseline SHALL be tested for statistical significance using a paired t-test or
Wilcoxon signed-rank test (if non-normal distribution).
Report p-value; claim significance only if p < 0.05.

---

### RR-20: Effect Size Reporting
**Priority:** SHOULD
**Requirement:** Report Cohen's d or equivalent effect size alongside p-values
for significant comparisons. Avoid interpreting p < 0.05 as "large effect."
**Rationale:** Follows current scientific best practices; expected by IEEE reviewers.

---

## DOCUMENTATION AND PAPER REQUIREMENTS

### RR-21: Experiment Log
**Priority:** MUST
**Requirement:** Every experiment run SHALL produce a timestamped log file
containing: seed, dataset version, AMGS weights, all metric values, and
runtime environment metadata.
**Location:** experiments/results/ directory.

---

### RR-22: Research Log Maintenance
**Priority:** MUST
**Requirement:** Every significant algorithmic decision (weight choice, threshold
setting, model selection) SHALL be recorded in RESEARCH_LOG.md before implementation.
No undocumented algorithm parameter changes.
**Rationale:** Audit trail for academic integrity.

---

### RR-23: Algorithm Version Tracking
**Priority:** MUST
**Requirement:** The AMGS formula version SHALL be tracked. Any change to the
formula, weights, or factor definitions constitutes a new version (v1 → v2, etc.).
Version changes require a new RESEARCH_LOG entry and a DECISIONS.md ADR update.

---

### RR-24: Paper-Ready Figures
**Priority:** MUST
**Requirement:** All evaluation result plots SHALL be generated at 300 DPI in
PDF/SVG format for paper inclusion. Scripts SHALL be in experiments/plots/ and
reproducible from raw result files.
**Required figures:**
  - AMGS vs. 4 baselines: UMR-F1, SIER, MRR (grouped bar chart)
  - Ablation study: factor importance chart
  - Factor score distribution violin plots
  - AMGS score distribution histogram by decision class
  - Temporal decay visualization (decay curve plot)

---

### RR-25: Limitations Section
**Priority:** MUST
**Requirement:** The paper SHALL include an honest Limitations section reporting:
  - Hand-tuned initial weights (L-1)
  - Synthetic/public dataset (L-2)
  - English-only (L-3)
  - Single-user scope (L-4)
  - Heuristic privacy scoring (L-5)
  - Irreversible forgetting (L-6)
No omission of known limitations is permitted.

---

## RESEARCH REQUIREMENTS SUMMARY

| Category | Count | MUST | SHOULD |
|----------|-------|------|--------|
| Experimental Design | 5 | 5 | 0 |
| Benchmark Dataset | 4 | 3 | 1 |
| Evaluation Metrics | 6 | 4 | 2 |
| Ablation Study | 2 | 1 | 1 |
| Statistical Reporting | 3 | 1 | 2 |
| Documentation & Paper | 5 | 5 | 0 |
| **TOTAL** | **25** | **19** | **6** |

---

## COMBINED REQUIREMENTS TOTALS

| Document | Requirements | MUST | SHOULD |
|----------|-------------|------|--------|
| Functional (FR) | 33 | 25 | 8 |
| Non-Functional (NFR) | 27 | 24 | 3 |
| Research (RR) | 25 | 19 | 6 |
| **GRAND TOTAL** | **85** | **68** | **17** |

---
_Document Owner: AIMF Research Team_
_Status: APPROVED_
_Last Reviewed: 2026-07-14_

**Date:** 2026-07-11
**Author:** Sajit Roshan
**Subtitle:** Towards Agentic, Context-Aware Credit Risk Models for Cash-Flow-Based Small Business Lending
**Tag:** undersight Research
**Excerpt:** Why credit scorecards should be generated at underwriting time rather than selected from a static library: an architecture combining agentic reasoning, historical evidence, and institutional intelligence.
---

## Abstract

Traditional credit scorecards assume that applicants belong to homogeneous populations for which a single statistical model can adequately estimate risk. This assumption breaks down in the long tail of small business lending. Businesses seeking Merchant Cash Advance (MCA), Revenue-Based Financing (RBF), and other forms of alternative credit exhibit enormous diversity across industries, operating models, customer behavior, payment ecosystems, seasonality, geography, and cash-flow dynamics. Constructing a fixed library of scorecards capable of accurately evaluating this diversity would require thousands of specialized models while still failing to capture business-specific nuances.

This paper proposes the **Runtime Dynamic Scorecard Generation Engine (RDSGE)**, an agentic architecture that synthesizes a bespoke scorecard for every underwriting decision. Rather than selecting from a predefined collection of scorecards, the proposed system constructs a scorecard at runtime by combining three independent sources of intelligence:

**(1) an agentic scorecard creation pipeline driven by deep research and failure-mode reasoning,**

**(2) statistical evidence extracted from probabilistically matched historical deals, and**

**(3) institutional intelligence captured through credit policies, underwriting guidelines, deal-level underwriting communications and notes, expert underwriting rationale, and supporting model artifacts.**

The proposed architecture represents a shift from static credit modeling toward adaptive, explainable, and context-aware underwriting systems capable of reasoning about businesses individually while remaining grounded in empirical data, expert judgment, and organizational knowledge.

## 1. Introduction

Alternative small business lending differs fundamentally from consumer lending.

Consumer credit models benefit from large populations whose financial behavior is sufficiently homogeneous to justify standardized statistical scorecards. In contrast, small businesses are extraordinarily heterogeneous.

A lender's portfolio may span dozens of these segments simultaneously. Although many of these businesses generate similar annual revenues, the mechanisms through which they earn revenue, manage cash flows, incur expenses, and ultimately default are fundamentally different.

A beachfront taco restaurant depends heavily on weekend tourism and weather conditions. An electrical contractor depends on project completion and invoice collections. A dental clinic depends on insurance reimbursement cycles. A cleaning company relies on recurring contractual revenue. Consequently, the definition of a "healthy" business differs substantially across industries.

Traditional underwriting systems attempt to address this diversity by building either a single generalized scorecard or a limited collection of industry-specific scorecards. Neither approach scales to the diversity observed in the long tail of small business lending.

This paper argues that scorecards should not be selected, they should be **generated dynamically** for every underwriting decision.

## 2. Motivation

North American industry classification systems (NAICS) contain well over one thousand industry classifications. Even within the most granular industry definitions, businesses exhibit substantial diversity in geography, customer mix, operating model, payment behavior, and seasonality.

Supporting this diversity through manually engineered scorecards would require thousands of independently maintained models, each demanding continuous validation, governance, recalibration, and redevelopment.

Instead of maintaining thousands of static scorecards, we propose generating a new scorecard for each applicant using runtime reasoning.

## 3. System Overview

The Runtime Dynamic Scorecard Generation Engine synthesizes a unique scorecard for every underwriting decision by combining three complementary intelligence sources. Agentic intelligence contributes contextual reasoning: deep research into the merchant, its industry, its expected financial behavior, and its plausible failure modes. Historical intelligence contributes empirical evidence extracted from probabilistically matched historical deals. Institutional intelligence contributes the organization's accumulated credit expertise, from formal policy to deal-level underwriting rationale.

These three intelligence streams collectively produce a scorecard specifically designed for the merchant being evaluated. Sections 4 through 6 describe the agentic pipeline, Section 7 the historical evidence, and Section 8 the institutional layer; Section 9 describes how the three fuse at runtime.

## 4. Agentic Scorecard Creation Pipeline

The first intelligence pipeline assumes no access to internal historical data. Instead, it reasons about the merchant in the same manner as an experienced credit model developer encountering an unfamiliar business.

### Merchant Profiling

The system first constructs a merchant profile using publicly available information.

This process identifies the dimensions that define how the business operates: what it sells, who it serves, and how it runs day to day.

### Industry Context

The system next constructs an industry profile.

Rather than relying solely on industry codes, it considers contextual factors such as local market conditions, neighborhood characteristics, customer demographics, competitive intensity, weather dependence, tourism exposure, and regional economic factors.

For example, two restaurants sharing the same NAICS classification may exhibit substantially different risk profiles because one operates in a seasonal tourist district while the other serves a stable residential community.

### Expected Financial Behavior

The engine then develops an expected financial behavior model describing how a healthy business within this context should behave.

The baseline covers three clusters of expectations: revenue behavior, payment behavior, and obligations and liquidity.

These expectations establish a contextual baseline against which observed bank transactions can later be interpreted.

## 5. Failure-Mode Analysis

Traditional scorecards identify variables correlated with default. The proposed architecture instead begins by asking: **How can this business fail?**

For each merchant, the system constructs a hierarchy of plausible failure modes. The hierarchy is specific to the business: a restaurant and an electrical contractor with similar revenues face very different failure surfaces.

Each failure mode is expanded into causal scenarios.

This causal reasoning directly informs feature engineering.

## 6. Runtime Metric Selection

Failure-mode analysis determines which metrics should be measured. Rather than relying exclusively on fixed variables, the engine selects metrics capable of detecting early indicators of the identified failure scenarios.

Rather than generating arbitrary new metrics, the engine primarily selects from a curated and validated metric library. This balances adaptability with production reliability while allowing limited runtime metric synthesis where appropriate.

The selected metrics are then weighted and calibrated according to the merchant profile, industry context, and identified failure mechanisms.

## 7. Historical Intelligence

The second intelligence source consists of the lender's historical deal portfolio. Each historical deal contains:

- application information
- bank transaction history
- underwriting decision
- funding details
- repayment performance
- delinquency history
- recovery outcomes

In addition, every historical merchant has already been evaluated using an extensive library of predefined metrics.

### Probabilistic Deal Matching

Exact historical matches rarely exist. Instead, the engine retrieves probabilistically similar businesses based on industry, geography, transaction behavior, revenue patterns, operating characteristics, and other contextual similarities.

### Candidate Model Generation

Once comparable historical deals have been identified, the system performs statistical analysis to generate candidate predictive models. These candidate models provide empirical evidence regarding which variables appear predictive for businesses resembling the current applicant. Rather than replacing the dynamically generated scorecard, these statistical models serve as an additional source of evidence during runtime scorecard construction.

## 8. Institutional Intelligence

Historical repayment data captures what happened. Institutional intelligence captures how experienced credit professionals think about risk. This intelligence has accumulated over years of underwriting, portfolio management, policy development, and credit decision-making, but much of it remains dispersed across policy documents, underwriting systems, emails, internal discussions, and governance artifacts. The proposed architecture treats this institutional memory as a first-class source of intelligence.

### 8.1 Credit Policies and Underwriting Guidelines

Formal credit policies define the organization's lending philosophy and risk appetite. These documents include:

- credit policies
- lending guidelines
- industry restrictions
- concentration limits
- documentation requirements
- policy exceptions
- exposure limits
- governance rules

Rather than acting as static documentation, these policies constrain and guide runtime scorecard generation, ensuring consistency with organizational objectives.

### 8.2 Deal-Level Underwriting Communications and Notes

Perhaps the richest source of institutional intelligence lies in the reasoning recorded during day-to-day underwriting activities. Every application generates discussions explaining why a deal was approved, declined, or modified. These communications often include observations regarding:

- management quality
- unusual transaction behavior
- compensating strengths
- mitigating weaknesses
- industry-specific concerns
- documentation quality
- merchant explanations
- fraud indicators

Although largely unstructured, these communications collectively represent years of expert underwriting judgment.

The proposed architecture transforms underwriting emails, notes, comments, and internal discussions into a searchable knowledge repository. During runtime scorecard generation, probabilistic retrieval identifies historically similar underwriting discussions whose reasoning can inform the current scorecard.

### 8.3 Expert Knowledge Capture

Institutional intelligence should evolve continuously. The architecture therefore includes periodic expert knowledge capture sessions in which senior underwriters discuss recent cases, emerging fraud patterns, changing industry conditions, evolving underwriting practices, and macroeconomic developments. These discussions are converted into structured knowledge and incorporated into the institutional repository, enabling the system to learn from expert reasoning before sufficient repayment data becomes available.

### 8.4 Existing Models and Supporting Documentation

Existing production scorecards remain an important source of institutional intelligence, but they serve as supporting artifacts rather than the primary source of guidance. Production scorecards, model development documents, and independent validation reports provide valuable information regarding historical feature engineering decisions, variable definitions, calibration strategies, governance considerations, and known model limitations. The runtime scorecard generator references these artifacts to complement, rather than replace, expert judgment and empirical evidence.

## 9. Runtime Intelligence Fusion

The Runtime Dynamic Scorecard Generation Engine combines three complementary intelligence streams.

- **Agentic Intelligence** provides contextual reasoning by understanding the merchant, its industry, expected financial behavior, and plausible failure mechanisms.
- **Historical Intelligence** contributes empirical evidence through probabilistic matching with similar historical deals and runtime statistical model generation.
- **Institutional Intelligence** contributes organizational expertise through credit policies, underwriting rationale, expert knowledge, and accumulated organizational memory.

A runtime orchestration engine synthesizes these three perspectives into a unified scorecard, selecting variables, assigning weights, defining score bands, and producing an explainable credit assessment tailored to the individual merchant.

## 10. Advantages

Compared with conventional scorecard development, the proposed architecture offers several advantages.

## 11. Conclusion

This paper introduces the **Runtime Dynamic Scorecard Generation Engine (RDSGE)**, a novel architecture for constructing bespoke credit scorecards at underwriting time. Rather than relying on static, predefined scorecards, the proposed system synthesizes a new scorecard for every applicant by combining **agentic reasoning**, **historical statistical evidence**, and **institutional intelligence**.

The architecture begins by understanding how a specific business operates, constructing a contextual model of its expected financial behavior, and reasoning explicitly about how that business could fail. It then grounds this reasoning using statistically similar historical deals and enriches it with organizational expertise captured through credit policies, underwriting communications, expert judgment, and accumulated institutional knowledge.

By integrating these complementary sources of intelligence, the Runtime Dynamic Scorecard Generation Engine moves credit underwriting beyond static statistical models toward adaptive, explainable, and context-aware risk assessment. We believe this architecture represents a foundational step toward the next generation of intelligent underwriting systems, in which credit models are no longer selected from a finite catalog but are dynamically assembled to reflect the unique characteristics of each borrower and the collective intelligence of the lending institution.

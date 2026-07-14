---
status: active
last_updated: 2026-07-11
phase: 4
research_target: capstone and publishable study
---

# VisualDSA Research Evaluation Plan

## Working study direction

VisualDSA is evaluated as an emerging educational technology platform that integrates:

- Interactive visualization
- Guided formative assessment
- Recorded student interaction
- Learning analytics
- Instructor-facing intervention support

The study should not evaluate only whether the software runs.

It should evaluate whether the artifact is usable, instructionally appropriate, and useful to students and instructors.

## Research boundary

The initial prototype includes six research-complete modules:

1. Arrays
2. Stacks
3. Queues
4. Binary Search
5. Introductory Sorting
6. Binary Search Trees

The full HelloUniversity DSA curriculum remains broader than the evaluated prototype.

## Evaluation questions

Suggested research questions:

### RQ1

How acceptable is VisualDSA in terms of functionality, usability, instructional suitability, and accessibility?

### RQ2

How do students perform before and after using the selected VisualDSA modules?

### RQ3

What interaction patterns and misconceptions are identified through VisualDSA’s recorded assessments?

### RQ4

How useful are VisualDSA’s analytics to instructors for identifying learning difficulties and planning interventions?

### RQ5

What revisions do students and instructors recommend for improving the platform?

## Evaluation stages

```text
Expert review
    ↓
Technical and functional validation
    ↓
Small usability pilot
    ↓
Artifact revision
    ↓
Formal student implementation
    ↓
Instructor analytics evaluation
    ↓
Integrated quantitative and qualitative interpretation
```

## Stage 1: Expert review

### Suggested evaluator groups

- DSA or computer science instructors
- Software or systems-development experts
- Educational-technology or instructional-design experts

One evaluator may cover more than one area when qualified, but expertise should be documented.

### Evaluation dimensions

#### Content and instructional design

- Accuracy
- Alignment with objectives
- Clarity
- Appropriateness of examples
- Feedback quality
- Assessment alignment
- Misconception definitions

#### Software quality

- Functional suitability
- Performance efficiency
- Compatibility
- Usability
- Reliability
- Security
- Maintainability
- Portability where applicable

The final instrument may align with ISO/IEC 25010 or an institutionally approved software-quality model.

#### Learning analytics

- Relevance
- Interpretability
- Actionability
- Accuracy
- Sufficiency
- Risk of misinterpretation

## Stage 2: Functional validation

Collect evidence from:

- Automated tests
- Route tests
- Algorithm-state tests
- Scoring tests
- Security tests
- Accessibility review
- Database-integrity checks

This stage verifies the artifact before students use it.

## Stage 3: Small usability pilot

Purpose:

- Detect navigation problems
- Test instructions
- Verify assessment timing
- Review event completeness
- Refine feedback
- Check analytics readability

The pilot should use a small group separate from the final study sample when feasible.

## Stage 4: Student evaluation

### Possible design A: One-group pretest-posttest

```text
Pretest
→ VisualDSA intervention
→ Posttest
→ Usability and experience survey
```

Suitable when only one class is available.

Limit:

Causal claims must remain cautious because there is no comparison group.

### Possible design B: Comparison-group design

```text
Group A:
Traditional or existing material
→ Posttest

Group B:
VisualDSA-supported learning
→ Posttest
```

Stronger when groups are reasonably comparable.

### Possible design C: Crossover design

```text
Group 1 uses VisualDSA for Topic Set A
Group 2 uses current approach for Topic Set A

Then switch approaches for Topic Set B
```

This may be practical when withholding the system for the whole term is undesirable.

The final design should follow instructor approval, class availability, ethics requirements, and statistical feasibility.

## Student measures

### Learning performance

Possible measures:

- Pretest score
- Posttest score
- Gain score
- Delayed retention score when feasible
- Module-assessment score
- First-attempt accuracy

### Interaction measures

- Completion
- Attempts
- Retries
- Hint use
- Active time
- Abandonment
- Misconception codes
- Practice-to-assessment change

### Usability and acceptance

Possible dimensions:

- Ease of use
- Learnability
- Clarity
- Usefulness
- Satisfaction
- Confidence in tracing algorithms
- Perceived cognitive support

Use a validated instrument where appropriate, then add VisualDSA-specific items.

## Instructor evaluation

Instructor tasks:

1. Review class mastery.
2. Identify common misconceptions.
3. Inspect one struggling student.
4. Select a topic for reteaching.
5. Interpret practice and assessment differences.
6. Review recommended interventions.

Measures:

- Time to complete analytics tasks
- Accuracy of interpretation
- Perceived usefulness
- Perceived actionability
- Trust in the displayed evidence
- Intention to use
- Suggested improvements

## Qualitative data

Possible sources:

- Student open-ended responses
- Instructor interviews
- Expert comments
- Observation notes
- Think-aloud sessions during pilot use
- Post-use focus group

Suggested questions:

```text
Which visualization helped you most?
Which interaction was confusing?
Which feedback changed your understanding?
Did the assessment reflect what you learned?
What should the instructor dashboard show more clearly?
What would make you use this again?
```

## Analytics validity checks

Before interpreting event data:

- Verify event completeness
- Verify timestamps
- Verify module versions
- Remove invalidated attempts
- Define missing-data rules
- Check whether background time inflated duration
- Confirm misconception classifier accuracy
- Confirm scoring consistency

## Quantitative analysis direction

Depending on design and assumptions:

### Descriptive

- Mean
- Median
- Standard deviation
- Frequency
- Percentage
- Completion rate
- Misconception frequency

### Pretest-posttest

Possible tests:

- Paired-samples t-test when assumptions are met
- Wilcoxon signed-rank test when assumptions are not met
- Effect size
- Confidence interval

### Group comparison

Possible tests:

- Independent-samples t-test
- Mann-Whitney U
- ANCOVA using pretest as a covariate when justified
- Effect size

### Association

Possible analysis:

- Relationship between practice first-attempt accuracy and posttest score
- Relationship between hint use and assessment score
- Relationship between misconception frequency and mastery

Do not select tests only because they are familiar. Match the test to the data, design, and assumptions.

## Qualitative analysis direction

Use thematic analysis or another approved qualitative method.

Suggested process:

1. Familiarize with responses.
2. Create initial codes.
3. Group codes into themes.
4. Review themes.
5. Define themes.
6. Compare student and instructor perspectives.
7. Integrate themes with quantitative findings.

## Mixed-method integration

Recommended structure:

```text
Quantitative findings
    +
Interaction analytics
    +
Qualitative explanations
    =
Integrated interpretation
```

Example:

```text
Finding:
Binary Search posttest improved.

Analytics:
Most remaining errors were BS02 and BS03.

Interview explanation:
Students understood midpoint selection but still confused boundary updates.

Instructional implication:
The next version should strengthen active-range practice.
```

## Success criteria

Possible artifact-success criteria:

- No critical functional or security defects
- Expert ratings meet the approved acceptance threshold
- Students can complete the full workflow
- Usability score reaches the selected benchmark
- Recorded events are sufficiently complete for analysis
- Instructors can identify misconceptions using the dashboard
- Qualitative feedback supports instructional usefulness

Learning-improvement thresholds should be interpreted through statistical and practical significance, not a fixed arbitrary percentage alone.

## Ethics and privacy

Before formal data collection:

- Obtain required institutional approval
- Provide informed consent
- Explain what interactions are recorded
- Separate research consent from normal course grading where required
- De-identify research exports
- Limit access to authorized researchers
- Define retention and deletion rules
- Avoid using analytics to unfairly penalize students
- Allow participants to ask questions about their data

## Research dataset

Recommended de-identified fields:

```text
participant_id
group
module_key
module_version
attempt_number
pretest_score
posttest_score
assessment_score
first_attempt_accuracy
hint_count
retry_count
active_duration
misconception_codes
usability_scores
instructor_usefulness_scores
```

Keep direct identifiers in a separate protected mapping file only when necessary.

## Reporting limitations

Report:

- Sample size
- Institution context
- Selected topics
- Duration of intervention
- Device and connectivity constraints
- Lack of random assignment where applicable
- Prototype module coverage
- Possible novelty effect
- Event-record limitations
- Generalizability limits

## Research deliverables

```text
Expert-evaluation instrument
Student pretest
Student posttest
Student usability questionnaire
Instructor analytics task sheet
Instructor interview guide
Consent form
Data dictionary
Analysis plan
Pilot report
Final evaluation report
```

## Evaluation acceptance criteria

```text
[ ] Research questions match the artifact
[ ] Selected modules are clearly bounded
[ ] Measures align with each research question
[ ] Functional validation happens before student use
[ ] Analytics validity is checked
[ ] Quantitative tests match the design
[ ] Qualitative process is documented
[ ] Privacy and consent are addressed
[ ] Claims match the strength of the design
[ ] Limitations are reported honestly
```

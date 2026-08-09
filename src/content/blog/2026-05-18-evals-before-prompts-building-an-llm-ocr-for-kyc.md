---
title: "Evals before prompts: building an LLM OCR for KYC"
date: "2026-05-18"
description: "Building a production LLM document-extraction system by getting the eval loop right before touching the prompts."
tags: ["llm", "evals"]
canonicalUrl: "https://blog.nilenso.com/blog/2026/05/18/evals-before-prompts-building-an-llm-ocr-for-kyc/"
---

![Golden documents flow through a prompt into a scorecard, and failures feed the next prompt](/images/blog/2026-05-18-evals-before-prompts-building-an-llm-ocr-for-kyc/hero.png)

KYC, or Know Your Customer, is how banks, fintechs, and a growing number of businesses verify that a person is who they claim to be. At the heart of it sits a deeply unglamorous task: typing the fields off a scanned PAN card or Aadhaar into a form. Humans are bad at this. It's boring, error-prone, and, at scale, expensive. Can an LLM do it instead?

Around this time last year, I was trying to answer that question for one of our clients. They were paying a third-party service to do this extraction for them, and the bill was steep enough that they wanted to bring the work in-house. The question was whether LLMs could reduce the cost of document verification without sacrificing the accuracy KYC demands.

Before writing any prompts, I needed to understand the problem first. Which documents we'd see in production, which fields to pull off each one, and what counted as correct. That meant building something to measure against.

## The Golden Dataset

After reviewing the client's existing data, I selected the documents that had already been successfully verified and vetted by a domain expert. This became the **Golden dataset**, a highly curated, human-verified collection of inputs and "_ground truth_" (ideal) outputs that served as the benchmark for evaluating the system. I kept it small but representative of real production distribution.

Starting here mattered because it gave me one number I could defend to the client: "on the kind of documents you actually send us, the system is right X% of the time." Anything fancier, like model comparisons, prompt tweaks, and regression checks, was downstream of having that baseline.

There were four document types: PAN (India's Income Tax ID), Aadhaar (Indian National ID card), DL (Indian Driver's License), and RC (Indian Vehicle Registration Certificate). Each has its own layout and failure modes, and a model can't transfer what it learned from one to another. A single blended accuracy number across all four would have buried the real problem: an LLM that reads one document type perfectly might fail on another. So I split the golden dataset into four slices, one per document type, and treated each as a separate problem with its own baseline and room to iterate.

![The golden dataset split into four slices, one per document type: PAN, Aadhaar, DL, and RC.](/images/blog/2026-05-18-evals-before-prompts-building-an-llm-ocr-for-kyc/dataset_slices.svg)

I included a mix of inputs: flatbed scans and phone photos, glare and skew, the long tail of state-wise DL and RC layouts, and documents with regional-language text alongside English. This kept each evaluation tractable while still reflecting real-world data.

How big should the golden dataset be? It needed to be big enough to be representative of production, small enough that the expert could review every run end-to-end. I settled on 50 documents per document type. That was enough to cover the realistic mix within each slice. Iteration was fast. I could review a full run in hours and do it again whenever I changed a prompt or swapped a model.

## The Rubric and the Loop

One thing that's easy to skip and shouldn't be: the rubric. The rubric is half the dataset. "Did the LLM read this correctly?" is not a yes/no question even for a single PAN card. I sat with the domain expert and pinned down, field by field, what counted as acceptable:

* ID numbers (PAN, Aadhaar, DL number, registration number): exact match, character for character. One wrong character is a failure, full stop. Format-valid hallucinations are the worst kind of failure and are flagged separately from honest misreads.
* Names: do we tolerate ANIL KUMAR vs Anil Kumar? Anil vs Anil Kumar (last name trimmed). Anik vs Anil (character confusion). Anil K vs Anil Kumar (abbreviation). Seshadri vs Sesadri (transliteration variance).
* Date of birth: normalised to a canonical format before comparison, so 01/04/1990 and 1990-04-01 aren't punished as different.
* Hallucinations vs omissions: a hallucinated field is always scored worse than a null or [unreadable]. The rubric says so explicitly, because in KYC, "I don't know" is recoverable and "here's a confident wrong answer" is not.

With the rubric in hand, I moved to human review. For identity documents, no automated check catches what a trained eye does. When a scan is unreadable, LLMs don't say "I don't know". They hallucinate plausible-looking IDs: a 10-character string in the right AAAAA9999A shape, a 12-digit Aadhaar that passes the checksum, a name read into the father's name slot. Reviewing each extraction side by side with the source image, I could see the failure modes started to repeat in the same handful of shapes. These patterns were the only things that told me what to fix next.

With the dataset, the rubric, and a reviewer in place, I had an eval loop. Run a prompt against all 50 documents in a slice, collect the extractions, score each one against the rubric, and walk away with two things: a number for that slice and a list of why each failure happened. The list, not the number, was what drove the next prompt change. Then run it again.

![The eval loop: prompt → run on slice (50 documents) → score against rubric (reviewer + checks) → number and failure list → revise prompt and repeat.](/images/blog/2026-05-18-evals-before-prompts-building-an-llm-ocr-for-kyc/eval_loop.svg)

## Iterating on the Prompt

My first prompt was a one-liner. Something close to "Extract the following fields from this image." I was running this against Gemini 2.0 Flash. The client had a preference for the Gemini family, and Flash was the cheapest vision model in it. I picked PAN to start with, the simplest layout and fewest fields. I got that working, and only then moved on to Aadhaar, DL, and RC. From there, the iterations on each prompt fell into three rough phases.

**Phase 1: Structure**. The first round of changes had nothing to do with reading documents better, only with how the prompts were organised. I gave each document type its own prompt. Trying to write one that handled all four had been a losing battle, since the layouts, critical fields, and failure modes were too different. I separated system and user prompts so instructions and inputs weren't tangled. I pinned down the output schema explicitly instead of letting the model decide. I dropped the temperature close to zero. And I rewrote the instructions to be short and direct. Every "please" and "kindly" came out. Standard prompt-engineering moves, mostly. They did real work, but only got me partway.

**Phase 2: Domain context**. The next round was about teaching the model what it was looking at. A naked "extract the DL number" didn't help when the document had multiple numbers on it. What helped was spelling out the rule for the field itself. For DLs, "Indian Driving Licence numbers follow state-specific formats like KA-XX-YYYYNNNNNNN". I added similar context for each ID type. Aadhaar is exactly 12 digits; PAN follows AAAAA9999A, and so on. I supplemented the prompt with a few-shot examples drawn from the client's own annotations. The model was now wrong less often, and when it was, the wrongness was easier to spot.

**Phase 3: Decomposition**. The change that mattered most was in how the work was split up. Instead of having one prompt return all fields for a document type at once, I split the extraction into multiple focused calls, one per field. The single-call version was juggling too much: layout, language, format, and field semantics, with errors in one field bleeding into others. Per-field calls were slower and more expensive, but each call was simple enough that the model stopped tripping over itself.

By the end of these iterations, the system achieved **92% accuracy** on the golden set at **10% of the third-party service's cost**.

| Metric | Third-party | LLM pipeline |
|--------|------------|--------------|
| Accuracy (golden set) | baseline | 92% |
| Latency p99 | ~10s | 7.9s |
| Cost (per 1M docs) | $10,000 | $1,000 |

When we shipped, the model itself had improved enough that I could drop the decomposition and go back to a single call per document. The workaround had quietly outlived its usefulness.

## What I'd Do Differently Today

Looking back a year later, two things would change.

I'd add chain-of-thought to the prompt. Asking the model to first describe what it sees in the document and then extract it would have caught many of the errors I was chasing through prompt rewrites.

I'd also explore using an LLM-as-judge to speed up the iteration loop. With the rubric and a few hundred labelled examples in place, a judge could compare each extraction against the ground truth and surface failures, letting me review only what got flagged instead of every document. The caveat: the judge can be wrong too, so its calls would need their own evaluation, a topic for another post.

**What I wouldn't change** is the engine: _the golden dataset_, _the rubric_, _the eval loop_. The prompts just tuned it. I could have rewritten instructions endlessly, swapped models, or tweaked the temperature. Instead, I built a baseline, nailed down what correct meant, and ran the same documents through the same rubric after every change. It's unglamorous work. But it's where the actual work happened.

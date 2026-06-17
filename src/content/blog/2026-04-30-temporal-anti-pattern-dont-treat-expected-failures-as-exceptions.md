---
title: "Temporal anti-pattern: Don't treat expected failures as exceptions"
date: "2026-04-30"
description: "A simple way to distinguish business logic failures from system exceptions."
tags: ["temporal", "exceptions"]
canonicalUrl: "https://blog.nilenso.com/blog/2026/04/30/business-errors-are-outcomes-not-exceptions/"
---

We recently worked on partner onboarding for a logistics platform. When a new delivery partner signs up, they upload identity documents. The system runs OCR on each document, validates the extracted fields, and marks the document as verified or rejected. A partner can't start taking deliveries until this is completed.

The previous flow took 3-4 days. The goal was same-day onboarding. The verification pipeline is inherently failure-prone: OCR can time out, validation services can stall, external APIs can rate-limit, and some cases need human review. We needed durable execution, automatic retries, and the ability to pause a workflow for hours and resume safely. That's what led us to [Temporal](https://temporal.io/).

In the Temporal framework, the individual tasks are modelled as [Activities](https://docs.temporal.io/activities), and the orchestration logic as the [Workflow](https://docs.temporal.io/workflows).

![Document verification workflow](/images/blog/temporal-anti-pattern-dont-treat-expected-failures-as-exceptions/document-verification-workflow.svg)

Temporal uses exceptions as its primary mechanism for handling failures, so we initially modelled our validation Activity the same way:

```kotlin
fun validateDocument(extractedData: ExtractedData): Boolean {
    if (extractedData.documentNumber == null) {
        throw ValidationException("Document number not found")
    }
    if (!isValidFormat(extractedData.documentNumber)) {
        throw ValidationException("Invalid document number format")
    }
    ...
    return true
}
```

The Workflow caught the exception to route the rejection:

```kotlin
override fun processDocument(document: Document) {
    try {
        val extractedData = activities.runOcr(document)
        activities.validateDocument(extractedData)
        markVerified(document.id)
    } catch (e: ActivityFailure) {
        markRejected(document.id, e.cause?.message)
    }
}
```

## Why is this a problem?

When an Activity throws an exception, Temporal treats it as a failure. The exception travels through Temporal's infrastructure and arrives at the Workflow wrapped in an `ActivityFailure`.

Temporal's [failure handling guidance](https://temporal.io/blog/failure-handling-in-practice) distinguishes between platform-level and application-level errors. You can mark an application-level error as [non-retryable](https://docs.temporal.io/references/failures#non-retryable) `ApplicationFailure` to skip retries, or flag it as [Benign](https://docs.temporal.io/develop/java/activities/benign-exceptions) to suppress metrics and log noise.

But the Workflow still receives a rejected document the same way it receives a crashed worker: as an `ActivityFailure` in a catch block. A partner uploading a blurry photo looks the same as a network timeout. And when you need to add new rejection reasons or route them differently, you're working inside catch blocks that also handle genuine crashes, making the code fragile to change.

## The fix

Instead of throwing an exception for a rejected document, *we **return the outcome as data***. The result flows through Temporal's normal return path. No failure machinery is triggered. Both verification and rejection become explicit branches in your workflow logic. The `try/catch` block is then correctly relegated to handling actual infrastructure failures.

We represent both success and rejection as explicit variants of a single return type:

```kotlin
sealed class ValidationResult {
    data class Verified(val data: VerifiedData) : ValidationResult()
    data class Rejected(val reason: String) : ValidationResult()
}

fun validateDocument(extractedData: ExtractedData): ValidationResult {
    if (extractedData.documentNumber == null) {
        return ValidationResult.Rejected("Document number not found")
    }
    if (!isValidFormat(extractedData.documentNumber)) {
        return ValidationResult.Rejected("Invalid document number format")
    }
    ...
    return ValidationResult.Verified(extractedData.toVerified())
}
```

The Workflow uses a `when` block instead of `try/catch`:

```kotlin
override fun processDocument(document: Document) {
    val extractedData = activities.runOcr(document)
    val result = activities.validateDocument(extractedData)
    when (result) {
        is ValidationResult.Verified -> markVerified(document.id)
        is ValidationResult.Rejected -> handleRejection(document.id, result.reason)
    }
}
```

The rejected document is no longer an interruption. It's a state the workflow transitions to. Business failures are part of the domain. They deserve to be modelled as first-class outcomes because code that models outcomes explicitly grows with the business instead of fighting against it.

---
title: "Sandboxing Megasthenes"
date: "2026-06-25"
description: "How we sandbox Megasthenes, our code-research agent SDK for analysing untrusted repositories."
tags: ["llm", "sandbox"]
canonicalUrl: "https://blog.nilenso.com/blog/2026/06/25/sandboxing-ai-agents/"
---

![A client talks to a sandboxed worker and agent, while host files and network access are blocked](/images/posts/2026-06-25-sandboxing-megasthenes/hero.png)

Everyone is racing to add LLMs to their systems. At the same time, nobody wants an agent running loose with access to the filesystem or the network. You definitely do not want an agent sending your data back home.

That is the challenge we had to solve while building Megasthenes, our SDK for building code-research agents. Megasthenes lets you point an agent at any GitHub or GitLab repo, ask questions about it in natural language, and get sourced, evidence-backed answers.

So how do you protect your host from code and inputs you do not control? You box the agent in. This post looks at how the Megasthenes sandbox works and the tradeoffs behind it.

## Reducing the surface area

The goal is to reduce the agent's surface area without taking away the tools it needs. In Megasthenes, that means letting the worker clone a repository into the sandbox so the agent can inspect files in the repo, search the tree, and walk git history, while denying direct access to the host filesystem, visibility into secrets and other processes, and network access during tool execution.

Megasthenes enforces that boundary with a two-part system: the **client** orchestrates the LLM loop, and the **worker** is an HTTP server inside the container. The client can talk to the worker only through constrained HTTP APIs. The worker clones repositories, runs tools, and keeps repository access inside the sandbox and away from the host filesystem.

<div style="text-align: center; margin: 0; padding: 0;">
  <p style="margin: 0 0 0.1rem 0; text-align: center;"><strong>Megasthenes sandbox architecture</strong></p>
  <img
    src="/images/posts/2026-06-25-sandboxing-megasthenes/architecture.svg"
    alt="Sandbox architecture. The LLM API sits outside the host machine. On the host, your application uses the Megasthenes client. The client talks over HTTP to the Megasthenes worker inside a sandbox implemented as a Linux container with gVisor. Host filesystem, secrets, and network stay outside the sandbox boundary."
    style="display: block; width: 100%; max-width: 900px; margin: 0 auto;"
  />
</div>

The worker runs on Linux because the sandbox relies on Linux container isolation and gVisor. As an additional layer, you can secure requests to it with an authorization token sent along with every request.

For the full sandbox API and setup details, see the [Megasthenes documentation](https://nilenso.github.io/megasthenes/guides/sandbox/).

## The four isolation layers

The sandbox works by stacking several boundaries. Together, these layers limit what the agent can do, validate what it asks for, restrict what it can see, and cut off what it can reach.

We enforce that boundary through four layers.

1. **Application hardening:** worker-side input validation and a small tool surface keep each call scoped to a repository.
2. **Network denial after clone:** [seccomp](https://en.wikipedia.org/wiki/Seccomp) blocks network syscalls during tool execution.
3. **Filesystem and process isolation:** [bubblewrap](https://www.linuxfromscratch.org/blfs/view/svn/general/bubblewrap.html) and Linux namespaces ensure tools can see only the worktree they need, not the rest of the host.
4. **Runtime isolation:** the worker runs inside a Linux container with [gVisor](https://gvisor.dev/), adding another boundary before the host kernel.

![Four stacked isolation layers between an untrusted repo (top) and the host (bottom): L1 application hardening, L2 seccomp, L3 bubblewrap, L4 container with gVisor. A red arrow shows the attack path descending through every layer to reach the host.](/images/posts/2026-06-25-sandboxing-megasthenes/isolation-layers.svg)

Megasthenes combines worker-side input validation with Linux sandboxing primitives such as seccomp and namespaces, then runs the whole thing inside a container with gVisor. A mistake in one layer should not immediately become host access.

## Why this design

We considered a few alternatives.

**Running directly on the host** would have been the simplest option, but also the least safe. If an agent can read arbitrary files, spawn processes, or use the network on the host, prompt injection and tool misuse become host-level problems.

**Plain Docker isolation** was better, but not enough for the threat model we cared about. We wanted tighter control over filesystem visibility, network use after cloning, and another boundary in case container isolation was not enough on its own.

**MicroVMs** were attractive from an isolation perspective, but heavier operationally than what we wanted for this workflow. We were looking for something easier to ship and integrate into an existing Docker-based system.

This design is the middle ground we chose: stronger than a stock container, lighter than full VM orchestration.

## The Tradeoffs

**Linux-only.** The worker depends on Linux container isolation and gVisor, so the isolated execution path runs there.

**Worker Overhead.** Every tool call goes through the worker. That adds overhead, though it is small compared to LLM latency.

**Full isolation still needs operational guardrails.** Timeouts and storage limits help, but if you run this in production against truly untrusted inputs, you should still add CPU and memory limits at the container or orchestration layer.

## Why this matters

Once an agent can read code, run tools, or touch a filesystem, sandboxing stops being optional. The details will vary, but the principle stays the same: keep the boundary narrow and assume the model will eventually try something you did not intend.

Check out the Megasthenes SDK at [nilenso/megasthenes](https://github.com/nilenso/megasthenes).

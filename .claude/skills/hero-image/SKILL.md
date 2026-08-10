---
name: hero-image
description: Generate the prompt for a post's hero or thumbnail illustration in the blog's house style. Use when creating, regenerating, or restyling artwork for a post on this site.
---

# Hero image prompt

Produces the image-generation prompt for a post illustration. The STYLE block is
fixed so every illustration reads as one family; only the SUBJECT line changes
per post.

## When to use this skill

- Creating a hero image for a new post
- Regenerating or restyling an existing post's artwork
- Producing the `thumbnail.png` social card for a post

## How to use

1. Identify the post's core idea in one sentence. Not the title — the tension or
   distinction the piece actually turns on.
2. Choose one visual metaphor for that idea. One central metaphor, not a
   collage. If two metaphors compete, the illustration will read as noise.
3. Emit the STYLE block below verbatim, then append a single SUBJECT line.
4. **Attach the reference images.** Words alone do not reproduce this style.
5. Save output per the file conventions below.

## Reference images — attach these, do not rely on the prose

The prose STYLE block is necessary but not sufficient. Text descriptions
reliably produce the right palette and the wrong drawing. Always give the
generator the reference images alongside the prompt:

- `public/images/posts/2026-06-25-sandboxing-megasthenes/hero.png` — the
  canonical hero. Referenced at its published path rather than copied here, so
  it cannot drift out of sync. Use it for overall composition, line weight,
  shading restraint, and how much space the subject occupies.
- `reference/robot-detail.png` — a crop of the robot from that hero. Use it
  whenever the illustration includes a robot. This is the house robot; it should
  look like the same character every time, not a new robot per post.

Phrase it to the generator as: match the style, line weight, and character
design of the attached reference images.

Measured effect. The same agent (pi, hand-authoring SVG), same post, same STYLE
block, run twice:

| | prose only | + reference images |
|---|---|---|
| robot | a square with two dots | the house robot, correct |
| darkest tone | #cd8c25 (gold) | #402e1b (warm brown) |
| gold accent | 0.32% | 0.98% |
| checker | PASS | PASS |

Both runs passed the checker. Only the second one was usable. Attaching the
references is what changed it, so treat step 4 as mandatory rather than a
nicety.

An agent needs to be told to *read* the reference files, not merely given the
paths — pi opened them with its read tool once the prompt said "read both images
before drawing and match them closely".

Do not edit the STYLE block per post. Its whole purpose is that it does not
vary. If a post genuinely cannot be served by it, say so rather than quietly
drifting the palette.

## The prompt

Emit everything between the rules, unchanged, then the SUBJECT line.

---

Create a minimalist editorial vector illustration for a personal
software-engineering blog.

STYLE — keep this consistent across all illustrations: Warm, understated
editorial illustration with a refined vintage-tech feel. Use a warm ivory/cream
background (#faf6ec) with subtle lighter cream areas (#f3ecdb). Use muted
mustard/gold (#d49423) as the primary accent and deep warm brown (#42301d)
sparingly for outlines and important details. Use warm beige and muted brown as
secondary tones. Avoid bright saturated colours. Keep the background a flat,
uniform colour with no vignette, gradient wash, or tinted edges.

Use thin, elegant monoline outlines, simple geometric shapes, flat vector fills,
very subtle tonal gradients, and extremely restrained shading. Keep the artwork
2D, crisp, airy and lightweight, with lots of negative space. Rounded corners and
softly organic geometric forms are preferred over sharp technical diagrams.

The composition should feel like a thoughtful editorial illustration rather than
a SaaS marketing graphic. Use one clear central visual metaphor, supported by a
few small symbolic objects around it. Small details such as stars, dots, paper,
books, simple robots, or geometric objects can add personality, but they should
remain subtle.

Use thin dashed connector lines and gentle curved paths when representing
processes or relationships. Diagrams should feel illustrative and human rather
than like a technical architecture diagram.

Characters, if needed, should be friendly robots drawn in one specific recurring
design, never realistic humans. The robot has a smooth rounded dome head in cream
white; a single large dark warm-brown rounded-rectangle visor covering most of
the face, holding two plain white circular eyes with no pupils, no mouth and no
nose; a rounded gold oval ear pad on each side of the head like headphones; a
thin dark antenna rising from the top of the head ending in a solid gold ball;
and a soft rounded pill-shaped torso with simple tube arms. Outline it in a thin,
even dark-brown monoline with very subtle warm shading on the upper dome. The
robot should read as calm and competent, sized as a real participant in the
scene rather than a tiny decorative sticker. Keep interface elements extremely
minimal and do not include readable text, labels, logos, or UI copy.

LAYOUT: 16:9 wide horizontal composition suitable for a blog hero image,
approximately 1600×900, generous whitespace, visually balanced left-to-right
composition, central subject slightly dominant, elements comfortably contained
within the frame.

DO NOT: use neon colours, blue/purple gradients, bright red, glossy 3D rendering,
photorealism, heavy shadows, complex UI mockups, excessive detail, thick
outlines, corporate stock-art aesthetics, or generic futuristic cyberpunk
imagery.

Overall aesthetic: warm editorial illustration × vintage technical drawing ×
modern flat vector art × subtle Indian/print-inspired warmth. Calm, intelligent,
playful, sophisticated, and cohesive with a cream-and-gold personal blog design.

No text. No photorealism. No 3D. No drop shadows. No watermark.

---

Then append one line:

    SUBJECT: Illustrate [POST TOPIC] using a simple visual metaphor: [VISUAL METAPHOR].

## Worked example

For the Temporal post:

    SUBJECT: Illustrate the distinction between expected business failures and
    unexpected system exceptions in Temporal workflows. Show a workflow branching
    into two paths: one calm, intentional business outcome and one unexpected
    system failure, using simple symbols rather than text.

Note the shape: it names the distinction, then the metaphor that carries it, then
"using simple symbols rather than text". The last clause matters — generators
reach for labels otherwise, and the STYLE block forbids readable text.

## Where the files go

One folder per post, named for the post id (the markdown filename without its
extension):

    public/images/posts/<post-id>/hero.png
    public/images/posts/<post-id>/thumbnail.png

`thumbnail.png` is the social card. It is resolved from the post id, not from
frontmatter, so nothing is configured per post: `posts/[slug].astro` uses it for
`og:image` and `twitter:image`, and `rss.xml.ts` for `<media:content>`,
`<media:thumbnail>`, and `<enclosure>`. Without it, `postThumbnail` falls back to
`hero.png`, then to the site-wide image.

Keep any editable vector source (`.svg`) beside the exported `.png`.

## Verifying a generated image

Generators drift. Check the result before committing it:

    python3 .claude/skills/hero-image/check-image.py public/images/posts/<post-id>/hero.png

It measures aspect ratio, background colour and flatness, how sparingly the gold
accent is used, the darkest tone, and the absence of forbidden colours. Exits
non-zero on failure, so it can gate a commit. Standard library only.

A failure is a prompt problem, not a reason to hand-edit the image: regenerate
rather than patching the export.

## Notes

Measured against the three published heroes, so the prompt describes what the
family actually looks like rather than what was once hoped for:

- The outline colour is warm brown, not maroon. An earlier version of this prompt
  asked for deep maroon (#8b2f2f); none of the three images contain a single
  pixel near it (0.000%, 0.000%, 0.001%). Their darkest tones are #42301d,
  #282018, and #2e1d09, all warm browns. The prompt now names the brown so new
  images match the ones already published. Reintroducing maroon would split the
  family visually.
- Gold lands accurately: the most saturated pixels sit at roughly #d1912f against
  the specified #d49423, covering 0.35–0.68% of each image, which is the intended
  sparing accent.
- Backgrounds drifted slightly lighter than specified (#fdf7ee, #fbf4ea, #fdf5ec
  against #faf6ec) — barely perceptible, but the flat-background instruction was
  added to hold it closer. #faf6ec matches the site's `--bg`, so artwork sits
  flush with the page rather than reading as a pasted-in rectangle.
- The published heroes are 1672×941, 1682×935, and 1717×916: near 16:9 by luck
  rather than instruction. The ratio and size are now stated explicitly.
- Existing images carry more UI panels than "keep interface elements extremely
  minimal" implies. Left as is, since they read well; worth watching if future
  images start looking like product screenshots.
- Editing this file mid-session does not take effect immediately: the skill
  loader serves the copy it read when the session started. After changing
  SKILL.md, reload before testing, or you will evaluate the old prompt and draw
  the wrong conclusion. Verify with `grep` against the file on disk.

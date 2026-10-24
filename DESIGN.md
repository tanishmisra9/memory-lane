---
name: Memory Lane
description: Paper-and-ink reminiscence sessions: a jukebox title-strip world with hard offset shadows.
colors:
  paper: "#fffdd0"
  surface: "#fffef0"
  ink: "#14110e"
  muted-ink: "#5d544a"
  action-mustard: "#e9b21a"
  stock-red: "#c62d26"
  stock-green: "#1a7a43"
  stock-cobalt: "#2858c8"
  on-stock-white: "#ffffff"
  night: "#17120f"
  night-surface: "#221b16"
  night-ink: "#f3ede2"
  night-muted: "#b3a898"
  night-shadow: "#000000"
  error-soft: "#ffb4a8"
  print-white: "#ffffff"
  print-black: "#000000"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(42px, 6.4vw, 92px)"
    fontWeight: 700
    lineHeight: 0.94
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(40px, 8vw, 72px)"
    fontWeight: 700
    lineHeight: 1.02
  section:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.02
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.05
  input-large:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "44px"
    fontWeight: 700
  lede:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.55
  note:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  button:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  square: "2px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.action-mustard}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "10px 24px"
    height: "52px"
  button-quiet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "10px 14px"
    height: "56px"
---

# Design System: Memory Lane

## Overview

**Creative North Star: "The Title Strip on Paper"**

A jukebox title strip, printed on paper stock and laid on a cream desk: ink outlines, hard offset shadows, three printing inks, one action color. Every screen holds one idea and leaves the rest empty. The look comes from the Telogify system (paper, ink, offset shadows, springs) with the Rockola's condensed capitals and stock colors, and from the Portfolio's outlined display type.

It refuses the clinical caregiving app, the dark music grid, the sepia scrapbook, and the agent dashboard. There are no pills, no gradients, no emoji, and no filler sections.

**Key Characteristics:**
- Paper ground, ink lines, a 4px hard offset shadow that lifts toward the cursor.
- Square corners everywhere (2px).
- Stock colors mean something: red is a song Qloo found, cobalt is a film or a song they named, green is a show. Mustard is only the action.
- Light by default, with an espresso night theme and a toggle that remembers itself.
- Motion is a spring (stiffness 120, damping 20) and a blur-fade reveal, and switches off for reduced motion.

## Colors

A committed paper-and-ink palette with three printing stocks and one action color.

### Primary
- **Action Mustard** (#e9b21a): the one action color: primary button, focus ring, the era window band, text selection.

### Secondary
- **Stock Red** (#c62d26), **Stock Green** (#1a7a43), **Stock Cobalt** (#2858c8): code blocks, the player marker, the queue's current item, progress. White text sits on them (**On-stock White** #ffffff, 5.4:1 or better).

### Neutral
- **Paper** (#fffdd0) is the page; **Surface** (#fffef0) is the card and field; **Ink** (#14110e) is text, borders and the shadow; **Muted Ink** (#5d544a) is secondary text (6.9:1 on Surface).
- Night theme: **Night** (#17120f) page, **Night Surface** (#221b16), **Night Ink** (#f3ede2), **Night Muted** (#b3a898), **Night Shadow** (#000000).
- **Error Soft** (#ffb4a8) is error text on night; errors are Stock Red on paper.
- **Print White** (#ffffff) and **Print Black** (#000000) appear only in the print stylesheet.

### Named Rules
**The One Action Rule.** Mustard marks the one thing to do. It is never a stock color and never decoration.
**The Stock Rule.** A stock color belongs to a code block, a marker, or a progress fill. Never body text, never a region background.

## Typography

**Display Font:** Barlow Condensed (Arial Narrow fallback)
**Body Font:** Barlow (system-ui fallback)

**Character:** Condensed capitals read like a printed title; the sans body is large and plain for older eyes. Display type on the landing is outlined (Portfolio's ghost heading) for the first sentence and solid for the second.

### Hierarchy
- **Display** (700, clamp 42 to 92px, 0.94): the landing headline.
- **Headline** (700, clamp 40 to 72px, 1.02): the title of a screen or a song.
- **Section** (700, 36px): sections of the Memory Book and the drawer.
- **Title** (700, 28px): a song or film inside the book. **Input Large** (700, 44px): the birth year.
- **Lede** (400, 20px): the sentence under a headline; about 40 characters wide.
- **Body** (400, 18px, 1.55): copy and fields. **Note** (15px): hints and the footer. **Caption** (600, 13px): timeline years and key hints.
- **Button** (700 condensed, 22px, 0.06em, uppercase).

### Named Rules
**The One Voice Rule.** Condensed capitals are for titles, buttons and labels. Running text is never condensed or uppercase.

## Layout

A 1180px column with 20px gutters. The player is two columns above about 700px (artwork, then the title, era timeline, transport and reactions) and one column below. The landing splits 7 to 5 at 960px, with the one action and the era picture both visible on the first screen. Setup is one question per screen at 760px. Spacing runs on 8, 12, 16, 24, 40; headings take more space above than below. Every control is at least 44px tall, and nothing scrolls sideways.

## Elevation & Depth

Hard offset shadows with no blur: 4px at rest, 6px on hover (the card lifts 2px toward the cursor), 1px when pressed. The shadow color is Ink by day and Night Shadow by night. The drawer is the only overlay: a flat card with a dimmed scrim. A faint paper-grain texture sits over the page (opacity 0.04 by day, 0.07 by night).

## Shapes

Square. Every card, button, field and marker uses a 2px radius; the browser test fails on anything above 8px. Borders are 1.5px Ink. The only circles are none: even the artwork is a square.

## Components

### Buttons
- **Primary:** Action Mustard, Ink border and text, 52px tall, offset shadow, lifts on hover, presses in on active.
- **Quiet:** Surface fill, the same border and shadow, 44px tall. **Text button:** underlined muted text for low-weight actions.

### Strip and queue
- A queue of 8 numbered squares (A1 to B2). The current one fills with its stock color; marked ones carry a colored underline. This is the session's progress, and it is also a control.

### Player
- Artwork with a cursor-following tilt, an era timeline (ages 0 to 40, the 10-to-30 window shaded, a red marker that springs to the song's age), a 88px square play button, a scrubbable progress line, and three reaction buttons with number shortcuts. Reactions Smiled and Okay open a one-line note.

### Drawer ("Why this")
- A right-hand card that traps focus, dims and inerts the page, and closes on Escape. It lists where the song came from, why it is from their youth, why it is gentle and familiar, and what could not be checked.

### Memory Book
- A care-staff card (worked, neutral, avoid, not tried), one timeline of every item (points for dated songs, bars for artists known only by active years), then one card per item with the reaction and the words written.

### Inputs / Fields
- Surface fill, 1.5px Ink border, 56px tall; focus adds a 3px Action Mustard offset shadow. Errors read in Stock Red.

## Do's and Don'ts

### Do:
- **Do** keep each screen to one idea and leave space.
- **Do** keep every control at least 44px tall and every text pair at least 4.5:1.
- **Do** show real data: a bar for what is only known as a span, a point for what is dated.
- **Do** switch motion off for reduced motion.

### Don't:
- **Don't** use pills, circles, gradients, glass or emoji.
- **Don't** use mustard as anything but the action.
- **Don't** repeat a fact on every card.
- **Don't** invent a year for a song Qloo only knows by an artist's active years.

## Not canonized (defects the build carries)

- The paper-grain overlay and the offset shadow come from Telogify; the craft floor would refuse offset shadows outside this world.
- The type ramp has more steps than a system needs (13 to 92px). It is recorded as built, not recommended.

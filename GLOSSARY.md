# beatdeck

A fixed-stage presentation engine where a talk is a sequence of beats, and the tooling that proves every beat renders.

## Language

**Stage**:
The fixed 1920×1080 canvas a talk is drawn on, scaled to the screen. All positions are stage pixels.
_Avoid_: slide, canvas, viewport

**Scene**:
A numbered group of beats that share one layer of the stage (`02 IDEA`).
_Avoid_: section, chapter

**Beat**:
One step of the talk, reached by one click; the whole stage is derived from its position (`#scene.beat`).
_Avoid_: slide, step, build

**Chrome**:
The system furniture on top of the stage (deck title, scene id, beat ticks); the deck's own or the default.
_Avoid_: header, HUD

**Safe area**:
The stage minus a margin (default 120 px left/right, 100 px top/bottom) that text should stay inside to read from the back of the room. Chrome is exempt.
_Avoid_: padding, bleed

**Covered text**:
Visible text with another element painted on top of it (a card, image, video or shape), so part of it cannot be read. Reported as a warning by the audit.
_Avoid_: hidden text, overlap (that is text over text)

**Export**:
A still copy of a talk as files: a PDF or a folder of PNGs, one page per beat, from the beat's settled frame.
_Avoid_: print, render, slides

**Handout**:
An export with one page per scene, taken from its last beat.
_Avoid_: summary, slide deck

**Export loss**:
What a beat's page cannot keep of what the audience sees live: motion, a live switch, text covered by another element. Reported per page by the export.
_Avoid_: export error, bug

**Variant**:
A look of the whole talk the speaker switches live outside the beat, such as a dark or light theme. The export pins one and can export each.
_Avoid_: mode, setting

**Locale**:
A language a talk is given in, written as a language code (`en`, `es`). A deck declares its locales; each is built as its own bundle.
_Avoid_: translation, language pack

**String table**:
The per-locale file of every piece of localized text of a deck (stage text, beat notes, deck title), shaped like the first locale's table.
_Avoid_: dictionary, resource file, translation file

**Beat map**:
The list of scenes and beats of a talk, shared by all its locales.
_Avoid_: outline, agenda

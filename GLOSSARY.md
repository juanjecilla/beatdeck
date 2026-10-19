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

**Locale**:
A language a talk is given in, written as a language code (`en`, `es`). A deck declares its locales; each is built as its own bundle.
_Avoid_: translation, language pack

**String table**:
The per-locale file of every piece of localized text of a deck (stage text, beat notes, deck title), shaped like the first locale's table.
_Avoid_: dictionary, resource file, translation file

**Beat map**:
The list of scenes and beats of a talk, shared by all its locales.
_Avoid_: outline, agenda

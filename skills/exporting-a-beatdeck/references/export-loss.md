# Export loss

What `npm run export` reports, why, and what to do. A page is one beat's settled frame, so anything that happens
over time or on a key press is outside it.

| Report line | Cause | Fix |
| --- | --- | --- |
| `auto beat: the page shows the end state` | The beat has a timeline (typing, counting, a sequence). The page is where it ends. | Check the end state reads on its own. If the motion carries the meaning, add a beat that shows the middle step, or tell the speaker what the page omits. |
| `still animating after … ms` | The frame had a tween or finite animation running at the timeout. The page caught a random moment. | Find the animation that outlives the beat (a long timeline, a transition on a changing value) and shorten it, or raise `--max-wait` if it is simply slow. |
| `ambient motion (… differ by N%)` | A loop that never ends (particles, a ticking counter, noise) changes the frame between two shots 400 ms apart. | Freeze the loop under `?capture=1` (the engine already freezes auto-advance, cursor blink and the cursor); read `flags.capture` in the component. |
| `"…" is covered by <tag.class>` | A background, image, video or painted SVG shape sits on top of the text. | Move the covering element behind the text in the DOM, or give it `data-audit="off"` when the overlap is the design. |
| `text overlaps: …` (error) | Two lines of text share the same pixels. | Move one, or `data-audit="off"` for an intentional glitch layer or shadow copy. |
| `<html data-… > is set by the deck` | The deck changes `<html>` outside the beat (a theme on a key). | Declare it in `variants` (SKILL.md, step 4). |
| `localStorage key "…" is set at load` | The deck keeps state outside the beat. | Check it does not change the look; if it does, make it a variant. |
| `<html …> changed after it was pinned` (error) | The deck rewrites a pinned variant on its own. | Stop the deck resetting it after load, or its `values` do not match the attribute it really uses. |
| `print differs from the screen by N%` (info) | Chromium's print drops or changes something: `backdrop-filter` and `mix-blend-mode` are the usual causes. | The page is an image with an invisible text layer, so it is still searchable. Remove the CSS feature for a vector page, or accept the image. |
| `text layer: N character(s) outside Latin-1` (info) | The invisible text of an image page covers Latin-1 only. | Search on that page misses those characters; the picture is unaffected. |

## Not checked (revisit when a talk needs it)

- Video, iframe and canvas content: exported as whatever frame is on screen, or blank in the print.
- Mid-fade frames: a beat that settles into partial opacity is exported as it stands.
- A handout drops the earlier beats of a scene; when later beats replace earlier content, that content is missing
  from the handout page.
- A variant held in React state instead of an `<html>` attribute cannot be pinned.
- Size: shadows and large backgrounds make a long deck's PDF tens of MB.

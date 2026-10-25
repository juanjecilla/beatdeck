# The PDF is vector, each page checked against the screen

`npm run export` prints every beat with Chromium (`page.pdf`), so the PDF has real, selectable text and stays small. Each printed page is then rasterised with PDFium (Chrome's own PDF engine) and compared with the screenshot of the same frame; a page that differs by more than `--diff` (1.5% of pixels) becomes the screenshot plus an invisible text layer, so it is still searchable, and is listed in the report.

Considered and rejected: an all-raster PDF (always faithful, but no selectable text and a larger file), and a vector-only PDF (print rendering ignores `backdrop-filter` and `mix-blend-mode` and can differ elsewhere, so a page could be silently wrong; measured 5–7% against ≤0.6% for ordinary pages).

The comparison needs a rasteriser that agrees with Chrome. pdf.js did not: it draws CSS `box-shadow` as dark halos, so every light-themed page with cards looked broken. PDFium agrees with the screen to about 0.03%. A page that moves between the screenshot and the print (ambient animation) is not compared, since the difference would be the motion; it keeps the vector page and is reported as an export loss.

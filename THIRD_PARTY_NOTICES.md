# Third-party notices

Checked against the linked source pages on 2026-10-02. Keep these notices and
license files with the deployed site. This inventory covers supplied assets;
it does not guarantee rights in every possible use of generated artwork.

- Cabin ambience: “Ambience, Airbus Plane, Interior, Loop, A.wav” by InspectorJ
  (https://www.jshaw.co.uk/), https://freesound.org/people/InspectorJ/sounds/321169/.
  CC BY 4.0: https://creativecommons.org/licenses/by/4.0/.
  Adapted by decoding, crossfading the loop boundary and reducing the level.
- Page turn: “Page Turn (1)” by OwlStorm / Ashe Kirk,
  https://freesound.org/people/OwlStorm/sounds/151220/.
  CC0: https://creativecommons.org/publicdomain/zero/1.0/. Level adjusted.
- Cloud photograph: “Clouds-Airplane.jpg”, Evan-Amos,
  https://commons.wikimedia.org/wiki/File:Clouds-Airplane.jpg. CC0. Cropped and tinted.
- Sunset: “Sunset from an airplane.jpg”, JoyD Smiths PTMr8,
  https://commons.wikimedia.org/wiki/File:Sunset_from_an_airplane.jpg. CC0. Cropped and tinted.
- Cloud towers (retained reference asset): Alf van Beem,
  https://commons.wikimedia.org/wiki/File:Cumulonimbus_from_an_airplane_at_32000ft,_pic2.JPG.
  CC0. Not selected by the current flight scenery sequence.
- Map outlines: Natural Earth, public domain,
  https://www.naturalearthdata.com/about/terms-of-use/. Simplified and projected
  for illustrative routes, not live flight tracking.
- Source Sans 3: Adobe, SIL Open Font License 1.1. License:
  `assets/fonts/SourceSans3-OFL.txt`.
- Patrick Hand: Patrick Wagesreiter, SIL Open Font License 1.1. License:
  `assets/fonts/OFL.txt`.
- Announcements: generated locally with Kokoro v1.0,
  https://huggingface.co/hexgrad/Kokoro-82M (Apache 2.0), via kokoro-onnx
  https://github.com/thewh1teagle/kokoro-onnx (MIT). Filtered and mixed with an
  original chime. License copies and the model card are in
  `assets/audio/samples/licenses/`. Models and runtime are not distributed.
- Lounge music, seatbelt click and runway/touchdown cues: original project
  synthesis, without third-party samples.
- Cabin, terminal, hands/book, drinks and postcards: project-generated artwork.
  Production notes are retained in repository `docs/design/`. Pauwee is a design
  reference; its audio, source code and screenshots are not runtime assets.

## Inflight globe · local v49 preview

Natural Earth 1:110m land polygons, public domain:
https://www.naturalearthdata.com/about/terms-of-use/
Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson
Coordinates rounded to three decimals; exterior rings projected locally on canvas.
City light clusters are decorative project graphics, not satellite imagery.
The current map does not load Leaflet or OpenStreetMap tiles.

## Geographic projection · D3

d3-array 3.2.4 and d3-geo 3.1.1, fixed upstream UMD builds wrapped as a local ES module in src/geo-projection.js.
Sources: https://github.com/d3/d3-array and https://github.com/d3/d3-geo

### d3-array license

Copyright 2010-2023 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.

### d3-geo license

Copyright 2010-2024 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.

This license applies to GeographicLib, versions 1.12 and later.

Copyright 2008-2012 Charles Karney

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Optional external YouTube views

Arrival street views use the YouTube IFrame Player API and external originals on YouTube. No video copies are downloaded or included in this artifact. These videos belong to their respective creators and are not licensed under this project's code license. The visible source link changes with the selected video. The app provides YouTube Terms and Google Privacy links in its Privacy & terms notice and asks before loading this optional feature.

Creators: Rambalac; VISUAL THAILAND; POPtravel; JWINTHAI; HP Walking Tours; walking around; City Walker 4k POV; Global Silent Walks. The local v60 visual baseline uses controls=0 and a full-scene cover layout with app controls. The current original source and timestamp are linked from the postcard. This visual baseline is not a claim of YouTube policy approval.

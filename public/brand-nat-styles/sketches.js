// Face-free layout sketches for the public Style Guide (Nat, 2026-10-21: no faces, no footage).
// Each style code draws a 9:16 frame (90x160 units) with a plain grey figure showing where text and graphics go.
// build.py fails if a public style has no sketch here.
(function(){
  const R = (x, y, w, h, c, rx = 1.5, ex = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${c}" ${ex}/>`;
  const O = (cx, cy, r, c, ex = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" class="${c}" ${ex}/>`;
  const E = (cx, cy, rx, ry, c, ex = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" class="${c}" ${ex}/>`;
  const P = (d, c, ex = '') => `<path d="${d}" class="${c}" ${ex}/>`;
  const FONT = { heavy: "font-family:'Inter Tight',sans-serif;font-weight:800", sans: "font-family:Inter,sans-serif;font-weight:600",
    serif: "font-family:'Instrument Serif',serif;font-style:italic", caps: "font-family:Georgia,serif;letter-spacing:.06em",
    hand: "font-family:'Bradley Hand','Segoe Print','Comic Sans MS',cursive;font-weight:700" };
  const T = (x, y, s, size, c, kind = 'heavy', anchor = 'middle') =>
    `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" class="${c}" style="${FONT[kind]}">${s}</text>`;
  const rot = (deg, cx, cy, inner) => `<g transform="rotate(${deg} ${cx} ${cy})">${inner}</g>`;
  const bg = c => R(0, 0, 90, 160, c, 0);
  // Plain figure: head centre (x, y), scale s, body down to `bottom`.
  const F = (x = 45, y = 96, s = 1, c = 'f', bottom) => {
    const b = bottom ?? y + 64 * s;
    return P(`M${x - 28 * s} ${b} Q${x - 28 * s} ${y + 22 * s} ${x} ${y + 20 * s} Q${x + 28 * s} ${y + 22 * s} ${x + 28 * s} ${b} Z`, c) + O(x, y, 12 * s, c);
  };
  const D = () => bg('r') + F();
  const tile = (x, y, s, c, ex = '') => R(x, y, s, s, c, s * .26, ex);
  const lines = (x, y, w, n, gap = 4, c = 'm') => Array.from({ length: n }, (_, k) => R(x, y + k * gap, w * (k === n - 1 ? .6 : 1 - (k % 2) * .12), 1.6, c, .8)).join('');
  const photo = (x, y, w, h) => R(x, y, w, h, 'sky', 1) + P(`M${x} ${y + h} L${x + w * .35} ${y + h * .45} L${x + w * .6} ${y + h * .75} L${x + w * .75} ${y + h * .6} L${x + w} ${y + h} Z`, 'hill') + O(x + w * .75, y + h * .28, Math.min(w, h) * .1, 'a');
  const polaroid = (x, y, w, h, deg) => rot(deg, x + w / 2, y + h / 2, R(x, y, w, h, 'wh st', .8) + photo(x + 2, y + 2, w - 4, h - 9));
  const arrow = (d, c = 'sk') => P(d, c, 'fill="none" marker-end="url(#skah)"');
  const chk = (x, y, c = 'sg') => P(`M${x} ${y} l2 2 l4 -4.5`, c, 'fill="none"');
  const burst = (x, y) => P(`M${x - 4} ${y - 4} l-2.5 -2.5 M${x} ${y - 5.5} v-3.5 M${x + 4} ${y - 4} l2.5 -2.5`, 'sk', 'fill="none"');
  const star = (cx, cy, r, c) => P(`M${cx} ${cy - r} L${cx + r * .3} ${cy - r * .3} L${cx + r} ${cy} L${cx + r * .3} ${cy + r * .3} L${cx} ${cy + r} L${cx - r * .3} ${cy + r * .3} L${cx - r} ${cy} L${cx - r * .3} ${cy - r * .3} Z`, c);
  const X = (x, y, s) => P(`M${x} ${y} L${x + s} ${y + s} M${x + s} ${y} L${x} ${y + s}`, 'sx', 'fill="none"');
  const vig = () => R(0, 0, 90, 160, '', 0, 'fill="url(#skvig)"');
  const bubble = (x, y, w, h, c) => R(x, y, w, h, c, h / 2);
  const mini = (x, y, w, h) => R(x, y, w, h, 'r', 1) + F(x + w / 2, y + h * .55, w / 70, 'f', y + h);

  window.SKETCH = {
    H1: bg('r') + T(45, 36, 'a small line', 6, 'wh', 'serif') + T(45, 56, 'BIG TITLE', 14, 'a ol', 'heavy') + F(45, 98, 1, 'f o'),
    H2: D() + [22, 33, 44].map((y, k) => bubble(14, y, 62, 9, 'wh st2') + tile(17, y + 1.5, 6, 'c' + (k + 1)) + R(26, y + 3.7, 34 - k * 4, 1.8, 'i', .9)).join(''),
    H3: D() + T(45, 36, 'WARM', 12, 'cr ol', 'heavy') + T(45, 49, 'TYPEWRITER', 9, 'cr ol', 'heavy') + R(24, 54, 42, 2.4, 'car', 1.2) + O(15, 26, 4, 'a') + O(76, 44, 4, 'pk'),
    H4: D() + T(45, 38, 'a soft little line', 7, 'i', 'serif') + T(45, 56, 'word', 18, 'i', 'heavy'),
    H5: D() + R(10, 22, 70, 24, 'a', 3) + R(18, 29, 54, 3.5, 'i') + R(25, 36, 40, 3.5, 'i') + bubble(64, 50, 16, 7, 'd') + T(72, 55.2, '0-3s', 4.2, 'wh', 'sans'),
    H6: bg('r') + E(14, 42, 7, 10, 'sky') + E(76, 42, 7, 10, 'sky') + R(-4, 74, 24, 90, 'seat', 6) + R(70, 74, 24, 90, 'seat', 6) + F() + bubble(20, 20, 50, 7, 'wh'),
    H7: D() + bubble(10, 20, 70, 9, 'wh') + T(45, 26.2, 'Which one is better?', 5.4, 'i', 'sans') + tile(21, 34, 12, 'c1') + tile(39, 34, 12, 'c2') + tile(57, 34, 12, 'c3'),
    H8: bg('y') + T(45, 20, 'THE TRICK TO', 5, 'i', 'hand') + T(45, 32, 'editing with claude.', 8, 'i', 'heavy') + R(17, 40, 56, 78, 'wh', 2) + mini(19, 42, 52, 74) + bubble(26, 108, 44, 10, 'wh st') + O(31, 113, 2.5, 'm') + R(35, 112, 30, 2, 'm', 1),
    H9: D() + tile(16, 22, 20, 'c2') + tile(54, 22, 20, 'c1') + X(13, 19, 26),
    H10: D() + T(45, 34, 'A PRODUCTIVE', 10, 'wh ol', 'heavy') + T(45, 46, 'DAY WITH AI', 9, 'wh ol', 'caps'),
    C1: D() + T(45, 127, 'words show up as <tspan class="a">spoken</tspan>', 6, 'wh ol', 'sans'),
    C2: D() + T(45, 130, 'WORD', 15, 'wh ol', 'heavy'),
    C3: D(),
    C4: D() + T(45, 128, 'small <tspan font-size="14" class="a">BIG</tspan> small', 6, 'wh ol', 'sans'),
    C5: D() + T(34, 128, 'short phrase', 6.5, 'wh ol', 'sans') + bubble(57, 121, 25, 9, 'wh') + T(69.5, 127.6, 'key', 6, 'i', 'heavy'),
    C6: D() + T(45, 120, 'small white line', 6, 'wh ol', 'sans') + T(45, 132, 'PUNCH WORDS', 10, 'a ol', 'heavy'),
    C7: D() + T(45, 118, 'T R A C K E D   C A P S', 4, 'wh', 'sans') + T(45, 135, 'Serif', 17, 'wh', 'serif'),
    C8: D() + T(45, 113, 'SMALL CAPS UNDER THE CHIN', 3.8, 'wh ol', 'heavy'),
    C9: D() + T(10, 26, 'words', 6.5, 'wh ol', 'heavy', 'start') + T(20, 35, 'land', 6.5, 'wh ol', 'heavy', 'start') + T(30, 44, 'like', 6.5, 'wh ol', 'heavy', 'start') + T(38, 60, 'stairs', 13, 'ice', 'serif', 'start') + R(39, 63, 34, .9, 'ice', .4),
    L1: bg('r') + O(20, 40, 18, 'blur') + O(72, 60, 22, 'blur') + rot(-8, 23, 38, R(8, 28, 30, 22, 'wh st', 2) + lines(12, 33, 22, 3)) + rot(7, 69, 32, R(54, 22, 30, 22, 'wh st', 2) + lines(58, 27, 22, 3)) + tile(58, 54, 12, 'c3') + F(45, 100, 1, 'f o'),
    L2: bg('r') + R(0, 0, 90, 80, 'd', 0) + R(10, 12, 70, 56, 'wh', 2) + lines(16, 20, 54, 8) + F(45, 108, .8) + R(0, 79.5, 90, 1, 'wh', 0),
    L3: bg('b') + rot(-8, 24, 46, R(8, 26, 32, 40, 'wh st', 1.5) + R(10, 28, 28, 30, 'sky', 1)) + rot(6, 67, 49, R(52, 30, 30, 38, 'wh st', 1.5) + R(54, 32, 26, 28, 'pk', 1)) + star(14, 80, 5, 'a') + O(78, 82, 4, 'pk') + F(45, 102, 1, 'f o'),
    L4: D() + R(20, 22, 50, 28, 'wh st', 3) + lines(25, 28, 40, 4),
    L5: bg('r') + R(0, 0, 90, 60, 'wh', 0) + T(45, 24, 'quotes, photos, proof', 6, 'i', 'sans') + lines(15, 32, 60, 4) + F(45, 104),
    L6: bg('r') + F(45, 120) + T(12, 30, 'all the text', 8, 'i', 'hand', 'start') + T(12, 43, 'lives up here', 8, 'i', 'hand', 'start') + R(12, 48, 46, 1, 'i', .5),
    L7: R(0, 0, 90, 27, 'd', 0) + R(14, 4, 62, 19, 'wh', 1.5) + lines(19, 8, 52, 3) + mini(0, 27, 90, 26) + R(0, 53, 90, 54, 'r', 0) + F(45, 84, .55, 'f', 107) + T(45, 68, 'BIG', 10, 'a ol', 'heavy') + R(0, 107, 90, 53, 'd', 0) + R(10, 113, 70, 41, 'wh', 2) + lines(16, 119, 58, 7) + R(0, 53, 90, .8, 'wh', 0) + R(0, 106.5, 90, .8, 'wh', 0),
    L8: bg('cr') + R(8, 16, 74, 92, 'wh st', 3) + O(13, 21, 1.4, 'x') + O(17.5, 21, 1.4, 'a') + O(22, 21, 1.4, 'g') + lines(14, 30, 62, 12, 5) + rot(-8, 62, 128, R(46, 108, 32, 38, 'wh st', 1) + mini(49, 111, 26, 27)),
    L9: bg('pat') + T(45, 20, 'Edited by', 8, 'i', 'serif') + R(6, 44, 28, 48, 'wh st', 2) + mini(8, 46, 24, 36) + T(20, 89, 'Before', 4.5, 'i', 'sans') + R(38, 30, 46, 92, 'wh st', 2) + mini(40, 32, 42, 80) + T(61, 119, 'After', 5, 'i', 'sans'),
    P1: D() + R(10, 18, 70, 56, 'wh st', 2) + R(15, 23, 40, 3, 'i', 1) + R(14, 38, 56, 5, 'a', 1) + lines(15, 32, 60, 6, 3.4) + bubble(15, 64, 30, 6, 'd') + T(30, 68.2, 'source · date', 3.6, 'wh', 'sans'),
    P2: D() + R(10, 20, 70, 44, 'd', 3) + P('M41 34 L52 42 L41 50 Z', 'wh') + bubble(14, 24, 24, 6, 'wh') + T(26, 28.2, 'Official', 3.8, 'i', 'sans'),
    P3: bg('r') + T(45, 72, '87%', 34, 'a ol', 'heavy') + F(45, 100, 1, 'f o'),
    P4: D() + R(12, 18, 66, 52, 'wh st', 3) + O(20, 27, 4, 'm') + R(27, 24.5, 24, 2, 'i', 1) + R(27, 28.5, 16, 1.6, 'm', .8) + lines(16, 37, 58, 4) + P('M18 62 c0 -2 3 -2 3 0 c0 -2 3 -2 3 0 c0 2 -3 4 -3 4 c0 0 -3 -2 -3 -4 Z', 'x'),
    P6: D() + polaroid(8, 20, 34, 38, -7) + polaroid(48, 24, 34, 38, 6),
    P7: bg('wh') + R(8, 20, 74, 90, 'st0', 1) + Array.from({ length: 8 }, (_, k) => R(8, 30 + k * 10, 74, .5, 'm', 0)).join('') + R(46, 60, 36, 10, 'a', 0, 'opacity=".7"') + T(64, 67.5, '$4,210', 5.5, 'i', 'heavy') + P('M60 76 L60 90 L63.5 86.5 L66.5 93 L68.5 92 L65.5 85.5 L70 85.5 Z', 'i') + bubble(8, 116, 32, 7, 'd') + T(24, 120.8, 'source', 4, 'wh', 'sans'),
    P8: bg('r') + R(6, 28, 78, 54, 'd', 3) + R(10, 32, 70, 46, 'wh', 1) + T(45, 60, '$12,480', 12, 'i', 'heavy') + rot(-22, 62, 100, R(58, 64, 9, 70, 'f', 4.5)),
    V1: D() + [16, 38, 60].map((x, k) => tile(x, 22, 14, 'c' + (k + 1)) + R(x - 1, 39, 16, 2.4, 'wh', 1.2)).join(''),
    V2: D() + tile(10, 22, 16, 'c1') + tile(64, 22, 16, 'c2') + tile(37, 50, 16, 'c3') + arrow('M28 30 L60 30') + arrow('M20 40 Q22 56 34 57') + arrow('M56 58 Q68 56 71 42'),
    V3: D() + T(45, 52, 'Why?', 22, 'wh ol', 'heavy'),
    V4: D() + tile(42, 18, 16, 'c2', 'opacity=".35"') + tile(40, 20, 16, 'c3', 'opacity=".6"') + tile(37, 22, 16, 'c1') + T(45, 52, 'every week', 8, 'wh ol', 'heavy'),
    V5: D() + [18, 31, 44].map((y, k) => bubble(10, y, 70, 11, 'wh st') + tile(13, y + 2.5, 6, 'c' + (k + 1)) + R(22, y + 4.7, 26, 1.8, 'i', .9) + T(76, y + 7.5, '$' + [20, 30, 0][k], 5.2, 'i', 'heavy', 'end')).join(''),
    V6: D() + T(45, 72, 'HUGE', 30, 'a ol', 'heavy'),
    V7: bg('wh') + T(45, 56, 'Every word', 11, 'i', 'heavy') + T(40, 72, 'builds in', 11, 'i', 'heavy') + O(76, 68, 5, 'a') + T(45, 88, 'on screen', 11, 'm2', 'heavy'),
    V8: bg('r') + R(0, 0, 90, 62, 'wh', 0) + T(10, 36, '“', 26, 'a', 'serif', 'start') + T(48, 32, 'what people', 9, 'i', 'serif') + T(48, 44, 'are saying', 9, 'i', 'serif') + F(45, 104),
    V9: photo(0, 0, 44.5, 79) + photo(45.5, 0, 44.5, 79) + photo(0, 80, 44.5, 80) + photo(45.5, 80, 44.5, 80),
    V10: bg('cr') + [[24, 'c1'], [52, 'c2'], [80, 'c3']].map(([y, c]) => R(12, y, 66, 22, 'wh', 3) + tile(17, y + 5, 12, c) + R(34, y + 7, 36, 2, 'i', 1) + R(34, y + 12, 26, 1.6, 'm', .8)).join(''),
    V11: D() + bubble(8, 18, 74, 11, 'wh') + [16, 34, 52, 70].map((x, k) => bubble(x - 6, 21, 14, 5, k === 1 ? 'a' : 'm')).join(''),
    V12: D() + O(45, 38, 26, '', 'fill="url(#skglow)"') + tile(36, 24, 18, 'c1') + R(28, 46, 34, 4, 'wh', 1) + P('M30 26 L38 20', 'sw', 'fill="none"'),
    V13: D() + O(45, 40, 16, 'ringbg', 'fill="none"') + P('M45 24 A16 16 0 1 1 29 40', 'ring', 'fill="none"') + T(45, 44.5, '42', 12, 'wh ol', 'heavy'),
    V14: D() + R(26, 20, 38, 38, 'wh', 6) + P('M26 31 L26 26 Q26 20 32 20 L58 20 Q64 20 64 26 L64 31 Z', 'x') + T(45, 28.5, 'YEAR', 5, 'wh', 'sans') + T(45, 50, '2015', 13, 'i', 'heavy'),
    V15: D() + R(8, 18, 74, 15, 'wh', 4) + tile(11, 21.5, 8, 'g') + R(22, 22, 36, 2, 'i', 1) + R(22, 27, 50, 1.6, 'm', .8),
    V16: D() + R(22, 22, 20, 20, 'off', 6) + R(48, 22, 20, 20, 'off', 6) + P('M27 34 q5 -6 10 0 M29.5 37 q2.5 -3 5 0', 'sk', 'fill="none"') + P('M53 27 q0 9 9 10 l2 -3 l-3 -2 l-1.5 1 q-3 -1.5 -4 -4 l1 -1.5 l-2 -3 Z', 'm2') + X(22, 22, 20) + X(48, 22, 20),
    V17: D() + R(16, 18, 58, 40, 'wh', 6) + O(45, 30, 7, '', 'fill="none" stroke="url(#skig)" stroke-width="2"') + T(45, 46, 'Comment', 5, 'i', 'sans') + T(45, 55, 'KEYWORD', 9, '', 'heavy').replace('class=""', 'fill="url(#skig)"'),
    V18: D() + polaroid(6, 18, 30, 34, -8) + polaroid(52, 22, 30, 34, 7) + star(44, 30, 8, 'a'),
    V19: bg('r') + F() + R(20, 104, 50, 52, 'd', 4) + O(27, 113, 3, 'm') + R(32, 111.5, 28, 2, 'wh', 1) + P('M62 111 c0 -2 3 -2 3 0 c0 -2 3 -2 3 0 c0 2 -3 4 -3 4 c0 0 -3 -2 -3 -4 Z', 'x') + O(45, 128, 6, 'm') + bubble(33, 138, 24, 7, 'ig2') + T(45, 142.8, 'Follow', 4.4, 'wh', 'sans'),
    V20: D() + T(45, 24, '10 AI TOOLS', 8, 'wh ol', 'heavy') + T(45, 33, '01/10', 5.5, 'wh ol', 'sans') + R(14, 38, 62, 15, 'a', 3) + T(45, 49, 'ITEM ONE', 8, 'i', 'heavy'),
    V21: bg('cr') + rot(4, 55, 90, R(32, 56, 46, 68, 'wh st', 2) + mini(34, 58, 42, 58)) + T(10, 34, 'BEFORE', 7, 'i', 'hand', 'start') + arrow('M22 38 Q20 56 30 64', 'sk2'),
    V22: D() + R(12, 18, 66, 11, 'wh', 2) + T(45, 25.5, 'follow for part 2', 5.6, 'i', 'hand'),
    V23: bg('cr') + T(8, 18, 'New Video', 5.5, 'i', 'heavy', 'start') + [8, 37, 66].map(x => mini(x, 22, 26, 46)).join('') + T(8, 84, 'Raw Clip', 5.5, 'i', 'heavy', 'start') + [8, 37, 66].map(x => mini(x, 88, 26, 46)).join(''),
    B1: bg('wh') + bubble(34, 30, 48, 12, 'a') + R(8, 50, 60, 30, 'off', 6) + lines(13, 57, 50, 5),
    B2: bg('wh') + [[24, 'c1', 52], [48, 'c2', 40], [72, 'c3', 56]].map(([y, c, w]) => O(13, y + 6, 5, c) + R(21, y, w, 13, 'off', 6) + R(25, y + 5, w - 10, 1.8, 'm', .9)).join('') + T(70, 120, '@bot', 7, 'c1t', 'heavy'),
    B3: bg('wh') + bubble(20, 14, 60, 10, 'off') + R(26, 18.5, 40, 1.6, 'lnk', .8) + R(10, 36, 70, 70, 'st0', 2) + Array.from({ length: 5 }, (_, k) => R(10, 50 + k * 11, 70, .5, 'm', 0)).join('') + R(12, 61, 66, 10, 'c1', 2) + R(10, 36, 70, 10, 'c2', 2),
    B4: bg('wh') + P('M10 22 L22 22 L25 25 L40 25 L40 40 L10 40 Z', 'a') + arrow('M44 32 L54 32') + R(10, 50, 70, 70, 'st0', 1) + Array.from({ length: 7 }, (_, k) => R(10, 60 + k * 10, 70, .5, 'm', 0)).join('') + R(34, 50, .5, 70, 'm', 0) + R(10.5, 90, 69, 9.5, 'gl', 0) + R(10.5, 100, 69, 9.5, 'gl', 0),
    B5: bg('r') + R(16, 8, 58, 144, 'd', 10) + R(19.5, 16, 51, 128, 'wh', 6) + bubble(40, 30, 27, 9, 'imb') + bubble(23, 44, 30, 9, 'off') + bubble(36, 58, 31, 9, 'imb') + bubble(23, 72, 24, 9, 'off'),
    B6: bg('b') + R(8, 126, 74, 16, 'glass', 5) + [12, 26, 54, 68].map((x, k) => tile(x, 129, 10, 'c' + (k % 3 + 1))).join('') + tile(40, 118, 10, 'a') + P('M48 128 L48 140 L51 137 L53.5 142 L55 141.4 L52.6 136.5 L56.5 136.5 Z', 'i'),
    B7: D() + O(72, 26, 7, 'c2') + O(77, 21, 2.2, 'x') + R(16, 38, 54, 13, 'wh', 6.5) + R(21, 43.5, 40, 1.8, 'm', .9),
    B8: D() + bubble(8, 26, 74, 18, 'd') + tile(12, 29, 12, 'c1') + R(28, 31, 26, 3, 'wh', 1) + T(28, 40, 'by', 4.5, 'm', 'sans', 'start') + tile(35, 36.5, 5, 'c2') + P('M64 26 L56 44', 'sw', 'fill="none"'),
    B9: bg('wh') + [12, 34, 56, 78].map((x, k) => O(x, 50, 9, 'c' + (k % 3 + 1)) + O(x, 47, 3.4, 'wh') + bubble(x - 9, 63, 18, 6, 'off')).join(''),
    B10: bg('wh') + P('M30 40 a8 8 0 0 1 14 -6 a10 10 0 0 1 18 4 a7 7 0 0 1 0 14 l-30 0 a6 6 0 0 1 -2 -12 Z', 'b') + [16, 39, 62].map(x => R(x, 84, 14, 14, 'st0', 2) + P(`M45 54 L${x + 7} 84`, 'sk', 'fill="none"')).join(''),
    B11: bg('d') + R(0, 0, 90, 20, 'k', 0) + R(0, 140, 90, 20, 'k', 0) + O(45, 80, 26, '', 'fill="url(#skglow)" opacity=".5"') + tile(36, 71, 18, 'c1') + P('M0 110 L90 64', 'sw', 'fill="none" opacity=".5"'),
    X1: bg('r') + E(45, 92, 40, 12, 'dash', 'fill="none"') + rot(-10, 68, 78, R(62, 70, 12, 20, 'd', 2)) + F(45, 98, 1, 'f o') + rot(8, 18, 100, R(12, 92, 12, 20, 'd', 2)) + rot(-6, 74, 106, R(68, 98, 12, 20, 'd', 2)),
    X2: bg('r') + Array.from({ length: 24 }, (_, k) => R(2 + (k % 4) * 22, 2 + Math.floor(k / 4) * 20, 20, 18, ['c1', 'c2', 'c3', 'off', 'a', 'sky'][(k * 5) % 6], 1)).join('') + F(45, 100, 1, 'f o'),
    X3: bg('offw') + R(0, 0, 12, 160, 'off', 0) + bubble(16, 58, 66, 11, 'wh st') + T(21, 65.5, 'make it pop', 5, 'i', 'sans', 'start') + R(50, 61, .8, 5, 'i', 0) + F(45, 102),
    X4: bg('d') + R(14, 40, 62, 112, 'r', 9) + F(45, 50, 1.05, 'f o', 152),
    X5: bg('r') + F(45, 112, 2.1) + vig() + P('M8 20 h10 M8 20 v10 M82 20 h-10 M82 20 v10 M8 140 h10 M8 140 v-10 M82 140 h-10 M82 140 v-10', 'sk', 'fill="none"'),
    X6: D() + R(58, 26, 40, 76, 'd', 6) + chk(63, 40, 'sg') + R(72, 38, 14, 1.8, 'wh', .9) + chk(63, 50, 'sg') + R(72, 48, 14, 1.8, 'wh', .9) + bubble(62, 86, 24, 8, 'a') + T(74, 91.4, 'Done', 4.4, 'i', 'sans') + P('M50 50 h-6 M50 58 h-9 M50 66 h-5', 'sk', 'fill="none"'),
    X7: D() + R(62, 56, 26, 30, 'd', 3) + [62, 71, 80].map(y => O(67, y, 2.6, 'g') + chk(65.3, y, 'sw') + R(72, y - 1, 12, 1.8, 'wh', .9)).join(''),
    X8: bg('r') + rot(-7, 21, 38, R(8, 30, 26, 18, 'cr', 1) + lines(11, 34, 20, 3)) + rot(6, 69, 34, R(56, 26, 26, 18, 'wh', 1) + T(69, 37, '“wow”', 6, 'i', 'serif')) + rot(-3, 45, 62, bubble(22, 58, 46, 8, 'wh st') + O(27, 62, 1.8, 'm')) + rot(5, 17, 74, R(6, 68, 22, 14, 'a', 1)) + F(45, 100, 1),
    X9: D() + O(60, 134, 26, 'k') + arrow('M20 70 L44 112', 'sk2') + arrow('M84 60 L68 104', 'sk2'),
    X10: bg('r') + P('M4 110 L22 98 L36 104 L52 84 L66 90 L86 30', 'glowl', 'fill="none"') + O(86, 30, 3, 'a') + T(84, 22, '10x', 9, 'a ol', 'heavy', 'end') + F(45, 100, 1, 'f o'),
    X11: bg('cr') + R(4, 20, 82, 104, 'wh st', 3) + O(9, 25, 1.3, 'x') + O(13, 25, 1.3, 'a') + O(17, 25, 1.3, 'g') + mini(8, 32, 40, 72) + T(52, 38, 'Working on', 4.6, 'i', 'sans', 'start') + [46, 54, 62].map(y => chk(52, y, 'sg') + R(60, y - 1, 20, 1.6, 'm', .8)).join('') + R(8, 110, 74, 4, 'off', 2) + R(8, 110, 48, 4, 'a', 2),
    X12: bg('r') + R(18, 14, 54, 62, 'd', 4) + F(45, 42, .7, 'm', 76) + F(45, 114, .8),
    X13: bg('paper') + P('M0 30 L20 26 L34 34 L52 24 L70 32 L90 26 L90 90 L0 96 Z', 'cr') + P('M0 120 L30 112 L50 122 L90 110 L90 160 L0 160 Z', 'wh') + F(45, 100, 1, 'f oo') + [['C', 'x', 10], ['U', 'a', 21], ['T', 'c1', 32]].map(([l, c, x], k) => rot(k % 2 ? 8 : -8, x + 5, 15, R(x, 8, 10, 13, c, 0) + T(x + 5, 18.5, l, 10, 'wh', 'heavy'))).join('') + rot(-20, 74, 18, R(64, 14, 20, 6, 'tape', 0)),
    X14: bg('seat') + F() + P('M15 160 Q14 118 33 113 Q30 108 32 96 Q34 81 45 82 Q58 81 59 96 Q60 108 57 113 Q76 118 75 160', 'wob', 'fill="none"') + P('M72 74 c0 -3 4 -3 4 0 c0 -3 4 -3 4 0 c0 3 -4 5 -4 5 c0 0 -4 -2 -4 -5 Z', 'wobf') + star(18, 76, 5, 'wobf'),
    X15: bg('r') + P('M0 0 L35 60 M90 0 L55 60 M0 160 L35 100 M90 160 L55 100 M35 60 L55 60 L55 100 L35 100 Z', 'sk', 'fill="none" opacity=".5"') + F(),
    X16: bg('r') + T(45, 44, 'COVER', 26, 'i', 'serif') + lines(6, 56, 18, 3, 3.5, 'i') + lines(68, 56, 18, 3, 3.5, 'i') + F(45, 100, 1, 'f o') + T(45, 142, 'the strapline', 8, 'wh', 'serif'),
    X17: bg('r') + O(20, 40, 14, 'c2') + O(70, 60, 16, 'c3') + T(45, 64, 'GLASS', 25, 'glass', 'heavy') + F(45, 100, 1, 'f o'),
    X18: bg('cr') + R(12, 18, 66, 116, 'wh st', 3) + T(45, 30, 'After', 6, 'i', 'sans') + rot(-4, 45, 72, R(22, 42, 46, 58, 'cr', 4) + O(45, 66, 11, 'c2') + O(41, 62, 4, 'wh', 'opacity=".6"') + T(45, 92, 'Captions', 7, 'i', 'serif')),
    X19: bg('d') + R(10, 30, 70, 48, 'mon', 3) + R(13, 33, 64, 42, 'd', 1) + P('M22 64 L34 46 L44 58 L54 44 L68 64', 'wl', 'fill="none"') + R(40, 78, 10, 10, 'mon', 0) + R(14, 96, 62, 8, 'kb', 2) + T(45, 132, 'Simple title', 10, 'wh', 'serif'),
    M1: bg('r') + F(45, 98, 1.3) + P('M10 24 h10 M10 24 v10 M80 24 h-10 M80 24 v10 M10 150 h10 M10 150 v-10 M80 150 h-10 M80 150 v-10', 'sk', 'fill="none"') + bubble(64, 10, 18, 8, 'd') + T(73, 15.6, '120%', 4.4, 'wh', 'sans'),
    M2: bg('r') + Array.from({ length: 12 }, (_, k) => { const a = k * Math.PI / 6; return P(`M${45 + Math.cos(a) * 28} ${80 + Math.sin(a) * 28} L${45 + Math.cos(a) * 60} ${80 + Math.sin(a) * 60}`, 'sm', 'fill="none"'); }).join('') + E(78, 30, 24, 30, '', 'fill="url(#skwarm)"') + F(),
    M3: D() + [8, 36, 64].map((x, k) => R(x, 20, 18, 26, 'wh st', 2) + tile(x + 4, 25, 10, 'c' + (k + 1)) + T(x + 9, 54, (k * 2.5) + 's', 4.5, 'i', 'sans')).join(''),
    M4: D() + P('M16 30 h6 M16 30 v6 M74 30 h-6 M74 30 v6', 'sm', 'fill="none"') + T(45, 26, 'breathe', 7, 'm2', 'serif'),
    M5: R(0, 0, 90, 80, 'r', 0) + F(45, 50, .55, 'f', 80) + R(0, 80, 90, 80, 'r', 0) + F(45, 126, 1.5, 'f', 160) + R(0, 79.5, 90, 1, 'wh', 0) + bubble(4, 4, 18, 7, 'd') + T(13, 8.8, 'wide', 4.4, 'wh', 'sans') + bubble(4, 84, 18, 7, 'd') + T(13, 88.8, 'tight', 4.4, 'wh', 'sans'),
    M6: D() + O(45, 96, 20, 'sk2', 'fill="none"') + P('M45 70 v6 M45 116 v6 M19 96 h6 M65 96 h6', 'sk2', 'fill="none"'),
    M7: D() + R(8, 20, 34, 26, 'wh st', 2) + O(25, 33, 50, 'a', 'opacity=".35"') + O(25, 33, 30, 'a'),
    S1: D() + R(20, 22, 50, 22, 'wh st', 3) + burst(22, 22) + burst(68, 22) + tile(10, 54, 10, 'c1') + burst(15, 54) + tile(70, 54, 10, 'c2') + burst(75, 54),
    S2: D() + R(20, 22, 50, 22, 'wh st', 3) + burst(45, 22),
    S3: D() + P('M10 134 q4 -6 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0', 'sw', 'fill="none" opacity=".8"') + T(18, 40, '♪', 14, 'm2', 'sans') + T(70, 30, '♫', 14, 'm2', 'sans'),
    G1: D() + R(0, 0, 90, 160, 'warm', 0) + vig(),
    G2: bg('wh') + F(45, 100, 1, 'fl') + R(10, 22, 70, 26, 'pan', 3) + R(10, 22, 3, 26, 'a', 1) + lines(17, 28, 56, 4),
    G3: bg('b') + star(14, 26, 7, 'a') + O(76, 40, 5, 'pk') + star(70, 76, 5, 'wh') + F(45, 100, 1, 'f o'),
    G4: bg('ios') + F() + R(10, 20, 70, 30, 'wh', 8, 'filter="url(#sksh)"') + tile(16, 26, 10, 'c1') + R(30, 28, 40, 2, 'i', 1) + R(30, 33, 30, 1.6, 'm', .8),
    G5: D() + R(0, 0, 90, 160, 'sepia', 0) + T(45, 30, 'a soft cream line', 6, 'cr', 'sans') + T(45, 46, 'punch line', 12, 'a', 'serif') + star(16, 40, 3, 'wh') + star(76, 24, 2.4, 'wh') + star(72, 52, 2, 'wh'),
    G6: bg('dark') + F(45, 96, 1, 'flit') + R(0, 0, 90, 160, 'teal', 0) + vig(),
    G7: bg('y') + R(14, 44, 62, 92, 'wh', 2) + mini(17, 47, 56, 86) + T(45, 26, 'white text', 10, 'wh ol', 'heavy'),
  };

  const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <clipPath id="skclip"><rect width="90" height="160" rx="7"/></clipPath>
    <radialGradient id="skvig"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
    <radialGradient id="skglow"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="skwarm"><stop offset="0" stop-color="#FFB25B" stop-opacity=".7"/><stop offset="1" stop-color="#FFB25B" stop-opacity="0"/></radialGradient>
    <linearGradient id="skig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#F9A23A"/><stop offset=".5" stop-color="#E1306C"/><stop offset="1" stop-color="#8A3AB9"/></linearGradient>
    <filter id="sksh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-opacity=".15"/></filter>
    <marker id="skah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#2A2622"/></marker>
  </defs></svg>`;
  window.sketchSVG = (code, label) => window.SKETCH[code]
    ? `<svg class="skv" viewBox="0 0 90 160" role="img" aria-label="Layout sketch: ${label}"><g clip-path="url(#skclip)">${window.SKETCH[code]}</g><rect width="90" height="160" rx="7" class="frame"/></svg>`
    : '';
  window.SKETCH_DEFS = DEFS;
})();

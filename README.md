# Mappa della Commedia · 神曲三维地图

The whole of Dante's *Commedia* — all 14,233 lines — set as a navigable 3D cosmos, built after Sandro Botticelli's *Mappa dell'Inferno* (c. 1480–1495). Every verse is placed as type: the funnel of Hell, the mountain of Purgatory at the antipodes, and the nine nested heavens of Paradise.

以《神曲》全部 14,233 行诗句构筑的三维宇宙，结构参照波提切利的《地狱图》：地狱漏斗、对跖点上的炼狱山与九重天。

**Live:** https://taogcd.github.io/divina-commedia-3d/

A web extension of *La Divina Commedia* (2024) by Chuantao Zhu (Tao) — [tttaaaooo.design](https://tttaaaooo.design/).

## Controls · 操作

| Input | 操作 |
| --- | --- |
| Drag | 拖拽：环绕旋转 |
| Scroll | 滚轮：朝光标处缩放，贴近时继续滚动即穿行而过 |
| Right-drag / Shift + drag | 平移 |
| Double-click | 飞近该处 |
| W A S D · Q E | 键盘飞行 |
| Sezione | 剖面：像《地狱图》一样切开地球 |
| Roman numerals | 飞往对应诗章并点亮其文字 |
| Viaggio / Space | 自动播放全部 100 章 |

## Sources

- Text: Dante Alighieri, *Commedia*, Italian text in the public domain (Project Gutenberg #1012), the same text presented by [Digital Dante](https://digitaldante.columbia.edu/dante/divine-comedy/).
- Structure: Sandro Botticelli, *Mappa dell'Inferno* and drawings for the *Commedia*.
- Rendering: [three.js](https://threejs.org/) r128 (MIT, see `THREE-LICENSE.txt`), vendored as `three.min.js`.

A single static `index.html`; no build step.

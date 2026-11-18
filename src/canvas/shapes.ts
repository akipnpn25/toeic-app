// 描画に使う、色と小さな道具。

export const COLOR = {
  // 子犬
  body: '#e9bd82',
  belly: '#f8e3bd',
  ear: '#b98350',
  dark: '#3b2a1e',
  nose: '#2b2018',
  pink: '#f4a6a6',
  tongue: '#ee7f8e',
  shadow: 'rgba(0, 0, 0, 0.15)',
  white: '#ffffff',
  // アイテム（テストで「描かれたか」を見分けられるよう、アイテムごとに色を変えてある）
  bowl: '#4a7bd0',
  bowlRim: '#6b97e8',
  bowlInside: '#2f4f8f',
  kibble: '#a0663a',
  ball: '#e5483c',
  collar: '#d6443a',
  tag: '#f2c94c',
  bone: '#f4ecd8',
  cushion: '#c9a7e8',
  cushionTop: '#dcc4f2',
  ribbon: '#ff7aa8',
  ribbonKnot: '#e0558a',
  bandana: '#3d6fc4',
  houseWall: '#d98f5c',
  houseRoof: '#a8452e',
  houseDoor: '#3b2a1e',
  flowerStem: '#4f9d4f',
  flowerA: '#ff8fb1',
  flowerB: '#ffd34d',
  frisbee: '#35b6a3',
  frisbeeInner: '#2a9486',
  medal: '#f0b400',
  medalInner: '#ffd84d',
  medalRibbon: '#d6443a',
  balloon: '#e8554e',
  string: '#8a8a8a',
  trophy: '#e8b92f',
  trophyBase: '#8a6a2a',
  crown: '#f7c600',
  jewelRed: '#e0314b',
  jewelBlue: '#3b82f6',
}

// 楕円を塗る
export function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  rotation = 0,
) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}

// 点をつないだ多角形を塗る
export function polygon(ctx: CanvasRenderingContext2D, points: [number, number][], fill: string) {
  ctx.beginPath()
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

// 長方形を塗る
export function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
) {
  ctx.fillStyle = fill
  ctx.fillRect(x, y, w, h)
}

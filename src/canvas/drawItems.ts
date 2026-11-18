// 子犬のアイテムを描く。
// 子犬とのかさなり方で、3つに分けてある（描く順番が大事。あとから描いたものが手前に見える）。
//   1. drawBackItems  … 子犬のうしろ：犬小屋・トロフィー・お花・風船
//   2. drawCushion    … 子犬の下：クッション
//   3. drawDogItems   … 子犬が身につけるもの：首輪・バンダナ・メダル・リボン・王冠
//   4. drawFrontItems … 子犬の手前：ごはん皿・ボール・骨・フリスビー

import type { ItemId } from '../logic/puppyItems'
import { COLOR, ellipse, polygon, rect } from './shapes'

// 絵の位置を決める目安
export type Geometry = {
  cx: number // 子犬の中心の x
  gy: number // 地面の y
  u: number // 子犬の大きさの「1単位」（ステージで変わる）
  headY: number // 頭の中心の y
  fed: boolean // 今日ごはんをもらったか（ごはん皿にフードが入る）
}

type Items = ReadonlySet<ItemId>

// ---- 1) 子犬のうしろ ----
export function drawBackItems(ctx: CanvasRenderingContext2D, items: Items, g: Geometry) {
  const { cx, gy } = g

  if (items.has('house')) {
    const hx = cx + 46 // 子犬のうしろ・右寄り
    rect(ctx, hx - 52, gy - 54, 104, 52, COLOR.houseWall) // 壁
    polygon(ctx, [[hx - 60, gy - 54], [hx + 60, gy - 54], [hx, gy - 92]], COLOR.houseRoof) // 屋根
    ellipse(ctx, hx, gy - 38, 18, 18, COLOR.houseDoor) // 入口（上が丸い）
    rect(ctx, hx - 18, gy - 38, 36, 36, COLOR.houseDoor)
  }

  if (items.has('trophy')) {
    const tx = 244
    rect(ctx, tx - 10, gy - 6, 20, 6, COLOR.trophyBase) // 台
    rect(ctx, tx - 3, gy - 20, 6, 14, COLOR.trophy) // 脚
    // カップ：上が広く、下がすぼまる形
    ctx.beginPath()
    ctx.moveTo(tx - 10, gy - 48)
    ctx.lineTo(tx + 10, gy - 48)
    ctx.quadraticCurveTo(tx + 9, gy - 20, tx, gy - 20)
    ctx.quadraticCurveTo(tx - 9, gy - 20, tx - 10, gy - 48)
    ctx.closePath()
    ctx.fillStyle = COLOR.trophy
    ctx.fill()
    // 取っ手（輪っか）
    ctx.strokeStyle = COLOR.trophy
    ctx.lineWidth = 2.5
    for (const dx of [-11, 11]) {
      ctx.beginPath()
      ctx.ellipse(tx + dx, gy - 38, 4, 6, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  if (items.has('flowers')) {
    ctx.strokeStyle = COLOR.flowerStem
    ctx.lineWidth = 2
    for (const [x, h] of [[10, 18], [22, 13]]) {
      ctx.beginPath()
      ctx.moveTo(x, gy)
      ctx.lineTo(x, gy - h)
      ctx.stroke()
    }
    ellipse(ctx, 10, gy - 20, 6, 6, COLOR.flowerA)
    ellipse(ctx, 10, gy - 20, 2.3, 2.3, COLOR.flowerB)
    ellipse(ctx, 22, gy - 15, 5, 5, COLOR.flowerB)
    ellipse(ctx, 22, gy - 15, 2, 2, COLOR.flowerA)
  }

  if (items.has('balloon')) {
    // ひもは、お花のあたりにつないである
    ctx.strokeStyle = COLOR.string
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(36, gy - 102)
    ctx.quadraticCurveTo(24, gy - 60, 14, gy - 22)
    ctx.stroke()
    ellipse(ctx, 36, gy - 118, 13, 16, COLOR.balloon)
    polygon(ctx, [[36, gy - 103], [33, gy - 98], [39, gy - 98]], COLOR.balloon) // 結び目
    ctx.globalAlpha = 0.5
    ellipse(ctx, 31, gy - 124, 3.5, 5, COLOR.white, 0.4) // つや
    ctx.globalAlpha = 1
  }
}

// ---- 2) 子犬の下 ----
export function drawCushion(ctx: CanvasRenderingContext2D, items: Items, g: Geometry) {
  if (!items.has('cushion')) return
  ellipse(ctx, g.cx, g.gy - 2, 70 * g.u, 12 * g.u, COLOR.cushion)
  ellipse(ctx, g.cx, g.gy - 5, 62 * g.u, 8 * g.u, COLOR.cushionTop)
}

// ---- 3) 子犬が身につけるもの（頭と体を描いたあとに描く） ----
export function drawDogItems(ctx: CanvasRenderingContext2D, items: Items, g: Geometry) {
  const { cx, headY, u } = g

  if (items.has('collar')) {
    // あごの下を通る赤い帯（楕円の下半分）と、金色のタグ
    ctx.strokeStyle = COLOR.collar
    ctx.lineWidth = 6 * u
    ctx.beginPath()
    ctx.ellipse(cx, headY + 36 * u, 33 * u, 10 * u, 0, Math.PI * 0.08, Math.PI * 0.92)
    ctx.stroke()
    ellipse(ctx, cx, headY + 50 * u, 5 * u, 5 * u, COLOR.tag)
  }

  if (items.has('bandana')) {
    polygon(
      ctx,
      [[cx - 28 * u, headY + 44 * u], [cx + 28 * u, headY + 44 * u], [cx, headY + 68 * u]],
      COLOR.bandana,
    )
    for (const [dx, dy] of [[-14, 50], [0, 58], [14, 50]]) {
      ellipse(ctx, cx + dx * u, headY + dy * u, 2 * u, 2 * u, COLOR.white)
    }
  }

  if (items.has('medal')) {
    // 首から下がるリボン（V字）と、金メダル
    ctx.strokeStyle = COLOR.medalRibbon
    ctx.lineWidth = 4 * u
    ctx.beginPath()
    ctx.moveTo(cx - 12 * u, headY + 44 * u)
    ctx.lineTo(cx, headY + 68 * u)
    ctx.lineTo(cx + 12 * u, headY + 44 * u)
    ctx.stroke()
    ellipse(ctx, cx, headY + 76 * u, 9 * u, 9 * u, COLOR.medal)
    ellipse(ctx, cx, headY + 76 * u, 6 * u, 6 * u, COLOR.medalInner)
  }

  if (items.has('ribbon')) {
    // 右の耳のうえのリボン
    const rx = cx + 30 * u
    const ry = headY - 34 * u
    ellipse(ctx, rx - 9 * u, ry, 10 * u, 6 * u, COLOR.ribbon, 0.5)
    ellipse(ctx, rx + 9 * u, ry, 10 * u, 6 * u, COLOR.ribbon, -0.5)
    ellipse(ctx, rx, ry, 4 * u, 4 * u, COLOR.ribbonKnot)
  }

  if (items.has('crown')) {
    // 頭のてっぺんの王冠。三つのとがりと、宝石
    const top = headY - 36 * u
    polygon(
      ctx,
      [
        [cx - 20 * u, top],
        [cx - 22 * u, top - 22 * u],
        [cx - 10 * u, top - 12 * u],
        [cx, top - 26 * u],
        [cx + 10 * u, top - 12 * u],
        [cx + 22 * u, top - 22 * u],
        [cx + 20 * u, top],
      ],
      COLOR.crown,
    )
    ellipse(ctx, cx, top - 7 * u, 3.2 * u, 3.2 * u, COLOR.jewelRed)
    ellipse(ctx, cx - 12 * u, top - 6 * u, 2.4 * u, 2.4 * u, COLOR.jewelBlue)
    ellipse(ctx, cx + 12 * u, top - 6 * u, 2.4 * u, 2.4 * u, COLOR.jewelBlue)
  }
}

// ---- 4) 子犬の手前 ----
export function drawFrontItems(ctx: CanvasRenderingContext2D, items: Items, g: Geometry) {
  const { gy } = g

  if (items.has('bowl')) {
    const bx = 50
    ellipse(ctx, bx, gy - 1, 18, 4, COLOR.shadow)
    polygon(
      ctx,
      [[bx - 16, gy - 13], [bx + 16, gy - 13], [bx + 12, gy - 1], [bx - 12, gy - 1]],
      COLOR.bowl,
    )
    ellipse(ctx, bx, gy - 13, 16, 5, COLOR.bowlRim)
    ellipse(ctx, bx, gy - 13, 13, 3.5, COLOR.bowlInside)
    if (g.fed) {
      // ごはんをもらったときだけ、フードが入っている
      ellipse(ctx, bx, gy - 14, 12, 5, COLOR.kibble)
      for (const dx of [-6, 0, 6]) ellipse(ctx, bx + dx, gy - 17, 2, 1.6, COLOR.tongue)
    }
  }

  if (items.has('bone')) {
    rect(ctx, 188, gy - 8, 16, 6, COLOR.bone)
    for (const x of [188, 204]) {
      ellipse(ctx, x, gy - 7.5, 3.5, 3.5, COLOR.bone)
      ellipse(ctx, x, gy - 2.5, 3.5, 3.5, COLOR.bone)
    }
  }

  if (items.has('ball')) {
    ellipse(ctx, 224, gy - 1, 10, 3, COLOR.shadow)
    ellipse(ctx, 224, gy - 10, 10, 10, COLOR.ball)
    ctx.globalAlpha = 0.85
    ellipse(ctx, 224, gy - 10, 10, 3, COLOR.white, -0.5) // 白い帯
    ctx.globalAlpha = 1
  }

  if (items.has('frisbee')) {
    // 空を飛んでいるフリスビー
    ellipse(ctx, 240, 50, 14, 4.5, COLOR.frisbee, -0.25)
    ellipse(ctx, 240, 49.5, 9, 2.5, COLOR.frisbeeInner, -0.25)
  }
}

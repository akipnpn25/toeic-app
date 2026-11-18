// Canvas に子犬を描く。
// Canvas は「ペンで絵を描く紙」のようなもの。座標は左上が (0, 0)、右へ x、下へ y が増える。
// ここでは、決まった大きさ（VIRTUAL_W × VIRTUAL_H）の紙に描く。
// 画面に出すときの拡大・縮小は、呼び出し側（PuppyCanvas）がまとめて行う。

import { MAX_STAGE } from '../logic/puppy'
import type { Mood } from '../logic/puppy'
import { itemsForStage } from '../logic/puppyItems'
import { drawBackItems, drawCushion, drawDogItems, drawFrontItems } from './drawItems'
import type { Geometry } from './drawItems'
import { COLOR, ellipse } from './shapes'

export const VIRTUAL_W = 260
export const VIRTUAL_H = 190

// 子犬の大きさ。ステージ0で 55%、ステージ20（最終）で 100%。
export function puppyScale(stage: number): number {
  const s = Math.min(Math.max(stage, 0), MAX_STAGE)
  return 0.55 + (0.45 * s) / MAX_STAGE
}

export type PuppyLook = {
  stage: number
  mood: Mood
}

// 子犬とアイテムを描く。子犬は紙の中央の下のほうに座らせる。
export function drawPuppy(ctx: CanvasRenderingContext2D, look: PuppyLook) {
  const u = puppyScale(look.stage) // 「1単位の長さ」。全てのパーツの大きさをこれの倍数で決める
  const cx = VIRTUAL_W / 2 // 中心の x
  const gy = VIRTUAL_H - 10 // 地面の y

  // 寝ているときは、頭が少し下がる
  const sleeping = look.mood === 'sleeping'
  const headDrop = sleeping ? 8 * u : 0
  const headY = gy - 108 * u + headDrop

  // このステージで持っているアイテム（Set は「重複のない集まり」。has で「入っているか」を調べられる）
  const items = new Set(itemsForStage(look.stage).map((item) => item.id))
  const geo: Geometry = { cx, gy, u, headY, fed: look.mood === 'fed' }

  ctx.save()
  ctx.lineCap = 'round'

  // ---- うしろのもの ----
  drawBackItems(ctx, items, geo)

  // 1) 影とクッション
  ellipse(ctx, cx, gy, 62 * u, 8 * u, COLOR.shadow)
  drawCushion(ctx, items, geo)

  // 2) しっぽ（体のうしろ）。ごきげんなときは高く上げる
  const tailLift = look.mood === 'fed' ? 22 * u : look.mood === 'hungry' ? 8 * u : 0
  ctx.beginPath()
  ctx.moveTo(cx + 42 * u, gy - 26 * u)
  ctx.quadraticCurveTo(cx + 78 * u, gy - 30 * u, cx + 70 * u, gy - 52 * u - tailLift)
  ctx.strokeStyle = COLOR.ear
  ctx.lineWidth = 12 * u
  ctx.stroke()

  // 3) 体とおなか
  ellipse(ctx, cx, gy - 50 * u, 52 * u, 50 * u, COLOR.body)
  ellipse(ctx, cx, gy - 40 * u, 30 * u, 36 * u, COLOR.belly)

  // 4) 前足
  ellipse(ctx, cx - 20 * u, gy - 9 * u, 16 * u, 10 * u, COLOR.belly)
  ellipse(ctx, cx + 20 * u, gy - 9 * u, 16 * u, 10 * u, COLOR.belly)

  // 5) 耳（頭のうしろ）。垂れ耳
  ellipse(ctx, cx - 40 * u, headY + 2 * u, 15 * u, 30 * u, COLOR.ear, 0.35)
  ellipse(ctx, cx + 40 * u, headY + 2 * u, 15 * u, 30 * u, COLOR.ear, -0.35)

  // 6) 頭
  ellipse(ctx, cx, headY, 44 * u, 42 * u, COLOR.body)

  // 7) 口まわり（マズル）と鼻
  ellipse(ctx, cx, headY + 14 * u, 20 * u, 15 * u, COLOR.belly)
  ellipse(ctx, cx, headY + 6 * u, 7 * u, 5 * u, COLOR.nose)

  // 8) 口：鼻から下に線、そこから左右に小さな弧（「ω」のかたち）
  ctx.strokeStyle = COLOR.dark
  ctx.lineWidth = 2 * u
  ctx.beginPath()
  ctx.moveTo(cx, headY + 11 * u)
  ctx.lineTo(cx, headY + 16 * u)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx - 5 * u, headY + 16 * u, 5 * u, 0, Math.PI)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx + 5 * u, headY + 16 * u, 5 * u, 0, Math.PI)
  ctx.stroke()

  // 9) 目と、機嫌ごとの表情
  const eyeY = headY - 4 * u
  const eyeDx = 17 * u
  if (look.mood === 'fed') {
    // ごきげん：笑った目（∩）、舌、ほっぺ、ハート
    ctx.strokeStyle = COLOR.dark
    ctx.lineWidth = 2.6 * u
    for (const dx of [-eyeDx, eyeDx]) {
      ctx.beginPath()
      ctx.arc(cx + dx, eyeY + 2 * u, 6 * u, Math.PI * 1.1, Math.PI * 1.9)
      ctx.stroke()
    }
    ellipse(ctx, cx, headY + 24 * u, 5 * u, 7 * u, COLOR.tongue)
    ctx.globalAlpha = 0.6
    ellipse(ctx, cx - 30 * u, headY + 8 * u, 8 * u, 5 * u, COLOR.pink)
    ellipse(ctx, cx + 30 * u, headY + 8 * u, 8 * u, 5 * u, COLOR.pink)
    ctx.globalAlpha = 1
    ctx.fillStyle = COLOR.tongue
    ctx.font = `${16 * u}px sans-serif`
    ctx.fillText('♥', cx + 44 * u, headY - 30 * u)
  } else if (sleeping) {
    // 寝ている：閉じた目（∪）と zzz
    ctx.strokeStyle = COLOR.dark
    ctx.lineWidth = 2.6 * u
    for (const dx of [-eyeDx, eyeDx]) {
      ctx.beginPath()
      ctx.arc(cx + dx, eyeY - 2 * u, 6 * u, Math.PI * 0.1, Math.PI * 0.9)
      ctx.stroke()
    }
    ctx.fillStyle = COLOR.dark
    ctx.font = `bold ${14 * u}px sans-serif`
    ctx.fillText('z', cx + 44 * u, headY - 28 * u)
    ctx.font = `bold ${10 * u}px sans-serif`
    ctx.fillText('z', cx + 58 * u, headY - 40 * u)
  } else {
    // おなかがすいている：まるい目（うるうる）
    for (const dx of [-eyeDx, eyeDx]) {
      ellipse(ctx, cx + dx, eyeY, 6 * u, 7 * u, COLOR.dark)
      ellipse(ctx, cx + dx + 2 * u, eyeY - 2.5 * u, 2.2 * u, 2.2 * u, COLOR.white)
    }
  }

  // ---- 子犬が身につけるもの（頭と顔のうえ）と、手前のもの ----
  drawDogItems(ctx, items, geo)
  drawFrontItems(ctx, items, geo)

  ctx.restore()
}

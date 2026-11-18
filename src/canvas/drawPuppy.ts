// Canvas に子犬を描く。
// Canvas は「ペンで絵を描く紙」のようなもの。座標は左上が (0, 0)、右へ x、下へ y が増える。
// ここでは、決まった大きさ（VIRTUAL_W × VIRTUAL_H）の紙に描く。
// 画面に出すときの拡大・縮小は、呼び出し側（PuppyCanvas）がまとめて行う。
//
// 動かすしくみ：この関数は「ある瞬間の1枚の絵」を描くだけ。
// 体の動き（ポーズ）を少しずつ変えながら、何十回も描き直すと、パラパラ漫画のように動いて見える。

import { MAX_STAGE } from '../logic/puppy'
import type { Mood } from '../logic/puppy'
import { itemsForStage } from '../logic/puppyItems'
import { NEUTRAL_POSE } from '../logic/puppyTricks'
import type { Pose } from '../logic/puppyTricks'
import { drawBackItems, drawCushion, drawFrontItems, drawHeadItems, drawNeckItems } from './drawItems'
import type { Geometry } from './drawItems'
import { COLOR, ellipse, polygon } from './shapes'

export const VIRTUAL_W = 260
export const VIRTUAL_H = 220 // ジャンプしても頭が紙から出ないよう、上に余白をとってある

// 子犬の大きさ。ステージ0で 55%、ステージ20（最終）で 100%。
export function puppyScale(stage: number): number {
  const s = Math.min(Math.max(stage, 0), MAX_STAGE)
  return 0.55 + (0.45 * s) / MAX_STAGE
}

export type PuppyLook = {
  stage: number
  mood: Mood
  pose?: Pose // 体の動き。なければ、ふだんの姿勢
}

// ジャンプの高さ（「1単位の長さ」u の何倍か）
const JUMP_HEIGHT = 28

// 子犬とアイテムを描く。子犬は紙の中央の下のほうに座らせる。
export function drawPuppy(ctx: CanvasRenderingContext2D, look: PuppyLook) {
  const pose = look.pose ?? NEUTRAL_POSE
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

  // ---- 動かない背景：うしろのアイテム、影、クッション ----
  drawBackItems(ctx, items, geo)
  // 跳んでいるあいだは、影が小さくなる（高いほど遠くに見える）
  ellipse(ctx, cx, gy, 62 * u * (1 - 0.3 * pose.lift), 8 * u * (1 - 0.3 * pose.lift), COLOR.shadow)
  drawCushion(ctx, items, geo)

  // ---- 子犬ぜんたいの動き ----
  // ctx.translate / scale は「紙のほうを動かす」命令。この行より下に描くものは、まとめて動く。
  // 足もとの中心 (cx, gy) を基準に、ジャンプ（上へ）・ゆれ（横へ）・回転（横幅を cos 倍）・おじぎ（少しつぶす）をかける。
  ctx.save()
  const spinX = Math.cos(pose.turn)
  ctx.translate(cx + pose.sway * 8 * u, gy - pose.lift * JUMP_HEIGHT * u)
  // 横幅が 0 になる瞬間は描けない（逆向きにもできない）ので、ごく薄い幅を最低限にする
  ctx.scale(Math.abs(spinX) < 0.03 ? 0.03 : spinX, 1 - 0.08 * pose.bow)
  ctx.translate(-cx, -gy)

  drawTail(ctx, geo, look.mood, pose)
  drawBody(ctx, geo, pose)

  // 頭は、首を軸に傾く。おじぎでは、頭が下がる。
  const neckX = cx
  const neckY = headY + 40 * u
  const bowDrop = pose.bow * 18 * u
  ctx.save()
  ctx.translate(neckX, neckY + bowDrop)
  ctx.rotate(pose.headTilt)
  ctx.translate(-neckX, -neckY)
  drawHead(ctx, geo, look.mood, pose)
  drawHeadItems(ctx, items, geo)
  ctx.restore()

  // 首まわりのアイテムは、頭が下がるときは、いっしょに下がる
  ctx.save()
  ctx.translate(0, bowDrop)
  drawNeckItems(ctx, items, geo)
  ctx.restore()

  ctx.restore() // ← 子犬ぜんたいの動きを元に戻す

  // ---- ふきだし（動かない） ----
  if (pose.bubble) {
    drawBubble(ctx, pose.bubble, cx + 60 * u + 16, headY - 44 * u - 8)
  }

  // ---- 手前のアイテム ----
  drawFrontItems(ctx, items, geo)

  ctx.restore()
}

// しっぽ（体のうしろ）。ごきげんなときは高く上げ、振るときは先が左右に動く。
function drawTail(ctx: CanvasRenderingContext2D, g: Geometry, mood: Mood, pose: Pose) {
  const { cx, gy, u } = g
  const lift = mood === 'fed' ? 22 * u : mood === 'hungry' ? 8 * u : 0
  ctx.beginPath()
  ctx.moveTo(cx + 42 * u, gy - 26 * u)
  ctx.quadraticCurveTo(cx + 78 * u, gy - 30 * u, cx + 70 * u + pose.tailWag * 14 * u, gy - 52 * u - lift)
  ctx.strokeStyle = COLOR.ear
  ctx.lineWidth = 12 * u
  ctx.stroke()
}

// 体・おなか・前足。お手のときは、右の前足が上がる。
function drawBody(ctx: CanvasRenderingContext2D, g: Geometry, pose: Pose) {
  const { cx, gy, u } = g
  ellipse(ctx, cx, gy - 50 * u, 52 * u, 50 * u, COLOR.body)
  ellipse(ctx, cx, gy - 40 * u, 30 * u, 36 * u, COLOR.belly)

  ellipse(ctx, cx - 20 * u, gy - 9 * u, 16 * u, 10 * u, COLOR.belly)

  // 右の前足：ふだんは地面、上げるとき（raise が大きいほど）は、右上に動いて、少し傾く
  const r = pose.pawRaise
  const pawX = cx + (20 + 18 * r) * u
  const pawY = gy - (9 + 43 * r) * u
  if (r > 0.02) {
    // 肩から足までの「腕」
    ctx.strokeStyle = COLOR.belly
    ctx.lineWidth = 14 * u
    ctx.beginPath()
    ctx.moveTo(cx + 22 * u, gy - 38 * u)
    ctx.lineTo(pawX, pawY)
    ctx.stroke()
  }
  ellipse(ctx, pawX, pawY, 16 * u, (10 + 3 * r) * u, COLOR.belly, -0.5 * r)
}

// 頭：耳・顔・表情。傾きは呼び出し側（ctx.rotate）がまとめてかける。
function drawHead(ctx: CanvasRenderingContext2D, g: Geometry, mood: Mood, pose: Pose) {
  const { cx, u, headY } = g

  // 耳（頭のうしろ）。垂れ耳
  ellipse(ctx, cx - 40 * u, headY + 2 * u, 15 * u, 30 * u, COLOR.ear, 0.35)
  ellipse(ctx, cx + 40 * u, headY + 2 * u, 15 * u, 30 * u, COLOR.ear, -0.35)

  // 頭
  ellipse(ctx, cx, headY, 44 * u, 42 * u, COLOR.body)

  // 口まわり（マズル）と鼻
  ellipse(ctx, cx, headY + 14 * u, 20 * u, 15 * u, COLOR.belly)
  ellipse(ctx, cx, headY + 6 * u, 7 * u, 5 * u, COLOR.nose)

  // 口
  if (pose.mouthOpen > 0.05) {
    // ほえるとき：口を開ける（大きさは mouthOpen に比例）
    ellipse(ctx, cx, headY + 21 * u, 7 * u, (3 + 8 * pose.mouthOpen) * u, COLOR.nose)
    ellipse(ctx, cx, headY + (24 + 5 * pose.mouthOpen) * u, 4.5 * u, 3.5 * u * pose.mouthOpen, COLOR.tongue)
  } else {
    // ふだん：鼻から下に線、そこから左右に小さな弧（「ω」のかたち）
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
  }

  // 目と、機嫌ごとの表情
  const eyeY = headY - 4 * u
  const eyeDx = 17 * u
  if (mood === 'fed') {
    // ごきげん：笑った目（∩）、舌、ほっぺ、ハート
    ctx.strokeStyle = COLOR.dark
    ctx.lineWidth = 2.6 * u
    for (const dx of [-eyeDx, eyeDx]) {
      ctx.beginPath()
      ctx.arc(cx + dx, eyeY + 2 * u, 6 * u, Math.PI * 1.1, Math.PI * 1.9)
      ctx.stroke()
    }
    if (pose.mouthOpen <= 0.05) ellipse(ctx, cx, headY + 24 * u, 5 * u, 7 * u, COLOR.tongue)
    ctx.globalAlpha = 0.6
    ellipse(ctx, cx - 30 * u, headY + 8 * u, 8 * u, 5 * u, COLOR.pink)
    ellipse(ctx, cx + 30 * u, headY + 8 * u, 8 * u, 5 * u, COLOR.pink)
    ctx.globalAlpha = 1
    ctx.fillStyle = COLOR.tongue
    ctx.font = `${16 * u}px sans-serif`
    ctx.fillText('♥', cx - 62 * u, headY - 30 * u) // リボン・王冠・ふきだしと重ならない、左側
  } else if (mood === 'sleeping') {
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
    ctx.fillText('z', cx - 58 * u, headY - 28 * u) // 左側（右側にはリボン・ふきだしがくる）
    ctx.font = `bold ${10 * u}px sans-serif`
    ctx.fillText('z', cx - 72 * u, headY - 40 * u)
  } else {
    // おなかがすいている：まるい目（うるうる）
    for (const dx of [-eyeDx, eyeDx]) {
      ellipse(ctx, cx + dx, eyeY, 6 * u, 7 * u, COLOR.dark)
      ellipse(ctx, cx + dx + 2 * u, eyeY - 2.5 * u, 2.2 * u, 2.2 * u, COLOR.white)
    }
  }
}

// ふきだし（まるい形と、頭のほうに向いた小さなとがり）
function drawBubble(
  ctx: CanvasRenderingContext2D,
  bubble: NonNullable<Pose['bubble']>,
  x: number,
  y: number,
) {
  ctx.save()
  ctx.globalAlpha = bubble.alpha
  ellipse(ctx, x, y, 28, 13, COLOR.white)
  ctx.strokeStyle = COLOR.dark
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.ellipse(x, y, 28, 13, 0, 0, Math.PI * 2)
  ctx.stroke()
  polygon(ctx, [[x - 16, y + 9], [x - 28, y + 22], [x - 6, y + 12]], COLOR.white)
  ctx.fillStyle = COLOR.dark
  ctx.font = 'bold 15px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(bubble.text, x, y + 1)
  ctx.restore()
}

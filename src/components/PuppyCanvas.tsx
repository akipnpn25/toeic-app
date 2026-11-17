import { useEffect, useRef } from 'react'
import { VIRTUAL_H, VIRTUAL_W, drawPuppy } from '../canvas/drawPuppy'
import type { PuppyLook } from '../canvas/drawPuppy'

// 子犬を描いた <canvas>。見た目（ステージ・機嫌）が変わるたびに描き直す。
export default function PuppyCanvas({ stage, mood }: PuppyLook) {
  // useRef：画面の部品（ここでは <canvas>）を、あとから直接さわるための「つかみ手」
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // useEffect：画面に出たあと（見た目の値が変わったあと）に実行される処理。
  // 最後の [stage, mood] は「この2つが変わったときだけ、もう一度実行する」という指定。
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // iPhone などの高精細な画面（Retina）では、画素数を増やして描かないとぼやける。
    // devicePixelRatio は「1つの表示用の点に、実際の画素が何個あるか」。
    const dpr = window.devicePixelRatio || 1
    canvas.width = VIRTUAL_W * dpr
    canvas.height = VIRTUAL_H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0) // 以降の描画を dpr 倍に拡大する
    ctx.clearRect(0, 0, VIRTUAL_W, VIRTUAL_H)

    drawPuppy(ctx, { stage, mood })
  }, [stage, mood])

  return (
    <canvas
      ref={canvasRef}
      // CSS では見た目の大きさだけを決める（描く紙の大きさは、上の canvas.width / height）
      style={{ width: '100%', aspectRatio: `${VIRTUAL_W} / ${VIRTUAL_H}`, display: 'block' }}
      role="img"
      aria-label="子犬"
    />
  )
}

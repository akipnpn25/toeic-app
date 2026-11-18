import { useCallback, useEffect, useRef } from 'react'
import { VIRTUAL_H, VIRTUAL_W, drawPuppy } from '../canvas/drawPuppy'
import type { PuppyLook } from '../canvas/drawPuppy'
import { pickTrick, poseAt } from '../logic/puppyTricks'
import type { Pose, Trick, TrickId } from '../logic/puppyTricks'

type Props = Omit<PuppyLook, 'pose'> & {
  // 芸が始まったとき（trick）、終わったとき（null）に呼ばれる
  onTrick?: (trick: Trick | null) => void
}

// 子犬を描いた <canvas>。見た目（ステージ・機嫌）が変わるたびに描き直す。
// タップすると、できる芸の中からランダムに1つ見せる。
export default function PuppyCanvas({ stage, mood, onTrick }: Props) {
  // useRef：画面の部品や値を、「描き直しのたびに作り直されない入れ物」に入れておく。
  // 中身（.current）を変えても、画面の描き直しは起きない。
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number | null>(null) // 動いている間の、次のアニメーション予約の番号
  const lastTrickRef = useRef<TrickId | null>(null) // 直前にやった芸（続けて同じ芸にしないため）
  const onTrickRef = useRef(onTrick) // 最新の onTrick を、いつでも呼べるように持っておく

  useEffect(() => {
    onTrickRef.current = onTrick
  })

  // 1枚の絵を描く。pose がなければ、ふだんの姿勢。
  // useCallback：stage や mood が変わらないかぎり、同じ関数を使い回す（useEffect の依存に使うため）
  const paint = useCallback(
    (pose?: Pose) => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return

      // iPhone などの高精細な画面（Retina）では、画素数を増やして描かないとぼやける。
      // devicePixelRatio は「1つの表示用の点に、実際の画素が何個あるか」。
      const dpr = window.devicePixelRatio || 1
      const width = Math.round(VIRTUAL_W * dpr)
      const height = Math.round(VIRTUAL_H * dpr)
      // 大きさを設定すると紙が真っ白になって少し重いので、変わったときだけ設定する
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0) // 以降の描画を dpr 倍に拡大する
      ctx.clearRect(0, 0, VIRTUAL_W, VIRTUAL_H)
      drawPuppy(ctx, { stage, mood, pose })
    },
    [stage, mood],
  )

  const stopAnimation = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      onTrickRef.current?.(null) // 途中で止めたので、「芸をしている」表示も消す
    }
  }, [])

  // 見た目が変わったら描き直す。画面から消えるとき・見た目が変わるときは、途中の動きを止める。
  // 最後の [paint, stopAnimation] は「この2つが変わったときだけ、もう一度実行する」という指定。
  useEffect(() => {
    paint()
    return stopAnimation
  }, [paint, stopAnimation])

  function handleTap() {
    if (mood === 'sleeping') return // 寝ているときは、芸をしない
    // 「視差・動きを減らす」設定（目が疲れやすい人向けの OS の設定）のときは、動かさない
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    stopAnimation()
    const trick = pickTrick(stage, lastTrickRef.current)
    lastTrickRef.current = trick.id
    onTrick?.(trick)

    const start = performance.now()
    // requestAnimationFrame：「次に画面を更新するとき、この関数を呼んでね」という予約。
    // 画面は1秒間に60回ほど（機種によって違う）更新される。更新のたびに、芸の進み具合（0〜1）を計算して、
    // 少しずつ違う絵を描き直す。これを繰り返すと、パラパラ漫画のように動いて見える。
    const step = (now: number) => {
      const progress = (now - start) / trick.duration
      if (progress >= 1) {
        frameRef.current = null
        paint() // ふだんの姿勢に戻す
        onTrickRef.current?.(null)
        return
      }
      paint(poseAt(trick, progress))
      frameRef.current = requestAnimationFrame(step) // 次の更新も予約する
    }
    frameRef.current = requestAnimationFrame(step)
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handleTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleTap()
        }
      }}
      // CSS では見た目の大きさだけを決める（描く紙の大きさは、paint の canvas.width / height）
      style={{
        width: '100%',
        aspectRatio: `${VIRTUAL_W} / ${VIRTUAL_H}`,
        display: 'block',
        cursor: mood === 'sleeping' ? 'default' : 'pointer',
        touchAction: 'manipulation', // iPhone で、ダブルタップによる拡大を起こさない
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      role="button"
      tabIndex={0}
      aria-label={mood === 'sleeping' ? '子犬（寝ています）' : '子犬（タップすると芸を見せます）'}
    />
  )
}

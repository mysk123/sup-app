'use client';

/**
 * Hero3D — LP ヒーローの 3D 演出
 * 「多数のサプリ候補を AI エンジンがルールで評価 → 過剰/相互作用を弾き →
 *  最適な数本だけを選定し、中央のエンジンに線でつないで組み上げる」
 *
 * - three は動的 import(初回描画をブロックしない / モバイルでは読み込まない)
 * - モバイル幅 / prefers-reduced-motion / WebGL 不可 のときは静止フォールバック
 */
import { useEffect, useRef, useState } from 'react';

const SELECTED = [
  { idx: 2, label: 'L-テアニン', score: 88 },
  { idx: 8, label: 'Mg グリシネート', score: 84 },
  { idx: 13, label: 'D3 + K2', score: 91 }
];
const REJECTED = [5, 11];
const RULES = ['重複チェック', '相互作用', '目的整合', '過剰摂取', 'タイミング'];

export default function Hero3D() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'static' | 'live'>('static');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const isNarrow = window.innerWidth < 680;
    const lowCore =
      typeof navigator !== 'undefined' &&
      (navigator.hardwareConcurrency ?? 8) <= 4;

    // WebGL 可用性チェック
    let webgl = false;
    try {
      const c = document.createElement('canvas');
      webgl = !!(
        c.getContext('webgl') || c.getContext('experimental-webgl')
      );
    } catch {
      webgl = false;
    }

    if (prefersReduced || isNarrow || lowCore || !webgl) {
      setMode('static');
      return;
    }

    setMode('live');

    let cleanup: (() => void) | null = null;
    let cancelled = false;

    import('three')
      .then((THREE) => {
        if (cancelled || !canvasRef.current || !wrapRef.current) return;
        cleanup = initScene(THREE, canvasRef.current, wrapRef.current);
      })
      .catch(() => setMode('static'));

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        width: '100%',
        height: 360,
        borderRadius: 18,
        overflow: 'hidden',
        background: '#081310',
        margin: '8px 0 32px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: mode === 'live' ? 'block' : 'none'
        }}
      />
      {/* ビネット */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 150px 30px rgba(0,0,0,0.6)'
        }}
      />

      {/* ステータス */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 9
        }}
      >
        <span
          id="h3d-dot"
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: '#5fe0a8',
            boxShadow: '0 0 10px #5fe0a8',
            display: 'inline-block'
          }}
        />
        <span
          id="h3d-stat"
          style={{
            fontSize: 11,
            letterSpacing: '0.2em',
            color: '#5fe0a8',
            fontWeight: 600
          }}
        >
          AI ENGINE · 選定完了
        </span>
      </div>

      {/* 評価ルール */}
      <div
        style={{
          position: 'absolute',
          top: 44,
          left: 18,
          width: 152,
          background: 'rgba(8,22,17,0.62)',
          border: '1px solid rgba(76,164,126,0.25)',
          borderRadius: 12,
          padding: '10px 12px'
        }}
      >
        <div
          style={{
            fontSize: 9.5,
            letterSpacing: '0.16em',
            color: '#7fa593',
            fontWeight: 700,
            marginBottom: 8
          }}
        >
          EVALUATION RULES
        </div>
        {RULES.map((r, i) => (
          <div
            key={r}
            id={`h3d-rule-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              margin: '5px 0',
              fontSize: 11.5,
              color: '#c7f3e0'
            }}
          >
            <span
              style={{
                width: 13,
                height: 13,
                borderRadius: 4,
                background: '#5fe0a8',
                color: '#081310',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                flexShrink: 0
              }}
            >
              ✓
            </span>
            <span>{r}</span>
          </div>
        ))}
      </div>

      {/* Sup. App ロゴ */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 18,
          fontWeight: 700,
          fontSize: 15,
          color: '#f0f5f1',
          letterSpacing: '-0.01em'
        }}
      >
        Sup<span style={{ color: '#4ca47e' }}>.</span>{' '}
        <span
          style={{
            fontSize: 9.5,
            color: '#8aa399',
            letterSpacing: '0.08em',
            fontWeight: 600
          }}
        >
          App
        </span>
      </div>

      {/* RESULT */}
      <div style={{ position: 'absolute', left: 18, bottom: 16 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            color: '#7fa593',
            fontWeight: 700,
            marginBottom: 4
          }}
        >
          RESULT
        </div>
        <div style={{ fontSize: 13.5, color: '#c7f3e0', fontWeight: 500 }}>
          最適スタックを選定{' '}
          <span id="h3d-sel" style={{ color: '#5fe0a8', fontWeight: 800 }}>
            3
          </span>{' '}
          <span style={{ color: '#6f9686' }}>/ 候補 17 本</span>
        </div>
      </div>

      {/* Optimization Score */}
      <div
        style={{
          position: 'absolute',
          right: 20,
          bottom: 14,
          textAlign: 'right'
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.15em',
            color: '#8aa399',
            fontWeight: 600,
            marginBottom: 2
          }}
        >
          OPTIMIZATION SCORE
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 4,
            justifyContent: 'flex-end'
          }}
        >
          <span
            id="h3d-score"
            style={{
              fontSize: 44,
              fontWeight: 800,
              lineHeight: 1,
              color: '#f0f5f1',
              letterSpacing: '-0.04em'
            }}
          >
            87
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#4ca47e' }}>
            /100
          </span>
        </div>
      </div>

      {/* 選定ラベル(live のみ) */}
      <div
        id="h3d-labels"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* 静止フォールバックの選定チップ */}
      {mode === 'static' && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-58%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'center'
          }}
        >
          {SELECTED.map((s) => (
            <div
              key={s.idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(76,164,126,0.16)',
                border: '1px solid rgba(95,224,168,0.45)',
                color: '#d6f7e8',
                fontSize: 13,
                fontWeight: 500,
                padding: '7px 16px',
                borderRadius: 999
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#5fe0a8',
                  boxShadow: '0 0 8px #5fe0a8'
                }}
              />
              {s.label}{' '}
              <span style={{ color: '#7fc9a8', fontSize: 11.5 }}>
                {s.score}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── three.js シーン ───────── */
function initScene(
  THREE: any,
  canvas: HTMLCanvasElement,
  wrap: HTMLDivElement
): () => void {
  const scoreEl = document.getElementById('h3d-score');
  const statEl = document.getElementById('h3d-stat');
  const dotEl = document.getElementById('h3d-dot');
  const selEl = document.getElementById('h3d-sel');
  const labelLayer = document.getElementById('h3d-labels');
  const ruleEls = RULES.map((_, i) => document.getElementById(`h3d-rule-${i}`));
  const ruleTh = [0.12, 0.3, 0.46, 0.62, 0.78];

  let W = wrap.clientWidth;
  let H = wrap.clientHeight;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 100);
  camera.position.set(0, 0.2, 9.8);

  scene.add(new THREE.AmbientLight(0x3a5f50, 0.9));
  const d1 = new THREE.DirectionalLight(0xffffff, 1.1);
  d1.position.set(5, 8, 6);
  scene.add(d1);
  const d2 = new THREE.DirectionalLight(0x4ca47e, 0.55);
  d2.position.set(-6, -2, -4);
  scene.add(d2);
  const scanLight = new THREE.PointLight(0x5fe0a8, 0.9, 15);
  scene.add(scanLight);
  const coreLight = new THREE.PointLight(0x5fe0a8, 0, 10);
  scene.add(coreLight);

  const cloud = new THREE.Group();
  scene.add(cloud);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.6, 1),
    new THREE.MeshStandardMaterial({
      color: 0x0f5b3e,
      emissive: 0x2f7d5c,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.2
    })
  );
  cloud.add(core);
  const coreRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.98, 0.02, 10, 60),
    new THREE.MeshBasicMaterial({
      color: 0x5fe0a8,
      transparent: true,
      opacity: 0.5
    })
  );
  cloud.add(coreRing);

  function makePill(cA: number, cB: number) {
    const g = new THREE.Group();
    const r = 0.5;
    const ch = 1.0;
    const mA = new THREE.MeshStandardMaterial({
      color: cA,
      roughness: 0.34,
      metalness: 0.06
    });
    const mB = new THREE.MeshStandardMaterial({
      color: cB,
      roughness: 0.34,
      metalness: 0.06
    });
    const tc = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, ch / 2, 26, 1, true),
      mA
    );
    tc.position.y = ch / 4;
    const bc = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, ch / 2, 26, 1, true),
      mB
    );
    bc.position.y = -ch / 4;
    const th = new THREE.Mesh(
      new THREE.SphereGeometry(r, 26, 16, 0, 6.2832, 0, 1.5708),
      mA
    );
    th.position.y = ch / 2;
    const bh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 26, 16, 0, 6.2832, 1.5708, 1.5708),
      mB
    );
    bh.position.y = -ch / 2;
    g.add(tc, bc, th, bh);
    g.userData.mats = [mA, mB];
    g.userData.baseColors = [cA, cB];
    return g;
  }

  const palette = [
    [0x0f5b3e, 0xf4efe0],
    [0x4ca47e, 0xffffff],
    [0xc8835f, 0xf4efe0],
    [0x06352a, 0x4ca47e],
    [0xd8a657, 0xffffff],
    [0x2f7d5c, 0xeef7f1]
  ];
  const N = 17;
  const R = 3.3;
  const topY = R + 0.7;
  const pills: any[] = [];
  const selMap: Record<number, { label: string; score: number }> = {};
  SELECTED.forEach((s) => (selMap[s.idx] = { label: s.label, score: s.score }));
  const rejSet = new Set(REJECTED);

  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const th = i * 2.39996;
    const p = palette[i % palette.length];
    const pill = makePill(p[0], p[1]);
    pill.position.set(
      Math.cos(th) * rad * R,
      y * R,
      Math.sin(th) * rad * R
    );
    pill.rotation.set(
      Math.random() * 3,
      Math.random() * 3,
      Math.random() * 3
    );
    pill.scale.setScalar(0.5);
    pill.userData.baseY = pill.position.y;
    pill.userData.phase = Math.random() * 6.28;
    pill.userData.sel = i in selMap;
    pill.userData.rej = rejSet.has(i);
    pill.userData.glow = 0;
    pill.userData.rejAmt = 0;
    cloud.add(pill);
    pills.push(pill);
  }

  // 選定ラベル
  const labelEls: Record<number, HTMLDivElement> = {};
  if (labelLayer) {
    SELECTED.forEach((s) => {
      const el = document.createElement('div');
      el.style.cssText =
        'position:absolute;left:0;top:0;will-change:transform;opacity:0;transition:opacity .35s;white-space:nowrap;font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;background:rgba(76,164,126,0.2);border:1px solid rgba(95,224,168,0.55);color:#d6f7e8;';
      el.innerHTML =
        '✓ ' + s.label + ' <span style="color:#7fc9a8;">' + s.score + '</span>';
      labelLayer.appendChild(el);
      labelEls[s.idx] = el;
    });
  }

  // 選定 → コアへの線
  const selPills = pills.filter((p) => p.userData.sel);
  const lines = selPills.map(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(6), 3)
    );
    const ln = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({
        color: 0x5fe0a8,
        transparent: true,
        opacity: 0
      })
    );
    cloud.add(ln);
    return ln;
  });

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(R + 0.5, 0.03, 12, 80),
    new THREE.MeshBasicMaterial({
      color: 0x5fe0a8,
      transparent: true,
      opacity: 0.55
    })
  );
  ring.rotation.x = Math.PI / 2;
  cloud.add(ring);

  // 背景パーティクル
  const pGeo = new THREE.BufferGeometry();
  const pn = 320;
  const parr = new Float32Array(pn * 3);
  for (let k = 0; k < pn; k++) {
    const rr = 5 + Math.random() * 7;
    const a = Math.random() * 6.28;
    const b = Math.acos(2 * Math.random() - 1);
    parr[k * 3] = rr * Math.sin(b) * Math.cos(a);
    parr[k * 3 + 1] = rr * Math.cos(b);
    parr[k * 3 + 2] = rr * Math.sin(b) * Math.sin(a);
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(parr, 3));
  const dust = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: 0x4ca47e,
      size: 0.05,
      transparent: true,
      opacity: 0.4
    })
  );
  scene.add(dust);

  // マウス視差
  let mx = 0;
  let my = 0;
  let tmx = 0;
  let tmy = 0;
  const onMove = (e: MouseEvent) => {
    const b = wrap.getBoundingClientRect();
    tmx = ((e.clientX - b.left) / b.width - 0.5) * 0.5;
    tmy = ((e.clientY - b.top) / b.height - 0.5) * 0.4;
  };
  const onLeave = () => {
    tmx = 0;
    tmy = 0;
  };
  wrap.addEventListener('mousemove', onMove);
  wrap.addEventListener('mouseleave', onLeave);

  const clock = new THREE.Clock();
  const sweep = 5.4;
  let dispScore = 0;
  let selCount = 0;
  const mintC = new THREE.Color(0x5fe0a8);
  const whiteC = new THREE.Color(0xbfe8d6);
  const pv = new THREE.Vector3();
  let raf = 0;
  let running = true;

  function frame() {
    if (!running) return;
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();
    const prog = (t % sweep) / sweep;
    const ringY = -topY + prog * (2 * topY);
    ring.position.y = ringY;
    scanLight.position.y = ringY;
    ring.material.opacity = 0.22 + 0.42 * Math.sin(prog * Math.PI);

    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;
    cloud.rotation.y += dt * 0.14;
    cloud.rotation.x = my;
    cloud.rotation.z = mx * 0.28;
    core.rotation.y += dt * 0.5;
    core.rotation.x += dt * 0.3;
    coreRing.rotation.z += dt * 0.6;
    coreRing.rotation.x = 1.2 + Math.sin(t * 0.4) * 0.3;
    dust.rotation.y -= dt * 0.02;

    let nsel = 0;
    for (let i = 0; i < pills.length; i++) {
      const pl = pills[i];
      const u = pl.userData;
      pl.position.y = u.baseY + Math.sin(t * 0.85 + u.phase) * 0.1;
      pl.rotation.x += dt * 0.22;
      pl.rotation.y += dt * 0.28;
      const d = Math.abs(ringY - pl.position.y);
      const flash = Math.max(0, 1 - d / 0.55);
      const passed = ringY > pl.position.y - 0.05;
      const gt = u.sel && passed ? 1 : 0;
      const rt = u.rej && passed ? 1 : 0;
      u.glow += (gt - u.glow) * 0.11;
      u.rejAmt += (rt - u.rejAmt) * 0.1;
      if (u.sel && u.glow > 0.5) nsel++;
      const ei = Math.max(flash * 0.6, u.glow * 1.4);
      const col = u.sel ? mintC : whiteC;
      u.mats[0].emissive.copy(col);
      u.mats[0].emissiveIntensity = ei;
      u.mats[1].emissive.copy(col);
      u.mats[1].emissiveIntensity = ei;
      // 却下 → くすませる(彩度/明度を落とす)
      if (u.rej) {
        const g = 1 - u.rejAmt * 0.62;
        u.mats[0].color.setHex(u.baseColors[0]).multiplyScalar(g);
        u.mats[1].color.setHex(u.baseColors[1]).multiplyScalar(g);
      }
      const sc = 0.5 * (1 + u.glow * 0.3 + flash * 0.05 - u.rejAmt * 0.2);
      pl.scale.setScalar(sc);
    }

    // 選定ラベルの追従
    SELECTED.forEach((s) => {
      const pl = pills[s.idx];
      const el = labelEls[s.idx];
      if (!el) return;
      const passed = ringY > pl.position.y - 0.05;
      pl.getWorldPosition(pv);
      pv.project(camera);
      const x = (pv.x * 0.5 + 0.5) * W;
      const y = (-pv.y * 0.5 + 0.5) * H;
      el.style.opacity = passed && pv.z < 1 ? '1' : '0';
      el.style.transform =
        'translate(-50%,-140%) translate(' +
        x.toFixed(1) +
        'px,' +
        y.toFixed(1) +
        'px)';
    });

    // 線の更新
    for (let s = 0; s < selPills.length; s++) {
      const sp = selPills[s];
      const ln = lines[s];
      ln.material.opacity = Math.max(0, sp.userData.glow - 0.1) * 0.7;
      const pa = ln.geometry.attributes.position.array;
      pa[0] = 0;
      pa[1] = 0;
      pa[2] = 0;
      pa[3] = sp.position.x;
      pa[4] = sp.position.y;
      pa[5] = sp.position.z;
      ln.geometry.attributes.position.needsUpdate = true;
    }

    const coreOn = Math.min(1, nsel / 3);
    coreLight.intensity = 0.3 + coreOn * 1.2;
    core.material.emissiveIntensity = 0.5 + coreOn * 0.9;
    coreRing.material.opacity = 0.3 + coreOn * 0.5;

    // ルール点灯
    ruleEls.forEach((el, i) => {
      if (!el) return;
      el.style.color = prog > ruleTh[i] ? '#c7f3e0' : '#5f7d70';
    });

    // スコア
    const targetScore = Math.round(Math.min(1, prog / 0.88) * 87);
    dispScore += (targetScore - dispScore) * 0.15;
    if (scoreEl) scoreEl.textContent = String(Math.round(dispScore));
    const selTarget = prog > 0.85 ? 3 : Math.floor((prog / 0.85) * 3);
    selCount += (selTarget - selCount) * 0.2;
    if (selEl) selEl.textContent = String(Math.round(selCount));

    const done = prog >= 0.88;
    if (statEl) {
      statEl.textContent = done
        ? 'AI ENGINE · 選定完了'
        : 'AI ENGINE · 評価中';
      statEl.style.color = done ? '#5fe0a8' : '#9fe1cb';
    }
    if (dotEl)
      dotEl.style.opacity = done
        ? '1'
        : String(0.4 + 0.6 * Math.abs(Math.sin(t * 4)));

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  const onResize = () => {
    W = wrap.clientWidth;
    H = wrap.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', onResize);

  // 画面外では一時停止(省電力)
  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries[0]?.isIntersecting;
      if (visible && !running) {
        running = true;
        clock.start();
        raf = requestAnimationFrame(frame);
      } else if (!visible && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    },
    { threshold: 0.05 }
  );
  io.observe(wrap);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    wrap.removeEventListener('mousemove', onMove);
    wrap.removeEventListener('mouseleave', onLeave);
    io.disconnect();
    Object.values(labelEls).forEach((el) => el.remove());
    renderer.dispose();
  };
}

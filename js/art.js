// SVG イラスト：属性の紋章 / 魔法陣 / ボスモンスター
const Art = (() => {
  let uid = 0;
  const mirror = d => `<path transform="translate(200 0) scale(-1 1)" d="${d}"/>`;

  const EMBLEM = {
    fire: g => `
      <path fill="url(#${g})" d="M50 2 C58 22 82 34 82 62 C82 84 66 98 50 98 C34 98 18 86 18 64 C18 48 28 38 34 26 C38 38 42 44 48 44 C42 30 42 16 50 2Z"/>
      <path fill="#fff" opacity=".55" d="M50 48 C56 60 66 66 66 78 C66 90 58 96 50 96 C42 96 34 90 34 80 C34 70 44 62 50 48Z"/>`,
    thunder: g => `<path fill="url(#${g})" stroke="#fff" stroke-width="2" stroke-linejoin="round" d="M60 2 L18 58 L44 58 L34 98 L84 38 L56 38 L70 2Z"/>`,
    ice: g => {
      let s = '';
      for (let i = 0; i < 6; i++) {
        s += `<g transform="rotate(${i * 60} 50 50)"><line x1="50" y1="50" x2="50" y2="6"/><polyline points="38,16 50,26 62,16"/><polyline points="40,32 50,40 60,32"/></g>`;
      }
      return `<g stroke="url(#${g})" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">${s}</g><circle cx="50" cy="50" r="7" fill="#fff"/>`;
    },
    dark: g => `
      <path fill="url(#${g})" d="M2 50 Q50 2 98 50 Q50 98 2 50Z"/>
      <circle cx="50" cy="50" r="22" fill="#12001d"/>
      <ellipse cx="50" cy="50" rx="5" ry="18" fill="#ff3df2"/>
      <circle cx="42" cy="42" r="4" fill="#fff" opacity=".8"/>`,
    light: g => {
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const r = i % 2 ? 17 : (i % 4 ? 36 : 48);
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
        pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`);
      }
      return `<polygon fill="url(#${g})" points="${pts.join(' ')}"/><circle cx="50" cy="50" r="12" fill="#fff"/>`;
    },
    wind: g => `
      <g stroke="url(#${g})" stroke-width="9" stroke-linecap="round" fill="none">
        <path d="M6 34 H58 C74 34 80 18 68 12 C58 7 50 16 56 24"/>
        <path d="M6 54 H80 C94 54 96 74 84 78 C74 81 68 72 74 66"/>
        <path d="M18 76 H46 C58 76 60 92 50 94"/>
      </g>`,
    beast: g => {
      const d = 'M20 6 C34 40 34 70 18 96 C46 70 48 38 30 6Z';
      return `<g fill="url(#${g})" stroke="#0005" stroke-width="1.5">
        <path d="${d}"/><path transform="translate(24 -2)" d="${d}"/><path transform="translate(48 2)" d="${d}"/></g>`;
    },
    poison: g => `
      <path fill="url(#${g})" d="M50 4 C64 30 84 46 84 64 C84 84 68 96 50 96 C32 96 16 84 16 64 C16 46 36 30 50 4Z"/>
      <ellipse cx="39" cy="64" rx="8" ry="9" fill="#1a0022"/>
      <ellipse cx="61" cy="64" rx="8" ry="9" fill="#1a0022"/>
      <path d="M46 78 L50 72 L54 78Z" fill="#1a0022"/>
      <circle cx="36" cy="40" r="4" fill="#fff" opacity=".7"/>`,
  };

  const COLORS = {
    fire:    ['#fff4b0', '#ff9a1f', '#ff2d1f'],
    thunder: ['#ffffff', '#ffe600', '#ff9d00'],
    ice:     ['#ffffff', '#8ff0ff', '#1fa6ff'],
    dark:    ['#e8b8ff', '#9b3dff', '#3a0070'],
    light:   ['#ffffff', '#fff3a6', '#ffb300'],
    wind:    ['#ffffff', '#6dffc1', '#0bb87a'],
    beast:   ['#fff1dc', '#ffae57', '#b5500f'],
    poison:  ['#f6d0ff', '#e04dff', '#2fd968'],
  };

  function emblem(el) {
    const key = ELEMENTS[el].key;
    const g = 'eg' + (++uid);
    const [a, b, c] = COLORS[key];
    return `<svg class="emblem" viewBox="0 0 100 100" aria-hidden="true"><defs>
      <linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
      <stop offset="0" stop-color="${a}"/><stop offset=".45" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
      ${EMBLEM[key](g)}</svg>`;
  }

  // 魔法陣：外周に詠唱文字、a+2 角の星、b 個の宝玉
  function circle(f) {
    const id = 'cp' + (++uid);
    const n = f.a + 2;
    const step = n >= 7 ? 3 : n >= 5 ? 2 : 1;
    const P = (i, r) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
    };
    let star = '';
    for (let i = 0; i < n; i++) {
      const [x1, y1] = P(i, 62), [x2, y2] = P((i + step) % n, 62);
      star += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
    let dots = '';
    for (let i = 0; i < f.b; i++) {
      const a = (i / f.b) * Math.PI * 2 - Math.PI / 2;
      dots += `<circle cx="${(100 + 76 * Math.cos(a)).toFixed(1)}" cy="${(100 + 76 * Math.sin(a)).toFixed(1)}" r="4.5"/>`;
    }
    let text = '';
    const unit = `${f.yomi}・${f.a}×${f.b}＝${f.ans}・`;
    while (text.length < 46) text += unit;
    text = text.slice(0, 46);
    return `<svg class="mcircle" viewBox="0 0 200 200" aria-hidden="true">
      <defs><path id="${id}" d="M100,100 m-86,0 a86,86 0 1,1 172,0 a86,86 0 1,1 -172,0"/></defs>
      <g fill="none" stroke="currentColor">
        <circle cx="100" cy="100" r="97" stroke-width="1.5" stroke-dasharray="2 5"/>
        <circle cx="100" cy="100" r="93" stroke-width="2"/>
        <circle cx="100" cy="100" r="79" stroke-width="1.2"/>
        <circle cx="100" cy="100" r="62" stroke-width="1.5"/>
        <path d="${star}" stroke-width="2"/>
        <circle cx="100" cy="100" r="30" stroke-width="1" stroke-dasharray="4 3"/>
      </g>
      <g fill="currentColor">${dots}</g>
      <text fill="currentColor" font-size="10" font-weight="800" letter-spacing="1.6"><textPath href="#${id}">${text}</textPath></text>
    </svg>`;
  }

  function monster(m) {
    const id = 'mg' + (++uid);
    const eye = m.eye || '#ff2d55';
    let s = `<svg class="monster" viewBox="0 0 200 200" aria-hidden="true"><defs>
      <radialGradient id="${id}" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="${m.c1}"/><stop offset="1" stop-color="${m.c2}"/></radialGradient>
      <radialGradient id="${id}e" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="${eye}"/><stop offset="1" stop-color="${eye}"/></radialGradient></defs>`;
    s += `<ellipse cx="100" cy="188" rx="64" ry="9" fill="#000" opacity=".4"/>`;

    if (m.wings) {
      const w = 'M60 104 L4 54 L14 90 L-2 104 L24 114 L12 140 L62 128Z';
      s += `<g class="wings" fill="${m.c2}" stroke="#000a" stroke-width="2.5"><path d="${w}"/>${mirror(w)}</g>`;
    }
    const top = { slime: 62, round: 56, tall: 44 }[m.shape];
    if (m.horns) {
      const h = `M68 ${top + 26} Q40 ${top - 8} 48 ${top - 38} Q62 ${top - 4} 88 ${top + 12}Z`;
      s += `<g fill="#fff3d6" stroke="#000a" stroke-width="2.5"><path d="${h}"/>${mirror(h)}</g>`;
    }
    if (m.spikes) {
      let sp = '';
      for (let i = -2; i <= 2; i++) sp += `M${92 + i * 20} ${top + 8} l8 -22 l8 22Z`;
      s += `<path d="${sp}" fill="${m.c2}" stroke="#000a" stroke-width="2.5"/>`;
    }
    const body = {
      slime: 'M26 178 C14 124 46 62 100 62 C154 62 186 124 174 178 C156 186 44 186 26 178Z',
      round: 'M100 56 C150 56 172 94 172 126 C172 162 140 182 100 182 C60 182 28 162 28 126 C28 94 50 56 100 56Z',
      tall: 'M100 44 C140 44 160 70 160 104 L160 168 C160 180 150 184 138 184 L62 184 C50 184 40 180 40 168 L40 104 C40 70 60 44 100 44Z',
    }[m.shape];
    s += `<path d="${body}" fill="url(#${id})" stroke="#000b" stroke-width="3.5"/>`;
    if (m.shape === 'slime') s += `<path d="M60 176 q6 12 12 0 M118 178 q5 10 10 0" stroke="#000b" stroke-width="3" fill="${m.c2}"/>`;
    if (m.spots) s += `<g fill="#0003"><circle cx="62" cy="80" r="9"/><circle cx="140" cy="150" r="12"/><circle cx="58" cy="160" r="7"/><circle cx="146" cy="84" r="6"/></g>`;
    s += `<ellipse cx="100" cy="156" rx="40" ry="20" fill="#fff" opacity=".16"/>`;
    s += `<ellipse cx="70" cy="${top + 18}" rx="16" ry="8" fill="#fff" opacity=".35" transform="rotate(-25 70 ${top + 18})"/>`;

    let ey = top + 52;
    if (m.cap) {
      s += `<path d="M10 ${top + 62} C10 ${top - 22} 190 ${top - 22} 190 ${top + 62} C150 ${top + 76} 50 ${top + 76} 10 ${top + 62}Z" fill="${m.cap}" stroke="#000b" stroke-width="3.5"/>
        <g fill="#fff" opacity=".9"><circle cx="58" cy="${top + 22}" r="12"/><circle cx="104" cy="${top + 4}" r="9"/><circle cx="146" cy="${top + 26}" r="13"/><circle cx="36" cy="${top + 50}" r="6"/><circle cx="170" cy="${top + 52}" r="6"/></g>`;
      ey = top + 92;
    }
    if (m.crown) {
      s += `<path d="M64 ${top + 6} l6 -30 l16 18 l14 -28 l14 28 l16 -18 l6 30Z" fill="#ffd54a" stroke="#7a4b00" stroke-width="2.5"/>
        <circle cx="100" cy="${top - 6}" r="5" fill="#ff2d55"/>`;
    }

    const eyes = m.cyclops ? [[100, ey, 22]] : [[72, ey, 16], [128, ey, 16]];
    eyes.forEach(([x, y, r]) => {
      s += m.skull
        ? `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.15}" fill="#111"/><circle cx="${x}" cy="${y + 2}" r="${r * 0.38}" fill="url(#${id}e)"/>`
        : `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.12}" fill="#fff" stroke="#000b" stroke-width="2.5"/>
           <circle cx="${x + 2}" cy="${y + 3}" r="${r * 0.62}" fill="url(#${id}e)"/>
           <circle cx="${x + 2}" cy="${y + 3}" r="${r * 0.3}" fill="#111"/>
           <circle cx="${x - r * 0.3}" cy="${y - r * 0.35}" r="${r * 0.22}" fill="#fff"/>`;
    });
    if (m.cyclops) {
      s += `<path d="M72 ${ey - 28} Q100 ${ey - 14} 128 ${ey - 28}" stroke="#111" stroke-width="7" stroke-linecap="round" fill="none"/>`;
    } else if (!m.skull) {
      s += `<g stroke="#111" stroke-width="6" stroke-linecap="round"><line x1="54" y1="${ey - 24}" x2="86" y2="${ey - 14}"/><line x1="146" y1="${ey - 24}" x2="114" y2="${ey - 14}"/></g>`;
    }

    const my = ey + 30;
    if (m.beak) {
      s += `<path d="M84 ${my - 8} L116 ${my - 8} L100 ${my + 14}Z" fill="#ffc53d" stroke="#000b" stroke-width="2.5"/>`;
    } else if (m.skull) {
      s += `<rect x="74" y="${my - 6}" width="52" height="18" rx="4" fill="#111"/>
        <g stroke="${m.c1}" stroke-width="3"><line x1="87" y1="${my - 6}" x2="87" y2="${my + 12}"/><line x1="100" y1="${my - 6}" x2="100" y2="${my + 12}"/><line x1="113" y1="${my - 6}" x2="113" y2="${my + 12}"/></g>`;
    } else {
      s += `<path d="M70 ${my - 4} Q100 ${my + 24} 130 ${my - 4} Q100 ${my + 6} 70 ${my - 4}Z" fill="#2a0612" stroke="#000b" stroke-width="2.5"/>
        <path d="M80 ${my} l6 11 l6 -9Z M108 ${my - 1} l6 10 l6 -11Z" fill="#fff"/>`;
    }
    return s + '</svg>';
  }

  return { emblem, circle, monster };
})();

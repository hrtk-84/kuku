(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $('#app');
  const castEl = $('#cast');
  const modalEl = $('#modal');
  const shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const elKey = f => ELEMENTS[f.el].key;
  const nameLen = s => [...s].length;

  // ---------- セーブ ----------
  const SAVE_KEY = 'kuku-ougi-v1';
  const save = (() => {
    const base = { xp: 0, facts: {}, stars: {}, voice: true, sfx: true };
    try { return Object.assign(base, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch { return base; }
  })();
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {} };
  Sound.enabled = save.sfx;
  Voice.enabled = save.voice;

  const stat = f => (save.facts[f.key] ||= { c: 0, w: 0 });
  const tier = f => {
    const c = save.facts[f.key]?.c || 0;
    return c >= TIER_NEED[3] ? 3 : c >= TIER_NEED[2] ? 2 : c >= TIER_NEED[1] ? 1 : 0;
  };
  const learnedCount = list => list.filter(f => tier(f) > 0).length;

  function levelInfo(xp) {
    let lv = 1, need = 60, rest = xp;
    while (rest >= need) { rest -= need; lv++; need = Math.round(need * 1.2); }
    return { lv, cur: rest, need, title: TITLES[Math.min(TITLES.length - 1, lv - 1)] };
  }
  // 戻り値：レベルが上がったら { from, to }、上がらなければ null
  function addXp(n) {
    const from = levelInfo(save.xp).lv;
    save.xp += n;
    persist();
    const to = levelInfo(save.xp).lv;
    return to > from ? { from, to } : null;
  }
  const curLv = () => levelInfo(save.xp).lv;
  const formOf = lv => FORMS.reduce((acc, f, i) => (lv >= f.lv ? i : acc), 0);
  function perks(lv) {
    const has = n => lv >= n;
    return {
      hearts: has(6) ? 5 : has(2) ? 4 : 3,
      time: has(3) ? 3000 : 0,
      combo: has(4),
      heal: has(5),
      crit: has(7) ? 5000 : 3500,
      opening: has(8) ? 20 : 0,
      mult: has(10) ? 1.5 : 1,
    };
  }
  const nextSkill = lv => SKILLS.find(s => s.lv > lv);
  const power = f => TIER_DMG[tier(f)];

  // ---------- 画面管理 ----------
  let cleanups = [];
  const onLeave = fn => cleanups.push(fn);
  function listen(target, ev, fn, opt) {
    target.addEventListener(ev, fn, opt);
    onLeave(() => target.removeEventListener(ev, fn, opt));
  }
  function later(fn, ms) {
    const t = setTimeout(fn, ms);
    onLeave(() => clearTimeout(t));
    return t;
  }
  function show(html) {
    cleanups.forEach(fn => fn());
    cleanups = [];
    Voice.stop();
    closeModal();
    castEl.className = 'hidden';
    app.innerHTML = html;
    window.scrollTo(0, 0);
  }

  document.addEventListener('pointerdown', () => Sound.init(), { passive: true });

  // ---------- パーティクル ----------
  const FX = (() => {
    const cv = $('#fx');
    const ctx = cv.getContext('2d');
    let parts = [], running = false, dpr = 1;
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = innerWidth * dpr;
      cv.height = innerHeight * dpr;
    }
    resize();
    addEventListener('resize', resize);
    function loop() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalCompositeOperation = 'lighter';
      parts = parts.filter(p => p.life > 0);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.97; p.vy *= 0.97; p.life -= p.decay;
        if (p.life <= 0) continue;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (p.star) {
          const r = p.size * p.life;
          ctx.moveTo(p.x, p.y - r * 2); ctx.lineTo(p.x + r * 0.5, p.y); ctx.lineTo(p.x, p.y + r * 2); ctx.lineTo(p.x - r * 0.5, p.y);
          ctx.moveTo(p.x - r * 2, p.y); ctx.lineTo(p.x, p.y + r * 0.5); ctx.lineTo(p.x + r * 2, p.y); ctx.lineTo(p.x, p.y - r * 0.5);
        } else {
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (parts.length) requestAnimationFrame(loop); else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    }
    function burst(x, y, colors, n = 70, speed = 14, g = 0.12) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random());
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g, life: 1, decay: 0.012 + Math.random() * 0.02,
          size: 2 + Math.random() * 5, color: colors[(Math.random() * colors.length) | 0], star: Math.random() < 0.3 });
      }
      if (!running) { running = true; requestAnimationFrame(loop); }
    }
    return { burst };
  })();
  const FX_COLORS = {
    fire: ['#ffd23f', '#ff7b00', '#ff2d1f', '#fff'], thunder: ['#fff', '#ffe600', '#9d7bff'], ice: ['#fff', '#8ff0ff', '#35b6ff'],
    dark: ['#c77dff', '#7b2cff', '#ff3df2'], light: ['#fff', '#fff3a6', '#ffcc33'], wind: ['#fff', '#6dffc1', '#18e0a0'],
    beast: ['#ffcf8a', '#ff8a2a', '#fff'], poison: ['#e04dff', '#3dff6e', '#fff'],
  };
  const shake = (cls = 'shake') => {
    document.body.classList.remove(cls);
    void document.body.offsetWidth;
    document.body.classList.add(cls);
    setTimeout(() => document.body.classList.remove(cls), 500);
  };

  // ---------- 必殺技 発動演出 ----------
  function cast(f, { short = false, badge = '' } = {}) {
    return new Promise(resolve => {
      const k = elKey(f);
      castEl.className = `cast el-${k}${short ? ' short' : ''}`;
      castEl.innerHTML = `
        <div class="cast-lines"></div>
        <div class="cast-flash"></div>
        <div class="cast-circle">${Art.circle(f)}</div>
        <div class="cast-emblem">${Art.emblem(f.el)}</div>
        <div class="cast-text">
          <div class="cast-pre">${ELEMENTS[f.el].yomi}ぞくせい ひっさつわざ</div>
          <div class="cast-yomi">${f.yomiQ}<span>・</span>${f.yomiA}</div>
          <div class="cast-name" style="--len:${nameLen(f.name)}">${f.name}</div>
          <div class="cast-eq">${f.a} × ${f.b} = <b>${f.ans}</b></div>
          ${badge ? `<div class="cast-badge">${badge}</div>` : ''}
        </div>
        <div class="cast-tap">タップで つぎへ</div>`;
      Sound.charge();
      Voice.chant(f);
      const t1 = setTimeout(() => {
        Sound.impact();
        shake();
        FX.burst(innerWidth / 2, innerHeight / 2, FX_COLORS[k], short ? 60 : 110, short ? 12 : 16);
        if (badge) setTimeout(() => Sound.sparkle(), 350);
      }, 380);
      const dur = short ? 1700 : 3000;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(t1); clearTimeout(t2);
        castEl.removeEventListener('pointerdown', skip);
        removeEventListener('keydown', key);
        castEl.classList.add('out');
        setTimeout(() => { castEl.className = 'hidden'; castEl.innerHTML = ''; resolve(); }, 220);
      };
      const t2 = setTimeout(finish, dur);
      const born = Date.now();
      const skip = () => { if (Date.now() - born > 700) finish(); };
      const key = e => { if (e.key === 'Enter' || e.key === ' ') skip(); };
      castEl.addEventListener('pointerdown', skip);
      addEventListener('keydown', key);
      onLeave(finish);
    });
  }

  // ---------- 共通パーツ ----------
  const topToggles = () => `
    <div class="toggles">
      <button class="tg ${save.voice ? 'on' : ''}" data-tg="voice" aria-label="こえ">${save.voice ? '🔊' : '🔇'}<small>こえ</small></button>
      <button class="tg ${save.sfx ? 'on' : ''}" data-tg="sfx" aria-label="おと">${save.sfx ? '🎵' : '🔕'}<small>おと</small></button>
    </div>`;
  function bindToggles(root = app) {
    $$('[data-tg]', root).forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.tg;
      save[k] = !save[k];
      Sound.enabled = save.sfx;
      Voice.enabled = save.voice;
      if (!save.voice) Voice.stop();
      persist();
      b.classList.toggle('on', save[k]);
      b.firstChild.textContent = k === 'voice' ? (save.voice ? '🔊' : '🔇') : (save.sfx ? '🎵' : '🔕');
      Sound.tap();
    }));
  }

  function cardHTML(f, { big = false, demo = false } = {}) {
    const t = demo ? 1 : tier(f);
    if (!t) {
      return `<button class="card locked${big ? ' big' : ''}" data-key="${f.key}">
        <div class="card-art"><div class="card-circle">${Art.circle(f)}</div><div class="card-lock">？</div></div>
        <div class="card-name" style="--len:3">？？？</div>
        <div class="card-q">${f.a} × ${f.b}</div></button>`;
    }
    return `<button class="card el-${elKey(f)} t${t}${big ? ' big' : ''}" data-key="${f.key}">
      <div class="card-el">${f.el}</div>
      <div class="card-tier">${TIER_NAMES[t]}</div>
      <div class="card-art"><div class="card-circle">${Art.circle(f)}</div><div class="card-emb">${Art.emblem(f.el)}</div></div>
      <div class="card-yomi">${f.yomi}</div>
      <div class="card-name" style="--len:${nameLen(f.name)}">${f.name}</div>
      <div class="card-q">${f.a} × ${f.b} = ${f.ans}</div></button>`;
  }

  function closeModal() { modalEl.className = 'hidden'; modalEl.innerHTML = ''; }
  function openCard(f) {
    const t = tier(f);
    const st = save.facts[f.key] || { c: 0, w: 0 };
    const next = t < 3 ? `あと <b>${TIER_NEED[t + 1] - st.c}</b> かい せいかいで「${TIER_NAMES[t + 1]}」→ いりょく <b>${TIER_DMG[t + 1]}</b>` : 'さいこうランク たっせい！';
    modalEl.className = 'modal';
    modalEl.innerHTML = `
      <div class="modal-back"></div>
      <div class="modal-body">
        ${cardHTML(f, { big: true })}
        ${t ? `<p class="desc">${f.desc}</p>` : `<p class="desc">まだ ふういん されている…<br>「しゅぎょう」で ${f.a} × ${f.b} を こたえて かいほうしよう！</p>`}
        <div class="mstats"><span>いりょく <b>${t ? TIER_DMG[t] : '-'}</b></span><span>せいかい <b>${st.c}</b></span><span>まちがい <b>${st.w}</b></span></div>
        <p class="mnext">${next}</p>
        <div class="mbtns">
          ${t ? '<button class="btn btn-main" data-chant>▶ となえる</button>' : ''}
          <button class="btn" data-close>とじる</button>
        </div>
      </div>`;
    const chant = () => {
      Voice.chant(f);
      Sound.charge();
      const c = $('.card', modalEl);
      c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse');
      setTimeout(() => { Sound.impact(); const r = c.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height * 0.4, FX_COLORS[elKey(f)], 50, 10); }, 380);
    };
    $('[data-chant]', modalEl)?.addEventListener('click', chant);
    $('[data-close]', modalEl).addEventListener('click', () => { Sound.tap(); closeModal(); Voice.stop(); });
    $('.modal-back', modalEl).addEventListener('click', () => { closeModal(); Voice.stop(); });
    if (t) chant();
  }

  // 数字パッド
  const numpadHTML = right => `
    <div class="numpad">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="nk" data-k="${n}">${n}</button>`).join('')}
      <button class="nk nk-sub" data-k="del">けす</button>
      <button class="nk" data-k="0">0</button>
      ${right}
    </div>`;

  // 問題の入力と判定（修行・決闘で共通）
  function makeQuiz({ onDigitsDone, extra }) {
    let input = '', target = 0, locked = true;
    const ansEl = $('#ans');
    const render = () => {
      ansEl.textContent = input;
      ansEl.classList.toggle('empty', !input);
    };
    const press = k => {
      if (locked) return;
      if (k === 'del') { if (input) { input = input.slice(0, -1); Sound.del(); render(); } return; }
      if (k === 'extra') { extra?.(); return; }
      if (input.length >= 2) return;
      input += k;
      Sound.key();
      render();
      if (input.length >= String(target).length) {
        locked = true;
        const v = Number(input);
        setTimeout(() => onDigitsDone(v), 120);
      }
    };
    $$('.numpad [data-k]').forEach(b => b.addEventListener('pointerdown', e => {
      e.preventDefault();
      b.classList.add('down');
      setTimeout(() => b.classList.remove('down'), 120);
      press(b.dataset.k);
    }));
    listen(window, 'keydown', e => {
      if (castEl.className !== 'hidden') return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
    });
    return {
      ask(ans) { target = ans; input = ''; locked = false; render(); },
      clear() { input = ''; render(); },
      lock() { locked = true; },
      unlock() { locked = false; },
    };
  }

  function qboxHTML() {
    return `
      <div class="qbox" id="qbox">
        <div class="qyomi" id="qyomi"></div>
        <div class="qeq dela"><span id="qa"></span><span class="x">×</span><span id="qb"></span><span class="eq">=</span><span class="ans empty" id="ans"></span></div>
        <div class="teach hidden" id="teach"></div>
      </div>`;
  }
  function setQuestion(f) {
    $('#qa').textContent = f.a;
    $('#qb').textContent = f.b;
    $('#qyomi').textContent = f.yomiQ + ' ＝ ？';
    $('#teach').classList.add('hidden');
    const q = $('#qbox');
    q.classList.remove('pop'); void q.offsetWidth; q.classList.add('pop');
  }
  function showTeach(f, head = 'こたえは…') {
    const t = $('#teach');
    t.innerHTML = `<small>${head}</small><b class="dela">${f.ans}</b><span>${f.yomiQ} ${f.yomiA}</span>`;
    t.classList.remove('hidden');
    Voice.say([f.yomiQ + '、' + f.yomiA, { rate: 0.9 }]);
  }

  // ---------- ホーム ----------
  function home() {
    const L = levelInfo(save.xp);
    const got = learnedCount(FACTS);
    const learned = FACTS.filter(f => tier(f) > 0);
    const feat = learned.length ? learned[(Math.random() * learned.length) | 0] : FACTS.find(f => f.key === '2x9');
    show(`
      <section class="screen home">
        <div class="home-top">${topToggles()}</div>
        <header class="logo">
          <div class="logo-sub">ひっさつわざで おぼえる</div>
          <h1 class="logo-main dela"><span class="k9">九九</span><span class="ogi">奥義伝</span></h1>
          <div class="logo-yomi">く く お う ぎ で ん</div>
        </header>

        <button class="player" data-status>
          <div class="p-hero">${Art.hero(formOf(L.lv))}<span class="p-lv dela">Lv.${L.lv}</span></div>
          <div class="p-body">
            <div class="p-title">${L.title}</div>
            <div class="bar"><i style="width:${(L.cur / L.need) * 100}%"></i></div>
            <div class="p-xp">つぎの レベルまで ${L.need - L.cur} XP</div>
            ${nextSkill(L.lv) ? `<div class="p-next">Lv.${nextSkill(L.lv).lv}で スキル「${nextSkill(L.lv).name}」</div>` : '<div class="p-next">すべての スキルを しゅうとく！</div>'}
          </div>
          <div class="p-col"><small>わざ</small><b class="dela">${got}</b><small>/81</small><em>ステータス ›</em></div>
        </button>

        <div class="home-main">
          <div class="feature">
            ${cardHTML(feat, { demo: !learned.length })}
            <div class="feature-cap">${learned.length ? 'タップで となえる' : 'れい：2×9 ＝ にく じゅうはち（タップ！）'}</div>
          </div>
          <nav class="menu">
            <button class="mbtn m-train" data-go="train">
              <div class="mb-icon">${Art.emblem('風')}</div>
              <div class="mb-txt"><b class="dela">修行</b><small>しゅぎょう</small><em>だんを えらんで わざを おぼえる</em></div>
            </button>
            <button class="mbtn m-battle" data-go="battle">
              <div class="mb-icon">${Art.emblem('炎')}</div>
              <div class="mb-txt"><b class="dela">決闘</b><small>けっとう</small><em>わざで ボスを たおせ！</em></div>
            </button>
            <button class="mbtn m-zukan" data-go="zukan">
              <div class="mb-icon">${Art.emblem('光')}</div>
              <div class="mb-txt"><b class="dela">技図鑑</b><small>わざずかん</small><em>あつめた わざ ${got}/81</em></div>
            </button>
          </nav>
        </div>
      </section>`);
    bindToggles();
    $$('[data-go]').forEach(b => b.addEventListener('click', () => {
      Sound.tap();
      const g = b.dataset.go;
      if (g === 'zukan') zukan(); else select(g);
    }));
    $('.feature .card').addEventListener('click', () => cast(feat));
    $('[data-status]').addEventListener('click', () => { Sound.tap(); status(); });
  }

  // ---------- 段えらび ----------
  function weakFacts() {
    return FACTS
      .filter(f => (save.facts[f.key]?.w || 0) > 0)
      .sort((x, y) => {
        const sx = save.facts[x.key], sy = save.facts[y.key];
        return (sy.w * 2 - sy.c) - (sx.w * 2 - sx.c);
      });
  }
  const starStr = n => [1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}">★</i>`).join('');

  function select(mode) {
    const battle = mode === 'battle';
    const weak = weakFacts();
    const tiles = DANS.map(d => {
      const facts = FACTS.filter(f => f.a === d.dan);
      const n = learnedCount(facts);
      const k = ELEMENTS[d.el].key;
      return `<button class="dan el-${k}" data-dan="${d.dan}">
        <div class="dan-art">${battle ? Art.monster(d.boss) : Art.emblem(d.el)}</div>
        <div class="dan-num dela">${d.dan}<small>の段</small></div>
        ${battle
          ? `<div class="dan-sub">${d.boss.name}</div><div class="stars">${starStr(save.stars[d.dan] || 0)}</div>`
          : `<div class="dan-bar"><i style="width:${(n / 9) * 100}%"></i></div><div class="dan-sub">${n}/9 しゅうとく</div>`}
      </button>`;
    }).join('');
    const extras = battle
      ? `<button class="dan wide el-dark" data-dan="all">
          <div class="dan-art">${Art.monster(LAST_BOSS.boss)}</div>
          <div><div class="dan-num dela">ラスボス</div><div class="dan-sub">${LAST_BOSS.boss.name}（2〜9の段 ぜんぶ）</div><div class="stars">${starStr(save.stars.all || 0)}</div></div>
        </button>`
      : `<button class="dan wide el-light" data-dan="all">
          <div class="dan-art">${Art.emblem('光')}</div>
          <div><div class="dan-num dela">ランダム</div><div class="dan-sub">2〜9の段から 15もん</div></div>
        </button>
        ${weak.length ? `<button class="dan wide el-poison" data-dan="weak">
          <div class="dan-art">${Art.emblem('毒')}</div>
          <div><div class="dan-num dela">にがて とっくん</div><div class="dan-sub">まちがえた わざ ${Math.min(12, weak.length)}もん</div></div>
        </button>` : ''}`;
    show(`
      <section class="screen select">
        <header class="shead">
          <button class="back" data-back>‹</button>
          <h2 class="dela">${battle ? '決闘' : '修行'}<small>${battle ? 'けっとう' : 'しゅぎょう'}</small></h2>
          <p>${battle ? 'たたかう あいてを えらべ！' : 'おぼえる だんを えらべ！'}</p>
        </header>
        <div class="dans">${tiles}</div>
        <div class="dans-extra">${extras}</div>
      </section>`);
    $('[data-back]').addEventListener('click', () => { Sound.tap(); home(); });
    $$('[data-dan]').forEach(b => b.addEventListener('click', () => {
      Sound.tap();
      const v = b.dataset.dan;
      const target = isNaN(v) ? v : Number(v);
      battle ? battleScreen(target) : practice(target);
    }));
  }

  // ---------- 修行 ----------
  function practice(target) {
    const pool =
      target === 'all' ? shuffle(FACTS.filter(f => f.a > 1)).slice(0, 15)
      : target === 'weak' ? shuffle(weakFacts().slice(0, 12))
      : FACTS.filter(f => f.a === target);
    const queue = pool.slice();
    const total = pool.length;
    let cleared = 0, cur = null, retry = false, hinted = false, t0 = 0;
    const gained = new Map();
    let xp = 0;
    const title = target === 'all' ? 'ランダム' : target === 'weak' ? 'にがて とっくん' : `${target}の段`;

    show(`
      <section class="screen game practice">
        <header class="ghead">
          <button class="back" data-back>‹</button>
          <div class="gtitle dela">${title}<small>しゅぎょう</small></div>
          <div class="gprog"><b id="pnum">0</b>/${total}</div>
        </header>
        <div class="pbar"><i id="pbar"></i></div>
        <div class="stage" id="stage"></div>
        ${qboxHTML()}
        ${numpadHTML('<button class="nk nk-hint" data-k="extra">ヒント</button>')}
      </section>`);
    $('[data-back]').addEventListener('click', () => { Sound.tap(); select('train'); });

    const quiz = makeQuiz({
      onDigitsDone: judge,
      extra: () => {
        if (!cur || hinted) return;
        hinted = true;
        Sound.tap();
        showTeach(cur, 'ヒント');
      },
    });

    function preview(f) {
      const t = tier(f);
      $('#stage').innerHTML = `
        <div class="preview el-${elKey(f)} ${t ? '' : 'sealed'}">
          <div class="pv-circle">${Art.circle(f)}</div>
          <div class="pv-emb">${t ? Art.emblem(f.el) : '<span class="dela">？</span>'}</div>
          <div class="pv-label">${t ? `<b>${f.name}</b><small>${TIER_NAMES[t]}</small>` : '<b>ふういんされた わざ</b><small>こたえて かいほうせよ！</small>'}</div>
        </div>`;
    }

    function next() {
      $('#pnum').textContent = cleared;
      $('#pbar').style.width = `${(cleared / total) * 100}%`;
      if (!queue.length) return finish();
      cur = queue.shift();
      retry = false;
      hinted = false;
      preview(cur);
      setQuestion(cur);
      quiz.ask(cur.ans);
      Voice.question(cur);
      t0 = Date.now();
    }

    async function judge(v) {
      const f = cur;
      if (v === f.ans) {
        let badge = '';
        if (!retry && !hinted) {
          const before = tier(f);
          stat(f).c++;
          const after = tier(f);
          if (after > before) badge = before === 0 ? '✦ NEW！ わざ しゅうとく ✦' : `ランクアップ！「${TIER_NAMES[after]}」 いりょく ${TIER_DMG[before]}→${TIER_DMG[after]}`;
          xp += 10;
          gained.set(f.key, f);
          persist();
        }
        cleared++;
        await cast(f, { badge });
        next();
      } else {
        Sound.wrong();
        shake('shake-s');
        if (!retry) { stat(f).w++; persist(); queue.push(f); }
        retry = true;
        showTeach(f, 'ざんねん！ こたえは…');
        $('#qbox').classList.add('miss');
        later(() => { $('#qbox')?.classList.remove('miss'); quiz.clear(); quiz.unlock(); }, 900);
      }
    }

    function finish() {
      const lvUp = addXp(xp);
      result({
        win: true,
        head: 'しゅぎょう かんりょう！',
        sub: `${title}の わざを ${gained.size}こ みがいた`,
        xp, lvUp,
        cards: [...gained.values()],
        retry: () => practice(target),
        back: () => select('train'),
      });
    }

    later(next, 250);
  }

  // ---------- 決闘 ----------
  function battleScreen(target) {
    const d = target === 'all' ? LAST_BOSS : DANS[target - 1];
    const boss = d.boss;
    const pool = target === 'all' ? FACTS.filter(f => f.a >= 2) : FACTS.filter(f => f.a === target);
    let queue = shuffle(pool);
    const P = perks(curLv());
    const maxHp = target === 'all' ? BOSS_HP.all : BOSS_HP.dan;
    const maxHearts = P.hearts;
    let hp = maxHp, hearts = maxHearts, cur = null, t0 = 0, raf = 0, crits = 0, combo = 0, lost = 0;
    const LIMIT = (target === 'all' ? 9000 : 12000) + P.time;
    const used = new Map();
    let xp = 0;

    show(`
      <section class="screen game battle el-${ELEMENTS[d.el].key}">
        <header class="ghead">
          <button class="back" data-back>‹</button>
          <div class="gtitle dela">VS ${boss.name}</div>
          <div class="hearts" id="hearts"></div>
        </header>
        <div class="stage bstage" id="stage">
          <div class="boss" id="boss">${Art.monster(boss)}</div>
          <div class="bhp"><div class="bhp-name">${boss.name}</div><div class="bhp-bar"><i id="hpbar"></i></div><div class="bhp-num dela" id="hpnum"></div></div>
          <div class="hero-mini" id="hero">${Art.hero(formOf(curLv()))}</div>
          <div class="combo dela hidden" id="combo"></div>
        </div>
        <div class="timer"><i id="timer"></i></div>
        ${qboxHTML()}
        ${numpadHTML('<button class="nk nk-sub nk-blank" data-k="none" disabled>⚔</button>')}
      </section>`);
    $('[data-back]').addEventListener('click', () => { Sound.tap(); select('battle'); });
    onLeave(() => cancelAnimationFrame(raf));

    const quiz = makeQuiz({ onDigitsDone: v => judge(v) });
    const bossEl = $('#boss');
    const heroEl = $('#hero');

    function renderHud() {
      $('#hearts').innerHTML = Array.from({ length: maxHearts }, (_, i) => `<i class="${i < hearts ? 'on' : ''}">♥</i>`).join('');
      $('#hpbar').style.width = `${(Math.max(0, hp) / maxHp) * 100}%`;
      $('#hpnum').textContent = Math.max(0, hp);
      const c = $('#combo');
      c.classList.toggle('hidden', combo < 2);
      c.innerHTML = `${combo}<small>れんぞく${P.combo && combo >= 3 ? ' ×2' : ''}</small>`;
    }
    function tick() {
      const left = Math.max(0, 1 - (Date.now() - t0) / LIMIT);
      const bar = $('#timer');
      if (!bar) return;
      bar.style.width = `${left * 100}%`;
      bar.classList.toggle('low', left < 0.3);
      if (left <= 0) { quiz.lock(); judge(null); return; }
      raf = requestAnimationFrame(tick);
    }
    function next() {
      if (hp <= 0) return win();
      if (!queue.length) queue = shuffle(pool);
      cur = queue.shift();
      setQuestion(cur);
      quiz.ask(cur.ans);
      t0 = Date.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }
    const anim = (el, cls) => {
      el.classList.remove('hit', 'attack', 'crit', 'cast', 'hurt'); void el.offsetWidth; el.classList.add(cls);
    };
    function popText(text, cls = '') {
      const p = document.createElement('div');
      p.className = 'dmg dela ' + cls;
      p.innerHTML = text;
      $('#stage').appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
    function dealDamage(n, crit, colors) {
      hp -= n;
      anim(bossEl, crit ? 'crit' : 'hit');
      crit ? Sound.crit() : Sound.hit();
      const r = bossEl.getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, colors, 40, 9);
      popText(crit ? `${n}<small>CRITICAL!</small>` : `${n}`, crit ? 'crit' : '');
      renderHud();
    }

    async function judge(v) {
      cancelAnimationFrame(raf);
      const f = cur;
      const ms = Date.now() - t0;
      if (v === f.ans) {
        const crit = ms < P.crit;
        if (crit) crits++;
        combo++;
        stat(f).c++;
        persist();
        used.set(f.key, f);
        xp += crit ? 15 : 10;
        let dmg = power(f) * P.mult;
        const doubled = P.combo && combo >= 3;
        if (doubled) dmg *= 2;
        if (crit) dmg *= 1.5;
        dmg = Math.round(dmg);
        const badges = [];
        if (crit) badges.push('⚡ クリティカル');
        if (doubled) badges.push(`⚔ れんげき ×2`);
        anim(heroEl, 'cast');
        await cast(f, { short: true, badge: badges.join('　') });
        dealDamage(dmg, crit, FX_COLORS[elKey(f)]);
        if (P.heal && combo % 5 === 0 && hearts < maxHearts) {
          hearts++;
          later(() => { Sound.sparkle(); popText('♥ かいふく', 'heal'); renderHud(); }, 350);
        }
        later(next, hp <= 0 ? 900 : 700);
      } else {
        stat(f).w++;
        persist();
        combo = 0;
        hearts--;
        lost++;
        anim(bossEl, 'attack');
        later(() => { anim(heroEl, 'hurt'); Sound.hurt(); shake(); document.body.classList.add('hurt'); setTimeout(() => document.body.classList.remove('hurt'), 400); }, 250);
        showTeach(f, v === null ? 'じかんぎれ！ こたえは…' : 'ざんねん！ こたえは…');
        renderHud();
        queue.splice(Math.min(2, queue.length), 0, f);
        later(() => (hearts <= 0 ? lose() : next()), 2300);
      }
    }

    function win() {
      cancelAnimationFrame(raf);
      const stars = lost === 0 ? 3 : lost === 1 ? 2 : 1;
      save.stars[target] = Math.max(save.stars[target] || 0, stars);
      xp += 40 + stars * 10;
      const lvUp = addXp(xp);
      bossEl.classList.add('defeat');
      Sound.fanfare();
      FX.burst(innerWidth / 2, innerHeight * 0.3, ['#ffd54a', '#fff', '#ff3d7f', '#35e0ff'], 160, 18);
      later(() => result({
        win: true,
        head: 'しょうり！',
        sub: `${boss.name}を たおした！${crits ? `（クリティカル ${crits}かい）` : ''}`,
        stars, xp, lvUp, boss,
        cards: [...used.values()],
        retry: () => battleScreen(target),
        back: () => select('battle'),
      }), 1400);
    }
    function lose() {
      cancelAnimationFrame(raf);
      Sound.lose();
      const lvUp = addXp(xp);
      result({
        win: false,
        head: 'まけてしまった…',
        sub: `あと ${hp} ダメージ！ しゅぎょうで わざを きたえて また いどもう！`,
        xp, lvUp, boss,
        cards: [...used.values()],
        retry: () => battleScreen(target),
        back: () => select('battle'),
      });
    }

    renderHud();
    later(() => {
      Sound.whoosh();
      if (P.opening) {
        anim(heroEl, 'cast');
        popText('覇気！', 'haki');
        dealDamage(P.opening, false, ['#ff3d7f', '#ffd54a', '#fff']);
        later(next, 900);
      } else next();
    }, 700);
  }

  // ---------- リザルト ----------
  function result({ win, head, sub, stars, xp, lvUp, boss, cards, retry, back }) {
    const L = levelInfo(save.xp);
    show(`
      <section class="screen result ${win ? 'win' : 'lose'}">
        <div class="res-head dela">${head}</div>
        ${boss ? `<div class="res-boss ${win ? 'down' : ''}">${Art.monster(boss)}</div>` : ''}
        ${stars != null ? `<div class="stars big">${starStr(stars)}</div>` : ''}
        <p class="res-sub">${sub}</p>
        <div class="res-xp"><b class="dela">+${xp}</b> XP</div>
        ${levelUpHTML(lvUp)}
        ${!lvUp ? `<div class="res-next">つぎの レベルまで あと ${L.need - L.cur} XP</div>` : ''}
        ${cards.length ? `<h3>つかった わざ</h3><div class="grid small">${cards.map(f => cardHTML(f)).join('')}</div>` : ''}
        <div class="res-btns">
          <button class="btn btn-main" data-r="retry">もういちど</button>
          <button class="btn" data-r="back">えらびなおす</button>
          <button class="btn" data-r="home">ホーム</button>
        </div>
      </section>`);
    if (lvUp) later(() => { Sound.levelup(); Voice.say('レベルアップ！'); }, 900);
    if (win) later(() => Voice.say(head.replace('！', '')), 200);
    $('[data-r="retry"]').addEventListener('click', () => { Sound.tap(); retry(); });
    $('[data-r="back"]').addEventListener('click', () => { Sound.tap(); back(); });
    $('[data-r="home"]').addEventListener('click', () => { Sound.tap(); home(); });
    $$('.grid .card').forEach(c => c.addEventListener('click', () => openCard(FACTS.find(f => f.key === c.dataset.key))));
  }

  // ---------- ステータス ----------
  function status() {
    const L = levelInfo(save.xp);
    const P = perks(L.lv);
    const form = formOf(L.lv);
    const kaiden = FACTS.filter(f => tier(f) === 3).length;
    const starSum = Object.values(save.stars).reduce((a, b) => a + b, 0);
    const avgPow = Math.round(FACTS.reduce((a, f) => a + power(f), 0) / FACTS.length * 10) / 10;
    show(`
      <section class="screen status">
        <header class="shead">
          <button class="back" data-back>‹</button>
          <h2 class="dela">ステータス</h2>
          <p>しゅぎょうと けっとうで つよくなろう！</p>
        </header>

        <div class="st-top">
          <div class="st-hero">${Art.hero(form)}</div>
          <div class="st-info">
            <div class="st-form">${FORMS[form].name}のすがた</div>
            <div class="st-title dela">${L.title}</div>
            <div class="st-lv dela">Lv.${L.lv}</div>
            <div class="bar"><i style="width:${(L.cur / L.need) * 100}%"></i></div>
            <div class="p-xp">つぎの レベルまで ${L.need - L.cur} XP</div>
          </div>
        </div>

        <div class="st-stats">
          <div><small>ハート</small><b class="dela">${'♥'.repeat(P.hearts)}</b></div>
          <div><small>せいげんじかん</small><b class="dela">${12 + P.time / 1000}<small>びょう</small></b></div>
          <div><small>わざの へいきん いりょく</small><b class="dela">${avgPow}</b></div>
          <div><small>あつめた わざ</small><b class="dela">${learnedCount(FACTS)}<small>/81</small></b></div>
          <div><small>皆伝の わざ</small><b class="dela">${kaiden}<small>/81</small></b></div>
          <div><small>ボスの ほし</small><b class="dela">${starSum}<small>/30</small></b></div>
        </div>

        <h3 class="st-h">しんか</h3>
        <div class="forms">
          ${FORMS.map((f, i) => `
            <div class="form ${i <= form ? 'got' : 'lock'} ${i === form ? 'now' : ''}">
              <div class="form-art">${Art.hero(i)}</div>
              <b>${i <= form ? f.name : '？？？'}</b><small>Lv.${f.lv}</small>
            </div>`).join('')}
        </div>

        <h3 class="st-h">スキル</h3>
        <div class="skills">
          ${SKILLS.map(s => {
            const got = L.lv >= s.lv;
            const isNext = !got && nextSkill(L.lv) === s;
            return `<div class="skill ${got ? 'got' : 'lock'} ${isNext ? 'next' : ''}">
              <div class="sk-icon">${got ? s.icon : '？'}</div>
              <div class="sk-body"><b>${got || isNext ? s.name : '？？？'}</b>${got || isNext ? `<small>${s.yomi}</small>` : ''}
                <p>${got || isNext ? s.desc : 'まだ ひみつ'}</p></div>
              <div class="sk-lv">${got ? 'しゅうとく' : `Lv.${s.lv}`}</div>
            </div>`;
          }).join('')}
        </div>

        <h3 class="st-h">わざの いりょく</h3>
        <div class="powers">
          <p>しゅぎょうで おなじ わざを なんども せいかいすると ランクが あがり、けっとうで あたえる ダメージが ふえる！</p>
          <div class="pow-row">
            <div class="t1c"><b class="dela">${TIER_DMG[1]}</b>初伝<small>1かい</small></div><span>›</span>
            <div class="t2c"><b class="dela">${TIER_DMG[2]}</b>中伝<small>5かい</small></div><span>›</span>
            <div class="t3c"><b class="dela">${TIER_DMG[3]}</b>皆伝<small>10かい</small></div>
          </div>
        </div>
      </section>`);
    $('[data-back]').addEventListener('click', () => { Sound.tap(); home(); });
  }

  function levelUpHTML(up) {
    if (!up) return '';
    const newSkills = SKILLS.filter(s => s.lv > up.from && s.lv <= up.to);
    const evolved = formOf(up.to) > formOf(up.from);
    return `
      <div class="lvup-panel">
        <div class="lvup-head dela">LEVEL UP!</div>
        <div class="lvup-lv dela">Lv.${up.from} <span>›</span> Lv.${up.to}</div>
        <div class="lvup-title">しょうごう「${TITLES[Math.min(TITLES.length - 1, up.to - 1)]}」</div>
        ${evolved ? `<div class="lvup-evo">
            <div class="evo-from">${Art.hero(formOf(up.from))}</div><span>›</span>
            <div class="evo-to">${Art.hero(formOf(up.to))}</div>
          </div><div class="lvup-evo-cap">「${FORMS[formOf(up.to)].name}」に しんかした！</div>` : ''}
        ${newSkills.map(s => `<div class="lvup-skill"><i>${s.icon}</i><div><b>スキル「${s.name}」を おぼえた！</b><small>${s.desc}</small></div></div>`).join('')}
      </div>`;
  }

  // ---------- 技図鑑 ----------
  function zukan(tab = 2) {
    const tabs = DANS.map(d => {
      const n = learnedCount(FACTS.filter(f => f.a === d.dan));
      return `<button class="ztab ${d.dan === tab ? 'on' : ''} ${n === 9 ? 'full' : ''}" data-tab="${d.dan}">${d.dan}<small>${n}/9</small></button>`;
    }).join('');
    const facts = FACTS.filter(f => f.a === tab);
    show(`
      <section class="screen zukan">
        <header class="shead">
          <button class="back" data-back>‹</button>
          <h2 class="dela">技図鑑<small>わざずかん</small></h2>
          <p>あつめた わざ <b>${learnedCount(FACTS)}</b> / 81　・　カードを タップで となえる</p>
        </header>
        <div class="ztabs">${tabs}</div>
        <div class="grid">${facts.map(f => cardHTML(f)).join('')}</div>
        <p class="legend">ランク：<b class="t1c">初伝</b> 1かい せいかい → <b class="t2c">中伝</b> 5かい → <b class="t3c">皆伝</b> 10かい</p>
      </section>`);
    $('[data-back]').addEventListener('click', () => { Sound.tap(); home(); });
    $$('[data-tab]').forEach(b => b.addEventListener('click', () => { Sound.tap(); zukan(Number(b.dataset.tab)); }));
    $$('.grid .card').forEach(c => c.addEventListener('click', () => {
      Sound.tap();
      openCard(FACTS.find(f => f.key === c.dataset.key));
    }));
  }

  home();
})();

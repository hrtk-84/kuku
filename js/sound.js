// 効果音（Web Audio で合成）と 読み上げ（Web Speech API）
const Sound = (() => {
  let ctx, master, noiseBuf;
  const s = { enabled: true };

  s.init = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.45;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  };

  const ok = () => s.enabled && ctx;

  function tone(freq, dur, type = 'square', vol = 0.2, when = 0, slideTo) {
    if (!ok()) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.3, f1 = 1000, f2 = 1000, when = 0, type = 'bandpass') {
    if (!ok()) return;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(f1, t);
    f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  const note = n => 440 * 2 ** ((n - 69) / 12);

  s.tap = () => tone(740, 0.06, 'triangle', 0.18);
  s.key = () => tone(1046, 0.05, 'square', 0.07);
  s.del = () => tone(420, 0.06, 'square', 0.07);
  s.wrong = () => { tone(220, 0.16, 'sawtooth', 0.18); tone(165, 0.3, 'sawtooth', 0.18, 0.13); };
  s.charge = () => { noise(0.45, 0.22, 300, 5000); tone(160, 0.45, 'sawtooth', 0.07, 0, 1200); };
  s.impact = () => {
    tone(150, 0.55, 'sine', 0.7, 0, 38);
    noise(0.45, 0.5, 4000, 150, 0, 'lowpass');
    tone(90, 0.3, 'square', 0.12, 0, 40);
  };
  s.sparkle = () => [0, 4, 7, 12, 16].forEach((n, i) => tone(note(84 + n), 0.22, 'triangle', 0.12, i * 0.05));
  s.hit = () => { noise(0.18, 0.5, 2500, 300); tone(300, 0.15, 'square', 0.15, 0, 80); };
  s.crit = () => { s.hit(); [0, 7, 12].forEach((n, i) => tone(note(88 + n), 0.15, 'square', 0.08, 0.05 + i * 0.05)); };
  s.hurt = () => { noise(0.35, 0.45, 900, 90, 0, 'lowpass'); tone(110, 0.35, 'square', 0.22, 0, 45); };
  s.whoosh = () => noise(0.3, 0.2, 600, 3000);
  s.fanfare = () => {
    const seq = [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36], [76, 0.56], [79, 0.68]];
    seq.forEach(([n, w]) => { tone(note(n), 0.22, 'square', 0.12, w); tone(note(n - 12), 0.22, 'triangle', 0.1, w); });
    tone(note(84), 0.9, 'square', 0.12, 0.84);
    tone(note(72), 0.9, 'triangle', 0.14, 0.84);
  };
  s.lose = () => [67, 63, 60, 55].forEach((n, i) => tone(note(n), 0.3, 'triangle', 0.14, i * 0.22));
  s.levelup = () => [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(note(n), 0.14, 'square', 0.09, i * 0.06));

  return s;
})();

const Voice = (() => {
  const v = { enabled: true, voice: null };
  const synth = window.speechSynthesis;

  function pick() {
    if (!synth) return;
    const list = synth.getVoices().filter(x => /^ja/i.test(x.lang));
    const prefer = ['Otoya', 'Hattori', 'Kyoko', 'O-Ren', 'Google 日本語', 'Nanami', 'Keita', 'Haruka', 'Ichiro'];
    v.voice = prefer.map(p => list.find(x => x.name.includes(p))).find(Boolean) || list[0] || null;
  }
  if (synth) {
    pick();
    synth.onvoiceschanged = pick;
  }

  v.stop = () => synth && synth.cancel();

  // 文字列 or [文字列, {rate,pitch}] の配列を順番に読む
  v.say = (...parts) => {
    if (!v.enabled || !synth) return;
    synth.cancel();
    parts.forEach(p => {
      const [text, opt = {}] = Array.isArray(p) ? p : [p];
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      if (v.voice) u.voice = v.voice;
      u.rate = opt.rate ?? 1;
      u.pitch = opt.pitch ?? 1;
      u.volume = 1;
      synth.speak(u);
    });
  };

  // 技の詠唱
  v.chant = f => v.say([f.yomiQ + '、' + f.yomiA + '！', { rate: 0.95, pitch: 0.85 }]);
  v.question = f => v.say([f.yomiQ, { rate: 0.95, pitch: 1.05 }]);

  return v;
})();

// Hiệu ứng âm thanh tổng hợp bằng Web Audio (không cần file âm thanh)
let ctx;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freqs, { volume = 0.7, type = 'sine', step = 0.09, length = 0.16 } = {}) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  freqs.forEach((f, i) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = f;
    const start = t0 + i * step;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.25 * volume, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + length);
    o.connect(g).connect(ac.destination);
    o.start(start);
    o.stop(start + length + 0.02);
  });
}

export function playSound(kind, settings) {
  if (!settings?.soundOn) return;
  const volume = (settings.volume ?? 70) / 100;
  if (kind === 'correct') tone([660, 880], { volume, type: 'triangle' });
  else if (kind === 'wrong') tone([220, 175], { volume, type: 'sawtooth', step: 0.12, length: 0.2 });
  else if (kind === 'flip') tone([520], { volume: volume * 0.5, length: 0.08 });
  else if (kind === 'coin' && settings.coinSound) tone([988, 1319, 1568], { volume, type: 'square', step: 0.07, length: 0.12 });
}

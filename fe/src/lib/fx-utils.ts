export interface EffectCoords {
  clientX?: number;
  clientY?: number;
}

export function spawnFloatingXP(amount: number, coords?: EffectCoords | null): void {
  const existing = document.querySelectorAll('.floating-xp');
  if (existing.length >= 3) existing[0].remove();

  const el = document.createElement('div');
  el.className =
    'floating-xp px-3 py-1 rounded-full bg-[#EFE078] text-[#111111] border-2 border-[#141414] font-mono text-xs font-extrabold shadow-[2px_2px_0px_#141414]';
  el.textContent = `+${amount} XP ✨`;
  const x = coords?.clientX ? coords.clientX : window.innerWidth / 2;
  const y = coords?.clientY ? coords.clientY : window.innerHeight / 2;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1280);
}

export function spawnConfetti(coords?: EffectCoords | null, count = 14): void {
  const existing = document.querySelectorAll('.confetti-piece');
  if (existing.length >= 24) return;

  const colors = ['#F4C2D7', '#EFE078', '#CBEAD8', '#DCD2F5', '#141414'];
  const symbols = ['✦', '★', '♥', '●', '✿'];
  const cx = coords?.clientX ? coords.clientX : window.innerWidth / 2;
  const cy = coords?.clientY ? coords.clientY : window.innerHeight / 2;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'confetti-piece font-bold text-sm select-none';
    p.textContent = symbols[i % symbols.length];
    p.style.color = colors[i % colors.length];
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = 45 + Math.random() * 65;
    p.style.setProperty('--tx', `${Math.round(Math.cos(angle) * dist)}px`);
    p.style.setProperty('--ty', `${Math.round(Math.sin(angle) * dist - 20)}px`);
    p.style.setProperty('--rot', `${Math.round((Math.random() - 0.5) * 320)}deg`);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 980);
  }
}

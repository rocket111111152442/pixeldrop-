"use client";

// Petits sons synthétisés (WebAudio) — aucun fichier audio à charger.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ac.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + when);
  osc.stop(ac.currentTime + when + dur + 0.02);
}

export type SoundName = "place" | "error" | "boom" | "coin" | "level" | "click" | "chat";

export function playSound(name: SoundName, enabled: boolean) {
  if (!enabled) return;
  switch (name) {
    case "place":
      tone(640, 0.07, "square", 0.05);
      break;
    case "click":
      tone(420, 0.04, "square", 0.04);
      break;
    case "error":
      tone(170, 0.18, "sawtooth", 0.06);
      break;
    case "boom":
      tone(110, 0.25, "square", 0.09);
      tone(70, 0.35, "sawtooth", 0.07, 0.05);
      break;
    case "coin":
      tone(880, 0.08, "square", 0.05);
      tone(1320, 0.12, "square", 0.05, 0.08);
      break;
    case "level":
      tone(523, 0.1, "square", 0.05);
      tone(659, 0.1, "square", 0.05, 0.1);
      tone(784, 0.18, "square", 0.06, 0.2);
      break;
    case "chat":
      tone(980, 0.05, "sine", 0.04);
      break;
  }
}

export function vibrate(pattern: number | number[], enabled: boolean) {
  if (!enabled) return;
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

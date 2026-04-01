/** Формат времени WebVTT: HH:MM:SS.mmm */
export function formatVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const whole = Math.floor(s);
  const frac = Math.round((s - whole) * 1000);
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${pad(h)}:${pad(m)}:${pad(whole)}.${pad(frac, 3)}`;
}

export function segmentsToWebVtt(
  segments: { start: number; end: number; text: string }[],
): string {
  const lines = ['WEBVTT', ''];
  segments.forEach((seg, i) => {
    lines.push(String(i + 1));
    lines.push(
      `${formatVttTime(seg.start)} --> ${formatVttTime(seg.end)}`,
      seg.text.trim(),
      '',
    );
  });
  return lines.join('\n');
}

const MAX = 4000;
const round = v => (v == null ? null : Math.round(v * 100) / 100);
export function compactAnalysis(result) {
  const { ref = [], user = [], hopMs } = result.curves;
  const factor = Math.max(1, Math.ceil(Math.max(ref.length, user.length) / MAX));
  const shrink = list => { const out = []; for (let i = 0; i < list.length; i += factor) out.push(round(list[i])); return out; };
  return { ...result, curves: { ...result.curves, ref: shrink(ref), user: shrink(user), hopMs: hopMs * factor } };
}

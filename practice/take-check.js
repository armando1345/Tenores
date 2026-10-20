// Si el AudioContext del grabador va más lento que el reloj real (visto con auriculares Bluetooth
// en Chrome), la toma llega comprimida y la nota no es fiable.
export const MIN_TAKE_RATIO = 0.9;

export function incompleteTake(recordedSec, wallSec) {
  return wallSec >= 2 && recordedSec / wallSec < MIN_TAKE_RATIO;
}

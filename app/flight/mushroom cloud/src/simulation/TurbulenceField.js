export class TurbulenceField {
  getForce(position, time, out) {
    const x = position.x * 0.23;
    const y = position.y * 0.19;
    const z = position.z * 0.23;
    const t = time * 0.72;
    out.set(
      Math.sin(y * 1.7 + t) + Math.cos(z * 2.1 - t * 0.7) + Math.sin((y + z) * 0.8),
      Math.sin(z * 1.3 + t * 0.5) * 0.45 + Math.cos(x * 1.9 - t) * 0.35,
      Math.cos(y * 1.5 - t * 0.8) - Math.sin(x * 2.0 + t * 0.6) + Math.cos((x - y) * 0.7)
    );
    return out.multiplyScalar(0.48);
  }
}

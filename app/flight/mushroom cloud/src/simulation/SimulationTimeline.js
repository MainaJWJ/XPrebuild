const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smooth = (a, b, value) => {
  const t = clamp01((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export class SimulationTimeline {
  constructor() {
    this.time = 0;
    this.flash = 0;
    this.fireball = 0;
    this.stemRise = 0;
    this.capSpread = 0;
    this.headRise = 0;
    this.headGrowth = 0;
    this.collar = 0;
    this.cooling = 0;
    this.dust = 0;
    this.heat = 0;
  }

  update(time) {
    this.time = time;
    this.flash = Math.pow(1 - smooth(0, .7, time), 2.4);
    this.fireball = smooth(.04, .3, time) * (1 - smooth(18, 28, time));
    // The same hot head rises quickly at first, then keeps climbing after it
    // has become a mature cloud. This avoids a separate "fireball then cap".
    this.headRise = smooth(.15, 10, time) * .35
      + smooth(8, 18, time) * .45
      + smooth(18, 32, time) * .2;
    this.headGrowth = smooth(.2, 7.5, time) * .58 + smooth(7.5, 27, time) * .42;
    this.stemRise = smooth(.08, 10, time);
    this.capSpread = smooth(4.5, 25, time);
    this.collar = smooth(8, 22, time);
    this.cooling = smooth(24, 38, time);
    this.dust = smooth(.3, 1.2, time) * (1 - smooth(10, 18, time));
    this.heat = (1 - this.cooling) * (1 - smooth(16, 28, time) * .45);
    return this;
  }
}

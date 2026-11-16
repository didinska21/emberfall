// Keyboard and mouse input for EMBERFALL, gathered in one place: the caller reads a
// steer value (-1..1) each step, plus edge-triggered actions (pulse, confirm, pause,
// mute) that the game loop consumes once. The mouse steers by position — the keeper
// glides toward the pointer — and the arrow keys steer by direction; whichever was
// touched last wins.

export class Input {
  constructor(canvas, toLogical) {
    this.canvas = canvas;
    this.toLogical = toLogical;
    this.keys = new Set();
    this.mouseX = null;
    this.mouseSteer = 0;
    this.usingMouse = false;
    this.pulseQueued = false;
    this.confirmQueued = false;
    this.pauseQueued = false;
    this.muteQueued = false;

    window.addEventListener('keydown', (event) => {
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      if (event.repeat) return;
      this.keys.add(event.code);
      this.usingMouse = false;
      if (event.code === 'Space') this.pulseQueued = true;
      if (event.code === 'Enter' || event.code === 'KeyR') this.confirmQueued = true;
      if (event.code === 'KeyP' || event.code === 'Escape') this.pauseQueued = true;
      if (event.code === 'KeyM') this.muteQueued = true;
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    canvas.addEventListener('pointermove', (event) => {
      this.mouseX = this.toLogical(event.clientX, event.clientY).x;
      this.usingMouse = true;
    });
    canvas.addEventListener('pointerdown', (event) => {
      this.mouseX = this.toLogical(event.clientX, event.clientY).x;
      this.usingMouse = true;
      this.pulseQueued = true;
      this.confirmQueued = true;
    });
  }

  /** The steer for this step: toward the pointer when the mouse rules, else the keys. */
  steer(keeperX) {
    if (this.usingMouse && this.mouseX !== null) {
      const dx = this.mouseX - keeperX;
      if (Math.abs(dx) < 6) return 0;
      return Math.max(-1, Math.min(1, dx / 90));
    }
    let move = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) move -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) move += 1;
    return move;
  }

  /** Read and clear an edge-triggered action: 'pulse', 'confirm', 'pause' or 'mute'. */
  take(action) {
    const key = `${action}Queued`;
    const value = this[key];
    this[key] = false;
    return value;
  }

  clearQueued() {
    this.pulseQueued = false;
    this.confirmQueued = false;
    this.pauseQueued = false;
    this.muteQueued = false;
  }
}

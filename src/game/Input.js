export class InputManager {
  constructor() {
    this.held = new Set();
    this.pressedThisFrame = new Set();
    this.virtualMove = { x: 0, z: 0 };

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!this.held.has(k)) this.pressedThisFrame.add(k);
      this.held.add(k);
      if (['w', 'a', 's', 'd', ' ', 'shift', 'f', 'tab'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.held.delete(e.key.toLowerCase());
    });
  }

  isDown(key) { return this.held.has(key); }
  wasPressed(key) { return this.pressedThisFrame.has(key); }

  // Used by on-screen touch buttons to behave exactly like a keyboard press/hold.
  pressVirtual(key) {
    if (!this.held.has(key)) this.pressedThisFrame.add(key);
    this.held.add(key);
  }

  releaseVirtual(key) {
    this.held.delete(key);
  }

  // Used by the on-screen joystick: dx/dz each in [-1, 1].
  setVirtualMove(dx, dz) {
    this.virtualMove.x = dx;
    this.virtualMove.z = dz;
  }

  getMoveVector() {
    let x = this.virtualMove.x;
    let z = this.virtualMove.z;
    if (this.isDown('w')) z -= 1;
    if (this.isDown('s')) z += 1;
    if (this.isDown('a')) x -= 1;
    if (this.isDown('d')) x += 1;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    return { x, z };
  }

  endFrame() { this.pressedThisFrame.clear(); }
}

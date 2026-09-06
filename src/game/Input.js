export class InputManager {
  constructor() {
    this.held = new Set();
    this.pressedThisFrame = new Set();
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

  endFrame() { this.pressedThisFrame.clear(); }
}

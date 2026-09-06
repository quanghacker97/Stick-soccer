export function isTouchDevice() {
  return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}

export function setupTouchControls(input) {
  const root = document.getElementById('touch-controls');
  const joystick = document.getElementById('touch-joystick');
  const knob = document.getElementById('touch-joystick-knob');
  root.classList.remove('hidden');

  const RADIUS = 52;
  let joystickPointerId = null;
  let centerX = 0, centerY = 0;

  function resetKnob() {
    knob.style.transform = 'translate(-50%, -50%)';
  }

  joystick.addEventListener('pointerdown', (e) => {
    if (joystickPointerId !== null) return;
    joystickPointerId = e.pointerId;
    joystick.setPointerCapture(e.pointerId);
    const rect = joystick.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
    updateJoystick(e.clientX, e.clientY);
  });

  joystick.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joystickPointerId) return;
    updateJoystick(e.clientX, e.clientY);
  });

  function endJoystick(e) {
    if (e.pointerId !== joystickPointerId) return;
    joystickPointerId = null;
    input.setVirtualMove(0, 0);
    resetKnob();
  }
  joystick.addEventListener('pointerup', endJoystick);
  joystick.addEventListener('pointercancel', endJoystick);

  function updateJoystick(clientX, clientY) {
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > RADIUS) { dx = (dx / dist) * RADIUS; dy = (dy / dist) * RADIUS; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    input.setVirtualMove(dx / RADIUS, dy / RADIUS);
  }

  for (const btn of document.querySelectorAll('.touch-btn')) {
    const key = btn.dataset.key;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      input.pressVirtual(key);
      btn.classList.add('active');
    });
    const release = () => { input.releaseVirtual(key); btn.classList.remove('active'); };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
  }
}

let scene, camera, renderer;
let particles, particlePositions;
let mouse = new THREE.Vector2();
let particleCount = 500;
let hoverForce = 0.05;

let clock = new THREE.Clock();

// Audio setup
let audioCtx, oscillator, gainNode;
let isPlaying = false;
let startX = null;

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 100;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Create particles geometry and material
  const geometry = new THREE.BufferGeometry();
  particlePositions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 200; // x
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 200; // y
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 200; // z
  }

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3)
  );

  // Colors from blue to purple gradient
  const colors = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    // interpolate from blue (0,0,1) to purple (0.5,0,1)
    let t = i / particleCount;
    colors[i * 3] = 0.5 * t; // R from 0 to 0.5
    colors[i * 3 + 1] = 0; // G
    colors[i * 3 + 2] = 1; // B fixed at 1
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("mouseleave", onMouseUp);
  window.addEventListener("mousemove", onMouseDrag);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
  // Normalize mouse position to range [-1,1]
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseDown(event) {
  startAudio();
  startX = event.clientX;
}

function onMouseUp(event) {
  stopAudio();
  startX = null;
}

function onMouseDrag(event) {
  if (isPlaying && startX !== null) {
    let deltaX = event.clientX - startX;
    let playbackRate = 1 + deltaX / 200; // speed control
    playbackRate = Math.min(Math.max(playbackRate, 0.25), 3); // clamp between 0.25x and 3x
    if (oscillator) oscillator.playbackRate.value = playbackRate;
  }
}

// Web Audio API tone generator
function startAudio() {
  if (isPlaying) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  oscillator = audioCtx.createOscillator();
  gainNode = audioCtx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

  oscillator.start();

  // Add playbackRate property for speed control
  oscillator.playbackRate = { value: 1 };

  // Using playbackRate to change frequency for demo (simulate speed change)
  const originalFreq = 440;
  function updateFreq() {
    if (!oscillator) return;
    oscillator.frequency.setValueAtTime(
      originalFreq * oscillator.playbackRate.value,
      audioCtx.currentTime
    );
    requestAnimationFrame(updateFreq);
  }
  updateFreq();

  isPlaying = true;
}

function stopAudio() {
  if (!isPlaying) return;
  oscillator.stop();
  oscillator.disconnect();
  gainNode.disconnect();
  oscillator = null;
  gainNode = null;
  audioCtx.close();
  audioCtx = null;
  isPlaying = false;
}

function animate() {
  requestAnimationFrame(animate);

  // On hover, particles shift opposite mouse movement
  const positions = particles.geometry.attributes.position.array;
  for (let i = 0; i < particleCount; i++) {
    let ix = i * 3;
    let iy = i * 3 + 1;

    // Move opposite to mouse direction with a subtle easing
    positions[ix] += -mouse.x * hoverForce;
    positions[iy] += -mouse.y * hoverForce;

    // Keep particles within bounds (-100 to 100)
    positions[ix] = THREE.MathUtils.clamp(positions[ix], -100, 100);
    positions[iy] = THREE.MathUtils.clamp(positions[iy], -100, 100);
  }
  particles.geometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}

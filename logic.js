let video,
  handpose,
  predictions = [];
let scene, camera, renderer;
let hands = [];

// 🦴 Define finger bone structure
const bones = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // Thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // Index
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12], // Middle
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16], // Ring
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20], // Pinky
];

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // Load ml5 Handpose model
  handpose = ml5.handpose(video, () => console.log("🤖 Handpose model ready!"));
  handpose.on("predict", (results) => (predictions = results));

  init3D();
}

function init3D() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 2000);
  camera.position.z = 600;

  // 💡 Lights
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(0, 0, 1);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));

  // Optional helpers
  const axes = new THREE.AxesHelper(400);
  const grid = new THREE.GridHelper(400, 20);
  scene.add(axes);
  scene.add(grid);

  // 🧱 Renderer
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(640, 480);
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.left = "660px";
  renderer.domElement.style.top = "0px";
  document.body.appendChild(renderer.domElement);
}

// 🖐️ Create 3D meshes for one hand
function createHandMeshes(color = 0x00ff00, boneColor = 0x00ffff) {
  const hand = { spheres: [], bones: [] };

  const sphereGeo = new THREE.SphereGeometry(5, 16, 16);
  const sphereMat = new THREE.MeshPhongMaterial({ color });
  for (let i = 0; i < 21; i++) {
    const s = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(s);
    hand.spheres.push(s);
  }

  const boneGeo = new THREE.CylinderGeometry(2, 2, 1, 8);
  const boneMat = new THREE.MeshPhongMaterial({ color: boneColor });
  for (let i = 0; i < bones.length; i++) {
    const b = new THREE.Mesh(boneGeo, boneMat);
    scene.add(b);
    hand.bones.push(b);
  }

  return hand;
}

function draw() {
  image(video, 0, 0, width, height);

  // Create hand mesh if not exists
  while (hands.length < predictions.length) {
    const colors = [0xff00ff, 0x00ff00, 0xffff00, 0x00ffff];
    hands.push(createHandMeshes(colors[hands.length % colors.length]));
  }

  // Hide extra hands
  for (let i = 0; i < hands.length; i++) {
    const visible = i < predictions.length;
    hands[i].spheres.forEach((s) => (s.visible = visible));
    hands[i].bones.forEach((b) => (b.visible = visible));
  }

  // Update each hand position
  for (let h = 0; h < predictions.length; h++) {
    const landmarks = predictions[h].landmarks;
    const hand = hands[h];

    for (let i = 0; i < landmarks.length; i++) {
      const [x, y, z] = landmarks[i];
      const mirroredX = width - x;
      const nx = (mirroredX - width / 2) / (width / 2);
      const ny = -(y - height / 2) / (height / 2);
      const scale = 300;
      const depth = -z * 5;
      hand.spheres[i].position.set(nx * scale, ny * scale, depth);
    }

    // 🦴 Connect joints with cylinders
    for (let i = 0; i < bones.length; i++) {
      const [start, end] = bones[i];
      const startPos = hand.spheres[start].position.clone();
      const endPos = hand.spheres[end].position.clone();

      const mid = new THREE.Vector3()
        .addVectors(startPos, endPos)
        .multiplyScalar(0.5);
      const distance = startPos.distanceTo(endPos);

      const bone = hand.bones[i];
      bone.position.copy(mid);
      bone.scale.set(1, distance / 2, 1);

      const dir = new THREE.Vector3().subVectors(endPos, startPos).normalize();
      const axis = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, dir);
      bone.setRotationFromQuaternion(quaternion);
    }
  }

  renderer.render(scene, camera);
}

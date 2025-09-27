let scene, camera, renderer, clock;
let ballTex, blockTex, skyboxTex, bumpTex;
let player, shadow, platforms = [];
let targetX = 0;

let platformSpeed = 0.08;
let gravity = -0.01;
let velocityY = 0;
let isJumping = false;
let gameOver = false;
let started = false;
let score = 0;
let scoreInterval;
const platformSize = { width: 1.5, height: 0.3, depth: 2.5 };

const scoreDisplay = document.getElementById('score');
const startBtn     = document.getElementById('startBtn');
const restartBtn   = document.getElementById('restartBtn');
const startScreen  = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');

startBtn.onclick = () => {
  startScreen.style.display = "none";
  started = true;
  loadTextures();
};
restartBtn.onclick = () => window.location.reload();

function loadTextures() {
  const loader = new THREE.TextureLoader();
  loader.load('ball_texture.jpg', tex1 => {
    ballTex = tex1;
    loader.load('platform_texture.jpg', tex2 => {
      blockTex = tex2;
      loader.load('skybox_texture.jpg', tex3 => {
        skyboxTex = tex3;
        loader.load('rough_bump_map.jpg', tex4 => {
          bumpTex = tex4;
          init();
        });
      });
    });
  });
}

function init() {
  scene = new THREE.Scene();
  scene.background = skyboxTex;

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 10);

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  // Lighting
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(10, 15, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  scene.add(dirLight);

  const amb = new THREE.AmbientLight(0x222222, 0.8);
  scene.add(amb);

  // Ball with rough texture
  const ballMat = new THREE.MeshStandardMaterial({
    map: ballTex,
    bumpMap: bumpTex,
    bumpScale: 0.05,
    roughness: 1.0,
    metalness: 0.0
  });
  const geo = new THREE.SphereGeometry(0.4, 32, 32);
  player = new THREE.Mesh(geo, ballMat);
  player.castShadow = true;
  player.position.set(0, 0.4, 0);
  scene.add(player);
  targetX = player.position.x;

  // Shadow disc
  const shadowGeo = new THREE.CircleGeometry(0.5, 32);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
  shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(player.position.x, 0.01, player.position.z);
  scene.add(shadow);

  // Platforms
  createPlatform(false);
  for (let i = 0; i < 30; i++) createPlatform(true);

  score = 0;
  scoreDisplay.textContent = 0;
  scoreInterval = setInterval(() => {
    if (!gameOver) scoreDisplay.textContent = ++score;
  }, 100);

  clock = new THREE.Clock();
  animate();
}

function createPlatform(relative = false) {
  const geo = new THREE.BoxGeometry(platformSize.width, platformSize.height, platformSize.depth);
  const mat = new THREE.MeshStandardMaterial({
    map: blockTex,
    emissive: new THREE.Color(0x22ffcc),
    emissiveIntensity: 0.3
  });
  const platform = new THREE.Mesh(geo, mat);
  platform.castShadow = true;
  platform.receiveShadow = true;

  let newPos = new THREE.Vector3(0, 0, 0);

  if (!relative) {
    newPos.set(0, 0, 0);
  } else {
    const last = platforms[platforms.length - 1];
    const lastX = last.position.x;

    const dir = Math.random();
    if (dir < 0.33) {
      newPos.set(lastX + platformSize.width, 0, last.position.z);
    } else if (dir < 0.66) {
      newPos.set(lastX - platformSize.width, 0, last.position.z);
    } else {
      newPos.set(lastX, 0, last.position.z - platformSize.depth);
    }
  }

  platform.position.copy(newPos);
  scene.add(platform);
  platforms.push(platform);
}

document.addEventListener('keydown', e => {
  if (!started || gameOver) return;
  if (e.key === 'ArrowLeft')  targetX -= platformSize.width;
  if (e.key === 'ArrowRight') targetX += platformSize.width;
  if (e.key === ' ' && !isJumping) {
    velocityY = 0.2;
    isJumping = true;
  }
});

document.addEventListener("touchstart", e => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
});

document.addEventListener("touchend", e => {
  touchEndX = e.changedTouches[0].screenX;
  touchEndY = e.changedTouches[0].screenY;
  handleSwipe();
});




function checkCollision() {
  for (let p of platforms) {
    if (
      Math.abs(player.position.x - p.position.x) < platformSize.width / 1.2 &&
      Math.abs(player.position.z - p.position.z) < platformSize.depth / 2 &&
      player.position.y <= 0.41
    ) {
      player.position.y = 0.4;
      velocityY = 0;
      isJumping = false;
      return true;
    }
  }
  return false;
}

function animate() {
  if (gameOver) return;
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  // Animate glow
  platforms.forEach(p => {
    if (p.material && p.material.emissive) {
      const intensity = 0.2 + 0.2 * Math.sin(elapsed + p.position.z);
      p.material.emissiveIntensity = intensity;
    }
  });

  velocityY += gravity;
  player.position.y += velocityY;
  player.position.z -= platformSpeed;
  player.position.x += (targetX - player.position.x) * 0.2;

  shadow.position.set(player.position.x, 0.01, player.position.z);

  if (!checkCollision() && player.position.y < -2) {
    gameOver = true;
    gameOverScreen.style.display = 'inline-block';
    clearInterval(scoreInterval);
    return;
  }

  camera.position.lerp(
    new THREE.Vector3(player.position.x, 5, player.position.z + 8),
    0.1
  );
  camera.lookAt(player.position.x, 0, player.position.z);

  platforms = platforms.filter(p => {
    if (p.position.z > player.position.z + 10) {
      scene.remove(p);
      return false;
    }
    return true;
  });

  const last = platforms[platforms.length - 1];
  if (last.position.distanceTo(player.position) < 50) {
    for (let i = 0; i < 3; i++) createPlatform(true);
  }

  renderer.render(scene, camera);
}

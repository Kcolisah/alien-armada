(function() {
  const canvas = document.getElementById("gameCanvas");
  const drawingSurface = canvas.getContext("2d");

  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const soundToggle = document.getElementById("soundToggle");
  const modeButtons = Array.from(document.querySelectorAll(".mode-button"));

  const hudMode = document.getElementById("hudMode");
  const hudScore = document.getElementById("hudScore");
  const hudGoal = document.getElementById("hudGoal");
  const hudLives = document.getElementById("hudLives");
  const hudStatus = document.getElementById("hudStatus");
  const canvasMessage = document.getElementById("canvasMessage");
  const modeTitle = document.getElementById("modeTitle");
  const modeDescription = document.getElementById("modeDescription");

  const music = document.getElementById("music");
  const shootSound = document.getElementById("shootSound");
  const explosionSound = document.getElementById("explosionSound");
  const gameOverSound = document.getElementById("gameOverSound");

  const spriteSheet = new Image();
  spriteSheet.src = "images/alienArmada.png";

  const specialEnemyImages = [
    "images/Baren.png",
    "images/Black_hole.png",
    "images/Ice.png",
    "images/Lava.png",
    "images/Terran.png"
  ].map(function(path) {
    const image = new Image();
    image.src = path;
    return image;
  });

  const MODE_CONFIG = {
    easy: {
      label: "Easy",
      goal: 10,
      spawnInterval: 85,
      minSpawnInterval: 45,
      enemySpeedMin: 1.1,
      enemySpeedMax: 1.8,
      missileSpeed: -9,
      fireDelay: 175,
      description: "Clear 10 aliens with slower spawns and a calmer pace.",
      status: "Easy patrol active"
    },
    hard: {
      label: "Hard",
      goal: 30,
      spawnInterval: 58,
      minSpawnInterval: 26,
      enemySpeedMin: 1.8,
      enemySpeedMax: 3.2,
      missileSpeed: -10,
      fireDelay: 130,
      description: "Clear 30 targets with faster movement and special sprite waves after the run heats up.",
      status: "Hard assault active"
    }
  };

  const STATE = {
    MENU: "menu",
    PLAYING: "playing",
    OVER: "over"
  };

  const game = {
    state: STATE.MENU,
    selectedMode: "easy",
    muted: false,
    score: 0,
    goal: MODE_CONFIG.easy.goal,
    lives: 3,
    maxLives: 3,
    spawnInterval: MODE_CONFIG.easy.spawnInterval,
    spawnTimer: 0,
    lastShotTime: 0,
    animationFrameId: 0,
    resultText: "",
    stars: [],
    missiles: [],
    enemies: [],
    explosions: [],
    keys: {
      left: false,
      right: false,
      shoot: false
    },
    cannon: null
  };

  buildStarfield();
  createCannon();
  updateModeUI();
  updateHud();
  updateCanvasMessage("Choose a mode and launch your mission.");
  syncAudioButtons();
  attachEventListeners();
  startLoop();

  function attachEventListeners() {
    startButton.addEventListener("click", function() {
      startGame(false);
    });

    restartButton.addEventListener("click", function() {
      startGame(true);
    });

    soundToggle.addEventListener("click", function() {
      game.muted = !game.muted;
      applyMuteState();
      syncAudioButtons();
    });

    modeButtons.forEach(function(button) {
      button.addEventListener("click", function() {
        selectMode(button.dataset.mode);
      });
    });

    window.addEventListener("keydown", function(event) {
      if (["ArrowLeft", "ArrowRight", "Space", "KeyR", "Escape"].indexOf(event.code) !== -1) {
        event.preventDefault();
      }

      switch (event.code) {
        case "ArrowLeft":
          game.keys.left = true;
          break;
        case "ArrowRight":
          game.keys.right = true;
          break;
        case "Space":
          game.keys.shoot = true;
          break;
        case "KeyR":
          startGame(true);
          break;
        case "Escape":
          goToMenu();
          break;
      }
    });

    window.addEventListener("keyup", function(event) {
      switch (event.code) {
        case "ArrowLeft":
          game.keys.left = false;
          break;
        case "ArrowRight":
          game.keys.right = false;
          break;
        case "Space":
          game.keys.shoot = false;
          break;
      }
    });
  }

  function selectMode(mode) {
    if (!MODE_CONFIG[mode]) {
      return;
    }

    game.selectedMode = mode;
    updateModeUI();
    updateHud();

    if (game.state !== STATE.PLAYING) {
      updateCanvasMessage("Mode selected: " + MODE_CONFIG[mode].label + ". Press Launch Mission.");
    }
  }

  function startGame(forceRestart) {
    if (game.state === STATE.PLAYING && !forceRestart) {
      return;
    }

    resetGameValues();
    game.state = STATE.PLAYING;
    game.resultText = "";
    updateHud();
    updateCanvasMessage(MODE_CONFIG[game.selectedMode].status);
    startMusic();
  }

  function goToMenu() {
    game.state = STATE.MENU;
    game.resultText = "";
    game.enemies = [];
    game.missiles = [];
    game.explosions = [];
    stopMusic();
    updateHud();
    updateCanvasMessage("Menu ready. Choose your mode and launch again.");
  }

  function resetGameValues() {
    const config = MODE_CONFIG[game.selectedMode];

    game.score = 0;
    game.goal = config.goal;
    game.lives = game.maxLives;
    game.spawnInterval = config.spawnInterval;
    game.spawnTimer = 0;
    game.lastShotTime = 0;
    game.missiles = [];
    game.enemies = [];
    game.explosions = [];
    game.cannon.x = canvas.width / 2 - game.cannon.width / 2;
    game.cannon.y = canvas.height - 42;
    game.cannon.vx = 0;
  }

  function startLoop() {
    let lastTime = performance.now();

    function loop(now) {
      const deltaTime = Math.min(34, now - lastTime);
      lastTime = now;

      update(deltaTime);
      render();

      game.animationFrameId = requestAnimationFrame(loop);
    }

    game.animationFrameId = requestAnimationFrame(loop);
  }

  function update(deltaTime) {
    animateStars(deltaTime);

    if (game.state !== STATE.PLAYING) {
      return;
    }

    updateCannon();
    fireMissileIfNeeded();
    updateMissiles();
    spawnEnemies();
    updateEnemies();
    updateExplosions();
    checkCollisions();
    checkWinCondition();
    updateHud();
  }

  function createCannon() {
    game.cannon = makeSprite({
      sourceX: 0,
      sourceY: 0,
      sourceWidth: 32,
      sourceHeight: 32,
      width: 32,
      height: 32,
      x: canvas.width / 2 - 16,
      y: canvas.height - 42,
      vx: 0,
      speed: 5.8
    });
  }

  function updateCannon() {
    if (game.keys.left && !game.keys.right) {
      game.cannon.vx = -game.cannon.speed;
    } else if (game.keys.right && !game.keys.left) {
      game.cannon.vx = game.cannon.speed;
    } else {
      game.cannon.vx = 0;
    }

    game.cannon.x += game.cannon.vx;
    game.cannon.x = Math.max(0, Math.min(canvas.width - game.cannon.width, game.cannon.x));
  }

  function fireMissileIfNeeded() {
    if (!game.keys.shoot) {
      return;
    }

    const config = MODE_CONFIG[game.selectedMode];
    const now = performance.now();

    if (now - game.lastShotTime < config.fireDelay) {
      return;
    }

    game.lastShotTime = now;

    const missile = makeSprite({
      width: 4,
      height: 14,
      x: game.cannon.centerX() - 2,
      y: game.cannon.y - 12,
      vy: config.missileSpeed
    });

    game.missiles.push(missile);
    playSound(shootSound, 0.22);
  }

  function updateMissiles() {
    for (let index = game.missiles.length - 1; index >= 0; index -= 1) {
      const missile = game.missiles[index];
      missile.y += missile.vy;

      if (missile.y + missile.height < 0) {
        game.missiles.splice(index, 1);
      }
    }
  }

  function spawnEnemies() {
    game.spawnTimer += 1;

    if (game.spawnTimer < game.spawnInterval) {
      return;
    }

    game.spawnTimer = 0;
    createEnemy();

    if (game.spawnInterval > MODE_CONFIG[game.selectedMode].minSpawnInterval) {
      game.spawnInterval -= 1;
    }
  }

  function createEnemy() {
    const config = MODE_CONFIG[game.selectedMode];
    const canUseSpecial = game.selectedMode === "hard" && game.score >= 10 && Math.random() < 0.32;

    if (canUseSpecial) {
      const image = specialEnemyImages[Math.floor(Math.random() * specialEnemyImages.length)];
      const specialEnemy = makeSprite({
        x: Math.random() * (canvas.width - 40),
        y: -48,
        width: 40,
        height: 40,
        vx: Math.random() < 0.5 ? -1.2 : 1.2,
        vy: randomBetween(config.enemySpeedMin + 0.3, config.enemySpeedMax + 0.8),
        enemyType: "special",
        image: image,
        wobbleOffset: Math.random() * Math.PI * 2,
        wobbleStrength: randomBetween(0.45, 1.2),
        time: 0
      });

      game.enemies.push(specialEnemy);
      return;
    }

    const regularEnemy = Object.assign(Object.create(alienObject), {
      sourceX: 32,
      sourceY: 0,
      sourceWidth: 32,
      sourceHeight: 32,
      width: 32,
      height: 32,
      x: Math.random() * (canvas.width - 32),
      y: -32,
      vx: 0,
      vy: randomBetween(config.enemySpeedMin, config.enemySpeedMax),
      enemyType: "regular",
      state: alienObject.NORMAL,
      frameTimer: 0
    });

    game.enemies.push(regularEnemy);
  }

  function updateEnemies() {
    for (let index = game.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = game.enemies[index];

      if (enemy.enemyType === "special") {
        enemy.time += 0.06;
        enemy.x += Math.sin(enemy.time + enemy.wobbleOffset) * enemy.wobbleStrength + enemy.vx * 0.12;
        enemy.y += enemy.vy;
        enemy.x = Math.max(0, Math.min(canvas.width - enemy.width, enemy.x));
      } else if (enemy.state === enemy.NORMAL) {
        enemy.y += enemy.vy;
      } else {
        enemy.frameTimer -= 1;
        if (enemy.frameTimer <= 0) {
          game.enemies.splice(index, 1);
          continue;
        }
      }

      if (enemy.y > canvas.height + enemy.height) {
        enemyPassed(index);
      }
    }
  }

  function enemyPassed(enemyIndex) {
    game.enemies.splice(enemyIndex, 1);
    game.lives -= 1;

    if (game.lives <= 0) {
      game.lives = 0;
      endGame(false);
      return;
    }

    updateCanvasMessage("Enemy slipped through. " + game.lives + " lives remaining.");
  }

  function checkCollisions() {
    for (let enemyIndex = game.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = game.enemies[enemyIndex];

      for (let missileIndex = game.missiles.length - 1; missileIndex >= 0; missileIndex -= 1) {
        const missile = game.missiles[missileIndex];

        if (!hitTestRectangle(missile, enemy)) {
          continue;
        }

        game.missiles.splice(missileIndex, 1);
        destroyEnemy(enemyIndex);
        break;
      }
    }
  }

  function destroyEnemy(enemyIndex) {
    const enemy = game.enemies[enemyIndex];
    game.score += 1;
    createExplosion(enemy.centerX(), enemy.centerY(), enemy.enemyType === "special" ? "special" : "regular");
    playSound(explosionSound, 0.3);

    if (enemy.enemyType === "regular") {
      enemy.state = enemy.EXPLODED;
      enemy.update();
      enemy.frameTimer = 14;
      enemy.vx = 0;
      enemy.vy = 0;
      return;
    }

    game.enemies.splice(enemyIndex, 1);
  }

  function createExplosion(x, y, kind) {
    game.explosions.push({
      x: x,
      y: y,
      radius: kind === "special" ? 5 : 3,
      maxRadius: kind === "special" ? 20 : 14,
      alpha: 1,
      color: kind === "special" ? "255, 145, 214" : "100, 243, 255"
    });
  }

  function updateExplosions() {
    for (let index = game.explosions.length - 1; index >= 0; index -= 1) {
      const explosion = game.explosions[index];
      explosion.radius += 1.4;
      explosion.alpha -= 0.08;

      if (explosion.radius >= explosion.maxRadius || explosion.alpha <= 0) {
        game.explosions.splice(index, 1);
      }
    }
  }

  function checkWinCondition() {
    if (game.score >= game.goal) {
      endGame(true);
    }
  }

  function endGame(didWin) {
    if (game.state === STATE.OVER) {
      return;
    }

    game.state = STATE.OVER;
    game.resultText = didWin ? "EARTH SAVED!" : "EARTH DESTROYED!";
    game.keys.shoot = false;
    stopMusic();

    if (didWin) {
      updateCanvasMessage("Mission complete. Press Restart Run or R to go again.");
      hudStatus.textContent = "Victory";
    } else {
      updateCanvasMessage("Mission failed. Press Restart Run or R to try again.");
      hudStatus.textContent = "Mission Failed";
      playSound(gameOverSound, 0.36);
    }
  }

  function updateModeUI() {
    const config = MODE_CONFIG[game.selectedMode];

    document.body.dataset.mode = game.selectedMode;
    modeTitle.textContent = config.label + " Mode";
    modeDescription.textContent = config.description;

    modeButtons.forEach(function(button) {
      button.classList.toggle("is-active", button.dataset.mode === game.selectedMode);
    });
  }

  function updateHud() {
    const config = MODE_CONFIG[game.selectedMode];

    hudMode.textContent = config.label;
    hudScore.textContent = String(game.score);
    hudGoal.textContent = String(config.goal);

    if (hudLives) {
      hudLives.textContent = String(game.lives);
    }

    if (game.state === STATE.PLAYING) {
      hudStatus.textContent = config.status;
    } else if (game.state === STATE.OVER) {
      hudStatus.textContent = game.resultText || "Run ended";
    } else {
      hudStatus.textContent = "Ready to launch";
    }
  }

  function updateCanvasMessage(message) {
    canvasMessage.textContent = message;
  }

  function startMusic() {
    stopMusic();
    applyMuteState();
    music.currentTime = 0;
    music.volume = game.muted ? 0 : 0.24;

    const playPromise = music.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function() {});
    }
  }

  function stopMusic() {
    music.pause();
    music.currentTime = 0;
  }

  function applyMuteState() {
    music.muted = game.muted;
    shootSound.muted = game.muted;
    explosionSound.muted = game.muted;
    gameOverSound.muted = game.muted;

    music.volume = game.muted ? 0 : 0.24;
    shootSound.volume = game.muted ? 0 : 0.22;
    explosionSound.volume = game.muted ? 0 : 0.3;
    gameOverSound.volume = game.muted ? 0 : 0.36;
  }

  function syncAudioButtons() {
    soundToggle.textContent = game.muted ? "Sound: Off" : "Sound: On";
  }

  function playSound(audioElement, volume) {
    if (game.muted) {
      return;
    }

    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement.volume = volume;

    const playPromise = audioElement.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function() {});
    }
  }

  function buildStarfield() {
    game.stars = [];

    for (let count = 0; count < 70; count += 1) {
      game.stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.35,
        speed: Math.random() * 0.6 + 0.15,
        alpha: Math.random() * 0.6 + 0.25
      });
    }
  }

  function animateStars(deltaTime) {
    const speedMultiplier = game.selectedMode === "hard" ? 1.22 : 1;

    game.stars.forEach(function(star) {
      star.y += star.speed * (deltaTime / 16.6) * speedMultiplier;
      if (star.y > canvas.height + 2) {
        star.y = -2;
        star.x = Math.random() * canvas.width;
      }
    });
  }

  function render() {
    drawingSurface.clearRect(0, 0, canvas.width, canvas.height);
    renderBackground();
    renderStars();
    renderHorizon();
    renderMissiles();
    renderEnemies();
    renderCannon();
    renderExplosions();
    renderOverlay();
  }

  function renderBackground() {
    const gradient = drawingSurface.createLinearGradient(0, 0, 0, canvas.height);

    if (game.selectedMode === "hard") {
      gradient.addColorStop(0, "#08091d");
      gradient.addColorStop(0.55, "#111c3d");
      gradient.addColorStop(1, "#1d0e32");
    } else {
      gradient.addColorStop(0, "#04101f");
      gradient.addColorStop(0.55, "#11254b");
      gradient.addColorStop(1, "#11203a");
    }

    drawingSurface.fillStyle = gradient;
    drawingSurface.fillRect(0, 0, canvas.width, canvas.height);

    drawingSurface.fillStyle = game.selectedMode === "hard" ? "rgba(255, 145, 214, 0.07)" : "rgba(100, 243, 255, 0.06)";
    drawingSurface.beginPath();
    drawingSurface.arc(canvas.width * 0.22, 62, 42, 0, Math.PI * 2);
    drawingSurface.fill();

    drawingSurface.beginPath();
    drawingSurface.arc(canvas.width * 0.8, 96, 24, 0, Math.PI * 2);
    drawingSurface.fill();
  }

  function renderStars() {
    game.stars.forEach(function(star) {
      drawingSurface.globalAlpha = star.alpha;
      drawingSurface.fillStyle = game.selectedMode === "hard" ? "#ffd3fa" : "#ffffff";
      drawingSurface.fillRect(star.x, star.y, star.radius, star.radius);
    });

    drawingSurface.globalAlpha = 1;
  }

  function renderHorizon() {
    if (!spriteSheet.complete) {
      return;
    }

    drawingSurface.globalAlpha = 0.85;
    drawingSurface.drawImage(spriteSheet, 0, 320, 480, 32, 0, canvas.height - 34, canvas.width, 34);
    drawingSurface.globalAlpha = 1;
  }

  function renderMissiles() {
    game.missiles.forEach(function(missile) {
      drawingSurface.fillStyle = game.selectedMode === "hard" ? "#ffe566" : "#64f3ff";
      drawingSurface.fillRect(missile.x, missile.y, missile.width, missile.height);
      drawingSurface.fillStyle = "rgba(255, 255, 255, 0.85)";
      drawingSurface.fillRect(missile.x, missile.y + 2, missile.width, 4);
    });
  }

  function renderEnemies() {
    game.enemies.forEach(function(enemy) {
      if (enemy.enemyType === "special") {
        if (enemy.image && enemy.image.complete) {
          drawingSurface.drawImage(enemy.image, Math.floor(enemy.x), Math.floor(enemy.y), enemy.width, enemy.height);
        } else {
          drawingSurface.fillStyle = "#ff91d6";
          drawingSurface.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
        return;
      }

      if (!spriteSheet.complete) {
        return;
      }

      drawingSurface.drawImage(
        spriteSheet,
        enemy.sourceX,
        enemy.sourceY,
        enemy.sourceWidth,
        enemy.sourceHeight,
        Math.floor(enemy.x),
        Math.floor(enemy.y),
        enemy.width,
        enemy.height
      );
    });
  }

  function renderCannon() {
    if (spriteSheet.complete) {
      drawingSurface.drawImage(
        spriteSheet,
        game.cannon.sourceX,
        game.cannon.sourceY,
        game.cannon.sourceWidth,
        game.cannon.sourceHeight,
        Math.floor(game.cannon.x),
        Math.floor(game.cannon.y),
        game.cannon.width,
        game.cannon.height
      );
    }

    drawingSurface.fillStyle = game.selectedMode === "hard" ? "rgba(255, 229, 102, 0.22)" : "rgba(100, 243, 255, 0.22)";
    drawingSurface.fillRect(game.cannon.x + 10, game.cannon.y + game.cannon.height - 2, 12, 4);
  }

  function renderExplosions() {
    game.explosions.forEach(function(explosion) {
      drawingSurface.beginPath();
      drawingSurface.fillStyle = "rgba(" + explosion.color + ", " + explosion.alpha + ")";
      drawingSurface.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
      drawingSurface.fill();
    });
  }

  function renderOverlay() {
    if (game.state === STATE.PLAYING) {
      return;
    }

    drawingSurface.fillStyle = "rgba(1, 4, 14, 0.32)";
    drawingSurface.fillRect(0, 0, canvas.width, canvas.height);

    drawingSurface.textAlign = "center";
    drawingSurface.textBaseline = "middle";

    if (game.state === STATE.MENU) {
      drawingSurface.fillStyle = "#1cff67";
      drawingSurface.font = "18px emulogic";
      drawingSurface.fillText("ALIEN ARMADA", canvas.width / 2, canvas.height / 2 - 18);

      drawingSurface.fillStyle = "#d8ecff";
      drawingSurface.font = "12px Arial";
      drawingSurface.fillText("Launch your mission from the left panel.", canvas.width / 2, canvas.height / 2 + 18);
    } else if (game.state === STATE.OVER) {
      drawingSurface.fillStyle = game.resultText === "EARTH SAVED!" ? "#1cff67" : "#ff5c7c";
      drawingSurface.font = "18px emulogic";
      drawingSurface.fillText(game.resultText, canvas.width / 2, canvas.height / 2 - 10);

      drawingSurface.fillStyle = "#d8ecff";
      drawingSurface.font = "12px Arial";
      drawingSurface.fillText("Press Restart Run or R to play again.", canvas.width / 2, canvas.height / 2 + 24);
    }

    drawingSurface.textAlign = "start";
    drawingSurface.textBaseline = "alphabetic";
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }
}());
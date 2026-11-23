export class FlappyGame {
  constructor(canvas, onScoreChange, onGameOver) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onScoreChange = onScoreChange;
    this.onGameOver = onGameOver;

    this.width = canvas.width;
    this.height = canvas.height;

    // Física
    this.gravity = 0.42;
    this.jumpForce = -7.6;
    this.pipeSpeed = 2.6;
    this.pipeWidth = 62;
    this.pipeGap = 148;
    this.groundHeight = 56;

    this.resetState();
    this.drawIdle();
  }

  resetState() {
    this.bird = {
      x: 95,
      y: this.height / 2 - 20,
      radius: 17,
      velocity: 0
    };
    this.pipes = [];
    this.score = 0;
    this.frameCount = 0;
    this.isRunning = false;
    this.startTime = null;
    this.animationId = null;
  }

  start() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.resetState();
    this.isRunning = true;
    this.startTime = Date.now();
    this.onScoreChange(0);
    this.flap();
    this.loop();
  }

  flap() {
    if (!this.isRunning) return;
    this.bird.velocity = this.jumpForce;
  }

  spawnPipe() {
    const minTop = 65;
    const maxTop = this.height - this.groundHeight - this.pipeGap - 65;
    const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;

    this.pipes.push({
      x: this.width,
      topHeight,
      bottomY: topHeight + this.pipeGap,
      passed: false
    });
  }

  update() {
    this.frameCount++;

    // Movimiento del pájaro
    this.bird.velocity += this.gravity;
    this.bird.y += this.bird.velocity;

    // Generar tuberías cada 105 frames
    if (this.frameCount % 105 === 0) {
      this.spawnPipe();
    }

    // Colisión techo o suelo
    if (this.bird.y - this.bird.radius <= 0) {
      this.bird.y = this.bird.radius;
      this.bird.velocity = 0;
    }

    if (this.bird.y + this.bird.radius >= this.height - this.groundHeight) {
      this.finishGame();
      return;
    }

    // Actualizar tuberías y comprobar puntos/colisiones
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x -= this.pipeSpeed;

      // Sumar punto al superar el centro de la tubería
      if (!p.passed && p.x + this.pipeWidth < this.bird.x) {
        p.passed = true;
        this.score++;
        this.onScoreChange(this.score);

        // Aumentar ligeramente la velocidad cada 5 puntos
        if (this.score % 5 === 0 && this.pipeSpeed < 4.5) {
          this.pipeSpeed += 0.15;
        }
      }

      // Colisión AABB con círculo aproximado
      const inPipeX =
        this.bird.x + this.bird.radius - 3 > p.x &&
        this.bird.x - this.bird.radius + 3 < p.x + this.pipeWidth;

      const hitTop = this.bird.y - this.bird.radius + 3 < p.topHeight;
      const hitBottom = this.bird.y + this.bird.radius - 3 > p.bottomY;

      if (inPipeX && (hitTop || hitBottom)) {
        this.finishGame();
        return;
      }

      // Eliminar tuberías que salieron de pantalla
      if (p.x + this.pipeWidth < 0) {
        this.pipes.splice(i, 1);
      }
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    // Cielo degradado
    const sky = ctx.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, '#0ea5e9');
    sky.addColorStop(1, '#bae6fd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    // Nubes decorativas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(80, 110, 26, 0, Math.PI * 2);
    ctx.arc(105, 105, 32, 0, Math.PI * 2);
    ctx.arc(132, 112, 24, 0, Math.PI * 2);
    ctx.arc(280, 170, 22, 0, Math.PI * 2);
    ctx.arc(305, 165, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPipes() {
    const ctx = this.ctx;
    for (const p of this.pipes) {
      // Tubo superior
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(p.x, 0, this.pipeWidth, p.topHeight);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(p.x - 4, p.topHeight - 22, this.pipeWidth + 8, 22);

      // Tubo inferior
      const bottomHeight = this.height - this.groundHeight - p.bottomY;
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(p.x, p.bottomY, this.pipeWidth, bottomHeight);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(p.x - 4, p.bottomY, this.pipeWidth + 8, 22);
    }
  }

  drawGround() {
    const ctx = this.ctx;
    const y = this.height - this.groundHeight;
    ctx.fillStyle = '#65a30d';
    ctx.fillRect(0, y, this.width, 14);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(0, y + 14, this.width, this.groundHeight - 14);
  }

  drawBird() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.bird.x, this.bird.y);

    // Inclinación según velocidad vertical
    const angle = Math.max(-0.45, Math.min(0.85, this.bird.velocity * 0.065));
    ctx.rotate(angle);

    // Cuerpo
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, this.bird.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#854d0e';
    ctx.stroke();

    // Ala
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(-4, 3, 9, 6, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Ojo
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(7, -5, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(9, -5, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Pico
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(14, -1);
    ctx.lineTo(24, 3);
    ctx.lineTo(14, 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawScoreInCanvas() {
    const ctx = this.ctx;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.font = 'bold 42px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText(String(this.score), this.width / 2, 65);
    ctx.fillText(String(this.score), this.width / 2, 65);
  }

  drawIdle() {
    this.drawBackground();
    this.drawGround();
    this.drawBird();
  }

  loop() {
    if (!this.isRunning) return;
    this.update();
    if (!this.isRunning) return;

    this.drawBackground();
    this.drawPipes();
    this.drawGround();
    this.drawBird();
    this.drawScoreInCanvas();

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  finishGame() {
    this.isRunning = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);

    // Último dibujado congelado
    this.drawBackground();
    this.drawPipes();
    this.drawGround();
    this.drawBird();
    this.drawScoreInCanvas();

    const durationSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
    this.onGameOver({
      score: this.score,
      duration: durationSeconds
    });
  }
}
import React, { useEffect, useRef, useState } from "react";

// Tiny, dependency-free Flappy Bird clone. Runs on a <canvas>, driven by
// requestAnimationFrame. No assets - everything is drawn with basic shapes,
// so this stays a self-contained easter egg with zero extra weight.
const WIDTH = 320;
const HEIGHT = 420;
const GRAVITY = 0.45;
const FLAP_VELOCITY = -7.2;
const PIPE_GAP = 130;
const PIPE_WIDTH = 52;
const PIPE_SPEED = 2.2;
const BIRD_X = 60;
const BIRD_SIZE = 22;

interface Pipe {
  x: number;
  gapY: number; // top of the gap
  passed: boolean;
}

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => {
    try { return parseInt(localStorage.getItem("devdex_flappy_best") || "0", 10) || 0; } catch { return 0; }
  });
  const [status, setStatus] = useState<"ready" | "playing" | "dead">("ready");

  // Mutable game state kept in refs so the render loop doesn't fight React's
  // own re-render cycle - only score/status changes trigger React updates.
  const birdY = useRef(HEIGHT / 2);
  const velocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const frame = useRef(0);
  const rafId = useRef<number | undefined>(undefined);
  const statusRef = useRef(status);
  statusRef.current = status;

  const resetGame = () => {
    birdY.current = HEIGHT / 2;
    velocity.current = 0;
    pipes.current = [];
    frame.current = 0;
    setScore(0);
  };

  const flap = () => {
    if (statusRef.current === "dead") {
      resetGame();
      setStatus("playing");
      return;
    }
    if (statusRef.current === "ready") {
      setStatus("playing");
    }
    velocity.current = FLAP_VELOCITY;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      skyGrad.addColorStop(0, "#7ec8f0");
      skyGrad.addColorStop(1, "#c9ecff");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      if (statusRef.current === "playing") {
        frame.current++;

        // Physics
        velocity.current += GRAVITY;
        birdY.current += velocity.current;

        // Spawn pipes
        if (frame.current % 95 === 0) {
          const gapY = 60 + Math.random() * (HEIGHT - PIPE_GAP - 160);
          pipes.current.push({ x: WIDTH + PIPE_WIDTH, gapY, passed: false });
        }

        // Move + score + collide
        for (const pipe of pipes.current) {
          pipe.x -= PIPE_SPEED;
          if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
            pipe.passed = true;
            setScore((s) => s + 1);
          }
          const withinX = BIRD_X + BIRD_SIZE / 2 > pipe.x && BIRD_X - BIRD_SIZE / 2 < pipe.x + PIPE_WIDTH;
          const hitsGap = birdY.current - BIRD_SIZE / 2 < pipe.gapY || birdY.current + BIRD_SIZE / 2 > pipe.gapY + PIPE_GAP;
          if (withinX && hitsGap) {
            setStatus("dead");
          }
        }
        pipes.current = pipes.current.filter((p) => p.x > -PIPE_WIDTH);

        if (birdY.current + BIRD_SIZE / 2 > HEIGHT - 20 || birdY.current - BIRD_SIZE / 2 < 0) {
          setStatus("dead");
        }
      }

      // Ground
      ctx.fillStyle = "#ded29a";
      ctx.fillRect(0, HEIGHT - 20, WIDTH, 20);
      ctx.fillStyle = "#c2b482";
      ctx.fillRect(0, HEIGHT - 20, WIDTH, 4);

      // Pipes
      ctx.fillStyle = "#4caf50";
      ctx.strokeStyle = "#2e7d32";
      ctx.lineWidth = 3;
      for (const pipe of pipes.current) {
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
        ctx.fillRect(pipe.x, pipe.gapY + PIPE_GAP, PIPE_WIDTH, HEIGHT - (pipe.gapY + PIPE_GAP));
        ctx.strokeRect(pipe.x, pipe.gapY + PIPE_GAP, PIPE_WIDTH, HEIGHT - (pipe.gapY + PIPE_GAP));
      }

      // Bird
      ctx.save();
      ctx.translate(BIRD_X, birdY.current);
      const angle = Math.max(-0.5, Math.min(0.9, velocity.current / 10));
      ctx.rotate(angle);
      ctx.fillStyle = "#ffd54f";
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff9800";
      ctx.beginPath();
      ctx.moveTo(BIRD_SIZE / 2 - 2, 0);
      ctx.lineTo(BIRD_SIZE / 2 + 8, -3);
      ctx.lineTo(BIRD_SIZE / 2 + 8, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#212121";
      ctx.beginPath();
      ctx.arc(4, -4, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist best score whenever we die with a new high score.
  useEffect(() => {
    if (status === "dead" && score > best) {
      setBest(score);
      try { localStorage.setItem("devdex_flappy_best", String(score)); } catch {}
    }
  }, [status, score, best]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="flex items-center justify-between w-full max-w-[320px] text-sm font-semibold text-foreground px-1">
        <span>Skor: {score}</span>
        <span className="text-muted-foreground">En iyi: {best}</span>
      </div>
      <div className="relative rounded-lg overflow-hidden border border-border shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onClick={flap}
          className="cursor-pointer touch-none"
        />
        {status !== "playing" && (
          <div
            onClick={flap}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white text-center cursor-pointer px-6"
          >
            <p className="text-lg font-bold">{status === "dead" ? "Kaybettin!" : "Flappy Devdex"}</p>
            <p className="text-sm text-white/80">
              {status === "dead" ? `Skor: ${score} — tekrar denemek için tıkla` : "Uçmak için tıkla ya da boşluk tuşuna bas"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { resolve } from 'path';

@Injectable()
export class FaceEmbeddingService {
  private readonly logger = new Logger(FaceEmbeddingService.name);
  /** One Python face_engine process at a time (parallel spawns cause timeouts). */
  private embedChain: Promise<void> = Promise.resolve();

  constructor(private readonly config: ConfigService) { }

  /**
   * Uses Python dlib/face_recognition engine.
   */
  async embedFromBuffer(buffer: Buffer): Promise<number[]> {
    if (!buffer?.length) {
      throw new BadRequestException('Empty file');
    }

    const startedAt = Date.now();
    console.log(`[TimeGateAPI][face-embed] start bytes=${buffer.length}`);
    this.logger.log(`[face-embed] started (bytes=${buffer.length})`);
    try {
      const embedding = await this.runSerialized(() => this.embedWithPython(buffer));
      console.log(
        `[TimeGateAPI][face-embed] success vectorLength=${embedding.length} elapsedMs=${Date.now() - startedAt}`,
      );
      this.logger.log(`[face-embed] success (vectorLength=${embedding.length}, ${Date.now() - startedAt}ms)`);
      return embedding;
    } catch (error) {
      console.log(
        `[TimeGateAPI][face-embed] error elapsedMs=${Date.now() - startedAt} message=${error instanceof Error ? error.message : String(error)
        }`,
      );
      this.logger.error(
        `[face-embed] failed after ${Date.now() - startedAt}ms: ${error instanceof Error ? error.message : String(error)
        }`,
      );
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (
          message.includes('no face detected') ||
          message.includes('empty image bytes') ||
          message.includes('invalid image') ||
          message.includes('cannot identify image file')
        ) {
          throw new BadRequestException(error.message);
        }
        if (
          message.includes('face_recognition import failed') ||
          message.includes('dlib') ||
          message.includes('visual studio') ||
          message.includes('microsoft c++') ||
          message.includes('please install') ||
          message.includes('non-json output')
        ) {
          throw new InternalServerErrorException(
            `Face engine is not correctly installed on this machine: ${error.message}`,
          );
        }
      }
      throw new InternalServerErrorException(
        error instanceof Error ? `Face engine failed: ${error.message}` : 'Face engine failed',
      );
    }
  }

  private runSerialized<T>(task: () => Promise<T>): Promise<T> {
    const run = this.embedChain.then(task, task);
    this.embedChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /**
   * Resolve a Python interpreter that has `face_recognition` importable.
   *
   * Strategy:
   *  1. Try the configured bin (FACE_ENGINE_PYTHON_BIN) if it exists and is
   *     valid for this OS (ignore Windows `.venv/Scripts/python.exe` on Linux).
   *  2. Probe common venv locations for this platform.
   *  3. Fall back to `python3` / `python` on PATH.
   */
  private async resolvePythonBin(configured: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    const isWin = process.platform === 'win32';

    const pathExists = (bin: string) => {
      try {
        fs.accessSync(bin, fs.constants.F_OK);
        return true;
      } catch {
        return false;
      }
    };

    const isUsableConfiguredPath = (bin: string) => {
      const normalized = bin.replace(/\\/g, '/').toLowerCase();
      const looksWindowsOnly =
        normalized.includes('/scripts/python.exe') ||
        normalized.endsWith('python.exe');
      if (!isWin && looksWindowsOnly) {
        this.logger.warn(
          `[face-embed] Ignoring Windows-only FACE_ENGINE_PYTHON_BIN=${bin} on ${process.platform}`,
        );
        return false;
      }
      // Relative / absolute path that clearly does not exist — skip early.
      if ((bin.includes('/') || bin.includes('\\') || bin.includes('.')) && !pathExists(bin)) {
        // Bare commands like "python3" have no slash — leave them for PATH spawn.
        if (bin.includes('/') || bin.includes('\\') || bin.endsWith('.exe')) {
          this.logger.warn(
            `[face-embed] FACE_ENGINE_PYTHON_BIN=${bin} not found on disk; trying fallbacks`,
          );
          return false;
        }
      }
      return true;
    };

    const hasFaceRec = (bin: string) =>
      new Promise<boolean>((resolveProbe) => {
        const child = spawn(bin, ['-c', 'import face_recognition'], {
          stdio: ['ignore', 'ignore', 'pipe'],
        });
        child.on('error', () => resolveProbe(false));
        child.on('close', (code) => resolveProbe(code === 0));
        setTimeout(() => {
          try {
            child.kill('SIGKILL');
          } catch {
            /* already exited */
          }
          resolveProbe(false);
        }, 5000);
      });

    const candidates: string[] = [];
    if (isUsableConfiguredPath(configured)) {
      candidates.push(configured);
    }
    if (isWin) {
      candidates.push(
        resolve(process.cwd(), '.venv', 'Scripts', 'python.exe'),
        resolve(process.cwd(), 'venv', 'Scripts', 'python.exe'),
        resolve(process.cwd(), '..', '.venv', 'Scripts', 'python.exe'),
      );
    } else {
      candidates.push(
        resolve(process.cwd(), '.venv', 'bin', 'python'),
        resolve(process.cwd(), 'venv', 'bin', 'python'),
        resolve(process.cwd(), '..', '.venv', 'bin', 'python'),
        'python3',
        'python',
      );
    }

    const seen = new Set<string>();
    for (const candidate of candidates) {
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      const needsDisk =
        candidate.includes('/') ||
        candidate.includes('\\') ||
        candidate.endsWith('.exe');
      if (needsDisk && !pathExists(candidate)) continue;
      if (await hasFaceRec(candidate)) {
        if (candidate !== configured) {
          this.logger.log(
            `[face-embed] Using Python at ${candidate} (configured was ${configured})`,
          );
        }
        return candidate;
      }
    }

    // Last resort: prefer a PATH python over a broken Windows path on Linux.
    const fallback = !isWin ? 'python3' : configured;
    this.logger.warn(
      `[face-embed] No interpreter with face_recognition found; spawning ${fallback} (will fail loudly if missing)`,
    );
    return fallback;
  }

  private async embedWithPython(buffer: Buffer): Promise<number[]> {
    const configured = this.config.get<string>('FACE_ENGINE_PYTHON_BIN') ?? 'python';
    const pythonBin = await this.resolvePythonBin(configured);
    const scriptPath =
      this.config.get<string>('FACE_ENGINE_SCRIPT_PATH') ?? resolve(process.cwd(), 'python', 'face_engine.py');
    const timeoutMs = Number(this.config.get<string>('FACE_ENGINE_TIMEOUT_MS') ?? 30000);

    const summarizeEngineText = (stdout: string, stderr: string) => {
      const out = stdout.trim();
      const err = stderr.trim();
      if (err && out) return `${err} | ${out}`;
      return err || out || '(no output)';
    };

    const parseEngineJson = (stdout: string, stderr: string) => {
      const raw = stdout.trim();
      if (!raw) {
        throw new Error(
          stderr.trim()
            ? `Face engine produced no stdout. stderr: ${stderr.trim()}`
            : 'Face engine produced no stdout',
        );
      }
      try {
        return JSON.parse(raw) as { embedding?: number[]; error?: string };
      } catch {
        const snippet = raw.length > 240 ? `${raw.slice(0, 240)}…` : raw;
        throw new Error(
          `Face engine returned non-JSON output: ${snippet}${stderr.trim() ? ` (stderr: ${stderr.trim()})` : ''
          }`,
        );
      }
    };

    return new Promise<number[]>((resolveEmbedding, rejectEmbedding) => {
      const child = spawn(pythonBin, [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      this.logger.log(`[face-embed] python spawned (bin=${pythonBin}, script=${scriptPath})`);

      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        rejectEmbedding(new Error(`Face engine timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          rejectEmbedding(
            new Error(
              `Python introuvable (${pythonBin}). Sur Render/Linux, définissez FACE_ENGINE_PYTHON_BIN=python3 ` +
                `(pas .venv/Scripts/python.exe) et installez face_recognition dans cet interpréteur.`,
            ),
          );
          return;
        }
        rejectEmbedding(err);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        this.logger.log(
          `[face-embed] python closed (code=${code ?? 'unknown'}, stdout=${stdout.trim().length} chars, stderr=${stderr.trim().length} chars)`,
        );
        try {
          const parsed = parseEngineJson(stdout, stderr);
          if (parsed.error) {
            rejectEmbedding(new Error(parsed.error));
            return;
          }
          if (code !== 0) {
            rejectEmbedding(
              new Error(
                `Face engine exited with code ${code ?? 'unknown'}. stderr: ${stderr.trim() || '(empty)'}`,
              ),
            );
            return;
          }
          if (!Array.isArray(parsed.embedding) || !parsed.embedding.length) {
            rejectEmbedding(
              new Error(
                `No embedding returned by face engine. Output: ${summarizeEngineText(stdout, stderr)}`,
              ),
            );
            return;
          }
          const embedding = parsed.embedding.filter((value): value is number => typeof value === 'number');
          if (!embedding.length) {
            rejectEmbedding(new Error('Invalid embedding format'));
            return;
          }
          resolveEmbedding(embedding);
        } catch (err) {
          if (code !== 0) {
            rejectEmbedding(
              err instanceof Error
                ? err
                : new Error(`Face engine exited with code ${code ?? 'unknown'}`),
            );
            return;
          }
          rejectEmbedding(err instanceof Error ? err : new Error('Invalid face engine output'));
        }
      });

      child.stdin.write(buffer);
      child.stdin.end();
    });
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length || a.length !== b.length) return 0;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (!na || !nb) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  mergeEmbeddings(base: number[], incoming: number[]): number[] {
    if (!base.length) return incoming;
    if (base.length !== incoming.length) return incoming;
    return base.map((value, idx) => (value + incoming[idx]) / 2);
  }
}

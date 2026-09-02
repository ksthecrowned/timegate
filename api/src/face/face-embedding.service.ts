import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChildProcess, spawn } from 'child_process';
import { resolve } from 'path';

type EngineJson = { embedding?: number[]; error?: string; ready?: boolean };

@Injectable()
export class FaceEmbeddingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FaceEmbeddingService.name);
  /** One face embed at a time (parallel requests overload memory on small instances). */
  private embedChain: Promise<void> = Promise.resolve();
  private resolvedPythonBin: string | null = null;

  private worker: ChildProcess | null = null;
  private workerReady = false;
  private workerBootPromise: Promise<void> | null = null;
  private workerLineBuffer = '';
  private workerResponseWaiter: {
    resolve: (parsed: EngineJson) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;

  constructor(private readonly config: ConfigService) { }

  onModuleInit(): void {
    const venvPy = this.defaultVenvPython();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    const venvExists = (() => {
      try {
        fs.accessSync(venvPy, fs.constants.F_OK);
        return true;
      } catch {
        return false;
      }
    })();
    this.logger.log(
      `[face-embed] cwd=${process.cwd()} venvPython=${venvPy} exists=${venvExists} ` +
        `FACE_ENGINE_PYTHON_BIN=${this.config.get<string>('FACE_ENGINE_PYTHON_BIN') ?? '(unset)'} ` +
        `persistent=${this.usePersistentWorker()}`,
    );
  }

  onModuleDestroy(): void {
    this.killWorker();
  }

  private defaultVenvPython(): string {
    return process.platform === 'win32'
      ? resolve(process.cwd(), '.venv', 'Scripts', 'python.exe')
      : resolve(process.cwd(), '.venv', 'bin', 'python');
  }

  private normalizePythonBin(bin: string): string {
    if (bin.includes('/') || bin.includes('\\')) {
      return resolve(process.cwd(), bin);
    }
    return bin;
  }

  private isBuiltVenvPython(bin: string): boolean {
    const normalized = bin.replace(/\\/g, '/').toLowerCase();
    return normalized.includes('/.venv/') || normalized.includes('/venv/');
  }

  private usePersistentWorker(): boolean {
    const flag = this.config.get<string>('FACE_ENGINE_PERSISTENT');
    if (flag === '0' || flag === 'false') return false;
    return true;
  }

  private scriptPath(): string {
    return this.config.get<string>('FACE_ENGINE_SCRIPT_PATH') ?? resolve(process.cwd(), 'python', 'face_engine.py');
  }

  private configuredPythonBin(): string {
    return this.config.get<string>('FACE_ENGINE_PYTHON_BIN') ?? this.defaultVenvPython();
  }

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

  private killWorker(): void {
    if (this.workerResponseWaiter) {
      clearTimeout(this.workerResponseWaiter.timer);
      this.workerResponseWaiter.reject(new Error('Face engine worker stopped'));
      this.workerResponseWaiter = null;
    }
    if (this.worker) {
      try {
        this.worker.kill('SIGKILL');
      } catch {
        /* already exited */
      }
    }
    this.worker = null;
    this.workerReady = false;
    this.workerBootPromise = null;
    this.workerLineBuffer = '';
  }

  private async resolvePythonBin(configured: string): Promise<string> {
    if (this.resolvedPythonBin) {
      return this.resolvedPythonBin;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    const isWin = process.platform === 'win32';
    const probeTimeoutMs = Number(this.config.get<string>('FACE_ENGINE_PROBE_TIMEOUT_MS') ?? 45000);

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
      if ((bin.includes('/') || bin.includes('\\') || bin.endsWith('.exe')) && !pathExists(bin)) {
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
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          resolveProbe(ok);
        };
        child.on('error', () => finish(false));
        child.on('close', (code) => finish(code === 0));
        setTimeout(() => {
          try {
            child.kill('SIGKILL');
          } catch {
            /* already exited */
          }
          finish(false);
        }, probeTimeoutMs);
      });

    const configuredAbs = this.normalizePythonBin(configured);
    const candidates: string[] = [];
    if (isUsableConfiguredPath(configuredAbs)) {
      candidates.push(configuredAbs);
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

      if (this.isBuiltVenvPython(candidate)) {
        this.logger.log(`[face-embed] Using venv Python at ${candidate} (skipping slow import probe)`);
        this.resolvedPythonBin = candidate;
        return candidate;
      }

      if (await hasFaceRec(candidate)) {
        if (candidate !== configuredAbs) {
          this.logger.log(
            `[face-embed] Using Python at ${candidate} (configured was ${configured})`,
          );
        }
        this.resolvedPythonBin = candidate;
        return candidate;
      }
    }

    const fallback = !isWin ? 'python3' : configuredAbs;
    this.logger.warn(
      `[face-embed] No interpreter with face_recognition found; spawning ${fallback} (will fail loudly if missing)`,
    );
    return fallback;
  }

  private parseEmbedding(parsed: EngineJson): number[] {
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    if (!Array.isArray(parsed.embedding) || !parsed.embedding.length) {
      throw new Error('No embedding returned by face engine');
    }
    const embedding = parsed.embedding.filter((value): value is number => typeof value === 'number');
    if (!embedding.length) {
      throw new Error('Invalid embedding format');
    }
    return embedding;
  }

  private drainWorkerStdout(chunk: Buffer): void {
    this.workerLineBuffer += chunk.toString('utf8');
    const lines = this.workerLineBuffer.split('\n');
    this.workerLineBuffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (!this.workerResponseWaiter) {
        this.logger.warn(`[face-embed] worker stdout without waiter: ${trimmed.slice(0, 120)}`);
        continue;
      }
      const waiter = this.workerResponseWaiter;
      this.workerResponseWaiter = null;
      clearTimeout(waiter.timer);
      try {
        const parsed = JSON.parse(trimmed) as EngineJson;
        waiter.resolve(parsed);
      } catch (err) {
        waiter.reject(
          err instanceof Error ? err : new Error(`Invalid face engine output: ${trimmed.slice(0, 120)}`),
        );
      }
    }
  }

  private async ensureWorkerReady(): Promise<void> {
    if (this.workerReady && this.worker) return;
    if (this.workerBootPromise) {
      await this.workerBootPromise;
      return;
    }

    const pythonBin = await this.resolvePythonBin(this.configuredPythonBin());
    const scriptPath = this.scriptPath();
    const bootTimeoutMs = Number(this.config.get<string>('FACE_ENGINE_BOOT_TIMEOUT_MS') ?? 90000);

    this.workerBootPromise = new Promise<void>((resolveBoot, rejectBoot) => {
      const child = spawn(pythonBin, [scriptPath, '--server'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      this.worker = child;
      this.workerReady = false;
      this.workerLineBuffer = '';
      this.logger.log(`[face-embed] starting persistent worker (bin=${pythonBin})`);

      let bootBuffer = '';
      const bootTimer = setTimeout(() => {
        this.killWorker();
        rejectBoot(new Error(`Face engine worker boot timeout after ${bootTimeoutMs}ms`));
      }, bootTimeoutMs);

      const onBootData = (chunk: Buffer) => {
        bootBuffer += chunk.toString('utf8');
        const lines = bootBuffer.split('\n');
        bootBuffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const msg = JSON.parse(trimmed) as EngineJson;
            if (msg.ready) {
              clearTimeout(bootTimer);
              child.stdout.off('data', onBootData);
              child.stdout.on('data', (c) => this.drainWorkerStdout(c));
              this.workerReady = true;
              this.logger.log('[face-embed] persistent worker ready');
              resolveBoot();
              return;
            }
            if (msg.error) {
              clearTimeout(bootTimer);
              this.killWorker();
              rejectBoot(new Error(msg.error));
            }
          } catch {
            /* wait for complete JSON line */
          }
        }
      };

      child.stdout.on('data', onBootData);
      child.stderr.on('data', (c: Buffer) => {
        const text = c.toString('utf8').trim();
        if (text) this.logger.warn(`[face-embed] worker stderr: ${text}`);
      });
      child.on('error', (err) => {
        clearTimeout(bootTimer);
        this.killWorker();
        rejectBoot(err);
      });
      child.on('close', (code) => {
        if (!this.workerReady) {
          clearTimeout(bootTimer);
          rejectBoot(new Error(`Face engine worker exited during boot (code=${code ?? 'unknown'})`));
        }
        this.logger.warn(`[face-embed] worker exited (code=${code ?? 'unknown'})`);
        this.worker = null;
        this.workerReady = false;
        this.workerBootPromise = null;
        if (this.workerResponseWaiter) {
          clearTimeout(this.workerResponseWaiter.timer);
          this.workerResponseWaiter.reject(new Error('Face engine worker exited'));
          this.workerResponseWaiter = null;
        }
      });
    });

    try {
      await this.workerBootPromise;
    } catch (err) {
      this.workerBootPromise = null;
      throw err;
    }
  }

  private async embedWithPersistentWorker(buffer: Buffer, timeoutMs: number): Promise<number[]> {
    await this.ensureWorkerReady();
    if (!this.worker?.stdin) {
      throw new Error('Face engine worker not running');
    }
    const stdin = this.worker.stdin;
    if (this.workerResponseWaiter) {
      throw new Error('Face engine worker busy');
    }

    return new Promise<number[]>((resolveEmbedding, rejectEmbedding) => {
      const timer = setTimeout(() => {
        this.workerResponseWaiter = null;
        this.killWorker();
        rejectEmbedding(new Error(`Face engine timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.workerResponseWaiter = {
        resolve: (parsed) => {
          try {
            resolveEmbedding(this.parseEmbedding(parsed));
          } catch (err) {
            rejectEmbedding(err instanceof Error ? err : new Error(String(err)));
          }
        },
        reject: rejectEmbedding,
        timer,
      };

      const header = Buffer.alloc(4);
      header.writeUInt32BE(buffer.length, 0);
      try {
        stdin.write(header);
        stdin.write(buffer);
      } catch (err) {
        clearTimeout(timer);
        this.workerResponseWaiter = null;
        this.killWorker();
        rejectEmbedding(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private async embedWithPython(buffer: Buffer): Promise<number[]> {
    const timeoutMs = Number(this.config.get<string>('FACE_ENGINE_TIMEOUT_MS') ?? 30000);

    if (this.usePersistentWorker()) {
      try {
        return await this.embedWithPersistentWorker(buffer, timeoutMs);
      } catch (err) {
        this.logger.warn(
          `[face-embed] persistent worker failed, falling back to one-shot: ${err instanceof Error ? err.message : String(err)}`,
        );
        this.killWorker();
      }
    }

    const pythonBin = await this.resolvePythonBin(this.configuredPythonBin());
    const scriptPath = this.scriptPath();

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
        return JSON.parse(raw) as EngineJson;
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
              `Python introuvable (${pythonBin}). Définissez FACE_ENGINE_PYTHON_BIN=.venv/bin/python sur Render/Linux.`,
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
          resolveEmbedding(this.parseEmbedding(parsed));
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

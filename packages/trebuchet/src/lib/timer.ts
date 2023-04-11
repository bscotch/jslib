import { performance } from 'perf_hooks';

interface TimerMark {
  name: string;
  time: number;
  interval: number;
  total: number;
}

export class Timer {
  protected marks: TimerMark[] = [];

  mark(name: string) {
    // the time since the process started
    const now = performance.now();
    const last = this.marks.at(-1);
    const first = this.marks[0];
    const mark = {
      name,
      time: now,
      interval: last ? now - last.time : now,
      total: first ? now - first.time : now,
    };
    this.marks.push(mark);
    // this.log();
  }

  log() {
    console.table(
      this.marks.map((m) => ({
        name: m.name,
        interval: Math.round(m.interval * 100) / 100,
      })),
    );
  }
}

export const timer = new Timer();

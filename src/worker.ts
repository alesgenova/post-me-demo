import { WorkerMessenger, ChildHandshake, DebugMessenger, debug } from "post-me";
import { WorkerMethods } from "./types";

const model: WorkerMethods = {
  sum: (x, y, onProgress) => {
    return new Promise((resolve) => {
      const nIterations = 10;

      const step = (iter: number) => {
        if (iter >= nIterations) {
          resolve(x + y);
          return;
        }

        onProgress((iter + 1) / nIterations);

        setTimeout(() => step(iter + 1), 100);
      }

      step(0);
    })
  },
}

let messenger = new WorkerMessenger({ worker: self as any });
// Optionally debug all the low level messages echanged
const log = debug('post-me:worker');
messenger = DebugMessenger(messenger, log);

// Start handshake with the parent
ChildHandshake(messenger, model).then((_connection) => { });

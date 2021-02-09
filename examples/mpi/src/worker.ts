import { joinPool, PoolConnection, Communicator, ParallelMethods } from '@post-me/mpi';

import { WorkerMethods } from "./types";

joinPool(self).then((connection: PoolConnection<WorkerMethods>) => {
  const methods: ParallelMethods<WorkerMethods> = {
    ring: (communicator) => async (value: number) => {
      const rank = communicator.rank();
      const size = communicator.size();
      let token: number;

      if (rank === 0) {
        token = value;
      } else {
        const source = rank - 1;
        token = await communicator.recv(source, 0);
        console.log(`Rank ${rank} received token ${token} from rank ${source}`);
      }

      const destination = (rank + 1) % size;
      await communicator.send(token, destination, 0);

      if (rank === 0) {
        const source = size - 1;
        token = await communicator.recv(source, 0);
        console.log(`Rank ${rank} received token ${token} from rank ${source}`);
      }

      return token;
    },

    sort: (communicator) => async (array: Float32Array) => {
      let subArray = await communicator.scatter(array, 0);
      subArray.sort((a, b) => a - b);
      const sorted = await communicator.reduce(subArray, mergeArrays, 0);
      return sorted;
    },

    pi: (communicator) => async (dx: number) => {
      const rank = communicator.rank();
      const size = communicator.size();
      let N = Math.floor(1 / dx);
      let M = Math.floor(N / size);
      if (rank === size - 1) {
        M = N - (size - 1) * M;
      }
      let result = 0;
      const delta = dx * rank * M;
      for (let i = 0; i < M; ++i) {
        const x = delta + i * dx;
        result += 1 / (1 + x * x);
      }

      const root = 0;
      const fullResult = await communicator.reduce(result, (a, b) => a + b, root);

      if (rank === root) {
        return fullResult! * 4 * dx;
      } else {
        return 0;
      }
    }
  };

  connection.setReturnTransfer('sort', (result) => result && result.buffer ? [result.buffer] : []);
  connection.registerMethods(methods);
})

function mergeArrays(a0: Float32Array, a1: Float32Array): Float32Array {
  const m = a0.length;
  const n = a1.length;

  const result = new Float32Array(m + n);

  let idx = 0;
  let i = 0;
  let j = 0;

  while (i < m && j < n) {
    if (a0[i] < a1[j]) {
      result[idx] = a0[i];
      i += 1;
    } else {
      result[idx] = a1[j];
      j += 1;
    }

    idx += 1;
  }

  while (i < m) {
    result[idx] = a0[i];
    i += 1;
    idx += 1;
  }

  while (j < n) {
    result[idx] = a1[j];
    j += 1;
    idx += 1;
  }

  return result;
}

function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  })
}

// const communicator = new Communicator(self);
// communicator.initialize().then(() => {
//   console.log("COMMUNICATOR INITIALIZED");
// });

// const model: WorkerMethods = {
//   sum: (x, y, onProgress) => {
//     return new Promise((resolve) => {
//       const nIterations = 10;

//       const step = (iter: number) => {
//         if (iter >= nIterations) {
//           resolve(x + y);
//           return;
//         }

//         onProgress((iter + 1) / nIterations);

//         setTimeout(() => step(iter + 1), 100);
//       }

//       step(0);
//     })
//   },
// }

// let messenger = new WorkerMessenger({ worker: self as any });
// // Optionally debug all the low level messages echanged
// const log = debug('post-me:worker');
// messenger = DebugMessenger(messenger, log);

// // Start handshake with the parent
// ChildHandshake(messenger, model).then((_connection) => { });

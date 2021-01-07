import { WorkerMessenger, ChildHandshake, DebugMessenger, debug } from "post-me";
import { WorkerMethods } from "./types";

const model: WorkerMethods = {
    sum: (x, y) => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(x + y), 250)
        })
    }
}

let messenger = new WorkerMessenger({ worker: self as any });
// Optionally debug all the low level messages echanged
// const log = debug('post-me:worker');
// messenger = DebugMessenger(messenger, log);

// Start handshake with the parent
ChildHandshake(messenger, model).then((_connection) => { });

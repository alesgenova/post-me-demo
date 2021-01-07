import { WorkerMessenger, ParentHandshake, WindowMessenger, LocalHandle, RemoteHandle, DebugMessenger, debug } from "post-me";
import {
  ParentMethods,
  ParentEvents,
  WorkerMethods,
  WorkerEvents,
  ChildMethods,
  ChildEvents
} from "./types";

let currentTitle = 'Parent';
const titleHeader = document.getElementById('title-header') as HTMLHeadingElement;
titleHeader.innerHTML = currentTitle;

const numberInputA = document.getElementById('number-input-a') as HTMLInputElement;
numberInputA.value = '2';
const numberInputB = document.getElementById('number-input-b') as HTMLInputElement;
numberInputB.value = '3';
const numberInputC = document.getElementById('number-input-c') as HTMLInputElement;
numberInputC.value = '';
const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;

const countSpan = document.getElementById('count-span') as HTMLSpanElement;
const emitBtn = document.getElementById('emit-btn') as HTMLButtonElement;

// Communicating with worker
{
  const worker = new Worker('./worker.js');
  let messenger = new WorkerMessenger({ worker });
  // Optionally debug all the low level messages echanged
  // const log = debug('post-me:parentW');
  // messenger = DebugMessenger(messenger, log);

  // Start handshake with the worker
  ParentHandshake(messenger, {}, 10, 1000).then((connection) => {
    const remoteHandle: RemoteHandle<WorkerMethods, WorkerEvents> = connection.remoteHandle();

    calculateBtn.onclick = () => {
      const a = parseFloat(numberInputA.value);
      const b = parseFloat(numberInputB.value);
      remoteHandle.call('sum', a, b).then(result => {
        numberInputC.value = result.toString();
      })
    }
  });
}

// Communicating with child iframe
{
  const model: ParentMethods = {
    getTitle: () => {
      return currentTitle
    },
    setTitle: (title) => {
      currentTitle = title;
      titleHeader.innerHTML = title;
    }
  }

  // Arbitrary code to generate a child window we'll communicate with
  const childContainer = document.getElementById("child-container") as HTMLDivElement;
  const childFrame = document.createElement('iframe');
  childFrame.src = './child.html';
  childFrame.name = 'child';
  childFrame.width = "100%";
  childFrame.height = "100%";
  childContainer.appendChild(childFrame);
  const childWindow = childFrame.contentWindow as Window;

  const colorInput = document.getElementById("color-input") as HTMLInputElement;

  // Create a Messenger to communicate with the child window
  let messenger = new WindowMessenger({
    localWindow: window,
    remoteWindow: childWindow,
    // both windows are on the same origin in this example,
    // if cross-origin, specify the actual origin, or '*' (not recommended)
    remoteOrigin: window.origin
  });

  // Optional debug all the low level messages echanged
  // const log = debug('post-me:parent0');
  // messenger = DebugMessenger(messenger, log);

  // Start handshake with the iframe
  ParentHandshake(messenger, model, 10, 1000).then((connection) => {
    const remoteHandle: RemoteHandle<ChildMethods, ChildEvents> = connection.remoteHandle();
    const localHandle: LocalHandle<ParentEvents> = connection.localHandle();

    remoteHandle.call('getBackground').then(color => {
      colorInput.value = color;
    });

    colorInput.oninput = (ev: any) => {
      remoteHandle.call('setBackground', ev.target.value);
    }

    emitBtn.onclick = () => {
      localHandle.emit('ping', undefined);
    }

    let count = 0;
    countSpan.innerHTML = count.toString();
    remoteHandle.addEventListener('pong', () => {
      count += 1;
      countSpan.innerHTML = count.toString();
    });
  })
}

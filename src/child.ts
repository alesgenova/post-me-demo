import { WindowMessenger, DebugMessenger, ChildHandshake, Connection, debug } from "post-me";
import { ChildMethods, ChildEvents, ParentMethods, ParentEvents } from "./types";

let currentColor = '#A5D6A7';
const rootContainer = document.getElementById("root") as HTMLDivElement;
rootContainer.style.backgroundColor = currentColor;

const countSpan = document.getElementById('count-span') as HTMLSpanElement;
const emitBtn = document.getElementById('emit-btn') as HTMLButtonElement;

const model: ChildMethods = {
  getBackground: () => {
    return currentColor;
  },
  setBackground: (color) => {
    currentColor = color;
    rootContainer.style.backgroundColor = color;
  }
}

const titleInput = document.getElementById("title-input") as HTMLInputElement;

// Create a Messenger to communicate with the parent window
let messenger = new WindowMessenger({
  localWindow: window,
  remoteWindow: window.parent,
  // both windows are on the same origin in this example,
  // if cross-origin, specify the actual origin, or '*' (not recommended)
  remoteOrigin: window.origin
});

// Optional debug all the low level messages echanged
// const log = debug('post-me:child');
// messenger = DebugMessenger(messenger, log);

// Start handshake
ChildHandshake(model, messenger).then((connection: Connection<ChildEvents, ParentMethods, ParentEvents>) => {
  const remoteHandle = connection.remoteHandle();
  const localHandle = connection.localHandle();

  remoteHandle.call('getTitle').then(title => {
    titleInput.value = title;
  });

  titleInput.oninput = (ev: any) => {
    remoteHandle.call('setTitle', ev.target.value);
  }

  emitBtn.onclick = () => {
    localHandle.emit('pong', undefined);
  }

  let count = 0;
  countSpan.innerHTML = count.toString();
  remoteHandle.addEventListener('ping', () => {
    count += 1;
    countSpan.innerHTML = count.toString();
  });
});
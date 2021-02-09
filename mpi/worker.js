const MARKER = '@post-me';

function createUniqueIdFn() {
  let __id = 0;
  return function () {
    const id = __id;
    __id += 1;
    return id;
  };
}
/**
 * A concrete implementation of the {@link Emitter} interface
 *
 * @public
 */


class ConcreteEmitter {
  constructor() {
    this._listeners = {};
  }
  /** {@inheritDoc Emitter.addEventListener} */


  addEventListener(eventName, listener) {
    let listeners = this._listeners[eventName];

    if (!listeners) {
      listeners = new Set();
      this._listeners[eventName] = listeners;
    }

    listeners.add(listener);
  }
  /** {@inheritDoc Emitter.removeEventListener} */


  removeEventListener(eventName, listener) {
    let listeners = this._listeners[eventName];

    if (!listeners) {
      return;
    }

    listeners.delete(listener);
  }
  /** {@inheritDoc Emitter.once} */


  once(eventName) {
    return new Promise(resolve => {
      const listener = data => {
        this.removeEventListener(eventName, listener);
        resolve(data);
      };

      this.addEventListener(eventName, listener);
    });
  }
  /** @internal */


  emit(eventName, data) {
    let listeners = this._listeners[eventName];

    if (!listeners) {
      return;
    }

    listeners.forEach(listener => {
      listener(data);
    });
  }
  /** @internal */


  removeAllListeners() {
    Object.values(this._listeners).forEach(listeners => {
      if (listeners) {
        listeners.clear();
      }
    });
  }

}

var MessageType;

(function (MessageType) {
  MessageType["HandshakeRequest"] = "handshake-request";
  MessageType["HandshakeResponse"] = "handshake-response";
  MessageType["Call"] = "call";
  MessageType["Response"] = "response";
  MessageType["Error"] = "error";
  MessageType["Event"] = "event";
  MessageType["Callback"] = "callback";
})(MessageType || (MessageType = {})); // Message Creators


function createHandshakeRequestMessage(sessionId) {
  return {
    type: MARKER,
    action: MessageType.HandshakeRequest,
    sessionId
  };
}

function createHandshakeResponseMessage(sessionId) {
  return {
    type: MARKER,
    action: MessageType.HandshakeResponse,
    sessionId
  };
}

function createCallMessage(sessionId, requestId, methodName, args) {
  return {
    type: MARKER,
    action: MessageType.Call,
    sessionId,
    requestId,
    methodName,
    args
  };
}

function createResponsMessage(sessionId, requestId, result, error) {
  const message = {
    type: MARKER,
    action: MessageType.Response,
    sessionId,
    requestId
  };

  if (result !== undefined) {
    message.result = result;
  }

  if (error !== undefined) {
    message.error = error;
  }

  return message;
}

function createCallbackMessage(sessionId, requestId, callbackId, args) {
  return {
    type: MARKER,
    action: MessageType.Callback,
    sessionId,
    requestId,
    callbackId,
    args
  };
}

function createEventMessage(sessionId, eventName, payload) {
  return {
    type: MARKER,
    action: MessageType.Event,
    sessionId,
    eventName,
    payload
  };
} // Type Guards


function isMessage(m) {
  return m && m.type === MARKER;
}

function isHandshakeRequestMessage(m) {
  return isMessage(m) && m.action === MessageType.HandshakeRequest;
}

function isHandshakeResponseMessage(m) {
  return isMessage(m) && m.action === MessageType.HandshakeResponse;
}

function isCallMessage(m) {
  return isMessage(m) && m.action === MessageType.Call;
}

function isResponseMessage(m) {
  return isMessage(m) && m.action === MessageType.Response;
}

function isCallbackMessage(m) {
  return isMessage(m) && m.action === MessageType.Callback;
}

function isEventMessage(m) {
  return isMessage(m) && m.action === MessageType.Event;
}

function makeCallbackEvent(requestId) {
  return "callback_".concat(requestId);
}

function makeResponseEvent(requestId) {
  return "response_".concat(requestId);
}

class Dispatcher extends ConcreteEmitter {
  constructor(messenger, sessionId) {
    super();
    this.uniqueId = createUniqueIdFn();
    this.messenger = messenger;
    this.sessionId = sessionId;
    this.removeMessengerListener = this.messenger.addMessageListener(this.messengerListener.bind(this));
  }

  messengerListener(event) {
    const {
      data
    } = event;

    if (!isMessage(data)) {
      return;
    }

    if (this.sessionId !== data.sessionId) {
      return;
    }

    if (isCallMessage(data)) {
      this.emit(MessageType.Call, data);
    } else if (isResponseMessage(data)) {
      this.emit(makeResponseEvent(data.requestId), data);
    } else if (isEventMessage(data)) {
      this.emit(MessageType.Event, data);
    } else if (isCallbackMessage(data)) {
      this.emit(makeCallbackEvent(data.requestId), data);
    }
  }

  callOnRemote(methodName, args, transfer) {
    const requestId = this.uniqueId();
    const callbackEvent = makeCallbackEvent(requestId);
    const responseEvent = makeResponseEvent(requestId);
    const message = createCallMessage(this.sessionId, requestId, methodName, args);
    this.messenger.postMessage(message, transfer);
    return {
      callbackEvent,
      responseEvent
    };
  }

  respondToRemote(requestId, value, error, transfer) {
    if (error instanceof Error) {
      error = {
        name: error.name,
        message: error.message
      };
    }

    const message = createResponsMessage(this.sessionId, requestId, value, error);
    this.messenger.postMessage(message, transfer);
  }

  callbackToRemote(requestId, callbackId, args) {
    const message = createCallbackMessage(this.sessionId, requestId, callbackId, args);
    this.messenger.postMessage(message);
  }

  emitToRemote(eventName, payload, transfer) {
    const message = createEventMessage(this.sessionId, eventName, payload);
    this.messenger.postMessage(message, transfer);
  }

  close() {
    this.removeMessengerListener();
    this.removeAllListeners();
  }

}

class ParentHandshakeDispatcher extends ConcreteEmitter {
  constructor(messenger, sessionId) {
    super();
    this.messenger = messenger;
    this.sessionId = sessionId;
    this.removeMessengerListener = this.messenger.addMessageListener(this.messengerListener.bind(this));
  }

  messengerListener(event) {
    const {
      data
    } = event;

    if (!isMessage(data)) {
      return;
    }

    if (this.sessionId !== data.sessionId) {
      return;
    }

    if (isHandshakeResponseMessage(data)) {
      this.emit(data.sessionId, data);
    }
  }

  initiateHandshake() {
    const message = createHandshakeRequestMessage(this.sessionId);
    this.messenger.postMessage(message);
    return this.sessionId;
  }

  close() {
    this.removeMessengerListener();
    this.removeAllListeners();
  }

}

class ChildHandshakeDispatcher extends ConcreteEmitter {
  constructor(messenger) {
    super();
    this.messenger = messenger;
    this.removeMessengerListener = this.messenger.addMessageListener(this.messengerListener.bind(this));
  }

  messengerListener(event) {
    const {
      data
    } = event;

    if (isHandshakeRequestMessage(data)) {
      this.emit(MessageType.HandshakeRequest, data);
    }
  }

  acceptHandshake(sessionId) {
    const message = createHandshakeResponseMessage(sessionId);
    this.messenger.postMessage(message);
  }

  close() {
    this.removeMessengerListener();
    this.removeAllListeners();
  }

}

var ProxyType;

(function (ProxyType) {
  ProxyType["Callback"] = "callback";
})(ProxyType || (ProxyType = {}));

function createCallbackProxy(callbackId) {
  return {
    type: MARKER,
    proxy: ProxyType.Callback,
    callbackId
  };
}

function isCallbackProxy(p) {
  return p && p.type === MARKER && p.proxy === ProxyType.Callback;
}

class ConcreteRemoteHandle extends ConcreteEmitter {
  constructor(dispatcher) {
    super();
    this._dispatcher = dispatcher;
    this._callTransfer = {};

    this._dispatcher.addEventListener(MessageType.Event, this._handleEvent.bind(this));
  }

  close() {
    this.removeAllListeners();
  }

  setCallTransfer(methodName, transfer) {
    this._callTransfer[methodName] = transfer;
  }

  call(methodName, ...args) {
    return this.customCall(methodName, args);
  }

  customCall(methodName, args, options = {}) {
    return new Promise((resolve, reject) => {
      const sanitizedArgs = [];
      const callbacks = [];
      let callbackId = 0;
      args.forEach(arg => {
        if (typeof arg === 'function') {
          callbacks.push(arg);
          sanitizedArgs.push(createCallbackProxy(callbackId));
          callbackId += 1;
        } else {
          sanitizedArgs.push(arg);
        }
      });
      const hasCallbacks = callbacks.length > 0;
      let callbackListener = undefined;

      if (hasCallbacks) {
        callbackListener = data => {
          const {
            callbackId,
            args
          } = data;
          callbacks[callbackId](...args);
        };
      }

      let transfer = options.transfer;

      if (transfer === undefined && this._callTransfer[methodName]) {
        transfer = this._callTransfer[methodName](...sanitizedArgs);
      }

      const {
        callbackEvent,
        responseEvent
      } = this._dispatcher.callOnRemote(methodName, sanitizedArgs, transfer);

      if (hasCallbacks) {
        this._dispatcher.addEventListener(callbackEvent, callbackListener);
      }

      this._dispatcher.once(responseEvent).then(response => {
        if (callbackListener) {
          this._dispatcher.removeEventListener(callbackEvent, callbackListener);
        }

        const {
          result,
          error
        } = response;

        if (error !== undefined) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  _handleEvent(data) {
    const {
      eventName,
      payload
    } = data;
    this.emit(eventName, payload);
  }

}

class ConcreteLocalHandle {
  constructor(dispatcher, localMethods) {
    this._dispatcher = dispatcher;
    this._methods = localMethods;
    this._returnTransfer = {};
    this._emitTransfer = {};

    this._dispatcher.addEventListener(MessageType.Call, this._handleCall.bind(this));
  }

  emit(eventName, payload, options = {}) {
    let transfer = options.transfer;

    if (transfer === undefined && this._emitTransfer[eventName]) {
      transfer = this._emitTransfer[eventName](payload);
    }

    this._dispatcher.emitToRemote(eventName, payload, transfer);
  }

  setMethods(methods) {
    this._methods = methods;
  }

  setMethod(methodName, method) {
    this._methods[methodName] = method;
  }

  setReturnTransfer(methodName, transfer) {
    this._returnTransfer[methodName] = transfer;
  }

  setEmitTransfer(eventName, transfer) {
    this._emitTransfer[eventName] = transfer;
  }

  _handleCall(data) {
    const {
      requestId,
      methodName,
      args
    } = data;
    const callMethod = new Promise((resolve, reject) => {
      const method = this._methods[methodName];

      if (typeof method !== 'function') {
        reject(new Error("The method \"".concat(methodName, "\" has not been implemented.")));
        return;
      }

      const desanitizedArgs = args.map(arg => {
        if (isCallbackProxy(arg)) {
          const {
            callbackId
          } = arg;
          return (...args) => {
            this._dispatcher.callbackToRemote(requestId, callbackId, args);
          };
        } else {
          return arg;
        }
      });
      Promise.resolve(method(...desanitizedArgs)).then(resolve).catch(reject);
    });
    callMethod.then(result => {
      let transfer;

      if (this._returnTransfer[methodName]) {
        transfer = this._returnTransfer[methodName](result);
      }

      this._dispatcher.respondToRemote(requestId, result, undefined, transfer);
    }).catch(error => {
      this._dispatcher.respondToRemote(requestId, undefined, error);
    });
  }

}

class ConcreteConnection {
  constructor(dispatcher, localMethods) {
    this._dispatcher = dispatcher;
    this._localHandle = new ConcreteLocalHandle(dispatcher, localMethods);
    this._remoteHandle = new ConcreteRemoteHandle(dispatcher);
  }

  close() {
    this._dispatcher.close();

    this.remoteHandle().close();
  }

  localHandle() {
    return this._localHandle;
  }

  remoteHandle() {
    return this._remoteHandle;
  }

}

const uniqueSessionId = createUniqueIdFn();

const runUntil = (worker, condition, unfulfilled, maxAttempts, attemptInterval) => {
  let attempt = 0;

  const fn = () => {
    if (!condition() && (attempt < maxAttempts || maxAttempts < 1)) {
      worker();
      attempt += 1;
      setTimeout(fn, attemptInterval);
    } else if (!condition() && attempt >= maxAttempts && maxAttempts >= 1) {
      unfulfilled();
    }
  };

  fn();
};
/**
 * Initiate the handshake from the Parent side
 *
 * @param messenger - The Messenger used to send and receive messages from the other end
 * @param localMethods - The methods that will be exposed to the other end
 * @param maxAttempts - The maximum number of handshake attempts
 * @param attemptsInterval - The interval between handshake attempts
 * @returns A Promise to an active {@link Connection} to the other end
 *
 * @public
 */


function ParentHandshake(messenger, localMethods = {}, maxAttempts = 5, attemptsInterval = 100) {
  const thisSessionId = uniqueSessionId();
  let connected = false;
  return new Promise((resolve, reject) => {
    const handshakeDispatcher = new ParentHandshakeDispatcher(messenger, thisSessionId);
    handshakeDispatcher.once(thisSessionId).then(response => {
      connected = true;
      handshakeDispatcher.close();
      const {
        sessionId
      } = response;
      const dispatcher = new Dispatcher(messenger, sessionId);
      const connection = new ConcreteConnection(dispatcher, localMethods);
      resolve(connection);
    });
    runUntil(() => handshakeDispatcher.initiateHandshake(), () => connected, () => reject(new Error("Handshake failed, reached maximum number of attempts")), maxAttempts, attemptsInterval);
  });
}
/**
 * Initiate the handshake from the Child side
 *
 * @param messenger - The Messenger used to send and receive messages from the other end
 * @param localMethods - The methods that will be exposed to the other end
 * @returns A Promise to an active {@link Connection} to the other end
 *
 * @public
 */


function ChildHandshake(messenger, localMethods = {}) {
  return new Promise((resolve, reject) => {
    const handshakeDispatcher = new ChildHandshakeDispatcher(messenger);
    handshakeDispatcher.once(MessageType.HandshakeRequest).then(response => {
      const {
        sessionId
      } = response;
      handshakeDispatcher.acceptHandshake(sessionId);
      handshakeDispatcher.close();
      const dispatcher = new Dispatcher(messenger, sessionId);
      const connection = new ConcreteConnection(dispatcher, localMethods);
      resolve(connection);
    });
  });
}
/** @public */


class BareMessenger {
  constructor(postable) {
    this.postMessage = (message, transfer = []) => {
      postable.postMessage(message, transfer);
    };

    this.addMessageListener = listener => {
      const outerListener = event => {
        listener(event);
      };

      postable.addEventListener('message', outerListener);

      const removeListener = () => {
        postable.removeEventListener('message', outerListener);
      };

      return removeListener;
    };
  }

}
/**
 * A concrete implementation of {@link Messenger} used to communicate with a Worker.
 *
 * @public
 *
 */


class WorkerMessenger extends BareMessenger {
  constructor({
    worker
  }) {
    super(worker);
  }

}
/**
 * A concrete implementation of {@link Messenger} used to communicate with a MessagePort.
 *
 * @public
 *
 */


class PortMessenger extends BareMessenger {
  constructor({
    port
  }) {
    port.start();
    super(port);
  }

}

const BARRIER_TAG = -1;
const BCAST_TAG = -2;
const SCATTER_TAG = -3;
const GATHER_TAG = -4;
const REDUCE_TAG = -5;

const buildBarrier = function (rank, size, send, recv) {
  return async function () {
    const destination = (rank + 1) % size;
    const source = (size + rank - 1) % size;
    const tag = BARRIER_TAG;
    let rounds = 2;

    while (rounds > 0) {
      if (rank === 0) {
        await send(true, destination, tag);
      }

      await recv(source, tag);

      if (rank !== 0) {
        await send(true, destination, tag);
      }

      rounds -= 1;
    }
  };
};

const buildBcast = function (rank, size, send, recv) {
  return async function (data, root) {
    const tag = BCAST_TAG; // O(logN) broadcast implementation

    const delta = (rank + size - root) % size;
    let stride = 1;

    while (stride < size) {
      if (delta < stride && delta + stride < size) {
        const destination = (rank + stride) % size;
        send(data, destination, tag);
      } else if (delta >= stride && delta - stride < stride) {
        const source = (rank + size - stride) % size;
        data = await recv(source, tag);
      }

      stride = stride * 2;
    }

    return data;
  };
};

const buildScatter = function (rank, size, send, recv) {
  return async function (data, root) {
    const tag = SCATTER_TAG; // O(N) scatter implementation can probably do better

    if (rank === root) {
      const fullSize = data.length;
      const subSize = Math.max(Math.floor(fullSize / size), 1);
      const remainder = Math.max(fullSize - subSize * size, 0);

      for (let destination = 0; destination < size; ++destination) {
        const extraStart = destination < remainder ? destination : remainder;
        const extraStop = destination < remainder ? 1 : 0;
        const start = destination * subSize + extraStart;
        const stop = start + subSize + extraStop;
        const subData = data.slice(start, stop);
        let transfer;

        if (subData.buffer) {
          transfer = [subData.buffer];
        }

        send(subData, destination, tag, transfer);
      }
    }

    const scatterData = await recv(root, tag);
    return scatterData;
  };
};

const buildGather = function (rank, size, send, recv) {
  return async function (data, root) {
    const tag = GATHER_TAG; // O(N) scatter implementation can probably do better

    let transfer;

    if (data.buffer) {
      transfer = [data.buffer];
    }

    send(data, root, tag, transfer);
    let gatheredData = null;

    if (rank === root) {
      for (let source = 0; source < size; ++source) {
        let subData = await recv(source, tag);

        if (source === 0) {
          gatheredData = subData;
        } else {
          const C = gatheredData.constructor;
          gatheredData = C.of(...gatheredData, ...subData);
        }
      }
    }

    return gatheredData;
  };
};

const buildAllGather = function (rank, size, send, recv) {
  return async function (data) {
    const gather = buildGather(rank, size, send, recv);
    const bcast = buildBcast(rank, size, send, recv);
    const root = 0;
    const gatheredData = await gather(data, root);
    return await bcast(gatheredData, root);
  };
};

const buildReduce = function (rank, size, send, recv) {
  return async function reduce(data, reducer, root) {
    const tag = REDUCE_TAG;
    let result = data; // O(logN) reduce implementation

    const delta = (rank + size - root) % size;
    let stride = 1;

    while (stride <= Math.floor(size / 2)) {
      if (delta % stride !== 0) {
        break;
      }

      const currSize = Math.floor(size / stride); // If there is an unpaired process at this iteration, reduce with root

      if (currSize % 2 !== 0) {
        const unpaired = (root + (currSize - 1) * stride) % size;

        if (rank === unpaired) {
          send(result, root, tag);
          break;
        } else if (rank === root) {
          const otherResult = await recv(unpaired, tag);
          result = reducer(result, otherResult);
        }
      }

      if (delta % (stride * 2) === 0) {
        const source = (rank + stride) % size;
        const otherResult = await recv(source, tag);
        result = reducer(result, otherResult);
      } else {
        const destination = (rank + size - stride) % size;
        send(result, destination, tag);
        break;
      }

      stride = stride * 2;
    }

    if (rank === root) {
      return result;
    } else {
      return null;
    }
  };
};

const buildAllReduce = function (rank, size, send, recv) {
  return async function (data, reducer) {
    const reduce = buildReduce(rank, size, send, recv);
    const bcast = buildBcast(rank, size, send, recv);
    const root = 0;
    const reducedData = await reduce(data, reducer, root);
    return await bcast(reducedData, root);
  };
};

function joinPool(workerScope) {
  return new Promise((resolve, reject) => {
    let messenger = new WorkerMessenger({
      worker: workerScope
    });
    ChildHandshake(messenger).then(connection => {
      const parentConnection = connection;
      const initMethods = {
        initComm(rank, ports) {
          return new Promise((thisResolve, thisReject) => {
            const handshakes = ports.map((port, otherRank) => {
              if (port === undefined) {
                return Promise.resolve(undefined);
              }

              let messenger = new PortMessenger({
                port
              });
              const Handshake = otherRank < rank ? ChildHandshake : ParentHandshake;
              return Handshake(messenger);
            });
            Promise.all(handshakes).then(connections => {
              const poolConnection = new ConcretePoolConnection(parentConnection, rank, connections);
              resolve(poolConnection);
              thisResolve();
            }).catch(err => {
              reject(err);
              thisReject(err);
            });
          });
        }

      };
      parentConnection.localHandle().setMethods(initMethods);
    }).catch(reject);
  });
}

class ConcretePoolConnection {
  constructor(parentConnection, rank, connections) {
    this._rank = rank;
    this._size = connections.length;
    this._connections = connections;
    this._parentConnection = parentConnection;
    this._communicators = {};

    this._connections.forEach(connection => {
      if (connection !== undefined) {
        const localHandle = connection.localHandle();
        localHandle.setMethod('send', this._handleSend.bind(this));
      }
    });
  }

  registerMethods(methods) {
    const exposedMethods = Object.entries(methods).reduce((tot, [methodName, method]) => {
      tot[methodName] = this._exposeParallelMethod(method);
      return tot;
    }, {});

    this._parentConnection.localHandle().setMethods(exposedMethods);
  }

  registerMethod(methodName, method) {
    this._parentConnection.localHandle().setMethod(methodName, this._exposeParallelMethod(method));
  }

  setReturnTransfer(methodName, transfer) {
    this._parentConnection.localHandle().setReturnTransfer(methodName, transfer);
  }

  _exposeParallelMethod(method) {
    return (taskId, ...args) => {
      const send = (data, destination, tag, transfer) => {
        return this._sendToChannel(taskId, this._rank, destination, tag, data, transfer);
      };

      const communicator = new ConcreteCommunicator(this._rank, this._size, send);
      this._communicators[taskId] = communicator;
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          Promise.resolve(method(communicator)(...args)).then(resolve).catch(reject);
        }, 0);
      });
    };
  }

  _sendToChannel(taskId, source, destination, tag, data, transfer) {
    const connection = this._connections[destination];

    if (connection === undefined) {
      return Promise.reject(new Error('The destination is out of range'));
    }

    const remoteHandle = connection.remoteHandle();
    return remoteHandle.customCall('send', [taskId, source, tag, data], {
      transfer
    });
  }

  _handleSend(taskId, source, tag, data) {
    const communicator = this._communicators[taskId];

    if (communicator === undefined) {
      return Promise.reject('A communicator does not exist for this task.');
    }

    return communicator._handleSend(source, tag, data);
  }

}

function messageKey(source, tag) {
  return "".concat(source, ",").concat(tag);
}

class ConcreteCommunicator {
  constructor(rank, size, sendFn) {
    this._rank = rank;
    this._size = size;
    this._messageQueue = {};
    this._receiveQueue = {};
    this._sendFn = sendFn;
    const send = this.send.bind(this);
    const recv = this.recv.bind(this);
    this.bcast = buildBcast(rank, size, send, recv);
    this.barrier = buildBarrier(rank, size, send, recv);
    this.scatter = buildScatter(rank, size, send, recv);
    this.gather = buildGather(rank, size, send, recv);
    this.allGather = buildAllGather(rank, size, send, recv);
    this.reduce = buildReduce(rank, size, send, recv);
    this.allReduce = buildAllReduce(rank, size, send, recv);
  }

  rank() {
    return this._rank;
  }

  size() {
    return this._size;
  }

  send(data, destination, tag, transfer) {
    if (destination === this.rank()) {
      this._handleSend(this.rank(), tag, data); // Resolve to avoid deadlock


      return Promise.resolve();
    }

    return this._sendFn(data, destination, tag, transfer);
  }

  recv(source, tag) {
    return new Promise((resolve, reject) => {
      const key = messageKey(source, tag);

      if (this._messageQueue[key] && this._messageQueue[key].length > 0) {
        const [sender] = this._messageQueue[key].splice(0, 1);

        sender.resolve();
        resolve(sender.data);
      } else {
        if (this._receiveQueue[key] === undefined) {
          this._receiveQueue[key] = [];
        }

        this._receiveQueue[key].push({
          resolve,
          reject
        });
      }
    });
  }

  _handleSend(source, tag, data) {
    return new Promise((resolve, reject) => {
      const key = messageKey(source, tag);

      if (this._receiveQueue[key] && this._receiveQueue[key].length > 0) {
        const [receiver] = this._receiveQueue[key].splice(0, 1);

        resolve();
        receiver.resolve(data);
      } else {
        if (this._messageQueue[key] === undefined) {
          this._messageQueue[key] = [];
        }

        this._messageQueue[key].push({
          resolve,
          reject,
          data
        });
      }
    });
  }

}

joinPool(self).then(connection => {
  const methods = {
    ring: communicator => async value => {
      const rank = communicator.rank();
      const size = communicator.size();
      let token;

      if (rank === 0) {
        token = value;
      } else {
        const source = rank - 1;
        token = await communicator.recv(source, 0);
        console.log("Rank ".concat(rank, " received token ").concat(token, " from rank ").concat(source));
      }

      const destination = (rank + 1) % size;
      await communicator.send(token, destination, 0);

      if (rank === 0) {
        const source = size - 1;
        token = await communicator.recv(source, 0);
        console.log("Rank ".concat(rank, " received token ").concat(token, " from rank ").concat(source));
      }

      return token;
    },
    sort: communicator => async array => {
      let subArray = await communicator.scatter(array, 0);
      subArray.sort((a, b) => a - b);
      const sorted = await communicator.reduce(subArray, mergeArrays, 0);
      return sorted;
    },
    pi: communicator => async dx => {
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
        return fullResult * 4 * dx;
      } else {
        return 0;
      }
    }
  };
  connection.setReturnTransfer('sort', result => result && result.buffer ? [result.buffer] : []);
  connection.registerMethods(methods);
});

function mergeArrays(a0, a1) {
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
} // const communicator = new Communicator(self);
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

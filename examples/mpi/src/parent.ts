import { createPool, WorkerPool } from '@post-me/mpi';
import { linearScale, createColorMap } from '@colormap/core';
import { viridis } from '@colormap/presets';
import {
  WorkerMethods,
} from "./types";

const N_WORKERS = 4;
main(N_WORKERS);

async function main(N: number) {
  // Array section elements
  const sizeSelect = document.getElementById("size-select") as HTMLSelectElement;
  sizeSelect.value = "6";
  const threadSelect = document.getElementById("thread-select") as HTMLSelectElement;
  threadSelect.value = "pool";

  const createBtn = document.getElementById("create-btn") as HTMLButtonElement;
  const sortBtn = document.getElementById("sort-btn") as HTMLButtonElement;
  sortBtn.disabled = true;

  const arrayImg = document.getElementById("array-img") as HTMLImageElement;

  const arrayResultSpan = document.getElementById("array-result-span") as HTMLSpanElement

  // Pi section elements
  const dxSelect = document.getElementById("dx-select") as HTMLSelectElement;
  dxSelect.value = "8";
  const calculateBtn = document.getElementById("calculate-btn") as HTMLButtonElement;
  const piResultSpan = document.getElementById("pi-result-span") as HTMLSpanElement

  let array = new Float32Array(0);

  createBtn.onclick = function () {
    const size = parseInt(sizeSelect.value);
    array = makeRandom(Math.pow(10, size));
    renderArray(array, arrayImg, 2000);
    sortBtn.disabled = false;
  }

  const workers: Worker[] = [];
  for (let i = 0; i < N; ++i) {
    workers.push(new Worker('./worker.js'));
  }

  const workerPool: WorkerPool<WorkerMethods> = await createPool(workers);

  sortBtn.onclick = async function () {
    arrayResultSpan.textContent = '';
    let t0: any;
    let t1: any;
    if (threadSelect.value === 'main') {
      t0 = new Date();
      array.sort((a, b) => a - b);
      t1 = new Date();
    } else {
      const argsFn = (array: Float32Array) => (rank: number): [Float32Array] => {
        if (rank !== 0) {
          array = new Float32Array(0);
        }
        return [array];
      }
      const transferFn = (rank: number, [array]: Float32Array[]) => {
        return [array.buffer];
      }

      t0 = new Date();
      const result = await workerPool.call('sort', argsFn(array), transferFn);
      t1 = new Date();
      array = result[0]!;
    }

    arrayResultSpan.textContent = `Sorted in ${t1 - t0}ms`;
    renderArray(array, arrayImg, 2000);
    sortBtn.disabled = true;
  }

  calculateBtn.onclick = async function () {
    piResultSpan.textContent = '';
    const dx = Math.pow(10, -parseInt(dxSelect.value));
    let t0: any;
    let t1: any;
    let result = 0;
    if (threadSelect.value === 'main') {
      t0 = new Date();
      result = pi(dx);
      t1 = new Date();
    } else {
      t0 = new Date();
      const results = await workerPool.call('pi', () => [dx]);
      t1 = new Date();
      result = results[0]!;
    }

    piResultSpan.textContent = `${result} in ${t1 - t0}ms`;
  }

}

function makeRandom(size: number): Float32Array {
  const array = new Float32Array(size);
  array.forEach((_, i) => {
    array[i] = Math.random();
  })
  return array;
}

function renderArray(array: Float32Array, img: HTMLImageElement, maxSize: number) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  const width = Math.min(array.length, maxSize);
  canvas.width = width;
  canvas.height = 1;
  const imageData = new ImageData(width, 1);
  const scale = linearScale([0, 1], [0, 1]);
  const colorMap = createColorMap(viridis, scale);
  const stride = Math.floor(array.length / width);
  for (let i = 0; i < width; ++i) {
    colorMap(array[i * stride])
      .concat(1)
      .map(v => v * 255)
      .forEach((c, j) => {
        imageData.data[i * 4 + j] = c;
      })
  }

  context.putImageData(imageData, 0, 0);
  img.src = canvas.toDataURL();
}

function pi(dx: number): number {
  let N = Math.floor(1 / dx);
  let result = 0;
  for (let i = 0; i < N; ++i) {
    const x = i * dx;
    result += 1 / (1 + x * x);
  }

  return result * 4 * dx;
};
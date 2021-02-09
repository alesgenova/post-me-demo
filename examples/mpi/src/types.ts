export type WorkerMethods = {
  ring(data: number): number;
  sort(array: Float32Array): Float32Array | null;
  pi(dx: number): number | null;
};

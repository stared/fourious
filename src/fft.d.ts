declare module "fft.js" {
  export default class FFT {
    constructor(size: number);
    transform(output: Float64Array, input: Float64Array): void;
    realTransform(output: Float64Array, input: Float64Array): void;
    inverseTransform(output: Float64Array, input: Float64Array): void;
  }
}

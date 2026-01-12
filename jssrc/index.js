import { YError } from 'yerror';
import ttf2woff2Factory from './ttf2woff2.cjs';
import wasmModule from './ttf2woff2.wasm';

let module = null;

async function getModule() {
  if (!module) {
    module = await ttf2woff2Factory({
      instantiateWasm(imports, receiveInstance) {
        const instance = new WebAssembly.Instance(wasmModule, imports);
        receiveInstance(instance, wasmModule);
        return instance.exports;
      },
    });
  }
  return module;
}

export default async function ttf2woff2(inputContent) {
  const theTTFToWOFF2Module = await getModule();

  // Prepare input
  const inputBuffer = theTTFToWOFF2Module._malloc(inputContent.length + 1);
  const outputSizePtr = theTTFToWOFF2Module._malloc(4);
  let outputBufferPtr;
  let outputSize;
  let outputContent;

  theTTFToWOFF2Module.writeArrayToMemory(inputContent, inputBuffer);

  try {
    // Run
    outputBufferPtr = theTTFToWOFF2Module.convert(
      inputBuffer,
      inputContent.length,
      outputSizePtr,
    );

    // Retrieve output
    outputSize = theTTFToWOFF2Module.getValue(outputSizePtr, 'i32');
    outputContent = Buffer.alloc(outputSize);

    for (let i = 0; i < outputSize; i++) {
      outputContent[i] = theTTFToWOFF2Module.getValue(outputBufferPtr + i, 'i8');
    }

    if (outputSize === 0) {
      throw new YError('E_CONVERT_ERROR');
    }

  } finally {
    theTTFToWOFF2Module.freePtrs(outputBufferPtr, outputSizePtr);
  }

  return outputContent;
};

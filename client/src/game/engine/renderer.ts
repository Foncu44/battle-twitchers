// Minimal 3D pipeline: perspective camera, rotating cube, depth.
export async function initRenderer(canvasSelector: string) {
  if (!("gpu" in navigator)) throw new Error("WebGPU not supported");
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) throw new Error("No WebGPU device");

  const canvas = document.querySelector(canvasSelector) as HTMLCanvasElement | null;
  if (!canvas) throw new Error("Canvas not found");

  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("WebGPU context missing");

  const format = navigator.gpu.getPreferredCanvasFormat();
  const devicePixelRatio = window.devicePixelRatio || 1;
  const resize = () => {
    const width = Math.max(640, canvas.clientWidth * devicePixelRatio);
    const height = Math.max(360, canvas.clientHeight * devicePixelRatio);
    canvas.width = width;
    canvas.height = height;
    context.configure({ device, format, alphaMode: "opaque", size: [width, height] });
  };
  resize();
  window.addEventListener("resize", resize);

  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // Cube vertices: position + color
  const cubeVertices = new Float32Array([
    // front
    -1, -1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, -1, 1, 1, 0, 0, 1, -1, -1, 1, 1, 0, 0,
    // back
    -1, -1, -1, 0, 1, 0, -1, 1, -1, 0, 1, 1, 1, 1, -1, 1, 1, 1, 1, -1, -1, 1, 1, 0, 1,
  ]);
  const cubeIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3, // front
    4, 5, 6, 4, 6, 7, // back
    3, 2, 5, 3, 5, 4, // top
    0, 7, 6, 0, 6, 1, // bottom
    0, 4, 7, 0, 3, 4, // left
    1, 6, 5, 1, 5, 2, // right
  ]);

  const vertexBuffer = device.createBuffer({
    size: cubeVertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(vertexBuffer.getMappedRange()).set(cubeVertices);
  vertexBuffer.unmap();

  const indexBuffer = device.createBuffer({
    size: cubeIndices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Uint16Array(indexBuffer.getMappedRange()).set(cubeIndices);
  indexBuffer.unmap();

  const shaderModule = device.createShaderModule({
    code: `
      struct Uniforms {
        mvp : mat4x4<f32>,
        color : vec3<f32>
      }
      @group(0) @binding(0) var<uniform> uniforms : Uniforms;

      struct Output {
        @builtin(position) Position : vec4<f32>,
        @location(0) color : vec3<f32>
      }

      @vertex
      fn vs_main(@location(0) pos: vec3<f32>, @location(1) color: vec3<f32>) -> Output {
        var out: Output;
        out.Position = uniforms.mvp * vec4<f32>(pos, 1.0);
        out.color = color * uniforms.color;
        return out;
      }

      @fragment
      fn fs_main(@location(0) color: vec3<f32>) -> @location(0) vec4<f32> {
        return vec4<f32>(color, 1.0);
      }
    `,
  });

  const uniformBuffer = device.createBuffer({
    size: 16 * 4 + 3 * 4, // mat4 + color
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 6 * 4,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x3" },
            { shaderLocation: 1, offset: 3 * 4, format: "float32x3" },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list", cullMode: "back" },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus",
    },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  function perspective(fovY: number, aspect: number, near: number, far: number) {
    const f = 1.0 / Math.tan(fovY / 2);
    return new Float32Array([
      f / aspect,
      0,
      0,
      0,
      0,
      f,
      0,
      0,
      0,
      0,
      far / (far - near),
      1,
      0,
      0,
      (-far * near) / (far - near),
      0,
    ]);
  }

  function frame(time: number) {
    const aspect = canvas.width / canvas.height;
    const proj = perspective((50 * Math.PI) / 180, aspect, 0.1, 100);
    const angle = time * 0.001;
    const viewModel = new Float32Array([
      Math.cos(angle), 0, Math.sin(angle), 0,
      0, 1, 0, 0,
      -Math.sin(angle), 0, Math.cos(angle), 0,
      0, 0, -4, 1,
    ]);
    // mvp = proj * viewModel
    const mvp = new Float32Array(16);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        mvp[col + row * 4] =
          proj[row * 4 + 0] * viewModel[col + 0] +
          proj[row * 4 + 1] * viewModel[col + 4] +
          proj[row * 4 + 2] * viewModel[col + 8] +
          proj[row * 4 + 3] * viewModel[col + 12];
      }
    }

    const color = new Float32Array([0.6 + 0.4 * Math.sin(angle * 0.5), 0.8, 1.0]);
    device.queue.writeBuffer(uniformBuffer, 0, mvp);
    device.queue.writeBuffer(uniformBuffer, 16 * 4, color);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.05, g: 0.07, b: 0.1, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, "uint16");
    pass.setBindGroup(0, bindGroup);
    pass.drawIndexed(cubeIndices.length);
    pass.end();
    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}


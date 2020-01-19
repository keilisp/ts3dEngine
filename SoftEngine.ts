///<reference path="babylon.math.ts" />
// import * as BABYLON from "babylonjs";

module SoftEngine {
  export interface Face {
    A: number;
    B: number;
    C: number;
  }

  export class Camera {
    Position: BABYLON.Vector3;
    Target: BABYLON.Vector3;

    constructor() {
      this.Position = BABYLON.Vector3.Zero();
      this.Target = BABYLON.Vector3.Zero();
    }
  }

  export class Mesh {
    Position: BABYLON.Vector3;
    Rotation: BABYLON.Vector3;
    Vertices: BABYLON.Vector3[];
    Faces: Face[];

    constructor(
      public name: string,
      verticesCount: number,
      facesCount: number
    ) {
      this.Position = BABYLON.Vector3.Zero();
      this.Rotation = BABYLON.Vector3.Zero();
      this.Vertices = new Array(verticesCount);
      this.Faces = new Array(facesCount);
    }
  }

  export class Device {
    // BackBuffer design
    private backbuffer: ImageData;
    private workingCanvas: HTMLCanvasElement;
    private workingContext: CanvasRenderingContext2D;
    private workingWidth: number;
    private workingHeight: number;
    // == backbuffer.data
    private backbufferdata;

    constructor(canvas: HTMLCanvasElement) {
      this.workingCanvas = canvas;
      this.workingWidth = canvas.width;
      this.workingHeight = canvas.height;
      this.workingContext = this.workingCanvas.getContext("2d");
    }

    // Clearing BackBuffer
    public clear(): void {
      // Black by default
      this.workingContext.clearRect(
        0,
        0,
        this.workingWidth,
        this.workingHeight
      );

      // Once cleared with black pixels, we're getting back the associated image data to
      // clear out back buffer
      this.backbuffer = this.workingContext.getImageData(
        0,
        0,
        this.workingWidth,
        this.workingHeight
      );
    }

    // Once everything is ready, we can flush the back buffer
    // into the front buffer.
    public present(): void {
      this.workingContext.putImageData(this.backbuffer, 0, 0);
    }

    // Function for puttin a pixel at a specifix X,Y coordinates
    public putPixel(x: number, y: number, color: BABYLON.Color4): void {
      this.backbufferdata = this.backbuffer.data;

      let index: number = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;

      // Setting color
      this.backbufferdata[index] = color.r * 43;
      this.backbufferdata[index + 1] = color.g * 255;
      this.backbufferdata[index + 2] = color.b * 255;
      this.backbufferdata[index + 3] = color.a * 255;
    }

    // Transforming 3D coordinates into 2D through transformation matrix
    public project(
      coord: BABYLON.Vector3,
      transMat: BABYLON.Matrix
    ): BABYLON.Vector2 {
      let point = BABYLON.Vector3.TransformCoordinates(coord, transMat);

      let x = (point.x * this.workingWidth + this.workingWidth / 2.0) >> 0;
      let y = (-point.y * this.workingHeight + this.workingHeight / 2.0) >> 0;
      return new BABYLON.Vector2(x, y);
    }

    public drawPoint(point: BABYLON.Vector2): void {
      // Clipping
      if (
        point.x >= 0 &&
        point.y >= 0 &&
        point.x < this.workingWidth &&
        point.y < this.workingHeight
      ) {
        this.putPixel(point.x, point.y, new BABYLON.Color4(1, 1, 0, 1));
      }
    }

    public drawBline(point0: BABYLON.Vector2, point1: BABYLON.Vector2): void {
      // Bresenham’s line algorithm
      let x0 = point0.x >> 0;
      let y0 = point0.y >> 0;
      let x1 = point1.x >> 0;
      let y1 = point1.y >> 0;
      let dx = Math.abs(x1 - x0);
      let dy = Math.abs(y1 - y0);
      let sx = x0 < x1 ? 1 : -1;
      let sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;

      while (true) {
        this.drawPoint(new BABYLON.Vector2(x0, y0));

        if (x0 == x1 && y0 == y1) break;
        let e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x0 += sx;
        }
        if (e2 < dx) {
          err += dx;
          y0 += sy;
        }
      }
    }

    // Re-compute each vertex projection
    // during each frame
    public render(camera: Camera, meshes: Mesh[]): void {
      let viewMatrix = BABYLON.Matrix.LookAtLH(
        camera.Position,
        camera.Target,
        BABYLON.Vector3.Up()
      );
      let projectionMatrix = BABYLON.Matrix.PerspectiveFovLH(
        0.78,
        this.workingWidth / this.workingHeight,
        0.01,
        1.0
      );

      for (let index = 0; index < meshes.length; index++) {
        let cMesh = meshes[index];

        let worldMatrix = BABYLON.Matrix.RotationYawPitchRoll(
          cMesh.Rotation.y,
          cMesh.Rotation.x,
          cMesh.Rotation.z
        ).multiply(
          BABYLON.Matrix.Translation(
            cMesh.Position.x,
            cMesh.Position.y,
            cMesh.Position.z
          )
        );

        let transformMatrix = worldMatrix
          .multiply(viewMatrix)
          .multiply(projectionMatrix);

        // for (let i = 0; i < cMesh.Vertices.length - 1; i++) {
        //   let point0 = this.project(cMesh.Vertices[i], transformMatrix);
        //   let point1 = this.project(cMesh.Vertices[i + 1], transformMatrix);
        //   this.drawLine(point0, point1);
        // }
        for (
          let indexFaces = 0;
          indexFaces < cMesh.Faces.length;
          indexFaces++
        ) {
          let currentFace = cMesh.Faces[indexFaces];

          let vertexA = cMesh.Vertices[currentFace.A];
          let vertexB = cMesh.Vertices[currentFace.B];
          let vertexC = cMesh.Vertices[currentFace.C];

          let pixelA = this.project(vertexA, transformMatrix);
          let pixelB = this.project(vertexB, transformMatrix);
          let pixelC = this.project(vertexC, transformMatrix);

          this.drawBline(pixelA, pixelB);
          this.drawBline(pixelB, pixelC);
          this.drawBline(pixelC, pixelA);
        }
      }
    }
  }
}

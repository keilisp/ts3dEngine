///<reference path="babylon.math.ts" />

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
      this.backbufferdata[index] = color.r * 255;
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
    /*
      REWRITE WITH PROMISES
    */
    // Loading the JSON file in an asynchronous manner and
    // calling back with the function passed providing the array of meshes loaded
    public LoadJSONFileAsync(
      filename: string,
      callback: (result: Mesh[]) => any
    ): void {
      let jsonObject = {};
      let xmlhttp = new XMLHttpRequest();
      xmlhttp.open("GET", filename, true);
      xmlhttp.onreadystatechange = () => {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
          let jsonObject = JSON.parse(filename);
          callback(this.CreateMeshesFromJSON(jsonObject));
        }
      };
      xmlhttp.send(null);
    }

    private CreateMeshesFromJSON(jsonObject): Mesh[] {
      let meshes: Mesh[] = [];
      for (
        let meshIndex = 0;
        meshIndex < jsonObject.meshes.length;
        meshIndex++
      ) {
        let verticesArray: number[] = jsonObject.meshes[meshIndex].positions;
        let indicesArray: number[] = jsonObject.meshes[meshIndex].indices;
        let uvCount: number = jsonObject.meshes[meshIndex].uvs;
        let verticesStep = 1;

        // Depending of the number of texture's coordinates per vertex
        // we're jumping in the vertices array  by 6, 8 & 10 windows frame

        switch (uvCount) {
          case 0:
            verticesStep = 6;
            break;
          case 1:
            verticesStep = 8;
            break;
          case 2:
            verticesStep = 10;
            break;
        }

        let verticesCount = verticesArray.length / verticesStep;
        // number of faces is logically the size of the array divided by 3 (A, B, C)
        let facesCount = indicesArray.length / 3;
        let mesh = new SoftEngine.Mesh(
          jsonObject.meshes[meshIndex].name,
          verticesCount,
          facesCount
        );

        // Filling the Vertices array of our mesh first
        for (let index = 0; index < verticesCount; index++) {
          let x = verticesArray[index * verticesStep];
          let y = verticesArray[index * verticesStep + 1];
          let z = verticesArray[index * verticesStep + 2];

          mesh.Vertices[index] = new BABYLON.Vector3(x, y, x);
        }

        // Then filling the Faces array
        for (let index = 0; index < facesCount; index++) {
          let a = indicesArray[index * 3];
          let b = indicesArray[index * 3 + 1];
          let c = indicesArray[index * 3 + 2];

          mesh.Faces[index] = {
            A: a,
            B: b,
            C: c
          };
        }

        // Getting the position set in Blender
        let position = jsonObject.meshes[meshIndex].position;
        mesh.Position = new BABYLON.Vector3(
          position[0],
          position[1],
          position[2]
        );
        meshes.push(mesh);
      }
      return meshes;
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

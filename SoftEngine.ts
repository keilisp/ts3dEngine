///<reference path="babylon.math.ts"/>

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
      this.Vertices = new Array(verticesCount);
      this.Faces = new Array(facesCount);
      this.Rotation = new BABYLON.Vector3(0, 0, 0);
      this.Position = new BABYLON.Vector3(0, 0, 0);
    }
  }

  export class Device {
    // the back buffer size is equal to the number of pixels to draw
    // on screen (width*height) * 4 (R,G,B & Alpha values).
    private backbuffer: ImageData;
    private workingCanvas: HTMLCanvasElement;
    private workingContext: CanvasRenderingContext2D;
    private workingWidth: number;
    private workingHeight: number;
    // equals to backbuffer.data
    private backbufferdata;

    constructor(canvas: HTMLCanvasElement) {
      this.workingCanvas = canvas;
      this.workingWidth = canvas.width;
      this.workingHeight = canvas.height;
      this.workingContext = this.workingCanvas.getContext("2d");
    }

    // This function is called to clear the back buffer with a specific color
    public clear(): void {
      // Clearing with black color by default
      this.workingContext.clearRect(
        0,
        0,
        this.workingWidth,
        this.workingHeight
      );
      // once cleared with black pixels, we're getting back the associated image data to
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

    // Called to put a pixel on screen at a specific X,Y coordinates
    public putPixel(x: number, y: number, color: BABYLON.Color4): void {
      this.backbufferdata = this.backbuffer.data;
      // As we have a 1-D Array for our back buffer
      // we need to know the equivalent cell index in 1-D based
      // on the 2D coordinates of the screen
      let index: number = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;

      // RGBA color space is used by the HTML5 canvas
      this.backbufferdata[index] = color.r * 255;
      this.backbufferdata[index + 1] = color.g * 255;
      this.backbufferdata[index + 2] = color.b * 255;
      this.backbufferdata[index + 3] = color.a * 255;
    }

    // Project takes some 3D coordinates and transform them
    // in 2D coordinates using the transformation matrix
    public project(
      coord: BABYLON.Vector3,
      transMat: BABYLON.Matrix
    ): BABYLON.Vector2 {
      // transforming the coordinates
      let point = BABYLON.Vector3.TransformCoordinates(coord, transMat);
      // The transformed coordinates will be based on coordinate system
      // starting on the center of the screen. But drawing on screen normally starts
      // from top left. We then need to transform them again to have x:0, y:0 on top left.
      let x = (point.x * this.workingWidth + this.workingWidth / 2.0) >> 0;
      let y = (-point.y * this.workingHeight + this.workingHeight / 2.0) >> 0;
      return new BABYLON.Vector2(x, y);
    }

    // drawPoint calls putPixel but does the clipping operation before
    public drawPoint(point: BABYLON.Vector2): void {
      // Clipping what's visible on screen
      if (
        point.x >= 0 &&
        point.y >= 0 &&
        point.x < this.workingWidth &&
        point.y < this.workingHeight
      ) {
        // Drawing a yellow point
        this.putPixel(point.x, point.y, new BABYLON.Color4(1, 1, 0, 1));
      }
    }

    public drawLine(point0: BABYLON.Vector2, point1: BABYLON.Vector2): void {
      let dist = point1.subtract(point0).length();

      // If the distance between the 2 points is less than 2 pixels
      // We're exiting
      if (dist < 2) return;

      // Find the middle point between first & second point
      let middlePoint = point0.add(point1.subtract(point0).scale(0.5));
      // We draw this point on screen
      this.drawPoint(middlePoint);
      // Recursive algorithm launched between first & middle point
      // and between middle & second point
      this.drawLine(point0, middlePoint);
      this.drawLine(middlePoint, point1);
    }

    public drawBline(point0: BABYLON.Vector2, point1: BABYLON.Vector2): void {
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

    // The main method of the engine that re-compute each vertex projection
    // during each frame
    public render(camera: Camera, meshes: Mesh[]): void {
      // To understand this part, please read the prerequisites resources
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
        // current mesh to work on
        let cMesh = meshes[index];
        // Beware to apply rotation before translation
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

    // Loading the JSON file in an asynchronous manner and
    // calling back with the function passed providing the array of meshes loaded
    public LoadJSONFileAsync(
      fileName: string,
      callback: (result: Mesh[]) => any
    ): void {
      let jsonObject = {};
      let xmlhttp = new XMLHttpRequest();
      xmlhttp.open("GET", fileName, true);
      xmlhttp.onreadystatechange = () => {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
          jsonObject = JSON.parse(xmlhttp.responseText);
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
        let verticesArray: number[] = jsonObject.meshes[meshIndex].vertices;
        // Faces
        let indicesArray: number[] = jsonObject.meshes[meshIndex].indices;

        let uvCount: number = jsonObject.meshes[meshIndex].uvCount;
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

        // the number of interesting vertices information for us
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
          mesh.Vertices[index] = new BABYLON.Vector3(x, y, z);
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

        // Getting the position you've set in Blender
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
  }
}

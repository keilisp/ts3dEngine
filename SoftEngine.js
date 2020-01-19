///<reference path="babylon.math.ts" />
// import * as BABYLON from "babylonjs";
var SoftEngine;
(function (SoftEngine) {
    var Camera = /** @class */ (function () {
        function Camera() {
            this.Position = BABYLON.Vector3.Zero();
            this.Target = BABYLON.Vector3.Zero();
        }
        return Camera;
    }());
    SoftEngine.Camera = Camera;
    var Mesh = /** @class */ (function () {
        function Mesh(name, verticesCount, facesCount) {
            this.name = name;
            this.Position = BABYLON.Vector3.Zero();
            this.Rotation = BABYLON.Vector3.Zero();
            this.Vertices = new Array(verticesCount);
            this.Faces = new Array(facesCount);
        }
        return Mesh;
    }());
    SoftEngine.Mesh = Mesh;
    var Device = /** @class */ (function () {
        function Device(canvas) {
            this.workingCanvas = canvas;
            this.workingWidth = canvas.width;
            this.workingHeight = canvas.height;
            this.workingContext = this.workingCanvas.getContext("2d");
        }
        // Clearing BackBuffer
        Device.prototype.clear = function () {
            // Black by default
            this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
            // Once cleared with black pixels, we're getting back the associated image data to
            // clear out back buffer
            this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
        };
        // Once everything is ready, we can flush the back buffer
        // into the front buffer.
        Device.prototype.present = function () {
            this.workingContext.putImageData(this.backbuffer, 0, 0);
        };
        // Function for puttin a pixel at a specifix X,Y coordinates
        Device.prototype.putPixel = function (x, y, color) {
            this.backbufferdata = this.backbuffer.data;
            var index = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;
            // Setting color
            this.backbufferdata[index] = color.r * 43;
            this.backbufferdata[index + 1] = color.g * 255;
            this.backbufferdata[index + 2] = color.b * 255;
            this.backbufferdata[index + 3] = color.a * 255;
        };
        // Transforming 3D coordinates into 2D through transformation matrix
        Device.prototype.project = function (coord, transMat) {
            var point = BABYLON.Vector3.TransformCoordinates(coord, transMat);
            var x = (point.x * this.workingWidth + this.workingWidth / 2.0) >> 0;
            var y = (-point.y * this.workingHeight + this.workingHeight / 2.0) >> 0;
            return new BABYLON.Vector2(x, y);
        };
        Device.prototype.drawPoint = function (point) {
            // Clipping
            if (point.x >= 0 &&
                point.y >= 0 &&
                point.x < this.workingWidth &&
                point.y < this.workingHeight) {
                this.putPixel(point.x, point.y, new BABYLON.Color4(1, 1, 0, 1));
            }
        };
        Device.prototype.drawBline = function (point0, point1) {
            // Bresenham’s line algorithm
            var x0 = point0.x >> 0;
            var y0 = point0.y >> 0;
            var x1 = point1.x >> 0;
            var y1 = point1.y >> 0;
            var dx = Math.abs(x1 - x0);
            var dy = Math.abs(y1 - y0);
            var sx = x0 < x1 ? 1 : -1;
            var sy = y0 < y1 ? 1 : -1;
            var err = dx - dy;
            while (true) {
                this.drawPoint(new BABYLON.Vector2(x0, y0));
                if (x0 == x1 && y0 == y1)
                    break;
                var e2 = 2 * err;
                if (e2 > -dy) {
                    err -= dy;
                    x0 += sx;
                }
                if (e2 < dx) {
                    err += dx;
                    y0 += sy;
                }
            }
        };
        // Re-compute each vertex projection
        // during each frame
        Device.prototype.render = function (camera, meshes) {
            var viewMatrix = BABYLON.Matrix.LookAtLH(camera.Position, camera.Target, BABYLON.Vector3.Up());
            var projectionMatrix = BABYLON.Matrix.PerspectiveFovLH(0.78, this.workingWidth / this.workingHeight, 0.01, 1.0);
            for (var index = 0; index < meshes.length; index++) {
                var cMesh = meshes[index];
                var worldMatrix = BABYLON.Matrix.RotationYawPitchRoll(cMesh.Rotation.y, cMesh.Rotation.x, cMesh.Rotation.z).multiply(BABYLON.Matrix.Translation(cMesh.Position.x, cMesh.Position.y, cMesh.Position.z));
                var transformMatrix = worldMatrix
                    .multiply(viewMatrix)
                    .multiply(projectionMatrix);
                // for (let i = 0; i < cMesh.Vertices.length - 1; i++) {
                //   let point0 = this.project(cMesh.Vertices[i], transformMatrix);
                //   let point1 = this.project(cMesh.Vertices[i + 1], transformMatrix);
                //   this.drawLine(point0, point1);
                // }
                for (var indexFaces = 0; indexFaces < cMesh.Faces.length; indexFaces++) {
                    var currentFace = cMesh.Faces[indexFaces];
                    var vertexA = cMesh.Vertices[currentFace.A];
                    var vertexB = cMesh.Vertices[currentFace.B];
                    var vertexC = cMesh.Vertices[currentFace.C];
                    var pixelA = this.project(vertexA, transformMatrix);
                    var pixelB = this.project(vertexB, transformMatrix);
                    var pixelC = this.project(vertexC, transformMatrix);
                    this.drawBline(pixelA, pixelB);
                    this.drawBline(pixelB, pixelC);
                    this.drawBline(pixelC, pixelA);
                }
            }
        };
        return Device;
    }());
    SoftEngine.Device = Device;
})(SoftEngine || (SoftEngine = {}));

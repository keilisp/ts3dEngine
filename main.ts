///<reference path="SoftEngine.ts"/>

let canvas: HTMLCanvasElement;
let device: SoftEngine.Device;
let meshes: SoftEngine.Mesh[] = [];
let mera: SoftEngine.Camera;

document.addEventListener("DOMContentLoaded", init, false);

function init() {
  canvas = <HTMLCanvasElement>document.getElementById("frontBuffer");
  mera = new SoftEngine.Camera();
  device = new SoftEngine.Device(canvas);

  mera.Position = new BABYLON.Vector3(0, 0, 10);
  mera.Target = new BABYLON.Vector3(0, 0, 0);

  device.LoadJSONFileAsync(
    "http://localhost/public_html/ts3dEngine/monkey.babylon",
    loadJSONCompleted
  );
}
function loadJSONCompleted(meshesLoaded: SoftEngine.Mesh[]) {
  meshes = meshesLoaded;
  // Calling the HTML5 rendering loop
  requestAnimationFrame(drawingLoop);
}

// Rendering loop handler
function drawingLoop() {
  device.clear();

  for (let i = 0; i < meshes.length; i++) {
    meshes[i].Rotation.x += 0.01;
    meshes[i].Rotation.y += 0.01;
  }

  // Doing the various matrix operations
  device.render(mera, meshes);
  // Flushing the back buffer into the front buffer
  device.present();

  // Calling the HTML5 rendering loop recursively
  requestAnimationFrame(drawingLoop);
}

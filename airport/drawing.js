import * as THREE from '../vendor/three/three.module.min.js';

export const INK = 0xffffff;
export const YELLOW = 0xffd400;
export const PAPER = 0x111111;
export const occluder = new THREE.MeshBasicMaterial({ color: PAPER, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const inks = new Map();
function ink(color) {
  if (!inks.has(color)) inks.set(color, new THREE.LineBasicMaterial({ color, transparent: false }));
  return inks.get(color);
}
export function line(parent, points, color = INK, closed = false) {
  const vertices = points.map(p => new THREE.Vector3(...p));
  const object = new (closed ? THREE.LineLoop : THREE.Line)(new THREE.BufferGeometry().setFromPoints(vertices), ink(color));
  object.renderOrder = 2;
  parent.add(object);
  return object;
}
export function solid(parent, geometry, color = INK, smooth = false) {
  const mesh = new THREE.Mesh(geometry, occluder);
  parent.add(mesh);
  if (smooth) {
    // Weld only for topology lookup; the actual render geometry stays untouched.
    const position = geometry.getAttribute('position');
    const index = geometry.index;
    const edges = new Map();
    const count = index ? index.count : position.count;
    const point = i => new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(i) : i);
    const key = p => p.toArray().map(n => n.toFixed(5)).join(',');
    for (let i = 0; i < count; i += 3) {
      const p = [point(i), point(i + 1), point(i + 2)];
      const normal = p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).normalize();
      if (!normal.lengthSq()) continue;
      for (let j = 0; j < 3; j++) {
        const a = p[j], b = p[(j + 1) % 3];
        const id = [key(a), key(b)].sort().join('|');
        if (!edges.has(id)) edges.set(id, { a, b, normals: [] });
        edges.get(id).normals.push(normal);
      }
    }
    const contour = new THREE.LineSegments(new THREE.BufferGeometry(), ink(color));
    contour.renderOrder = 2;
    mesh.add(contour);
    mesh.userData.updateContour = camera => {
      const eye = mesh.worldToLocal(camera.getWorldPosition(new THREE.Vector3()));
      const vertices = [];
      for (const { a, b, normals } of edges.values()) {
        const direction = eye.clone().sub(a.clone().add(b).multiplyScalar(0.5));
        const front = normals[0].dot(direction) >= 0;
        if (normals.length === 1 || normals.some(n => (n.dot(direction) >= 0) !== front) || (normals.length === 2 && normals[0].dot(normals[1]) < 0.6)) vertices.push(a, b);
      }
      contour.geometry.dispose();
      contour.geometry = new THREE.BufferGeometry().setFromPoints(vertices);
    };
  } else {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25), ink(color));
    edges.renderOrder = 2;
    mesh.add(edges);
  }
  return mesh;
}
export function box(parent, size, position, color = INK) {
  const mesh = solid(parent, new THREE.BoxGeometry(...size), color);
  mesh.position.set(...position);
  return mesh;
}
export function cylinder(parent, top, bottom, height, position, color = INK, sides = 32) {
  const mesh = solid(parent, new THREE.CylinderGeometry(top, bottom, height, sides), color, sides > 12);
  mesh.position.set(...position);
  return mesh;
}
export function polygon(parent, points, thickness, color = INK) {
  const shape = new THREE.Shape(points.map(p => new THREE.Vector2(...p)));
  return solid(parent, new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false }), color);
}

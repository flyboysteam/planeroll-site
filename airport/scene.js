import * as THREE from '../vendor/three/three.module.min.js';
import { PAPER } from './drawing.js';
import { createAircraft } from './aircraft.js';
import { createEnvironment } from './environment.js';

export function mountAirport(container) {
  const scene=new THREE.Scene();scene.background=new THREE.Color(PAPER);
  const camera=new THREE.PerspectiveCamera(33,1,1,2500);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setClearColor(PAPER);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label','Technical outline airport scene with a yellow passenger aircraft, terminal, control tower and runway');
  renderer.domElement.setAttribute('role','img');
  container.append(renderer.domElement);
  scene.add(createEnvironment());
  const aircraft=createAircraft('PR-001');aircraft.position.set(45,0,31);aircraft.rotation.y=Math.PI+.1;aircraft.scale.setScalar(1.1);scene.add(aircraft);
  const parked=createAircraft('PR-002');parked.position.set(-42,0,6);parked.rotation.y=Math.PI/2;scene.add(parked);
  const second=createAircraft('PR-003');second.position.set(-15,0,6);second.rotation.y=Math.PI/2;scene.add(second);
  let frame=0, disposed=false;
  function render() {
    frame=0;if(disposed)return;
    const {width,height}=container.getBoundingClientRect();if(!width||!height)return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(width,height,false);
    // Image-cover framing: horizontal crop below the reference aspect, vertical
    // crop above it. Mobile keeps a meaningful slice centred on the hero plane.
    const aspect=width/height, reference=16/9;
    camera.aspect=aspect;
    camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(33)/2)*Math.min(1,reference/aspect)));
    const crop=THREE.MathUtils.clamp((reference-aspect)/(reference-.5),0,1);
    const target=new THREE.Vector3(4+crop*41,18-Math.min(15,Math.max(0,1-reference/aspect)*40), crop*31);
    camera.position.copy(target).add(new THREE.Vector3(65,48,154));camera.lookAt(target);camera.updateProjectionMatrix();
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    scene.traverse(object=>object.userData.updateContour?.(camera));
    renderer.render(scene,camera);
    container.dataset.ready='true';
  }
  const requestRender=()=>{if(!frame&&!disposed)frame=requestAnimationFrame(render);};
  const observer=new ResizeObserver(requestRender);observer.observe(container);
  window.addEventListener('resize',requestRender);
  const restore=()=>requestRender();
  const lost=event=>{event.preventDefault();container.dataset.ready='false';};
  renderer.domElement.addEventListener('webglcontextlost',lost);
  renderer.domElement.addEventListener('webglcontextrestored',restore);
  requestRender();
  return {scene,camera,aircraft,render:requestRender,dispose(){
    disposed=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',requestRender);
    renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.domElement.removeEventListener('webglcontextrestored',restore);
    const geometries=new Set(),materials=new Set();scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)materials.add(object.material);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();
  }};
}
const container=document.querySelector('#airport');
let airport;
try { airport=mountAirport(container); } catch(error) {
  container.dataset.ready='false';
  container.textContent='The airport preview requires a browser with WebGL 2 enabled.';
  console.error('Unable to initialize airport',error);
}
window.addEventListener('pagehide',event=>{if(!event.persisted)airport?.dispose();});

import * as THREE from '../vendor/three/three.module.min.js';
import { YELLOW, solid, box, cylinder, line, polygon } from './drawing.js';

// Original procedural narrow-body study, in metres. +X is the nose.
// All filled meshes and their outlines share the same geometry and parent transform.
export function createAircraft(id) {
  const aircraft = new THREE.Group();
  aircraft.name = id;
  aircraft.userData = { aircraftId: id, asset: 'procedural-narrowbody', placeholder: true };
  const profile = [[-19, 0], [-18.5,.25], [-17,.65], [-15,1.15], [-13,1.6], [-11,1.85], [11,1.85], [12.5,1.78], [14,1.52], [15,1.2], [16,.85], [16.8,.42], [17.2,0]];
  const body = solid(aircraft, new THREE.LatheGeometry(profile.map(([x,r]) => new THREE.Vector2(r,x)), 64), YELLOW, true);
  body.rotation.z = -Math.PI / 2;
  body.position.y = 4.1;
  // Swept wings and horizontal stabilizers: planform extruded vertically.
  for (const sign of [-1, 1]) {
    const wing = polygon(aircraft, [[6,1.2],[-3,17],[-5.2,17],[-6,5],[-7,1.2]].map(([x,z])=>[x,z*sign]), .22, YELLOW);
    wing.rotation.x = Math.PI / 2;
    wing.position.y = 3.6;
    const tail = polygon(aircraft, [[-11, .5],[-17,7],[-19,7],[-17, .5]].map(([x,z])=>[x,z*sign]), .15, YELLOW);
    tail.rotation.x = Math.PI / 2; tail.position.y = 4.5;
    line(aircraft, [[-3,3.6,17*sign],[-4,5.3,17.5*sign],[-5.2,5.4,17.5*sign],[-5.2,3.6,17*sign]],YELLOW);
    line(aircraft, [[2.6,3.62,6*sign],[-3.7,3.62,15.6*sign],[-5.1,3.62,15.6*sign]],YELLOW);
    const pylon = box(aircraft,[2.9,1.1,.25],[4,2.7,6*sign],YELLOW);
    pylon.rotation.z = -.1;
    const engineProfile = [[-2,.88],[-1.6,1.15],[.9,1.2],[1.55,1.08],[1.55,.9],[.9,.85],[-1.4,.65],[-2,.7],[-2,.88]];
    const engine = solid(aircraft,new THREE.LatheGeometry(engineProfile.map(([x,r])=>new THREE.Vector2(r,x)),48),YELLOW,true);
    engine.rotation.z = -Math.PI/2; engine.position.set(4.8,1.8,6*sign);
    const fan = cylinder(aircraft,.72,.72,.08,[5.85,1.8,6*sign],YELLOW); fan.rotation.z = Math.PI/2;
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6;
      line(aircraft,[[5.92,1.8+Math.cos(a)*.22,6*sign+Math.sin(a)*.22],[5.92,1.8+Math.cos(a+.3)*.68,6*sign+Math.sin(a+.3)*.68]],YELLOW);
    }
    // Cabin windows follow the cylindrical skin, not a floating flat strip.
    for(let x=-10.5;x<11;x+=.76) {
      const points=[];
      for(let i=0;i<20;i++) {
        const a=i*Math.PI/10, y=.65+Math.sin(a)*.25;
        points.push([x+Math.cos(a)*.16,4.1+y,sign*(Math.sqrt(1.85**2-y*y)+.015)]);
      }
      line(aircraft,points,YELLOW,true);
    }
    const skin = (x,y) => {
      const index=profile.findIndex(p=>p[0]>=x);
      const [ax,ar]=profile[index-1], [bx,br]=profile[index];
      const radius=ar+(br-ar)*(x-ax)/(bx-ax);
      return [x,y,sign*(Math.sqrt(Math.max(0,radius*radius-(y-4.1)**2))+.025)];
    };
    for(const x of [-10.7,10]) {
      const points=[];
      for(let i=0;i<=12;i++) points.push(skin(x,3.55+i*1.65/12));
      for(let i=0;i<=12;i++) points.push(skin(x+.65,5.2-i*1.65/12));
      line(aircraft,points,YELLOW,true);
    }
    line(aircraft,[[12.5,4.95],[13.7,4.92],[14.3,4.42],[12.6,4.45]].map(p=>skin(...p)),YELLOW,true);
    line(aircraft,[[13.9,4.88],[14.8,4.7],[15.3,4.28],[14.5,4.37]].map(p=>skin(...p)),YELLOW,true);
  }
  const fin = polygon(aircraft,[[-10.5,4.8],[-15,11.1],[-17.1,11.1],[-17.8,4.6]],.24,YELLOW);
  fin.position.z=-.12;
  line(aircraft,[[-16.2,10.9,.14],[-16.8,5,.14]],YELLOW);
  for (const [x,z] of [[12,0],[-3,-2.2],[-3,2.2]]) {
    cylinder(aircraft,.1,.1,2.4,[x,1.6,z],YELLOW,12);
    for(const side of [-1,1]) {
      const wheel=cylinder(aircraft,.48,.48,.25,[x,.5,z+side*.27],YELLOW,32);
      wheel.rotation.x=Math.PI/2;
      const hub=cylinder(aircraft,.22,.22,.27,[x,.5,z+side*.27],YELLOW,24); hub.rotation.x=Math.PI/2;
    }
  }
  return aircraft;
}

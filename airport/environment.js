import * as THREE from '../vendor/three/three.module.min.js';
import { box, cylinder, line, solid, polygon } from './drawing.js';

function glazing(group, x, y, z, width, height, columns) {
  for(let i=0;i<=columns;i++) line(group,[[x+i*width/columns,y,z],[x+i*width/columns,y+height,z]]);
  for(let h=0;h<=height;h+=1.4) line(group,[[x,y+h,z],[x+width,y+h,z]]);
}
function bridge(parent,x,z,length) {
  box(parent,[4,3,length],[x,4,z+length/2]);
  for(let offset=0;offset<length;offset+=1.2) line(parent,[[x-2.01,2.5,z+offset],[x-2.01,5.5,z+offset],[x+2,5.5,z+offset]]);
  cylinder(parent,.2,.2,3,[x,1.5,z+length-2]);
  box(parent,[5,3.5,3],[x,4,z+length]);
}
function vehicle(parent,x,z,carts=0) {
  const g=new THREE.Group(); g.position.set(x,0,z); parent.add(g);
  box(g,[3.3,1.3,1.8],[0,1,0]);box(g,[1.6,1.2,1.65],[-.6,2.2,0]);
  for(const a of [-1,1]) for(const b of [-1,1]) {
    const w=cylinder(g,.4,.4,.22,[a*1.1,.45,b*.94]);w.rotation.x=Math.PI/2;
  }
  for(let i=0;i<carts;i++) {
    const cx=4+i*3.5;
    line(g,[[cx-2, .5,0],[cx-1,.5,0]]);
    box(g,[2.6,1.1,1.7],[cx,.95,0]);
    for(const side of [-1,1]) {const w=cylinder(g,.28,.28,.2,[cx,.3,side*.9]);w.rotation.x=Math.PI/2;}
  }
}
export function createEnvironment() {
  const g=new THREE.Group();g.name='airport-infrastructure';
  // Ground is deliberately much larger than any supported camera frustum.
  const ground=solid(g,new THREE.PlaneGeometry(10000,10000));ground.rotation.x=-Math.PI/2;ground.position.y=-.05;
  box(g,[85,8,20],[-44,4,-28]);box(g,[89,.5,23],[-44,8.4,-28]);
  glazing(g,-86,.5,-17.98,84,7,32);
  for(const x of [-69,-42,-15]) {
    box(g,[11,10,23],[x,5,-28]);box(g,[13,.5,25],[x,10.3,-28]);
    glazing(g,x-5.5,1,-16.48,11,8,4);
    bridge(g,x-3,-16,6);
    // Stand envelopes and lead-in lines.
    line(g,[[x-12,.015,-1],[x-12,.015,27],[x+11,.015,27],[x+11,.015,-1]]);
    line(g,[[x,.02,26],[x,.02,5]]);
    vehicle(g,x-7,10,2);
  }
  // Tower, right of the terminal and behind the apron.
  const tower=new THREE.Group();tower.position.set(47,0,-65);g.add(tower);
  box(tower,[24,4.5,13],[0,2.25,0]);glazing(tower,-12,1,6.51,24,3,12);
  cylinder(tower,2.5,3,20,[0,10,0],undefined,8);
  cylinder(tower,5,2.5,4,[0,22,0],undefined,8);
  cylinder(tower,5.8,5,3.5,[0,25.75,0],undefined,8);
  cylinder(tower,6,6,.35,[0,27.7,0],undefined,8);
  cylinder(tower,3,3,1.1,[0,28.4,0],undefined,8);
  cylinder(tower,.08,.08,4,[0,31,0]);
  box(tower,[3,.12,.4],[0,31.6,0]);
  // Hangar: separate side/back walls, truly open front, roof and door trusses.
  const hangar=new THREE.Group();hangar.position.set(76,0,-78);g.add(hangar);
  box(hangar,[.4,12,28],[-18,6,0]);box(hangar,[.4,12,28],[18,6,0]);box(hangar,[36,12,.4],[0,6,-14]);
  const roof=polygon(hangar,[[-19,12],[0,15],[19,12],[19,11.7],[0,14.7],[-19,11.7]],29);roof.position.z=-14.5;
  for(const x of [-15,-11,11,15]) {
    box(hangar,[3.8,11,.25],[x,5.5,14]);
    line(hangar,[[x-1.8,0,14.2],[x+1.8,11,14.2],[x-1.8,11,14.2],[x+1.8,0,14.2]]);
  }
  line(hangar,[[-18,11,14.3],[18,11,14.3]]);
  for(let x=-16;x<18;x+=4) line(hangar,[[x,11,14.3],[x+2,12.5,14.3],[x+4,11,14.3]]);
  // Runway and parallel taxiway extend far beyond the frame.
  for(const z of [-111,-93,-83,43,57]) line(g,[[-1500,.02,z],[1500,.02,z]]);
  for(let x=-500;x<500;x+=14) line(g,[[x,.025,-102],[x+7,.025,-102]]);
  for(let x=-500;x<500;x+=10) line(g,[[x,.025,50],[x+4,.025,50]]);
  for(const z of [-108,-96]) for(let x=-140;x<-110;x+=4) line(g,[[x,.025,z],[x+2,.025,z]]);
  // Broad curved taxiway connector, drawn as intentional contours.
  for(const offset of [-7,0,7]) {
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-170,.03,50+offset),new THREE.Vector3(45,.03,50+offset),new THREE.Vector3(95+offset,.03,32),new THREE.Vector3(105+offset,.03,-37),new THREE.Vector3(135,.03,-83+offset),new THREE.Vector3(240,.03,-83+offset)]);
    const points=curve.getPoints(180).map(p=>p.toArray());
    if(offset) line(g,points); else for(let i=0;i<points.length-3;i+=6)line(g,points.slice(i,i+3));
  }
  for(const [x,z] of [[-82,-5],[-35,-12],[15,-24],[72,-51]]) {
    cylinder(g,.12,.2,19,[x,9.5,z]);box(g,[3,.2,1.2],[x,19,z]);
    for(let j=-1;j<=1;j++) box(g,[.6,.45,.8],[x+j,18.8,z]);
    box(g,[1,.12,1],[x,.06,z]);
  }
  vehicle(g,1,19);vehicle(g,-40,32,3);
  return g;
}

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './robot-scene.css';

export type RobotPhase = 'idle' | 'selected' | 'reaching' | 'done';
export type RobotMoment = 'medicine' | 'mug' | 'water' | 'phone';

type RobotSceneProps = {
  phase?: RobotPhase;
  moment?: RobotMoment;
  onComplete?: () => void;
  interactive?: boolean;
  onSelect?: () => void;
  className?: string;
};

type SceneControl = { setPhase: (phase: RobotPhase) => void; dispose: () => void };
const objectNames: Record<RobotMoment, string> = {
  medicine: 'pills', mug: 'mug', water: 'water bottle', phone: 'phone',
};
const DURATION = 4200;
const MEDICINE_DURATION = 12000;
const smooth = (value: number) => {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
};

/** A procedural visual explanation, not a dimensional CAD file or robot controller. */
function createScene(host: HTMLDivElement, moment: RobotMoment, complete: () => void, selection: { allowed: () => boolean; select: () => void }): SceneControl {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3.5, 3.5, 2.65, -2.65, 0.1, 40);
  camera.position.set(5.6, 4.4, 6.8);
  camera.lookAt(-0.05, moment === 'medicine' ? 0.61 : 0.7, moment === 'medicine' ? 0.17 : 0.04);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const geometry = <T extends THREE.BufferGeometry,>(value: T): T => { geometries.add(value); return value; };
  const material = (color: THREE.ColorRepresentation, roughness = 0.75, metalness = 0) => {
    const result = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    materials.add(result);
    return result;
  };
  const printed = material('#292d2b', 0.85);
  const motor = material('#101714', 0.62, 0.1);
  const motorFace = material('#424941', 0.62, 0.18);
  const metal = material('#a8aaa0', 0.35, 0.65);
  const rubber = material('#151c18', 0.95);
  const deskMaterial = material('#e4daca', 0.96);
  const edgeMaterial = material('#cec3b0', 0.93);
  const cableRed = material('#733d31', 0.65);
  const cableCream = material('#b6ad93', 0.75);
  const sage = material('#728875', 0.8);
  const ceramic = material('#c5c9bb', 0.48);
  const objectMaterial = moment === 'medicine' ? material('#6798ab', 0.68) : moment === 'mug' ? ceramic : moment === 'water' ? sage : material('#151d18', 0.55);

  const mesh = (shape: THREE.BufferGeometry, paint: THREE.Material, parent: THREE.Object3D = scene) => {
    const item = new THREE.Mesh(geometry(shape), paint);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  };
  const box = (size: [number, number, number], paint: THREE.Material, parent: THREE.Object3D, position: [number, number, number]) => {
    const item = mesh(new THREE.BoxGeometry(...size), paint, parent);
    item.position.set(...position);
    return item;
  };
  const cylinder = (radius: number, depth: number, paint: THREE.Material, parent: THREE.Object3D, position: [number, number, number], axis: 'y' | 'z' = 'y') => {
    const item = mesh(new THREE.CylinderGeometry(radius, radius, depth, 32), paint, parent);
    item.position.set(...position);
    if (axis === 'z') item.rotation.x = Math.PI / 2;
    return item;
  };
  const cable = (points: [number, number, number][], paint: THREE.Material, parent: THREE.Object3D, radius = 0.014) => {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    return mesh(new THREE.TubeGeometry(curve, 24, radius, 5, false), paint, parent);
  };
  const roundedPlate = (width: number, depth: number, height: number, paint: THREE.Material, parent: THREE.Object3D, position: [number, number, number], radius = 0.035) => {
    const outline = new THREE.Shape();
    const x = -width / 2;
    const y = -depth / 2;
    outline.moveTo(x + radius, y);
    outline.lineTo(x + width - radius, y);
    outline.quadraticCurveTo(x + width, y, x + width, y + radius);
    outline.lineTo(x + width, y + depth - radius);
    outline.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
    outline.lineTo(x + radius, y + depth);
    outline.quadraticCurveTo(x, y + depth, x, y + depth - radius);
    outline.lineTo(x, y + radius);
    outline.quadraticCurveTo(x, y, x + radius, y);
    const shape = new THREE.ExtrudeGeometry(outline, { depth: height, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.004, bevelSegments: 2, steps: 1, curveSegments: 5 });
    shape.rotateX(-Math.PI / 2);
    const plate = mesh(shape, paint, parent);
    plate.position.set(...position);
    return plate;
  };

  // Unmarked geometric tablets are illustrative objects, without medication or dose data.
  const tabletWhite = material('#f4eee0', 0.75);
  const tabletBlue = material('#9dbcc5', 0.68);
  const tabletOchre = material('#d5b776', 0.7);
  const capsule = (parent: THREE.Object3D, position: [number, number, number], paint: THREE.Material, scale = 1, rotation = 0) => {
    const pill = mesh(new THREE.CapsuleGeometry(0.028 * scale, 0.075 * scale, 4, 14), paint, parent);
    pill.rotation.z = Math.PI / 2;
    pill.rotation.y = rotation;
    pill.position.set(...position);
    return pill;
  };

  scene.add(new THREE.HemisphereLight('#fff8e9', '#8b9489', 3));
  const key = new THREE.DirectionalLight('#fff5df', 4.1);
  key.position.set(-3, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.normalBias = 0.025;
  key.shadow.bias = -0.0002;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#e4ede9', 1.3);
  fill.position.set(4, 3, -4);
  scene.add(fill);

  // A finite desk makes the tabletop mounting and near-side delivery location clear.
  const deskDepth = moment === 'medicine' ? 2.60 : 3.18;
  const deskZ = moment === 'medicine' ? -0.40 : 0;
  box([5.65, 0.14, deskDepth], edgeMaterial, scene, [0, -0.13, deskZ]);
  box([5.65, 0.055, deskDepth], deskMaterial, scene, [0, -0.035, deskZ]);
  let medicineLid: THREE.Group | null = null;
  const medicineOrganizerPosition = new THREE.Vector3(0.65, 0.015, -0.75);
  const bedsideCenter = new THREE.Vector3(-0.45, 0.015, 1.50);

  if (moment !== 'medicine') {
    const mat = box([1.06, 0.012, 0.84], material('#d1c9b7'), scene, [0.3, 0.002, 1.03]);
    mat.receiveShadow = true;
  }

  if (moment === 'medicine') {
    // A separate, legged bedside table sits across a visible gap from the main desk.
    const bedside = new THREE.Group();
    bedside.name = 'Separate bedside table';
    bedside.position.set(bedsideCenter.x, 0, bedsideCenter.z);
    scene.add(bedside);
    const bedsideWood = material('#8c9d8e', 0.85);
    const bedsideTop = material('#c1cdbf', 0.8);
    roundedPlate(1.37, 0.86, 0.11, bedsideWood, bedside, [0, -0.105, 0], 0.06);
    roundedPlate(1.36, 0.85, 0.018, bedsideTop, bedside, [0, 0.005, 0], 0.06);
    for (const x of [-0.51, 0.51]) for (const z of [-0.27, 0.27]) {
      box([0.10, 0.79, 0.10], bedsideWood, bedside, [x, -0.49, z]);
    }
    box([0.92, 0.05, 0.06], bedsideWood, bedside, [0, -0.62, 0.27]);
    const dish = new THREE.Group();
    dish.name = 'Shallow bedside dish';
    dish.position.set(0, 0.027, 0);
    bedside.add(dish);
    const dishProfile = [new THREE.Vector2(0, 0), new THREE.Vector2(0.24, 0), new THREE.Vector2(0.30, 0.065), new THREE.Vector2(0.30, 0.085), new THREE.Vector2(0.277, 0.085), new THREE.Vector2(0.222, 0.026), new THREE.Vector2(0, 0.026)];
    mesh(new THREE.LatheGeometry(dishProfile, 48), material('#eeeade', 0.5), dish);

    const organizer = new THREE.Group();
    organizer.name = 'Seven-compartment weekly pill organizer';
    organizer.position.copy(medicineOrganizerPosition);
    scene.add(organizer);
    const organizerPlastic = material('#a4c3b7', 0.48);
    const organizerFloor = material('#d7e3d9', 0.55);
    const hingePlastic = material('#d8e5da', 0.42);
    const lidPlastic = new THREE.MeshStandardMaterial({ color: '#b9d5c6', roughness: 0.34, metalness: 0, transparent: true, opacity: 0.76, depthWrite: false });
    materials.add(lidPlastic);
    const slotWidth = 0.34;
    const trayWidth = slotWidth * 7 + 0.06;
    roundedPlate(trayWidth, 0.65, 0.045, organizerPlastic, organizer, [0, 0.01, 0]);
    box([trayWidth - 0.025, 0.18, 0.026], organizerPlastic, organizer, [0, 0.14, -0.29]);
    box([trayWidth - 0.025, 0.18, 0.026], organizerPlastic, organizer, [0, 0.14, 0.29]);
    for (let boundary = 0; boundary <= 7; boundary += 1) {
      box([0.023, 0.18, 0.58], organizerPlastic, organizer, [(boundary - 3.5) * slotWidth, 0.14, 0]);
    }
    const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    weekdays.forEach((day, index) => {
      const x = (index - 3) * slotWidth;
      roundedPlate(slotWidth - 0.037, 0.53, 0.013, organizerFloor, organizer, [x, 0.058, 0], 0.025);
      // The selected compartment gets two separate animated pills below.
      if (index !== 2) {
        capsule(organizer, [x - 0.045, 0.105, -0.065], tabletWhite, 0.78, -0.28);
        const tablet = cylinder(0.039, 0.018, index % 2 ? tabletOchre : tabletBlue, organizer, [x + 0.061, 0.092, 0.07]);
        tablet.rotation.z = 0.12;
      }
      const hinge = cylinder(0.028, slotWidth - 0.075, hingePlastic, organizer, [x, 0.229, -0.293]);
      hinge.rotation.z = Math.PI / 2;
      const lid = new THREE.Group();
      lid.name = `${day} hinged lid`;
      lid.position.set(x, 0.225, -0.293);
      lid.rotation.x = 0;
      if (index === 2) medicineLid = lid;
      organizer.add(lid);
      roundedPlate(slotWidth - 0.014, 0.598, 0.018, lidPlastic, lid, [0, 0, 0.291], 0.025);
      box([0.11, 0.035, 0.052], hingePlastic, lid, [0, 0.005, 0.604]);

      const label = document.createElement('canvas');
      label.width = 192;
      label.height = 96;
      const context = label.getContext('2d');
      if (context) {
        context.clearRect(0, 0, label.width, label.height);
        context.fillStyle = '#2d5145';
        context.font = '700 50px Arial, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(day, 96, 49);
        const texture = new THREE.CanvasTexture(label);
        texture.colorSpace = THREE.SRGBColorSpace;
        textures.add(texture);
        const labelMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
        materials.add(labelMaterial);
        const dayLabel = mesh(new THREE.PlaneGeometry(0.27, 0.135), labelMaterial, lid);
        dayLabel.rotation.x = -Math.PI / 2;
        dayLabel.position.set(0, 0.027, 0.29);
        dayLabel.castShadow = false;
      }
    });
  }

  const base = new THREE.Group();
  base.position.set(-1.5, 0.01, -0.38);
  scene.add(base);
  box([0.69, 0.085, 0.58], printed, base, [0, 0.045, 0]);
  for (const x of [-0.25, 0.25]) for (const z of [-0.21, 0.21]) {
    cylinder(0.039, 0.01, motor, base, [x, 0.093, z]);
    cylinder(0.019, 0.014, metal, base, [x, 0.099, z]);
  }
  // Visible servo body, base turntable and rear controller plate.
  box([0.34, 0.36, 0.34], motor, base, [0, 0.29, 0]);
  box([0.37, 0.045, 0.36], motorFace, base, [0, 0.46, 0]);
  cylinder(0.20, 0.08, printed, base, [0, 0.50, 0]);
  box([0.30, 0.08, 0.17], printed, base, [-0.31, 0.13, -0.07]);
  cable([[-0.32, 0.16, -0.06], [-0.56, 0.08, -0.15], [-0.68, 0.035, -0.53], [-0.95, 0.035, -0.67]], rubber, base, 0.025);

  const swivel = new THREE.Group();
  swivel.position.y = 0.57;
  base.add(swivel);
  const shoulder = new THREE.Group();
  swivel.add(shoulder);
  const length1 = 1.21;
  const length2 = 1.13;
  const elbow = new THREE.Group();
  elbow.position.x = length1;
  shoulder.add(elbow);
  const wrist = new THREE.Group();
  wrist.position.x = length2;
  elbow.add(wrist);

  function joint(parent: THREE.Object3D, smaller = false) {
    const scale = smaller ? 0.8 : 1;
    box([0.30 * scale, 0.33 * scale, 0.32], motor, parent, [0.02, -0.025, 0]);
    box([0.06, 0.25 * scale, 0.34], motorFace, parent, [-0.13 * scale, -0.025, 0]);
    for (const sign of [-1, 1]) {
      cylinder(0.137 * scale, 0.045, printed, parent, [0, 0, sign * 0.205], 'z');
      cylinder(0.075 * scale, 0.018, metal, parent, [0, 0, sign * 0.236], 'z');
      cylinder(0.033, 0.021, motor, parent, [0, 0, sign * 0.248], 'z');
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        cylinder(0.012, 0.023, metal, parent, [Math.cos(angle) * 0.101 * scale, Math.sin(angle) * 0.101 * scale, sign * 0.239], 'z');
      }
    }
  }

  function bracket(length: number, parent: THREE.Object3D) {
    const outline = new THREE.Shape();
    const r = 0.16;
    outline.moveTo(0, -r);
    outline.lineTo(length, -r);
    outline.absarc(length, 0, r, -Math.PI / 2, Math.PI / 2, false);
    outline.lineTo(0, r);
    outline.absarc(0, 0, r, Math.PI / 2, Math.PI * 1.5, false);
    for (const x of [0, length]) {
      const hole = new THREE.Path();
      hole.absarc(x, 0, 0.081, 0, Math.PI * 2, true);
      outline.holes.push(hole);
    }
    for (let x = 0.3; x < length - 0.18; x += 0.22) {
      const hole = new THREE.Path();
      hole.absarc(x, 0, 0.033, 0, Math.PI * 2, true);
      outline.holes.push(hole);
    }
    const shape = geometry(new THREE.ExtrudeGeometry(outline, { depth: 0.057, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.012, bevelThickness: 0.012, curveSegments: 10 }));
    for (const sign of [-1, 1]) {
      const side = new THREE.Mesh(shape, printed);
      side.position.z = sign < 0 ? -0.218 : 0.161;
      side.castShadow = true;
      side.receiveShadow = true;
      parent.add(side);
    }
    box([0.18, 0.20, 0.36], printed, parent, [length * 0.45, 0, 0]);
    for (const [offset, paint] of [[-0.035, cableRed], [0, rubber], [0.035, cableCream]] as const) {
      cable([[0.08, 0.1, offset], [0.23, 0.20, offset], [length * 0.6, 0.18, offset], [length - 0.09, 0.11, offset]], paint, parent, 0.012);
    }
  }
  joint(shoulder);
  bracket(length1, shoulder);
  joint(elbow);
  bracket(length2, elbow);
  joint(wrist, true);

  const gripper = new THREE.Group();
  wrist.add(gripper);
  // The wrist coupler, jaw guide and sliding carriages form one continuous
  // assembly. Each jaw overlaps its guide at both the open and closed limits.
  box([0.20, 0.24, 0.29], printed, gripper, [0.035, -0.015, 0]);
  box([0.24, 0.22, 0.25], motor, gripper, [0.13, -0.015, 0]);
  box([0.11, 0.25, 0.76], printed, gripper, [0.26, 0, 0]);
  box([0.035, 0.035, 0.72], metal, gripper, [0.325, 0.065, 0]);
  for (const z of [-0.36, 0.36]) {
    box([0.15, 0.27, 0.055], printed, gripper, [0.27, 0, z]);
  }
  const fingers: THREE.Group[] = [];
  for (const sign of [-1, 1]) {
    const finger = new THREE.Group();
    gripper.add(finger);
    box([0.14, 0.20, 0.115], motorFace, finger, [0.30, -0.015, 0]);
    box([moment === 'medicine' ? 0.35 : 0.44, 0.11, 0.064], printed, finger, [moment === 'medicine' ? 0.43 : 0.48, -0.015, 0]);
    box([moment === 'medicine' ? 0.09 : 0.17, moment === 'medicine' ? 0.10 : 0.145, 0.025], rubber, finger, [0.58, -0.02, -sign * 0.04]);
    for (const x of [0.35, 0.43]) cylinder(0.016, 0.12, metal, finger, [x, -0.015, 0]);
    fingers.push(finger);
  }

  const object = new THREE.Group();
  object.name = objectNames[moment];
  scene.add(object);
  let secondPill: THREE.Group | null = null;
  let gripHeight = 0.19;
  let jawWidth = 0.244;
  if (moment === 'medicine') {
    gripHeight = 0;
    jawWidth = 0.10;
    const twoTonePill = (parent: THREE.Object3D, first: THREE.Material, second: THREE.Material) => {
      const radius = 0.047;
      const barrelLength = 0.12;
      for (const [sign, paint] of [[-1, first], [1, second]] as const) {
        const barrel = cylinder(radius, barrelLength / 2, paint, parent, [sign * barrelLength / 4, 0, 0]);
        barrel.rotation.z = Math.PI / 2;
        const end = mesh(new THREE.SphereGeometry(radius, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), paint, parent);
        end.rotation.z = -sign * Math.PI / 2;
        end.position.x = sign * barrelLength / 2;
      }
    };
    twoTonePill(object, objectMaterial, tabletWhite);
    secondPill = new THREE.Group();
    secondPill.name = 'Second illustrative pill';
    scene.add(secondPill);
    twoTonePill(secondPill, tabletWhite, tabletOchre);
  } else if (moment === 'mug') {
    const profile = [new THREE.Vector2(0, 0.015), new THREE.Vector2(0.165, 0.015), new THREE.Vector2(0.19, 0.05), new THREE.Vector2(0.20, 0.34), new THREE.Vector2(0.175, 0.34), new THREE.Vector2(0.16, 0.075), new THREE.Vector2(0, 0.075)];
    mesh(new THREE.LatheGeometry(profile, 40), ceramic, object);
    const handle = mesh(new THREE.TorusGeometry(0.105, 0.027, 12, 30), ceramic, object);
    handle.position.set(0.21, 0.21, 0);
    cylinder(0.167, 0.006, material('#73563c', 0.35), object, [0, 0.275, 0]);
  } else if (moment === 'water') {
    gripHeight = 0.28;
    jawWidth = 0.204;
    const profile = [new THREE.Vector2(0, 0.015), new THREE.Vector2(0.145, 0.015), new THREE.Vector2(0.15, 0.04), new THREE.Vector2(0.15, 0.43), new THREE.Vector2(0.095, 0.52), new THREE.Vector2(0.087, 0.58), new THREE.Vector2(0, 0.58)];
    mesh(new THREE.LatheGeometry(profile, 36), sage, object);
    cylinder(0.091, 0.065, motorFace, object, [0, 0.585, 0]);
    cylinder(0.153, 0.18, material('#a1ae9b'), object, [0, 0.25, 0]);
  } else {
    gripHeight = 0.14;
    jawWidth = 0.178;
    box([0.45, 0.065, 0.245], objectMaterial, object, [0, 0.047, 0]);
    box([0.41, 0.006, 0.208], material('#9daea4', 0.3), object, [0, 0.083, 0]);
    box([0.035, 0.008, 0.053], motor, object, [0.165, 0.088, 0]);
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pointsAtObject = (event: MouseEvent | PointerEvent) => {
    if (!selection.allowed() || (event.target instanceof Element && event.target.closest('button'))) return false;
    const rect = host.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const targets: THREE.Object3D[] = [object];
    if (secondPill) targets.push(secondPill);
    if (medicineLid) targets.push(medicineLid);
    return raycaster.intersectObjects(targets, true).length > 0;
  };
  const onPointerMove = (event: PointerEvent) => { host.style.cursor = pointsAtObject(event) ? 'pointer' : ''; };
  const onPointerLeave = () => { host.style.cursor = ''; };
  const onObjectClick = (event: MouseEvent) => { if (pointsAtObject(event)) selection.select(); };
  host.addEventListener('pointermove', onPointerMove);
  host.addEventListener('pointerleave', onPointerLeave);
  host.addEventListener('click', onObjectClick);

  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#73917c', transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false });
  materials.add(markerMaterial);
  const marker = mesh(new THREE.RingGeometry(moment === 'medicine' ? 0.32 : 0.34, moment === 'medicine' ? 0.335 : 0.354, 64), markerMaterial);
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(moment === 'medicine' ? 0.31 : 0.88, moment === 'medicine' ? 0.264 : 0.015, moment === 'medicine' ? -0.75 : 0.08);
  marker.visible = false;
  marker.castShadow = false;

  const start = new THREE.Vector3(0.88, 0, 0.08);
  const destination = new THREE.Vector3(0.3, 0.014, 1.03);
  const rest = new THREE.Vector3(0.12, 1.40, -0.29);
  const pick = start.clone().add(new THREE.Vector3(0, gripHeight, 0));
  const lift = pick.clone().add(new THREE.Vector3(0, 0.58, 0));
  const put = destination.clone().add(new THREE.Vector3(0, gripHeight, 0));
  const carry = put.clone().add(new THREE.Vector3(0, 0.58, 0));
  const retreat = put.clone().add(new THREE.Vector3(0, 0.34, 0));
  const hand = new THREE.Vector3();
  const segment = (from: THREE.Vector3, to: THREE.Vector3, time: number, a: number, b: number) => hand.copy(from).lerp(to, smooth((time - a) / (b - a)));

  function positionArm(target: THREE.Vector3, closed: number, wristTilt = 0, gripAperture = jawWidth) {
    // Solve in the arm's vertical plane, then rotate the base towards that plane.
    const dx = target.x - base.position.x;
    const dz = target.z - base.position.z;
    const radius = Math.hypot(dx, dz);
    // Target the center of the contact pads, measured from the wrist pivot.
    const padOffsetY = moment === 'medicine' ? -0.02 : 0;
    const distance = Math.max(0.12, radius - (0.58 * Math.cos(wristTilt) - padOffsetY * Math.sin(wristTilt)));
    const height = target.y - (base.position.y + swivel.position.y) - (0.58 * Math.sin(wristTilt) + padOffsetY * Math.cos(wristTilt));
    const reach = Math.min(length1 + length2 - 0.012, Math.hypot(distance, height));
    const q2 = -Math.acos(THREE.MathUtils.clamp((reach * reach - length1 * length1 - length2 * length2) / (2 * length1 * length2), -1, 1));
    const q1 = Math.atan2(height, distance) - Math.atan2(length2 * Math.sin(q2), length1 + length2 * Math.cos(q2));
    swivel.rotation.y = -Math.atan2(dz, dx);
    shoulder.rotation.z = q1;
    elbow.rotation.z = q2;
    wrist.rotation.z = -q1 - q2 + wristTilt;
    // A narrow approach clears the compartment walls before the pads close on a pill.
    const openAperture = moment === 'medicine' ? THREE.MathUtils.lerp(0.20, 0.14, Math.abs(Math.sin(wristTilt))) : 0.29;
    const aperture = THREE.MathUtils.lerp(openAperture, gripAperture, closed);
    fingers[0].position.z = -aperture;
    fingers[1].position.z = aperture;
  }

  const pillStarts = [new THREE.Vector3(0.265, 0.138, -0.835), new THREE.Vector3(0.35, 0.138, -0.655)];
  const pillDestinations = [new THREE.Vector3(-0.53, 0.102, 1.54), new THREE.Vector3(-0.37, 0.102, 1.46)];
  const pillAbove = pillStarts.map(point => point.clone().add(new THREE.Vector3(0, 0.55, 0)));
  const dishAbove = pillDestinations.map(point => point.clone().add(new THREE.Vector3(0, 0.45, 0)));
  const medicineRetreat = pillDestinations[1].clone().add(new THREE.Vector3(0, 0.36, 0));
  const lidHandle = new THREE.Vector3();
  // Fold the lid behind the organizer to clear the gripper crossbar on descent.
  const lidOpenAngle = 2.60;

  function handlePosition(angle: number) {
    return lidHandle.set(0.31, 0.24 + 0.005 * Math.cos(angle) + 0.604 * Math.sin(angle), -1.043 - 0.005 * Math.sin(angle) + 0.604 * Math.cos(angle));
  }

  function poseMedicine(time: number, selected: boolean) {
    if (!medicineLid || !secondPill) return;
    const opening = smooth((time - 0.14) / 0.14);
    const angle = lidOpenAngle * opening;
    medicineLid.rotation.x = -angle;
    let closed = 0;
    let wristTilt = 0;
    let stage = 'ready';
    if (time <= 0) hand.copy(rest);
    else if (time < 0.10) { segment(rest, handlePosition(0), time, 0, 0.10); stage = 'approaching-lid'; }
    else if (time < 0.14) { hand.copy(handlePosition(0)); closed = smooth((time - 0.10) / 0.04); stage = 'grasping-lid'; }
    else if (time < 0.28) { hand.copy(handlePosition(angle)); closed = 1; stage = 'opening-compartment'; }
    else if (time < 0.31) { hand.copy(handlePosition(lidOpenAngle)); closed = 1 - smooth((time - 0.28) / 0.03); stage = 'releasing-lid'; }
    else if (time < 0.36) {
      segment(handlePosition(lidOpenAngle), pillAbove[0], time, 0.31, 0.36);
      wristTilt = -Math.PI / 2 * smooth((time - 0.31) / 0.05);
      stage = 'approaching-first-pill';
    } else {
      wristTilt = -Math.PI / 2;
      if (time < 0.40) { segment(pillAbove[0], pillStarts[0], time, 0.36, 0.40); stage = 'approaching-first-pill'; }
      else if (time < 0.44) { hand.copy(pillStarts[0]); closed = smooth((time - 0.40) / 0.04); stage = 'grasping-first-pill'; }
      else if (time < 0.49) { segment(pillStarts[0], pillAbove[0], time, 0.44, 0.49); closed = 1; stage = 'lifting-first-pill'; }
      else if (time < 0.57) { segment(pillAbove[0], dishAbove[0], time, 0.49, 0.57); closed = 1; stage = 'carrying-first-pill'; }
      else if (time < 0.61) { segment(dishAbove[0], pillDestinations[0], time, 0.57, 0.61); closed = 1; stage = 'lowering-first-pill'; }
      else if (time < 0.64) { hand.copy(pillDestinations[0]); closed = 1 - smooth((time - 0.61) / 0.03); stage = 'releasing-first-pill'; }
      else if (time < 0.68) { segment(pillDestinations[0], dishAbove[0], time, 0.64, 0.68); stage = 'returning-for-second-pill'; }
      else if (time < 0.74) { segment(dishAbove[0], pillAbove[1], time, 0.68, 0.74); stage = 'returning-for-second-pill'; }
      else if (time < 0.78) { segment(pillAbove[1], pillStarts[1], time, 0.74, 0.78); stage = 'approaching-second-pill'; }
      else if (time < 0.82) { hand.copy(pillStarts[1]); closed = smooth((time - 0.78) / 0.04); stage = 'grasping-second-pill'; }
      else if (time < 0.86) { segment(pillStarts[1], pillAbove[1], time, 0.82, 0.86); closed = 1; stage = 'lifting-second-pill'; }
      else if (time < 0.93) { segment(pillAbove[1], dishAbove[1], time, 0.86, 0.93); closed = 1; stage = 'carrying-second-pill'; }
      else if (time < 0.96) { segment(dishAbove[1], pillDestinations[1], time, 0.93, 0.96); closed = 1; stage = 'lowering-second-pill'; }
      else if (time < 0.98) { hand.copy(pillDestinations[1]); closed = 1 - smooth((time - 0.96) / 0.02); stage = 'releasing-second-pill'; }
      else { segment(pillDestinations[1], medicineRetreat, time, 0.98, 1); stage = time >= 1 ? 'complete' : 'retracting'; }
    }
    positionArm(hand, closed, wristTilt, time < 0.31 ? 0.08 : jawWidth);
    const pills = [object, secondPill];
    pills.forEach((pill, index) => {
      const pickup = index === 0 ? 0.44 : 0.82;
      const release = index === 0 ? 0.61 : 0.96;
      const carrying = time >= pickup && time < release;
      const restingPlace = time >= release ? pillDestinations[index] : pillStarts[index];
      pill.position.copy(carrying ? hand : restingPlace);
      pill.rotation.y = carrying ? swivel.rotation.y : -Math.atan2(restingPlace.z - base.position.z, restingPlace.x - base.position.x);
    });
    marker.visible = selected;
    objectMaterial.emissive.set(selected ? '#14251b' : '#000000');
    host.dataset.medicineStage = stage;
    host.dataset.deliveredPills = String(time >= 0.96 ? 2 : time >= 0.61 ? 1 : 0);
    host.dataset.compartmentOpen = opening.toFixed(3);
    renderer.render(scene, camera);
  }

  function pose(time: number, selected = false) {
    host.dataset.animationProgress = time.toFixed(3);
    if (moment === 'medicine') {
      poseMedicine(time, selected);
      return;
    }
    delete host.dataset.medicineStage;
    delete host.dataset.deliveredPills;
    delete host.dataset.compartmentOpen;
    let closed = 0;
    if (time <= 0) hand.copy(rest);
    else if (time < 0.25) segment(rest, pick, time, 0, 0.25);
    else if (time < 0.35) { hand.copy(pick); closed = smooth((time - 0.25) / 0.10); }
    else if (time < 0.49) { segment(pick, lift, time, 0.35, 0.49); closed = 1; }
    else if (time < 0.76) { segment(lift, carry, time, 0.49, 0.76); closed = 1; }
    else if (time < 0.86) { segment(carry, put, time, 0.76, 0.86); closed = 1; }
    else if (time < 0.94) { hand.copy(put); closed = 1 - smooth((time - 0.86) / 0.08); }
    else segment(put, retreat, time, 0.94, 1);
    positionArm(hand, closed);
    object.position.copy(time < 0.35 ? start : time >= 0.86 ? destination : hand).y -= time >= 0.35 && time < 0.86 ? gripHeight : 0;
    // The object follows the wrist plane during transport, keeping it inside the jaws.
    object.rotation.y = time >= 0.35 && time < 0.86 ? swivel.rotation.y : time >= 0.86 ? -Math.atan2(destination.z - base.position.z, destination.x - base.position.x) : 0;
    marker.visible = selected;
    objectMaterial.emissive.set(selected ? '#14251b' : '#000000');
    renderer.render(scene, camera);
  }

  let frame = 0;
  let destroyed = false;
  let activePhase: RobotPhase = 'idle';
  let progress = 0;
  let finished = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const resize = () => {
    if (destroyed) return;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    const aspect = width / height;
    // Keep the whole desk and gripper in frame, including narrow responsive layouts.
    const halfHeight = Math.max(moment === 'medicine' ? 2.48 : 2.20, (moment === 'medicine' ? 3.5 : 3.25) / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    pose(progress, activePhase === 'selected');
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const finish = () => {
    if (destroyed || finished) return;
    finished = true;
    complete();
  };
  const setPhase = (phase: RobotPhase) => {
    cancelAnimationFrame(frame);
    activePhase = phase;
    finished = false;
    if (phase !== 'reaching') {
      progress = phase === 'done' ? 1 : 0;
      pose(progress, phase === 'selected');
      return;
    }
    if (reducedMotion.matches) {
      progress = 1;
      pose(1);
      frame = requestAnimationFrame(finish);
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      if (destroyed || activePhase !== 'reaching') return;
      progress = Math.min((now - started) / (moment === 'medicine' ? MEDICINE_DURATION : DURATION), 1);
      pose(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    progress = 0;
    frame = requestAnimationFrame(tick);
  };
  const onMotionPreference = () => {
    if (activePhase === 'reaching' && reducedMotion.matches) {
      cancelAnimationFrame(frame);
      progress = 1;
      pose(1);
      frame = requestAnimationFrame(finish);
    }
  };
  reducedMotion.addEventListener('change', onMotionPreference);

  return {
    setPhase,
    dispose() {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      host.removeEventListener('click', onObjectClick);
      host.style.cursor = '';
      reducedMotion.removeEventListener('change', onMotionPreference);
      geometries.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
      textures.forEach(item => item.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}

export default function RobotScene({ phase = 'idle', moment = 'mug', onComplete, interactive = false, onSelect, className = '' }: RobotSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<SceneControl | null>(null);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  const interaction = useRef({ interactive, onSelect, phase });
  interaction.current = { interactive, onSelect, phase };
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    let control: SceneControl | undefined;
    try {
      control = createScene(host.current, moment, () => complete.current?.(), {
        allowed: () => interaction.current.interactive && !!interaction.current.onSelect && (interaction.current.phase === 'idle' || interaction.current.phase === 'selected'),
        select: () => interaction.current.onSelect?.(),
      });
      scene.current = control;
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    }
    return () => { control?.dispose(); scene.current = null; };
  }, [moment]);

  useEffect(() => { scene.current?.setPhase(phase); }, [phase, moment]);

  // WebGL failure should preserve the surrounding guided interaction.
  useEffect(() => {
    if (!unavailable || phase !== 'reaching') return;
    const timeout = window.setTimeout(() => complete.current?.(), 0);
    return () => window.clearTimeout(timeout);
  }, [unavailable, phase, moment]);

  const name = objectNames[moment];
  const description = moment === 'medicine'
    ? `Interactive concept model of an SO-101-inspired arm beside a seven-compartment weekly pill organizer with labeled hinged lids. After confirmation, the connected gripper opens one compartment and carries two illustrative capsules, one at a time, into a shallow dish on a separate bedside table. ${phase === 'done' ? 'Both capsules are now in the bedside dish and the compartment remains open.' : phase === 'reaching' ? 'The opening and transfer sequence is in progress.' : 'The arm is stationary and the compartment is closed.'} This is a visual concept, without medication selection or dosing logic.`
    : `Interactive concept model of an SO-101-inspired arm fixed to a desk beside a ${name}. The arm has black printed brackets, visible servo motors, cables and a two-finger gripper. ${phase === 'done' ? `The ${name} is now on the near side of the desk.` : phase === 'reaching' ? `The arm is moving the ${name} to the near side.` : 'The arm is stationary.'}`;
  return <figure className={`robot-scene ${className}`} data-phase={phase} data-moment={moment}>
    <div ref={host} className="robot-scene-viewport">
      <span className="robot-scene-description" role="img" aria-label={description} />
      {unavailable && <div className="robot-scene-fallback"><span className="robot-scene-fallback-mark" aria-hidden="true">⌁</span><p>The 3D preview is unavailable in this browser.</p><span>You can still use the guided demo.</span></div>}
      {interactive && onSelect && (phase === 'idle' || phase === 'selected') && <button className="robot-scene-select" type="button" onClick={onSelect} aria-label={`Select the ${name}`} aria-pressed={phase === 'selected'}>{phase === 'selected' ? `${name.charAt(0).toUpperCase() + name.slice(1)} selected` : `Select the ${name}`}<span aria-hidden="true">↗</span></button>}
    </div>
    <figcaption><span>SO-101 concept model</span><span>Illustrative simulation</span></figcaption>
  </figure>;
}

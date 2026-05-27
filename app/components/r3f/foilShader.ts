import * as THREE from "three";

/**
 * Shader de foil holographique (fresnel sur la normale 3D réelle) — partagé.
 * Utilisé par :
 *  - la Voie A statique ([HoloCard3D.tsx]) : plan de foil collé sur la <CardFront> DOM, blend CSS `screen` ;
 *  - l'approche A « texture bakée » du château : superposé en `AdditiveBlending` sur la carte texturée.
 *
 * Sortie pensée pour un blend additif/screen : le noir n'ajoute rien, le foil éclaircit.
 */

export const FOIL_DEFAULTS = { foil: 0.9, fresnel: 2.4, bands: 3 } as const;

export const FOIL_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const FOIL_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uFoil;
  uniform float uFresnel;
  uniform float uBands;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;

  vec3 hue2rgb(float h) {
    vec3 c = abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0;
    return clamp(c, 0.0, 1.0);
  }

  void main() {
    // Angle de vue RÉEL : la normale tourne avec le tilt 3D du plan.
    float vd = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
    float fres = pow(1.0 - vd, uFresnel);

    float sweep = (vUv.x * 0.6 - vUv.y * 0.4) * uBands
                + (1.0 - vd) * 2.0
                + uPointer.x * 1.2 - uPointer.y * 0.8
                + uTime * 0.05;
    vec3 foil = pow(hue2rgb(fract(sweep)), vec3(0.8));
    float stripe = 0.5 + 0.5 * sin(sweep * 6.2831853);

    // Base faible (face-on discret → le conic CSS sous-jacent domine au repos),
    // l'iridescence monte avec l'angle de vue (rim) = ce que le CSS ne sait qu'approximer.
    float sheen = mix(0.02, 0.18, stripe);
    float rim = smoothstep(0.0, 1.0, fres);
    float strength = clamp(uFoil * (sheen + rim * 0.85), 0.0, 1.0);

    vec3 col = foil * strength;

    // Glints fins (scintillent surtout au tilt)
    float n = fract(sin(dot(floor(vUv * 260.0), vec2(12.9898, 78.233)) + uTime * 1.5) * 43758.5453);
    col += vec3(step(0.993, n)) * (0.12 + rim * 0.5);

    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Matériau de foil prêt à l'emploi (uniforms initialisés aux valeurs par défaut). */
export function createFoilMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
      uFoil: { value: FOIL_DEFAULTS.foil },
      uFresnel: { value: FOIL_DEFAULTS.fresnel },
      uBands: { value: FOIL_DEFAULTS.bands },
    },
    vertexShader: FOIL_VERT,
    fragmentShader: FOIL_FRAG,
    transparent: true,
    depthWrite: false,
  });
}

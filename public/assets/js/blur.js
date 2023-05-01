import {
  BoxBufferGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  Scene,
  ShaderMaterial,
  TextureLoader,
  Vector2,
} from "https://unpkg.com/three@0.120.0/build/three.module.js";

import useThree from "https://codepen.io/soju22/pen/cb31020fed766eb66bc8ad1879bc3325.js";

App();

function App() {
  const images = [
    {
      src: "assets/images/blur1.jpeg",
    },
    {
      src: "assets/images/blur2.jpeg",
    },
    {
      src: "assets/images/blur3.jpeg",
    },
    {
      src: "assets/images/blur4.jpeg",
    },
    {
      src: "assets/images/blur5.jpeg",
    },
  ];

  let three, scene;
  let image1, image2;
  let progress = 0,
    targetProgress = 0,
    center = new Vector2();
  const loader = new TextureLoader();

  init();

  function init() {
    three = useThree().init({
      canvas: document.getElementById("canvas"),
      mouse_move: true,
    });

    Promise.all(images.map(loadTexture)).then((responses) => {
      initScene();
      initListeners();
      animate();
    });
  }

  function initScene() {
    scene = new Scene();
    image1 = ZoomBlurImage({ three });
    image1.setMap(images[0].texture);
    scene.add(image1.mesh);

    image2 = ZoomBlurImage({ three });
    image2.setMap(images[1].texture);
    scene.add(image2.mesh);

    setImagesProgress(0);

    gsap.fromTo(
      image1.uStrength,
      { value: -2 },
      { value: 0, duration: 3, ease: Power2.easeOut }
    );

    three.onAfterResize(() => {
      image1.resize();
      image2.resize();
    });
  }

  function initListeners() {
    // setInterval(() => {
    //   navNext();
    // }, 5000);
    canvas.addEventListener("click", (e) => {
      navNext();
    });

    canvas.addEventListener("keyup", (e) => {
      if (e.keyCode === 37 || e.keyCode === 38) {
        navPrevious();
      } else if (e.keyCode === 39 || e.keyCode === 40) {
        navNext();
      }
    });
  }

  function navNext() {
    if (Number.isInteger(targetProgress)) setTargetProgress(targetProgress + 1);
    else setTargetProgress(Math.ceil(targetProgress));
  }

  function navPrevious() {
    if (Number.isInteger(targetProgress)) setTargetProgress(targetProgress - 1);
    else setTargetProgress(Math.floor(targetProgress));
  }

  function setTargetProgress(value) {
    targetProgress = value;
    if (targetProgress < 0) {
      progress += images.length;
      targetProgress += images.length;
    }
  }

  function updateProgress() {
    const progress1 = lerp(progress, targetProgress, 0.05);
    const pdiff = progress1 - progress;
    if (pdiff === 0) return;

    const p0 = progress % 1;
    const p1 = progress1 % 1;
    if ((pdiff > 0 && p1 < p0) || (pdiff < 0 && p0 < p1)) {
      const i = Math.floor(progress1) % images.length;
      const j = (i + 1) % images.length;
      image1.setMap(images[i].texture);
      image2.setMap(images[j].texture);
    }

    progress = progress1;
    setImagesProgress(progress % 1);
  }

  function setImagesProgress(progress) {
    image1.uStrength.value = progress;
    image2.uStrength.value = -1 + progress;
  }

  function animate() {
    requestAnimationFrame(animate);
    const { renderer, camera, cameraCtrl, mouse } = three;

    center.copy(mouse).divideScalar(2).addScalar(0.5);
    lerpv2(image1.uCenter.value, center, 0.1);
    lerpv2(image2.uCenter.value, center, 0.1);

    updateProgress();

    if (cameraCtrl) cameraCtrl.update();
    renderer.render(scene, camera);
  }

  function loadTexture(img, index) {
    return new Promise((resolve) => {
      loader.load(img.src, (texture) => {
        img.texture = texture;
        resolve(texture);
      });
    });
  }
}

function ZoomBlurImage({ three }) {
  let geometry, material, mesh;

  const uMap = { value: null };
  const uCenter = { value: new Vector2(0.5, 0.5) };
  const uStrength = { value: -1 };
  const uUVOffset = { value: new Vector2(0, 0) };
  const uUVScale = { value: new Vector2(1, 1) };

  init();

  return { geometry, material, mesh, uCenter, uStrength, setMap, resize };

  function init(params) {
    geometry = new PlaneBufferGeometry(1, 1, 1, 1);

    material = new ShaderMaterial({
      transparent: true,
      uniforms: {
        map: uMap,
        center: uCenter,
        strength: uStrength,
        uvOffset: uUVOffset,
        uvScale: uUVScale,
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      // adapted from from https://github.com/evanw/glfx.js
      fragmentShader: `
        uniform sampler2D map;
        uniform vec2 center;
        uniform float strength;
        uniform vec2 uvOffset;
        uniform vec2 uvScale;
        varying vec2 vUv;

        float random(vec3 scale, float seed) {
          /* use the fragment position for a different seed per-pixel */
          return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
        }
        
        void main() {
          vec2 tUv = vUv * uvScale + uvOffset;
          if (abs(strength) > 0.001) {
            vec4 color = vec4(0.0);
            float total = 0.0;
            vec2 toCenter = center * uvScale + uvOffset - tUv;
            
            /* randomize the lookup values to hide the fixed number of samples */
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);
            
            for (float t = 0.0; t <= 5.0; t++) {
              float percent = (t + offset) / 10.0;
              float weight = 2.0 * (percent - percent * percent);
              vec4 texel = texture2D(map, tUv + toCenter * percent * strength);

              /* switch to pre-multiplied alpha to correctly blur transparent images */
              texel.rgb *= texel.a;

              color += texel * weight;
              total += weight;
            }

            gl_FragColor = color / total;

            /* switch back from pre-multiplied alpha */
            gl_FragColor.rgb /= gl_FragColor.a + 0.00001;
            gl_FragColor.a = 1.0 - abs(strength);
          } else {
            gl_FragColor = texture2D(map, tUv);
          }
        }
      `,
    });

    mesh = new Mesh(geometry, material);
  }

  function setMap(value) {
    uMap.value = value;
    resize();
  }

  function resize() {
    mesh.scale.set(three.size.wWidth, three.size.wHeight, 1);
    const iWidth = uMap.value.image.width;
    const iHeight = uMap.value.image.height;
    const iRatio = iWidth / iHeight;
    uUVOffset.value.set(0, 0);
    uUVScale.value.set(1, 1);
    if (iRatio > three.size.ratio) {
      uUVScale.value.x = three.size.ratio / iRatio;
      uUVOffset.value.x = (1 - uUVScale.value.x) / 2;
    } else {
      uUVScale.value.y = iRatio / three.size.ratio;
      uUVOffset.value.y = (1 - uUVScale.value.y) / 2;
    }
  }
}

function limit(val, min, max) {
  return val < min ? min : val > max ? max : val;
}

function lerp(a, b, x) {
  return a + x * (b - a);
}

export function lerpv2(v1, v2, amount) {
  v1.x = lerp(v1.x, v2.x, amount);
  v1.y = lerp(v1.y, v2.y, amount);
}

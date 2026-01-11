import * as THREE from 'three';

import TouchTexture from './TouchTexture';

const glslify = require('glslify');

export default class Particles {

	constructor(webgl) {
		this.webgl = webgl;
		this.container = new THREE.Object3D();
	}

	init(src) {
		const loader = new THREE.TextureLoader();

		loader.load(src, (texture) => {
			this.texture = texture;
			this.texture.minFilter = THREE.LinearFilter;
			this.texture.magFilter = THREE.LinearFilter;
			this.texture.format = THREE.RGBFormat;

			this.width = texture.image.width;
			this.height = texture.image.height;

			this.initPoints(true);
			this.initHitArea();
			this.initTouch();
			this.resize();
			this.show();
		}, undefined, (error) => {
			console.error('Error loading texture:', error);
			// Create a fallback texture
			this.createFallbackTexture();
		});
	}


	createFallbackTexture() {
		// Create a simple canvas as fallback texture
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d');

		// Create a gradient pattern as fallback
		const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
		gradient.addColorStop(0, '#ffffff');
		gradient.addColorStop(0.5, '#cccccc');
		gradient.addColorStop(1, '#888888');

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, 512, 512);

		// Add some text to indicate it's a fallback
		ctx.fillStyle = '#000000';
		ctx.font = '24px Arial';
		ctx.textAlign = 'center';
		ctx.fillText('Image Loading Error', 256, 256);

		const texture = new THREE.Texture(canvas);
		texture.needsUpdate = true;

		this.texture = texture;
		this.texture.minFilter = THREE.LinearFilter;
		this.texture.magFilter = THREE.LinearFilter;
		this.texture.format = THREE.RGBFormat;

		this.width = canvas.width;
		this.height = canvas.height;

		this.initPoints(true);
		this.initHitArea();
		this.initTouch();
		this.resize();
		this.show();
	}

	initPoints(discard) {
		this.numPoints = this.width * this.height;

		let numVisible = this.numPoints;
		let threshold = 0;
		let originalColors;

		if (discard) {
			// discard pixels darker than threshold #22
			numVisible = 0;
			threshold = 34;

			const img = this.texture.image;
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');

			canvas.width = this.width;
			canvas.height = this.height;
			ctx.scale(1, -1);
			ctx.drawImage(img, 0, 0, this.width, this.height * -1);

			const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			originalColors = Float32Array.from(imgData.data);

			for (let i = 0; i < this.numPoints; i++) {
				if (originalColors[i * 4 + 0] > threshold) numVisible++;
			}

			// console.log('numVisible', numVisible, this.numPoints);
		}

		const uniforms = {
			uTime: { value: 0 },
			uRandom: { value: 1.0 },
			uDepth: { value: 2.0 },
			uSize: { value: 0.0 },
			uTextureSize: { value: new THREE.Vector2(this.width, this.height) },
			uTexture: { value: this.texture },
			uTouch: { value: null },
			uSpatialMode: { value: 0.0 },
			uMousePosition: { value: new THREE.Vector2(0.5, 0.5) },
		};

		const material = new THREE.RawShaderMaterial({
			uniforms,
			vertexShader: glslify(require('../../../shaders/particle.vert')),
			fragmentShader: glslify(require('../../../shaders/particle.frag')),
			depthTest: false,
			transparent: true,
			// blending: THREE.AdditiveBlending
		});

		const geometry = new THREE.InstancedBufferGeometry();

		// positions
		const positions = new THREE.BufferAttribute(new Float32Array(4 * 3), 3);
		positions.setXYZ(0, -0.5, 0.5, 0.0);
		positions.setXYZ(1, 0.5, 0.5, 0.0);
		positions.setXYZ(2, -0.5, -0.5, 0.0);
		positions.setXYZ(3, 0.5, -0.5, 0.0);
		geometry.addAttribute('position', positions);

		// uvs
		const uvs = new THREE.BufferAttribute(new Float32Array(4 * 2), 2);
		uvs.setXYZ(0, 0.0, 0.0);
		uvs.setXYZ(1, 1.0, 0.0);
		uvs.setXYZ(2, 0.0, 1.0);
		uvs.setXYZ(3, 1.0, 1.0);
		geometry.addAttribute('uv', uvs);

		// index
		geometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 2, 1, 2, 3, 1]), 1));

		const indices = new Uint16Array(numVisible);
		const offsets = new Float32Array(numVisible * 3);
		const angles = new Float32Array(numVisible);

		for (let i = 0, j = 0; i < this.numPoints; i++) {
			if (discard && originalColors[i * 4 + 0] <= threshold) continue;

			offsets[j * 3 + 0] = i % this.width;
			offsets[j * 3 + 1] = Math.floor(i / this.width);

			indices[j] = i;

			angles[j] = Math.random() * Math.PI;

			j++;
		}

		geometry.addAttribute('pindex', new THREE.InstancedBufferAttribute(indices, 1, false));
		geometry.addAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3, false));
		geometry.addAttribute('angle', new THREE.InstancedBufferAttribute(angles, 1, false));

		this.object3D = new THREE.Mesh(geometry, material);
		this.container.add(this.object3D);
	}

	initTouch() {
		// create only once
		if (!this.touch) this.touch = new TouchTexture(this);
		this.object3D.material.uniforms.uTouch.value = this.touch.texture;
	}

	initHitArea() {
		const geometry = new THREE.PlaneGeometry(this.width, this.height, 1, 1);
		const material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, wireframe: true, depthTest: false });
		material.visible = false;
		this.hitArea = new THREE.Mesh(geometry, material);
		this.container.add(this.hitArea);
	}

	addListeners() {
		this.handlerInteractiveMove = this.onInteractiveMove.bind(this);
		this.handlerInteractiveDown = this.onInteractiveDown.bind(this);
		this.handlerInteractiveUp = this.onInteractiveUp.bind(this);

		this.webgl.interactive.addListener('interactive-move', this.handlerInteractiveMove);
		this.webgl.interactive.addListener('interactive-down', this.handlerInteractiveDown);
		this.webgl.interactive.addListener('interactive-up', this.handlerInteractiveUp);
		this.webgl.interactive.objects.push(this.hitArea);
		this.webgl.interactive.enable();
	}

	removeListeners() {
		this.webgl.interactive.removeListener('interactive-move', this.handlerInteractiveMove);
		this.webgl.interactive.removeListener('interactive-down', this.handlerInteractiveDown);
		this.webgl.interactive.removeListener('interactive-up', this.handlerInteractiveUp);

		const index = this.webgl.interactive.objects.findIndex(obj => obj === this.hitArea);
		this.webgl.interactive.objects.splice(index, 1);
		this.webgl.interactive.disable();
	}

	// ---------------------------------------------------------------------------------------------
	// PUBLIC
	// ---------------------------------------------------------------------------------------------

	update(delta) {
		if (!this.object3D) return;
		if (this.touch) this.touch.update();

		this.object3D.material.uniforms.uTime.value += delta;
	}

	show(time = 0.6) {
		const gui = this.webgl.app.gui;

		// Use saved settings if available, otherwise defaults
		const size = gui ? gui.particlesSize : 1.5;
		const random = gui ? gui.particlesRandom : 2.0;
		const depth = gui ? gui.particlesDepth : 4.0;

		// Transition to the target settings
		TweenLite.to(this.object3D.material.uniforms.uSize, time, { value: size });
		TweenLite.to(this.object3D.material.uniforms.uRandom, time, { value: random });
		TweenLite.fromTo(this.object3D.material.uniforms.uDepth, time * 1.2, { value: 40.0 }, { value: depth });

		this.addListeners();
	}

	hide(_destroy, time = 0.4) {
		return new Promise((resolve, reject) => {
			TweenLite.to(this.object3D.material.uniforms.uRandom, time, {
				value: 5.0, onComplete: () => {
					if (_destroy) this.destroy();
					resolve();
				}
			});
			TweenLite.to(this.object3D.material.uniforms.uDepth, time, { value: -20.0, ease: Quad.easeIn });
			TweenLite.to(this.object3D.material.uniforms.uSize, time * 0.8, { value: 0.0 });

			this.removeListeners();
		});
	}

	destroy() {
		if (!this.object3D) return;

		this.object3D.parent.remove(this.object3D);
		this.object3D.geometry.dispose();
		this.object3D.material.dispose();
		this.object3D = null;

		if (!this.hitArea) return;

		this.hitArea.parent.remove(this.hitArea);
		this.hitArea.geometry.dispose();
		this.hitArea.material.dispose();
		this.hitArea = null;
	}

	// ---------------------------------------------------------------------------------------------
	// EVENT HANDLERS
	// ---------------------------------------------------------------------------------------------


	resize() {
		if (!this.object3D) return;

		const fovHeight = this.webgl.fovHeight;
		const fovWidth = fovHeight * this.webgl.camera.aspect;

		const scaleY = fovHeight / this.height;
		const scaleX = fovWidth / this.width;

		// Mobile/Masaüstü ayrımı
		const isMobile = window.innerWidth <= 900;
		let scale;

		if (isMobile) {
			// Mobile: Portrait/Landscape ayrımı
			const isPortrait = window.innerHeight > window.innerWidth;

			if (isPortrait) {
				// Portrait: Sadece yükseklik bazlı ölçeklendirme - her fotoğraf yüksekliği ekrana tam sığar
				scale = scaleY; // Sadece yüksekliği kullan, genişlik taşabilir

				// Ekran yüksekliğine göre dinamik faktör - referans 800px
				const screenHeight = window.innerHeight;
				const baseHeight = 715;
				const heightFactor = Math.min(screenHeight / baseHeight, 1.2); // Maks 1.2x büyütme
				scale *= heightFactor;
			} else {
				// Landscape: Contain stratejisi - hem yükseklik hem genişliği dikkate al
				scale = Math.min(scaleY, scaleX);

				// Landscape'de daha küçük base height kullan - küçülme önlemek için
				const screenHeight = window.innerHeight;
				const baseHeight = 400; // Landscape için daha küçük referans
				const heightFactor = Math.max(screenHeight / baseHeight, 1.0); // Minimum 1.0x, küçülme olmaz
				scale *= heightFactor;
			}
		} else {
			// Masaüstü: Eski contain stratejisi
			scale = Math.min(scaleY, scaleX);
		}

		// Horizontal position - sadece mobile cihazlarda
		let horizontalPosition = 0;

		if (isMobile) {
			// Mobile horizontal position control
			const photoIndex = this.webgl.currSample;
			const horizontalOffsets = {
				0: 0,    // sample-01.jpg
				1: 0,    // sample-02.jpg
				2: 0,    // sample-03.jpg
				3: 10,    // sample-04.jpg
				4: 0,    // sample-05.jpg
				5: 45,    // sample-06.jpg
				6: 20,    // sample-07.jpg
				7: 0,    // sample-08.jpg
				8: 20,    // sample-09.jpg
				9: 0,    // sample-10.jpg
				10: 0,   // sample-11.jpg
				11: 0,   // sample-12.jpg
				12: 0,   // sample-13.jpg
				13: 0,   // sample-14.jpg
				14: 0,   // sample-15.jpg
				15: 0,   // sample-16.jpg
				16: 0,   // sample-17.jpg
				17: 0,   // sample-18.jpg
				18: -20,   // sample-19.jpg
			};

			horizontalPosition = horizontalOffsets[photoIndex] || 0;
		}

		this.object3D.scale.set(scale, scale, 1);
		this.object3D.position.x = horizontalPosition;
		this.hitArea.scale.set(scale, scale, 1);
		this.hitArea.position.x = horizontalPosition;
	}

	onInteractiveMove(e) {
		// Disable touch interaction when in spatial photo mode
		if (this.spatialPhotoMode) {
			return;
		}

		const uv = e.intersectionData.uv;
		if (this.touch) this.touch.addTouch(uv);
	}

	onInteractiveDown(e) {
		// Check for left mouse click
		if (e.isLeftClick) {
			this.startExplode();
		}
	}

	onInteractiveUp(e) {
		// Check for left mouse click release
		if (e.isLeftClick) {
			this.startReform();
		}
	}

	startExplode() {
		if (!this.object3D) return;

		// Cancel any pending reform
		if (this.reformTimeout) {
			clearTimeout(this.reformTimeout);
			this.reformTimeout = null;
		}

		// Check if mobile to slow down animation
		const isMobile = this.webgl.interactive && this.webgl.interactive.browser && this.webgl.interactive.browser.mobile;
		const duration = isMobile ? 4.0 : 1.5;

		// Explode - make edge particles scatter to infinity, center stable
		TweenLite.to(this.object3D.material.uniforms.uRandom, duration, { value: 30.0, ease: Power2.easeOut });
		TweenLite.to(this.object3D.material.uniforms.uDepth, duration, { value: 50.0, ease: Power2.easeOut });
	}

	startReform() {
		if (!this.object3D) return;

		// Cancel any pending reform
		if (this.reformTimeout) {
			clearTimeout(this.reformTimeout);
		}

		// Start reform immediately with soft animation (20% faster)
		const gui = this.webgl.app.gui;
		const size = gui ? gui.particlesSize : 1.5;
		const random = gui ? gui.particlesRandom : 2.0;
		const depth = gui ? gui.particlesDepth : 4.0;

		// Check if mobile to slow down animation
		const isMobile = this.webgl.interactive && this.webgl.interactive.browser && this.webgl.interactive.browser.mobile;
		const durationScale = isMobile ? 2.5 : 1.0;

		TweenLite.to(this.object3D.material.uniforms.uSize, 1.6 * durationScale, { value: size, ease: Power2.easeInOut });
		TweenLite.to(this.object3D.material.uniforms.uRandom, 2.0 * durationScale, { value: random, ease: Power2.easeInOut });
		TweenLite.to(this.object3D.material.uniforms.uDepth, 2.4 * durationScale, { value: depth, ease: Power2.easeInOut });
	}

	startSpatialPhoto() {
		if (!this.object3D) return;

		// Enable spatial photo mode
		this.spatialPhotoMode = true;

		// Reset mouse position to center when starting spatial photo mode
		this.object3D.material.uniforms.uMousePosition.value.set(0.5, 0.5);

		// Set spatial mode uniform
		this.object3D.material.uniforms.uSpatialMode.value = 1.0;

		// Keep particles stable - no explosion effect
		const gui = this.webgl.app.gui;
		const size = gui ? gui.particlesSize : 1.5;
		const random = gui ? gui.particlesRandom : 2.0;
		const depth = gui ? gui.particlesDepth : 4.0;

		// Maintain current values without animation
		this.object3D.material.uniforms.uSize.value = size;
		this.object3D.material.uniforms.uRandom.value = random;
		this.object3D.material.uniforms.uDepth.value = depth;
	}

	stopSpatialPhoto() {
		if (!this.object3D) return;

		// Disable spatial photo mode
		this.spatialPhotoMode = false;

		// Reset spatial mode uniform
		this.object3D.material.uniforms.uSpatialMode.value = 0.0;

		// Return to normal settings with smooth transition
		const gui = this.webgl.app.gui;
		const size = gui ? gui.particlesSize : 1.5;
		const random = gui ? gui.particlesRandom : 2.0;
		const depth = gui ? gui.particlesDepth : 4.0;

		TweenLite.to(this.object3D.material.uniforms.uSize, 1.5, { value: size, ease: Power2.easeInOut });
		TweenLite.to(this.object3D.material.uniforms.uRandom, 1.5, { value: random, ease: Power2.easeInOut });
		TweenLite.to(this.object3D.material.uniforms.uDepth, 1.5, { value: depth, ease: Power2.easeInOut });
	}
}

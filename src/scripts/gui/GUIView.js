export default class GUIView {

	constructor(app) {
		this.app = app;

		// Default settings
		this.defaultSettings = {
			particlesRandom: 2,
			particlesDepth: 4,
			particlesSize: 1.5,
			touchRadius: 0.15
		};

		// Current state - use default values initially
		this.particlesHitArea = this.defaultSettings.particlesHitArea;
		this.particlesRandom = this.defaultSettings.particlesRandom;
		this.particlesDepth = this.defaultSettings.particlesDepth;
		this.particlesSize = this.defaultSettings.particlesSize;
		this.touchRadius = this.defaultSettings.touchRadius;

		// Map to store settings per image index
		this.loadFromLocalStorage();

		this.initCustomGUI();
	}

	loadFromLocalStorage() {
		const stored = localStorage.getItem('particle_settings');
		if (stored) {
			try {
				this.settingsMap = JSON.parse(stored);
			} catch (e) {
				console.error('Error parsing settings from localStorage', e);
				this.settingsMap = {};
			}
		} else {
			this.settingsMap = {};
		}
	}

	saveToLocalStorage() {
		localStorage.setItem('particle_settings', JSON.stringify(this.settingsMap));
	}

	initCustomGUI() {
		this.dom = {
			touchRadius: document.getElementById('touchRadius'),
			particlesRandom: document.getElementById('particlesRandom'),
			particlesDepth: document.getElementById('particlesDepth'),
			particlesSize: document.getElementById('particlesSize'),
			valTouchRadius: document.getElementById('val-touchRadius'),
			valParticlesRandom: document.getElementById('val-particlesRandom'),
			valParticlesDepth: document.getElementById('val-particlesDepth'),
			valParticlesSize: document.getElementById('val-particlesSize')
		};

		if (this.dom.touchRadius) {
			this.dom.touchRadius.addEventListener('input', (e) => {
				this.touchRadius = parseFloat(e.target.value);
				if (this.dom.valTouchRadius) this.dom.valTouchRadius.textContent = this.touchRadius.toFixed(2);
				this.onTouchChange();
				this.saveCurrentSettings();
			});
		}

		if (this.dom.particlesRandom) {
			this.dom.particlesRandom.addEventListener('input', (e) => {
				this.particlesRandom = parseFloat(e.target.value);
				if (this.dom.valParticlesRandom) this.dom.valParticlesRandom.textContent = this.particlesRandom.toFixed(1);
				this.onParticlesChange();
				this.saveCurrentSettings();
			});
		}

		if (this.dom.particlesDepth) {
			this.dom.particlesDepth.addEventListener('input', (e) => {
				this.particlesDepth = parseFloat(e.target.value);
				if (this.dom.valParticlesDepth) this.dom.valParticlesDepth.textContent = this.particlesDepth.toFixed(1);
				this.onParticlesChange();
				this.saveCurrentSettings();
			});
		}

		if (this.dom.particlesSize) {
			this.dom.particlesSize.addEventListener('input', (e) => {
				this.particlesSize = parseFloat(e.target.value);
				if (this.dom.valParticlesSize) this.dom.valParticlesSize.textContent = this.particlesSize.toFixed(2);
				this.onParticlesChange();
				this.saveCurrentSettings();
			});
		}

		// Set initial DOM values to match current state
		this.updateDOMValues();


		// Mobile Toggle Logic
		const toggleBtn = document.getElementById('gui-toggle');
		const guiMenu = document.getElementById('custom-gui');

		if (toggleBtn && guiMenu) {
			toggleBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				guiMenu.classList.toggle('visible');
			});
		}

		// Image Upload Logic
		const uploadBtn = document.getElementById('upload-btn');
		const imageUpload = document.getElementById('image-upload');

		if (uploadBtn && imageUpload) {
			uploadBtn.addEventListener('click', () => {
				imageUpload.click();
			});

			imageUpload.addEventListener('change', (e) => {
				const file = e.target.files[0];
				if (file) {
					const url = URL.createObjectURL(file);
					const name = file.name.split('.')[0]; // Use file name as photo name
					if (this.app.webgl) {
						this.app.webgl.addSample(url, name);
					}
				}
			});
		}
	}

	updateDOMValues() {
		// Update DOM elements to match current state
		if (this.dom.touchRadius) this.dom.touchRadius.value = this.touchRadius;
		if (this.dom.particlesRandom) this.dom.particlesRandom.value = this.particlesRandom;
		if (this.dom.particlesDepth) this.dom.particlesDepth.value = this.particlesDepth;
		if (this.dom.particlesSize) this.dom.particlesSize.value = this.particlesSize;

		if (this.dom.valTouchRadius) this.dom.valTouchRadius.textContent = this.touchRadius.toFixed(2);
		if (this.dom.valParticlesRandom) this.dom.valParticlesRandom.textContent = this.particlesRandom.toFixed(1);
		if (this.dom.valParticlesDepth) this.dom.valParticlesDepth.textContent = this.particlesDepth.toFixed(1);
		if (this.dom.valParticlesSize) this.dom.valParticlesSize.textContent = this.particlesSize.toFixed(2);
	}

	saveCurrentSettings() {
		const index = this.app.webgl.currSample;
		if (index === undefined) return;

		this.settingsMap[index] = {
			particlesRandom: this.particlesRandom,
			particlesDepth: this.particlesDepth,
			particlesSize: this.particlesSize,
			touchRadius: this.touchRadius
		};

		this.saveToLocalStorage();
	}

	loadSettingsForIndex(index) {
		const settings = this.settingsMap[index] || { ...this.defaultSettings };

		// Update internal state
		this.particlesRandom = settings.particlesRandom;
		this.particlesDepth = settings.particlesDepth;
		this.particlesSize = settings.particlesSize;
		this.touchRadius = settings.touchRadius;

		// Update DOM elements
		this.updateDOMValues();

		// Apply to WebGL
		this.onTouchChange();
		this.onParticlesChange();
	}

	initStats() {
		this.stats = new Stats();
		document.body.appendChild(this.stats.dom);
	}

	update() { }

	enable() {
		const gui = document.getElementById('custom-gui');
		if (gui) gui.classList.add('visible');
	}

	disable() {
		const gui = document.getElementById('custom-gui');
		if (gui) gui.classList.remove('visible');
	}

	toggle() {
		const gui = document.getElementById('custom-gui');
		if (gui) gui.classList.toggle('visible');
	}

	onTouchChange() {
		if (!this.app.webgl || !this.app.webgl.particles || !this.app.webgl.particles.touch) return;
		this.app.webgl.particles.touch.radius = this.touchRadius;
	}

	onParticlesChange() {
		if (!this.app.webgl || !this.app.webgl.particles || !this.app.webgl.particles.object3D) return;

		this.app.webgl.particles.object3D.material.uniforms.uRandom.value = this.particlesRandom;
		this.app.webgl.particles.object3D.material.uniforms.uDepth.value = this.particlesDepth;
		this.app.webgl.particles.object3D.material.uniforms.uSize.value = this.particlesSize;
	}
}

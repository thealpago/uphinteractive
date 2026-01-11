import EventEmitter from 'events';
import * as THREE from 'three';
import browser from 'browser-detect';

import { passiveEvent } from '../../utils/event.utils.js';

export default class InteractiveControls extends EventEmitter {

	get enabled() { return this._enabled; }

	constructor(camera, el) {
		super();

		this.camera = camera;
		this.el = el || window;

		// Force cursor to default for the element
		if (this.el !== window) {
			this.el.style.cursor = 'default';
		}

		this.plane = new THREE.Plane();
		this.raycaster = new THREE.Raycaster();

		this.mouse = new THREE.Vector2();
		this.offset = new THREE.Vector3();
		this.intersection = new THREE.Vector3();

		this.objects = [];
		this.hovered = null;
		this.selected = null;

		this.isDown = false;

		this.browser = browser();

		this.enable();
	}

	enable() {
		if (this.enabled) return;
		this.addListeners();
		this._enabled = true;
	}

	disable() {
		if (!this.enabled) return;
		this.removeListeners();
		this._enabled = false;
	}

	addListeners() {
		this.handlerDown = this.onDown.bind(this);
		this.handlerMove = this.onMove.bind(this);
		this.handlerUp = this.onUp.bind(this);
		this.handlerLeave = this.onLeave.bind(this);
		this.handlerContextMenu = this.onContextMenu.bind(this);

		const isTouch = this.browser.mobile || this.browser.tablet || (window.navigator.maxTouchPoints > 0);

		if (isTouch) {
			this.el.addEventListener('touchstart', this.handlerDown, { passive: false });
			this.el.addEventListener('touchmove', this.handlerMove, { passive: false });
			this.el.addEventListener('touchend', this.handlerUp, { passive: false });
		}

		// For hybrid devices or desktop fallback, also listen to mouse events if needed.
		// However, to mimic original logic's separation:
		if (!isTouch || (isTouch && !this.browser.mobile)) {
			// On tablets/hybrid, we might want mouse events too if touch not fired,
			// or simply use mouse events as fallback. 
			// But creating duplicates might be an issue. 
			// Let's stick to the else logic but simply expanded 'if' to include tablets.
			// Actually, let's keep the either-or logic but expanded, to avoid double-firing on some Androids.
		}

		if (!isTouch) {
			this.el.addEventListener('mousedown', this.handlerDown);
			this.el.addEventListener('mousemove', this.handlerMove);
			this.el.addEventListener('mouseup', this.handlerUp);
			this.el.addEventListener('mouseleave', this.handlerLeave);
			this.el.addEventListener('contextmenu', this.handlerContextMenu);
		}
	}

	removeListeners() {
		const isTouch = this.browser.mobile || this.browser.tablet || (window.navigator.maxTouchPoints > 0);

		if (isTouch) {
			this.el.removeEventListener('touchstart', this.handlerDown);
			this.el.removeEventListener('touchmove', this.handlerMove);
			this.el.removeEventListener('touchend', this.handlerUp);
		}

		if (!isTouch) {
			this.el.removeEventListener('mousedown', this.handlerDown);
			this.el.removeEventListener('mousemove', this.handlerMove);
			this.el.removeEventListener('mouseup', this.handlerUp);
			this.el.removeEventListener('mouseleave', this.handlerLeave);
			this.el.removeEventListener('contextmenu', this.handlerContextMenu);
		}
	}

	resize(x, y, width, height) {
		if (x || y || width || height) {
			this.rect = { x, y, width, height };
		}
		else if (this.el === window) {
			this.rect = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
		}
		else {
			this.rect = this.el.getBoundingClientRect();
		}
	}

	onMove(e) {
		// Prevent page scrolling on touch devices when interacting with particles
		if (e.touches) {
			e.preventDefault();
		}

		// Ensure cursor stays default
		if (this.el !== window) {
			this.el.style.cursor = 'default';
		}

		const t = (e.touches) ? e.touches[0] : e;
		const touch = { x: t.clientX, y: t.clientY };

		this.mouse.x = ((touch.x - this.rect.x) / this.rect.width) * 2 - 1;
		this.mouse.y = -((touch.y - this.rect.y) / this.rect.height) * 2 + 1;

		this.raycaster.setFromCamera(this.mouse, this.camera);

		/*
		// is dragging
		if (this.selected && this.isDown) {
			if (this.raycaster.ray.intersectPlane(this.plane, this.intersection)) {
				this.emit('interactive-drag', { object: this.selected, position: this.intersection.sub(this.offset) });
			}
			return;
		}
		*/

		const intersects = this.raycaster.intersectObjects(this.objects);

		if (intersects.length > 0) {
			const object = intersects[0].object;
			this.intersectionData = intersects[0];

			this.plane.setFromNormalAndCoplanarPoint(this.camera.getWorldDirection(this.plane.normal), object.position);

			if (this.hovered !== object) {
				this.emit('interactive-out', { object: this.hovered });
				this.emit('interactive-over', { object });
				this.hovered = object;
			}
			else {
				this.emit('interactive-move', { object, intersectionData: this.intersectionData });
			}
		}
		else {
			this.intersectionData = null;

			if (this.hovered !== null) {
				this.emit('interactive-out', { object: this.hovered });
				this.hovered = null;
			}
		}
	}

	onDown(e) {
		// Don't prevent default on touchstart to allow tablet scrolling
		// Only prevent on touchmove when actually interacting with particles

		this.isDown = true;

		// Check for left mouse click (button 0) and middle mouse click (button 1)
		// For mobile: treat 2-finger touch as left click (trigger explosion)
		let isLeftClick = !e.touches && e.button === 0;
		if (e.touches && e.touches.length === 2) {
			isLeftClick = true;
			e.preventDefault(); // Prevent default zoom/scroll gestures when using 2 fingers
		}

		const isMiddleClick = !e.touches && e.button === 1;

		// Prevent default action on middle click (like auto-scroll)
		if (isMiddleClick) {
			e.preventDefault();
		}

		// Update rect on touch start to handle dynamic mobile viewports
		if (e.touches) {
			this.resize();

			// For single touch, we use the first touch point for position
			const t = e.touches[0];
			this.mouse.x = ((t.clientX - this.rect.x) / this.rect.width) * 2 - 1;
			this.mouse.y = -((t.clientY - this.rect.y) / this.rect.height) * 2 + 1;
			this.raycaster.setFromCamera(this.mouse, this.camera);
		} else {
			this.onMove(e);
		}

		this.emit('interactive-down', { object: this.hovered, previous: this.selected, intersectionData: this.intersectionData, isLeftClick, isMiddleClick });
		this.selected = this.hovered;

		if (this.selected) {
			if (this.raycaster.ray.intersectPlane(this.plane, this.intersection)) {
				this.offset.copy(this.intersection).sub(this.selected.position);
			}
		}
	}

	onUp(e) {
		this.isDown = false;

		// For mouse: standard check
		let isLeftClick = !e.touches && e.button === 0;
		// For mobile: onUp is called when a finger is lifted.
		// If we were performing a 2-finger action, and lift a finger, we should treat it as 'releasing' the click.
		// e.touches contains remaining touches. If it was 2 (triggered action) and now becomes < 2, we end action.
		// However, standard onUp might not carry previous state easily without tracking.
		// But since we want "Left Click Up" logic which calls startReform(), we can just pass isLeftClick=true
		// if we suspect this was a 2-finger release.
		// A simple heuristic: if it's a touch event, and we are lifting fingers, treat it as finishing the 'click' interaction potentially.
		// Or strictly: if e.touches.length < 2 (meaning we no longer have 2 fingers), we end action.
		if (e.changedTouches) {
			// If we just lifted a finger/fingers and now have fewer than 2 fingers, cancel effect.
			// Effectively, if we were doing the effect (2 fingers) and stop (0 or 1 finger), we want to stop.
			// Sending isLeftClick = true causes startReform(), which is safe to call even if not exploding.
			if (e.touches.length < 2) {
				isLeftClick = true;
			}
		}

		const isMiddleClick = !e.touches && e.button === 1;

		this.emit('interactive-up', { object: this.hovered, isLeftClick, isMiddleClick });
	}

	onContextMenu(e) {
		// Prevent context menu
		e.preventDefault();
		e.stopPropagation();
		return false;
	}

	onLeave(e) {
		this.onUp(e);

		this.emit('interactive-out', { object: this.hovered });
		this.hovered = null;
	}
}

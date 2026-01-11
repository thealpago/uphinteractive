// Interactive particle vertex shader

precision highp float;

attribute float pindex;
attribute vec3 position;
attribute vec3 offset;
attribute vec2 uv;
attribute float angle;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform float uTime;
uniform float uRandom;
uniform float uDepth;
uniform float uSize;
uniform vec2 uTextureSize;
uniform sampler2D uTexture;
uniform sampler2D uTouch;
uniform float uSpatialMode;
uniform vec2 uMousePosition;

varying vec2 vPUv;
varying vec2 vUv;
varying vec4 vColor;

#pragma glslify: snoise2 = require(glsl-noise/simplex/2d)

float random(float n) {
	return fract(sin(n) * 43758.5453123);
}

void main() {
	vUv = uv;

	// Use current offset directly (no transition)
	vec3 displaced = offset;

	// particle uv
	vec2 puv = offset.xy / uTextureSize;
	vPUv = puv;

	// pixel color
	vec4 colA = texture2D(uTexture, puv);
	
	// greyscale (for size calculation only)
	float grey = colA.r * 0.21 + colA.g * 0.71 + colA.b * 0.07;
	
	// pass original color to fragment shader
	vColor = colA;

	// randomise
	displaced.xy += vec2(random(pindex) - 0.5, random(offset.x + pindex) - 0.5) * uRandom;
	float rndz = (random(pindex) + snoise2(vec2(pindex * 0.1, uTime * 0.1)));
	
	// Enhanced depth for spatial photo mode
	float depthMultiplier = 1.0;
	if (uSpatialMode > 0.5) {
		// Create layered depth effect based on pixel brightness
		float brightness = grey;
		depthMultiplier = mix(0.5, 3.0, 1.0 - brightness); // Darker pixels move back, lighter pixels forward
		
		// Add subtle animation
		depthMultiplier += sin(uTime * 2.0 + pindex * 0.1) * 0.1;
		
		// Add 3D movement based on mouse position
		float mouseInfluence = (uMousePosition.x - 0.5) * 2.0; // -1 to 1
		displaced.x += mouseInfluence * depthMultiplier * 20.0;
		displaced.y += (uMousePosition.y - 0.5) * depthMultiplier * 10.0;
	}
	
	displaced.z += rndz * (random(pindex) * 2.0 * uDepth * depthMultiplier);
	// center
	displaced.xy -= uTextureSize * 0.5;

	// touch
	float t = texture2D(uTouch, vPUv).r;
	displaced.z += t * 60.0 * rndz;
	displaced.x += cos(angle) * t * 60.0 * rndz;
	displaced.y += sin(angle) * t * 60.0 * rndz;

	// particle size
	float psize = (snoise2(vec2(uTime, pindex) * 0.5) + 2.0);
	psize *= max(grey, 0.2);
	psize *= uSize;

	// final position
	vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
	mvPosition.xyz += position * psize;
	vec4 finalPosition = projectionMatrix * mvPosition;

	gl_Position = finalPosition;
}

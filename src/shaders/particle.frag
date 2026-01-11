// Interactive particle fragment shader

precision highp float;

uniform sampler2D uTexture;

varying vec2 vPUv;
varying vec2 vUv;
varying vec4 vColor;

void main() {
	vec4 color = vec4(0.0);
	vec2 uv = vUv;

	// circle
	float border = 0.3;
	float radius = 0.5;
	float dist = radius - distance(uv, vec2(0.5));
	float t = smoothstep(0.0, border, dist);

	// final color - use original photo color
	color = vColor;
	color.a = t;

	gl_FragColor = color;
}
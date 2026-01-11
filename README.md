# Interactive Image Particles

An interactive web experience that creates stunning particle effects from photographs using Three.js and WebGL. This project demonstrates how to transform static images into dynamic, responsive particle systems that react to user interactions.

[View on GitHub](https://github.com/thealpago/uphinteractive.git)

## Features

- 🖼️ **Photograph to Particle Conversion**: Transform any image into interactive particles
- 🎯 **Mouse & Touch Interaction**: Particles react dynamically to user input
- ⚡ **High Performance**: Optimized rendering using off-screen textures
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🎨 **Customizable Settings**: Adjustable particle behavior through interactive controls



## Installation

```bash
# Install dependencies
npm install
```

## Usage

```bash
# Start the development server
npm start

# Or use the dev command
npm run dev

# Build for production
npm run build
```

Open your browser and navigate to `http://localhost:8080` to see the demo.

## Technology Stack

- **[Three.js](https://www.npmjs.com/package/three)** - 3D graphics library for WebGL
- **[GSAP](https://www.npmjs.com/package/gsap)** - Professional animation library
- **[GLSLify](https://www.npmjs.com/package/glslify)** - Module system for GLSL shaders
- **[Stats.js](https://www.npmjs.com/package/stats.js)** - Performance monitoring
- **[Webpack 5](https://webpack.js.org/)** - Module bundler and build tool
- **[Browser Detect](https://www.npmjs.com/package/browser-detect)** - Browser feature detection
- **[DOMReady](https://www.npmjs.com/package/domready)** - DOM ready event handler

## Project Structure

```
interactive-ph-particles/
├── src/                    # Source code (JS, Shaders, HTML Template)
├── static/                 # Static assets (CSS, Images, Favicon)
├── config/                 # Webpack configuration
└── dist/                   # Production build (Generated)
```

## Configuration

The project includes an interactive control panel where you can adjust:

- **Touch Radius**: Control the interaction radius for mouse/touch events
- **Particle Randomness**: Adjust the random movement of particles
- **Performance Settings**: Optimize for different devices

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with modern web technologies and best practices
- Inspired by creative coding and interactive art communities


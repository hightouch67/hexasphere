# Hexasphere.js

A modern JavaScript library for creating hexagon-tiled spheres using Three.js. This implementation generates geodesic polyhedrons with hexagonal tiles covering most of the sphere surface, with exactly 12 pentagonal tiles at the vertices of the original icosahedron.

## Features

- **Modern Three.js Integration**: Built with the latest Three.js for optimal performance
- **TypeScript Support**: Full TypeScript definitions included
- **Modular Architecture**: Clean, maintainable code structure
- **Flexible Configuration**: Customizable sphere radius, subdivision levels, and tile properties
- **Export Capabilities**: Export to OBJ format for 3D modeling software
- **Interactive Demos**: Multiple example implementations included

## Installation

```bash
npm install
```

## Usage

### Basic Example

```javascript
import { Hexasphere } from './src/hexasphere.js';

const radius = 15;
const subdivisions = 5;
const tileWidth = 0.9;

const hexasphere = new Hexasphere(radius, subdivisions, tileWidth);

// Access tile data
hexasphere.tiles.forEach(tile => {
    console.log('Center:', tile.centerPoint);
    console.log('Boundary:', tile.boundary);
    console.log('Neighbors:', tile.neighbors);
});

// Export to OBJ format
const objString = hexasphere.toObj();
```

### Three.js Integration

```javascript
import * as THREE from 'three';
import { Hexasphere } from './src/hexasphere.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

const hexasphere = new Hexasphere(10, 4, 0.9);

// Create geometry from hexasphere data
const geometry = new THREE.BufferGeometry();
const vertices = [];
const indices = [];

hexasphere.tiles.forEach(tile => {
    // Add tile vertices and faces to geometry
    // ... implementation details
});

geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
geometry.setIndex(indices);

const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);
```

## API Reference

### Hexasphere Constructor

```javascript
new Hexasphere(radius, subdivisions, tileWidth)
```

- `radius` (number): Sphere radius
- `subdivisions` (number): Number of subdivisions per icosahedron edge
- `tileWidth` (number): Tile size factor (0.1 = mostly padding, 1.0 = no padding)

### Methods

- `toObj()`: Export sphere as Wavefront OBJ format string
- `toJson()`: Export sphere data as JSON string

### Tile Properties

Each tile in `hexasphere.tiles` contains:

- `centerPoint`: 3D coordinates of tile center
- `boundary`: Array of boundary vertices
- `neighbors`: Array of neighboring tile indices

## Examples

Check out the included example files:

- `index.html` - Full-featured demo with controls
- `index-light.html` - Minimal implementation
- `create_terrain_map.html` - Terrain mapping example

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Start development server
npm run dev
```

## License

MIT License - feel free to use in your projects.
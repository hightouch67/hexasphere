import * as THREE from 'three';

// Reuse the working Point, Face, and Tile classes but fix them
class Point {
    x: number;
    y: number;
    z: number;
    faces: Face[] = [];

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = parseFloat(x.toFixed(3));
        this.y = parseFloat(y.toFixed(3));
        this.z = parseFloat(z.toFixed(3));
    }

    subdivide(point: Point, count: number, checkPoint: (p: Point) => Point): Point[] {
        const segments: Point[] = [];
        segments.push(this);

        for (let i = 1; i < count; i++) {
            const np = new Point(
                this.x * (1 - (i / count)) + point.x * (i / count),
                this.y * (1 - (i / count)) + point.y * (i / count),
                this.z * (1 - (i / count)) + point.z * (i / count)
            );
            segments.push(checkPoint(np));
        }

        segments.push(point);
        return segments;
    }

    segment(point: Point, percent: number): Point {
        percent = Math.max(0.01, Math.min(1, percent));
        const x = point.x * (1 - percent) + this.x * percent;
        const y = point.y * (1 - percent) + this.y * percent;
        const z = point.z * (1 - percent) + this.z * percent;
        return new Point(x, y, z);
    }

    project(radius: number): Point {
        const mag = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2));
        const ratio = radius / mag;
        this.x = this.x * ratio;
        this.y = this.y * ratio;
        this.z = this.z * ratio;
        return this;
    }

    registerFace(face: Face): void {
        if (!this.faces.find(f => f.id === face.id)) {
            this.faces.push(face);
        }
    }

    getOrderedFaces(): Face[] {
        const workingArray = this.faces.slice();
        const ret: Face[] = [];

        let i = 0;
        while (i < this.faces.length && workingArray.length > 0) {
            if (i === 0) {
                ret.push(workingArray[0]);
                workingArray.splice(0, 1);
            } else {
                let hit = false;
                for (let j = 0; j < workingArray.length; j++) {
                    if (workingArray[j].isAdjacentTo(ret[i - 1])) {
                        ret.push(workingArray[j]);
                        workingArray.splice(j, 1);
                        hit = true;
                        break;
                    }
                }
                if (!hit) break;
            }
            i++;
        }

        return ret;
    }

    toString(): string {
        return `${this.x},${this.y},${this.z}`;
    }
}

class Face {
    static idCounter = 0;
    id: number;
    points: [Point, Point, Point];
    centroid?: Point;

    constructor(point1: Point, point2: Point, point3: Point, register: boolean = true) {
        this.id = Face.idCounter++;
        this.points = [point1, point2, point3];

        if (register) {
            point1.registerFace(this);
            point2.registerFace(this);
            point3.registerFace(this);
        }
    }

    getOtherPoints(point1: Point): Point[] {
        return this.points.filter(point => point.toString() !== point1.toString());
    }

    isAdjacentTo(face2: Face): boolean {
        if (!face2?.points) return false;
        let count = 0;
        for (const point1 of this.points) {
            for (const point2 of face2.points) {
                if (point1.toString() === point2.toString()) {
                    count++;
                }
            }
        }
        return count === 2;
    }

    getCentroid(): Point {
        if (this.centroid) return this.centroid;

        const x = (this.points[0].x + this.points[1].x + this.points[2].x) / 3;
        const y = (this.points[0].y + this.points[1].y + this.points[2].y) / 3;
        const z = (this.points[0].z + this.points[1].z + this.points[2].z) / 3;

        this.centroid = new Point(x, y, z);
        return this.centroid;
    }
}

class Tile {
    centerPoint: Point;
    faces: Face[];
    boundary: Point[];
    neighborIds: string[];
    neighbors: Tile[] = [];
    mesh?: THREE.Mesh;

    constructor(centerPoint: Point, hexSize: number = 1) {
        hexSize = Math.max(0.01, Math.min(1.0, hexSize));

        this.centerPoint = centerPoint;
        this.faces = centerPoint.getOrderedFaces();
        this.boundary = [];
        this.neighborIds = [];

        const neighborHash: { [key: string]: number } = {};

        // Build boundary using the ORIGINAL working method
        for (let f = 0; f < this.faces.length; f++) {
            this.boundary.push(this.faces[f].getCentroid().segment(this.centerPoint, hexSize));

            // Get neighboring tiles
            const otherPoints = this.faces[f].getOtherPoints(this.centerPoint);
            for (let o = 0; o < Math.min(2, otherPoints.length); o++) {
                neighborHash[otherPoints[o].toString()] = 1;
            }
        }

        this.neighborIds = Object.keys(neighborHash);

        // Fix winding order
        if (this.boundary.length >= 4) {
            // Calculate surface normal
            const U = {
                x: this.boundary[2].x - this.boundary[1].x,
                y: this.boundary[2].y - this.boundary[1].y,
                z: this.boundary[2].z - this.boundary[1].z
            };
            const V = {
                x: this.boundary[3].x - this.boundary[1].x,
                y: this.boundary[3].y - this.boundary[1].y,
                z: this.boundary[3].z - this.boundary[1].z
            };
            const normal = {
                x: U.y * V.z - U.z * V.y,
                y: U.z * V.x - U.x * V.z,
                z: U.x * V.y - U.y * V.x
            };

            // Check if pointing away from origin
            const dotProduct = (this.centerPoint.x * normal.x) + (this.centerPoint.y * normal.y) + (this.centerPoint.z * normal.z);
            if (dotProduct < 0) {
                this.boundary.reverse();
            }
        }
    }

    getLatLon(radius: number): { lat: number; lon: number } {
        const phi = Math.acos(this.centerPoint.y / radius);
        const theta = (Math.atan2(this.centerPoint.x, this.centerPoint.z) + Math.PI + Math.PI / 2) % (Math.PI * 2) - Math.PI;

        return {
            lat: 180 * phi / Math.PI - 90,
            lon: 180 * theta / Math.PI
        };
    }

    toString(): string {
        return this.centerPoint.toString();
    }
}

export class HexaSphere {
    radius: number;
    tiles: Tile[] = [];
    tileLookup: { [key: string]: Tile } = {};
    private scene: THREE.Scene;
    private projectionCanvas?: HTMLCanvasElement;
    private projectionData?: ImageData;
    private pathLines: THREE.Mesh[] = [];
    private tileLabels: THREE.Object3D[] = [];
    private tileLabelCounts?: Map<number, number>;
    private planetMesh?: THREE.Mesh;
    private atmosphereMesh?: THREE.Mesh;

    viewMode: 'planet' | 'tile' | 'both';
    constructor(radius: number, numDivisions: number, hexSize: number, scene: THREE.Scene, viewMode: 'planet' | 'tile' | 'both') {
        this.radius = radius;
        this.scene = scene;
        this.viewMode = viewMode;
        this.loadProjectionMap().then(() => {
            this.generateHexasphere(radius, numDivisions, hexSize, this.viewMode);
        });
    }

    private async loadProjectionMap(): Promise<void> {
        return new Promise((resolve) => {
            const img = document.getElementById("projection") as HTMLImageElement;

            if (!img) {
                resolve();
                return;
            }

            const processImage = () => {
                this.projectionCanvas = document.createElement('canvas');
                const context = this.projectionCanvas.getContext('2d')!;

                this.projectionCanvas.width = img.naturalWidth || img.width;
                this.projectionCanvas.height = img.naturalHeight || img.height;

                context.drawImage(img, 0, 0);
                this.projectionData = context.getImageData(0, 0, this.projectionCanvas.width, this.projectionCanvas.height);
            };

            if (img.complete && img.naturalWidth > 0) {
                processImage();
            } else {
                img.onload = processImage;
            }
            resolve();
        });
    }

    private generateHexasphere(radius: number, numDivisions: number, hexSize: number, viewMode: 'planet' | 'tile' | 'both'): void {
        const tao = 1.61803399;
        const corners = [
            new Point(1000, tao * 1000, 0),
            new Point(-1000, tao * 1000, 0),
            new Point(1000, -tao * 1000, 0),
            new Point(-1000, -tao * 1000, 0),
            new Point(0, 1000, tao * 1000),
            new Point(0, -1000, tao * 1000),
            new Point(0, 1000, -tao * 1000),
            new Point(0, -1000, -tao * 1000),
            new Point(tao * 1000, 0, 1000),
            new Point(-tao * 1000, 0, 1000),
            new Point(tao * 1000, 0, -1000),
            new Point(-tao * 1000, 0, -1000)
        ];

        const points: { [key: string]: Point } = {};
        for (const corner of corners) {
            points[corner.toString()] = corner;
        }

        const faces = [
            new Face(corners[0], corners[1], corners[4], false),
            new Face(corners[1], corners[9], corners[4], false),
            new Face(corners[4], corners[9], corners[5], false),
            new Face(corners[5], corners[9], corners[3], false),
            new Face(corners[2], corners[3], corners[7], false),
            new Face(corners[3], corners[2], corners[5], false),
            new Face(corners[7], corners[10], corners[2], false),
            new Face(corners[0], corners[8], corners[10], false),
            new Face(corners[0], corners[4], corners[8], false),
            new Face(corners[8], corners[2], corners[10], false),
            new Face(corners[8], corners[4], corners[5], false),
            new Face(corners[8], corners[5], corners[2], false),
            new Face(corners[1], corners[0], corners[6], false),
            new Face(corners[11], corners[1], corners[6], false),
            new Face(corners[3], corners[9], corners[11], false),
            new Face(corners[6], corners[10], corners[7], false),
            new Face(corners[3], corners[11], corners[7], false),
            new Face(corners[11], corners[6], corners[7], false),
            new Face(corners[6], corners[0], corners[10], false),
            new Face(corners[9], corners[1], corners[11], false)
        ];

        const getPointIfExists = (point: Point): Point => {
            const key = point.toString();
            if (points[key]) {
                return points[key];
            } else {
                points[key] = point;
                return point;
            }
        };

        let newFaces: Face[] = [];

        for (let f = 0; f < faces.length; f++) {
            let prev: Point[] = [];
            const bottom = [faces[f].points[0]];
            const left = faces[f].points[0].subdivide(faces[f].points[1], numDivisions, getPointIfExists);
            const right = faces[f].points[0].subdivide(faces[f].points[2], numDivisions, getPointIfExists);

            for (let i = 1; i <= numDivisions; i++) {
                prev = bottom.slice();
                bottom.length = 0;
                bottom.push(...left[i].subdivide(right[i], i, getPointIfExists));

                for (let j = 0; j < i; j++) {
                    newFaces.push(new Face(prev[j], bottom[j], bottom[j + 1]));
                    if (j > 0) {
                        newFaces.push(new Face(prev[j - 1], prev[j], bottom[j]));
                    }
                }
            }
        }

        // Project points to sphere
        const newPoints: { [key: string]: Point } = {};
        for (const p in points) {
            const np = points[p].project(radius);
            newPoints[np.toString()] = np;
        }

        // Create tiles
        this.tiles = [];
        this.tileLookup = {};

        for (const p in newPoints) {
            const newTile = new Tile(newPoints[p], hexSize);
            this.tiles.push(newTile);
            this.tileLookup[newPoints[p].toString()] = newTile;
        }

        // Resolve neighbors
        for (const tile of this.tiles) {
            for (const neighborId of tile.neighborIds) {
                const neighborTile = this.tileLookup[neighborId];
                if (neighborTile && neighborTile !== tile) {
                    tile.neighbors.push(neighborTile);
                }
            }
        }

        // Debug: Log neighbor stats
        console.log(`🔗 Neighbor resolution complete. Tiles: ${this.tiles.length}`);
        const tilesWithNeighbors = this.tiles.filter(t => t.neighbors.length > 0).length;
        console.log(`🔗 Tiles with neighbors: ${tilesWithNeighbors}/${this.tiles.length}`);
        if (this.tiles.length > 0) {
            const avgNeighbors = this.tiles.reduce((sum, t) => sum + t.neighbors.length, 0) / this.tiles.length;
            console.log(`🔗 Average neighbors per tile: ${avgNeighbors.toFixed(1)}`);
        }
        console.log(this.viewMode)
        if (this.viewMode === 'tile' || this.viewMode === 'both') {
            this.createMeshes();
        }
        if (this.viewMode === 'planet' || this.viewMode === 'both') {
            console.log('🌍 Creating planet and atmosphere meshes...');
            this.createPlanetMesh();
            this.createAtmosphereMesh();
        }
    }

    private isLand(lat: number, lon: number): boolean {
        if (!this.projectionData || !this.projectionCanvas) {
            return Math.random() > 0.3;
        }

        const x = Math.floor(this.projectionCanvas.width * (lon + 180) / 360);
        const y = Math.floor(this.projectionCanvas.height * (lat + 90) / 180);

        const clampedX = Math.max(0, Math.min(this.projectionCanvas.width - 1, x));
        const clampedY = Math.max(0, Math.min(this.projectionCanvas.height - 1, y));

        const pixelIndex = (clampedY * this.projectionCanvas.width + clampedX) * 4;
        return this.projectionData.data[pixelIndex] === 0;
    }


    // Public method for tile clicking functionality
    isLandPublic(lat: number, lon: number): boolean {
        return this.isLand(lat, lon);
    }

    // Helper method to get basic terrain type from coordinates
    private getBasicTerrainType(lat: number, lon: number): 'ocean' | 'land' | 'desert' | 'forest' | 'mountain' | 'arctic' | 'city' {
        if (!this.projectionData || !this.projectionCanvas) {
            return 'ocean';
        }

        const x = Math.floor(this.projectionCanvas.width * (lon + 180) / 360);
        const y = Math.floor(this.projectionCanvas.height * (lat + 90) / 180);

        const clampedX = Math.max(0, Math.min(this.projectionCanvas.width - 1, x));
        const clampedY = Math.max(0, Math.min(this.projectionCanvas.height - 1, y));

        const pixelIndex = (clampedY * this.projectionCanvas.width + clampedX) * 4;
        const r = this.projectionData.data[pixelIndex];
        const b = this.projectionData.data[pixelIndex + 2];

        const isLand = r === 0;
        if (!isLand) return 'ocean';

        const climateMarker = b;
        if (climateMarker === 255) return 'arctic';
        if (climateMarker === 50) return 'desert';
        if (climateMarker === 100) return 'mountain';
        if (climateMarker === 180) return 'forest';
        if (climateMarker === 200) return 'city';
        return 'forest'; // default land type
    }

    // Calculate mountain density in surrounding area
    private getMountainDensity(lat: number, lon: number, radius: number = 5): number {
        let mountainCount = 0;
        let totalSamples = 0;

        // Sample in a grid around the point
        for (let dlat = -radius; dlat <= radius; dlat += 2) {
            for (let dlon = -radius; dlon <= radius; dlon += 2) {
                const sampleLat = lat + dlat;
                const sampleLon = lon + dlon;

                // Keep coordinates in valid range
                if (sampleLat >= -90 && sampleLat <= 90 && sampleLon >= -180 && sampleLon <= 180) {
                    const terrainType = this.getBasicTerrainType(sampleLat, sampleLon);
                    if (terrainType === 'mountain') {
                        mountainCount++;
                    }
                    totalSamples++;
                }
            }
        }

        return totalSamples > 0 ? mountainCount / totalSamples : 0;
    }

    // Public method to get terrain information
    getTerrainInfo(lat: number, lon: number): {
        type: 'ocean' | 'land' | 'desert' | 'forest' | 'mountain' | 'arctic' | 'city';
        elevation: number;
        temperature: number;
        color: number;
    } {
        if (!this.projectionData || !this.projectionCanvas) {
            return { type: 'ocean', elevation: 0, temperature: 15, color: 0x0f2342 };
        }

        const x = Math.floor(this.projectionCanvas.width * (lon + 180) / 360);
        const y = Math.floor(this.projectionCanvas.height * (lat + 90) / 180);

        const clampedX = Math.max(0, Math.min(this.projectionCanvas.width - 1, x));
        const clampedY = Math.max(0, Math.min(this.projectionCanvas.height - 1, y));

        const pixelIndex = (clampedY * this.projectionCanvas.width + clampedX) * 4;
        const r = this.projectionData.data[pixelIndex];
        const g = this.projectionData.data[pixelIndex + 1];
        const b = this.projectionData.data[pixelIndex + 2];

        // Use RGB values to determine terrain types
        const isLand = r === 0;

        if (!isLand) {
            // Ocean depth based on blue intensity
            const depth = Math.min(255 - b, 200);
            const oceanColors = [0x0f2342, 0x1e3a8a, 0x2563eb, 0x3b82f6];
            return {
                type: 'ocean',
                elevation: -depth,
                temperature: Math.max(0, 25 - Math.abs(lat) * 0.3),
                color: oceanColors[Math.min(3, Math.floor(depth / 50))]
            };
        }

        // Land terrain analysis
        const absLat = Math.abs(lat);
        const baseTemp = 35 - absLat * 0.7;
        const elevation = g;
        const climateMarker = b;

        // Determine terrain type based on blue channel markers and climate
        if (climateMarker === 255) {
            // Snow-capped Mountains (white areas)
            return {
                type: 'arctic',
                elevation: elevation,
                temperature: Math.min(baseTemp, -5),
                color: 0xf8fafc
            };
        } else if (climateMarker === 240) {
            // Arctic/Tundra (light blue areas)
            return {
                type: 'arctic',
                elevation: elevation,
                temperature: Math.min(baseTemp, 0),
                color: 0xdbeafe
            };
        } else if (climateMarker === 50) {
            // Desert (yellow areas) 
            const desertColors = [0xfbbf24, 0xf59e0b, 0xd97706, 0xb45309];
            return {
                type: 'desert',
                elevation: elevation,
                temperature: Math.max(baseTemp, 25),
                color: desertColors[Math.min(3, Math.floor(elevation / 64))]
            };
        } else if (climateMarker === 100) {
            // Mountains (brown areas) with density-based elevation variation
            const mountainColors = [0x78716c, 0x57534e, 0x44403c, 0x292524];

            // Calculate mountain density to determine elevation
            // Mountains in the center of mountain regions are higher
            const mountainDensity = this.getMountainDensity(lat, lon, 3);

            // Base elevation from PNG (can be same for all mountains)
            const baseElevation = elevation;

            // Vary elevation based on mountain density (0.0 to 1.0)
            // Higher density = higher elevation (peak of mountain range)
            // Lower density = lower elevation (edges of mountain range)
            const densityMultiplier = 0.3 + (mountainDensity * 0.7); // Range: 0.3 to 1.0
            const variedElevation = baseElevation * densityMultiplier;

            // Add some random variation for natural look
            const randomVariation = 0.9 + (Math.random() * 0.2); // 0.9 to 1.1
            const finalElevation = Math.floor(variedElevation * randomVariation);

            // Debug logging for mountain elevation
            if (Math.random() < 0.005) { // Log 0.5% of mountain tiles
                console.log(`Mountain at lat:${lat.toFixed(1)}, lon:${lon.toFixed(1)} - density:${mountainDensity.toFixed(2)}, base:${baseElevation}, final:${finalElevation}`);
            }

            return {
                type: 'mountain',
                elevation: finalElevation,
                temperature: baseTemp - finalElevation * 0.1,
                color: mountainColors[Math.min(3, Math.floor(finalElevation / 64))]
            };
        } else if (climateMarker === 180) {
            // Jungle (dark green areas)
            const jungleColors = [0x166534, 0x15803d, 0x16a34a, 0x22c55e];
            return {
                type: 'forest',
                elevation: elevation,
                temperature: baseTemp,
                color: jungleColors[Math.min(3, Math.floor(elevation / 64))]
            };
        } else if (climateMarker === 200) {
            // Alien crystals
            return {
                type: 'city', // Using city type for alien terrain
                elevation: elevation,
                temperature: baseTemp + 5,
                color: 0xff00ff
            };
        } else {
            // Default grassland/forest
            const forestColors = [0x7cfc00, 0x397d02, 0x77ee00, 0x61b329, 0x83f52c];
            return {
                type: 'forest',
                elevation: elevation,
                temperature: baseTemp,
                color: forestColors[Math.min(4, Math.floor(elevation / 51))]
            };
        }
    }

    // A* pathfinding between two tiles
    findPath(startTile: any, endTile: any): any[] {
        const openSet = [startTile];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        // Initialize scores
        for (const tile of this.tiles) {
            gScore.set(tile, Infinity);
            fScore.set(tile, Infinity);
        }
        gScore.set(startTile, 0);
        fScore.set(startTile, this.heuristic(startTile, endTile));

        while (openSet.length > 0) {
            // Find tile with lowest fScore
            let current = openSet[0];
            for (const tile of openSet) {
                if (fScore.get(tile) < fScore.get(current)) {
                    current = tile;
                }
            }

            // If we reached the goal
            if (current === endTile) {
                const path = [];
                let temp = current;
                while (temp) {
                    path.unshift(temp);
                    temp = cameFrom.get(temp);
                }
                return path;
            }

            // Move current from open to closed set
            openSet.splice(openSet.indexOf(current), 1);
            closedSet.add(current);

            // Check all neighbors
            for (const neighbor of current.neighbors) {
                if (closedSet.has(neighbor)) continue;

                const tentativeGScore = gScore.get(current) + 1; // Distance between neighbors is 1

                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= gScore.get(neighbor)) {
                    continue;
                }

                cameFrom.set(neighbor, current);
                gScore.set(neighbor, tentativeGScore);
                fScore.set(neighbor, tentativeGScore + this.heuristic(neighbor, endTile));
            }
        }

        return []; // No path found
    }

    // Heuristic function for A* (Euclidean distance between tile centers)
    private heuristic(tileA: any, tileB: any): number {
        const dx = tileA.centerPoint.x - tileB.centerPoint.x;
        const dy = tileA.centerPoint.y - tileB.centerPoint.y;
        const dz = tileA.centerPoint.z - tileB.centerPoint.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // Add a 3D text label above a tile
    addTileLabel(tileIndex: number, text: string, color: number = 0xffffff, height: number = 5): THREE.Object3D {
        const tile = this.tiles[tileIndex];
        if (!tile) return new THREE.Object3D();

        // Track labels per tile for spacing
        if (!this.tileLabelCounts) {
            this.tileLabelCounts = new Map<number, number>();
        }
        const labelCount = this.tileLabelCounts.get(tileIndex) || 0;
        this.tileLabelCounts.set(tileIndex, labelCount + 1);

        // Create text sprite
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 64;

        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.font = 'Bold 24px Arial';
        context.textAlign = 'center';
        context.fillText(text, 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);

        // Position above tile with vertical spacing for multiple labels
        const verticalOffset = labelCount * 2; // Space labels 2 units apart vertically
        const position = this.getTilePosition(tileIndex, height + verticalOffset);
        sprite.position.copy(position);
        sprite.scale.set(8, 2, 1);

        // Add connecting line
        const lineGeometry = new THREE.BufferGeometry();
        const tilePos = this.getTilePosition(tileIndex, 0.5);
        lineGeometry.setFromPoints([tilePos, position]);

        const lineMaterial = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);

        // Group sprite and line
        const group = new THREE.Group();
        group.add(sprite);
        group.add(line);

        this.scene.add(group);
        this.tileLabels.push(group);

        return group;
    }

    // Get 3D position above a tile
    private getTilePosition(tileIndex: number, height: number): THREE.Vector3 {
        const tile = this.tiles[tileIndex];
        if (!tile) return new THREE.Vector3();

        // Normalize center point to sphere surface, then extend outward
        const center = tile.centerPoint;
        const length = Math.sqrt(center.x * center.x + center.y * center.y + center.z * center.z);
        const normalized = new THREE.Vector3(center.x / length, center.y / length, center.z / length);

        return normalized.multiplyScalar(this.radius + height);
    }

    // Create curved line between two tiles following sphere surface with elevated arc
    createCurvedLine(startTileIndex: number, endTileIndex: number, color: number = 0x00ffff, segments: number = 20): THREE.Mesh {
        const startTile = this.tiles[startTileIndex];
        const endTile = this.tiles[endTileIndex];

        if (!startTile || !endTile) {
            return new THREE.Mesh();
        }

        // Get normalized positions on sphere surface
        const startPos = this.getTilePosition(startTileIndex, 0.5);
        const endPos = this.getTilePosition(endTileIndex, 0.5);

        // Calculate distance between points to determine arc height
        const distance = startPos.distanceTo(endPos);
        const maxArcHeight = Math.min(distance * 0.3, this.radius * 0.25); // Dynamic height based on distance

        // Create great circle path with elevated midpoint
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;

            // Spherical linear interpolation (SLERP)
            const dot = startPos.clone().normalize().dot(endPos.clone().normalize());
            const theta = Math.acos(Math.max(-1, Math.min(1, dot)));

            let interpolated: THREE.Vector3;

            if (theta < 0.001) {
                // Points are very close, use linear interpolation
                interpolated = startPos.clone().lerp(endPos, t);
            } else {
                const sinTheta = Math.sin(theta);
                const a = Math.sin((1 - t) * theta) / sinTheta;
                const b = Math.sin(t * theta) / sinTheta;

                interpolated = startPos.clone().multiplyScalar(a).add(endPos.clone().multiplyScalar(b));
                interpolated.normalize();
            }

            // Add parabolic height curve - highest at midpoint (t=0.5)
            const heightMultiplier = 1 - Math.pow(2 * t - 1, 2); // Parabola: max at t=0.5, min at t=0,1
            const currentHeight = 0.5 + (maxArcHeight * heightMultiplier);

            interpolated.multiplyScalar(this.radius + currentHeight);
            points.push(interpolated);
        }

        // Create tube geometry following the curve
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.08, 6, false);
        const tubeMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9
        });

        const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
        this.scene.add(tubeMesh);
        this.pathLines.push(tubeMesh);

        return tubeMesh;
    }

    // Clear all path lines
    clearPathLines() {
        for (const line of this.pathLines) {
            this.scene.remove(line);
            line.geometry.dispose();
            (line.material as THREE.Material).dispose();
        }
        this.pathLines = [];
    }

    // Clear all tile labels
    clearTileLabels() {
        for (const label of this.tileLabels) {
            this.scene.remove(label);
            // Dispose of materials and geometries in the group
            label.traverse((child) => {
                if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                } else if (child instanceof THREE.Sprite) {
                    child.material.dispose();
                }
            });
        }
        this.tileLabels = [];
        this.tileLabelCounts = new Map<number, number>(); // Reset label counts
    }

    private createMeshes() {
        const landColors = [0x7cfc00, 0x397d02, 0x77ee00, 0x61b329, 0x83f52c];
        const oceanColors = [0x0f2342, 0x0f1e38, 0x1e3a8a];

        for (const tile of this.tiles) {
            if (tile.boundary.length < 3) continue;

            // Get terrain info and elevation
            const latLon = tile.getLatLon(this.radius);
            const terrainInfo = this.getTerrainInfo(latLon.lat, latLon.lon);

            // Calculate elevation multiplier based on terrain type
            let elevationMultiplier = 0;
            if (terrainInfo.type === 'mountain') {
                elevationMultiplier = 0.08; // Moderate mountain height
            } else if (terrainInfo.type === 'arctic' && terrainInfo.elevation > 150) {
                elevationMultiplier = 0.06; // Snow-capped peaks
            } else if (terrainInfo.type === 'desert') {
                elevationMultiplier = 0.03; // Slight elevation for dunes/mesas
            } else if (terrainInfo.type === 'forest') {
                elevationMultiplier = 0.02; // Gentle hills
            } else if (terrainInfo.type === 'city') { // Alien crystals
                elevationMultiplier = 0.12; // Moderate crystal spires
            }

            const geometry = new THREE.BufferGeometry();
            const vertices: number[] = [];
            const indices: number[] = [];

            if (elevationMultiplier > 0) {
                // Create extruded geometry for elevated tiles (flat-topped)
                const elevationHeight = (terrainInfo.elevation / 255) * elevationMultiplier * this.radius;

                // Store original and elevated vertices
                const baseVertices: number[] = [];
                const topVertices: number[] = [];

                // Add base vertices (original surface) and top vertices (elevated uniformly)
                for (const bp of tile.boundary) {
                    // Base vertices (on sphere surface)
                    baseVertices.push(bp.x, bp.y, bp.z);

                    // Calculate elevated position (uniform elevation for flat top)
                    const length = Math.sqrt(bp.x * bp.x + bp.y * bp.y + bp.z * bp.z);
                    const normalX = bp.x / length;
                    const normalY = bp.y / length;
                    const normalZ = bp.z / length;

                    const elevatedX = bp.x + normalX * elevationHeight;
                    const elevatedY = bp.y + normalY * elevationHeight;
                    const elevatedZ = bp.z + normalZ * elevationHeight;

                    topVertices.push(elevatedX, elevatedY, elevatedZ);
                }

                // Add all vertices to the geometry (base first, then top)
                vertices.push(...baseVertices, ...topVertices);

                const numBoundaryPoints = tile.boundary.length;

                // Create top face triangles (elevated surface)
                for (let j = 1; j < numBoundaryPoints - 1; j++) {
                    indices.push(
                        numBoundaryPoints,           // first top vertex (acts as center)
                        numBoundaryPoints + j,       // top vertex j
                        numBoundaryPoints + j + 1    // top vertex j+1
                    );
                }
                if (numBoundaryPoints > 2) {
                    indices.push(
                        numBoundaryPoints,                           // first top vertex
                        numBoundaryPoints + numBoundaryPoints - 1,   // last top vertex
                        numBoundaryPoints + 1                       // second top vertex
                    );
                }

                // Create side walls connecting base to top
                for (let j = 0; j < numBoundaryPoints; j++) {
                    const nextJ = (j + 1) % numBoundaryPoints;

                    // Two triangles per side wall
                    indices.push(
                        j,                          // base vertex j
                        nextJ,                      // base vertex j+1
                        numBoundaryPoints + j       // top vertex j
                    );

                    indices.push(
                        nextJ,                      // base vertex j+1
                        numBoundaryPoints + nextJ,  // top vertex j+1
                        numBoundaryPoints + j       // top vertex j
                    );
                }

                // Create bottom face triangles (base surface) - facing inward
                for (let j = 1; j < numBoundaryPoints - 1; j++) {
                    indices.push(
                        0,      // first base vertex (acts as center)
                        j + 1,  // base vertex j+1 (reversed winding)
                        j       // base vertex j
                    );
                }
                if (numBoundaryPoints > 2) {
                    indices.push(
                        0,                      // first base vertex
                        1,                      // second base vertex (reversed)
                        numBoundaryPoints - 1   // last base vertex
                    );
                }

            } else {
                // Create simple flat geometry for non-elevated tiles
                for (const bp of tile.boundary) {
                    vertices.push(bp.x, bp.y, bp.z);
                }

                // Create triangles
                for (let j = 1; j < tile.boundary.length - 1; j++) {
                    indices.push(0, j, j + 1);
                }
                if (tile.boundary.length > 2) {
                    indices.push(0, tile.boundary.length - 1, 1);
                }
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();

            // Add UV coordinates for texture mapping
            const uvs: number[] = [];
            if (elevationMultiplier > 0) {
                // For elevated tiles, add UVs for both base and top vertices
                for (const bp of tile.boundary) {
                    // Convert 3D position to UV coordinates
                    const lat = Math.asin(bp.y / this.radius) * 180 / Math.PI;
                    const lon = Math.atan2(bp.z, bp.x) * 180 / Math.PI;
                    const u = (lon + 180) / 360;
                    const v = (lat + 90) / 180;
                    uvs.push(u, v);
                }
                // Duplicate UVs for top vertices
                uvs.push(...uvs);
            } else {
                // For flat tiles, add UVs for boundary vertices
                for (const bp of tile.boundary) {
                    // Convert 3D position to UV coordinates
                    const lat = Math.asin(bp.y / this.radius) * 180 / Math.PI;
                    const lon = Math.atan2(bp.z, bp.x) * 180 / Math.PI;
                    const u = (lon + 180) / 360;
                    const v = (lat + 90) / 180;
                    uvs.push(u, v);
                }
            }
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

            const color = terrainInfo.color;

            // Load visual texture (earth-blue-marble.jpg)
            const textureLoader = new THREE.TextureLoader();
            const visualTexture = textureLoader.load('earth-blue-marble.jpg');
            visualTexture.wrapS = THREE.RepeatWrapping;
            visualTexture.wrapT = THREE.RepeatWrapping;

            const material = new THREE.MeshLambertMaterial({
                color: color,
                map: visualTexture,
                transparent: true,
                opacity: 0.9
            });

            const mesh = new THREE.Mesh(geometry, material);
            tile.mesh = mesh;
            this.scene.add(mesh);
        }

        console.log(`✅ Created ${this.tiles.length} tiles`);
    }

    private createPlanetMesh() {
        const geometry = new THREE.SphereGeometry(this.radius, 256, 256);
        const textureLoader = new THREE.TextureLoader();

        const visualTexture = textureLoader.load("earth-blue-marble.jpg");
        visualTexture.wrapS = THREE.RepeatWrapping;
        visualTexture.wrapT = THREE.ClampToEdgeWrapping;
        visualTexture.colorSpace = THREE.SRGBColorSpace;
        visualTexture.repeat.set(1, 1);

        const continentMask = textureLoader.load("earth-bump.jpg");
        continentMask.colorSpace = THREE.LinearSRGBColorSpace;
        continentMask.wrapT = THREE.RepeatWrapping;
        continentMask.wrapS = THREE.ClampToEdgeWrapping;
        continentMask.repeat.set(1, 1);

        const material = new THREE.MeshStandardMaterial({
            map: visualTexture,
            displacementMap: continentMask,
            displacementScale: this.radius * 0.1, // how much continents rise
        });

        // Create mesh
        this.planetMesh = new THREE.Mesh(geometry, material);
        this.planetMesh.renderOrder = 0;
        this.scene.add(this.planetMesh);

        console.log(`🌍 Created planet mesh with extruded continents`);
    }

    private createAtmosphereMesh() {



        const textureLoader = new THREE.TextureLoader();
        const atmosphereTexture = textureLoader.load("clouds.png", () => {
            console.log("☁️ Cloud texture loaded successfully");
        });

        const geometry = new THREE.SphereGeometry(this.radius * 1.12, 64, 64);

        const cloudMaterial = new THREE.MeshStandardMaterial({
            map: atmosphereTexture,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        this.atmosphereMesh = new THREE.Mesh(geometry, cloudMaterial);
        this.atmosphereMesh.renderOrder = 999;
        this.scene.add(this.atmosphereMesh);
    }

    getTiles(): Tile[] {
        return this.tiles;
    }

    getPlanetMesh(): THREE.Mesh | undefined {
        return this.planetMesh;
    }

    getAtmosphereMesh(): THREE.Mesh | undefined {
        return this.atmosphereMesh;
    }

    // Animate the atmosphere clouds
    animateAtmosphere(deltaTime: number) {
        if (this.atmosphereMesh) {
            // Rotate slightly + move texture for smooth effect
            //this.atmosphereMesh.rotation.y += deltaTime * 0.0005;
        }
    }

    setTileColor(tileIndex: number, color: number) {
        if (tileIndex >= 0 && tileIndex < this.tiles.length && this.tiles[tileIndex].mesh) {
            (this.tiles[tileIndex].mesh!.material as THREE.MeshLambertMaterial).color.setHex(color);
        }
    }

    // Clear existing tiles and regenerate
    regenerate(radius: number, numDivisions: number, hexSize: number) {
        // Clear existing meshes
        for (const tile of this.tiles) {
            if (tile.mesh) {
                this.scene.remove(tile.mesh);
                tile.mesh.geometry.dispose();
                (tile.mesh.material as THREE.Material).dispose();
            }
        }

        // Clear 3D elements
        this.clearPathLines();
        this.clearTileLabels();

        // Clear planet and atmosphere meshes
        if (this.planetMesh) {
            this.scene.remove(this.planetMesh);
            this.planetMesh.geometry.dispose();
            (this.planetMesh.material as THREE.Material).dispose();
            this.planetMesh = undefined;
        }

        if (this.atmosphereMesh) {
            this.scene.remove(this.atmosphereMesh);
            this.atmosphereMesh.geometry.dispose();
            (this.atmosphereMesh.material as THREE.Material).dispose();
            this.atmosphereMesh = undefined;
        }

        // Reset
        this.tiles = [];
        this.tileLookup = {};
        Face.idCounter = 0;

        // Update radius for new generation
        this.radius = radius;

        // Regenerate
        this.generateHexasphere(radius, numDivisions, hexSize, this.viewMode);
    }
}

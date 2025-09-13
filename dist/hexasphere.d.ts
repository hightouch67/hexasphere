import * as THREE from 'three';

declare class Face {
    static idCounter: number;
    id: number;
    points: [Point, Point, Point];
    centroid?: Point;
    constructor(point1: Point, point2: Point, point3: Point, register?: boolean);
    getOtherPoints(point1: Point): Point[];
    isAdjacentTo(face2: Face): boolean;
    getCentroid(): Point;
}

export declare class HexaSphere {
    radius: number;
    tiles: Tile[];
    tileLookup: {
        [key: string]: Tile;
    };
    private scene;
    private projectionCanvas?;
    private projectionData?;
    private pathLines;
    private tileLabels;
    private tileLabelCounts?;
    private planetMesh?;
    viewMode: 'planet' | 'tile' | 'both';
    constructor(radius: number, numDivisions: number, hexSize: number, scene: THREE.Scene, viewMode: 'planet' | 'tile' | 'both');
    private loadProjectionMap;
    private generateHexasphere;
    private isLand;
    isLandPublic(lat: number, lon: number): boolean;
    private getBasicTerrainType;
    private getMountainDensity;
    getTerrainInfo(lat: number, lon: number): {
        type: 'ocean' | 'land' | 'desert' | 'forest' | 'mountain' | 'arctic' | 'city';
        elevation: number;
        temperature: number;
        color: number;
    };
    findPath(startTile: any, endTile: any): any[];
    private heuristic;
    addTileLabel(tileIndex: number, text: string, color?: number, height?: number): THREE.Object3D;
    private getTilePosition;
    createCurvedLine(startTileIndex: number, endTileIndex: number, color?: number, segments?: number): THREE.Mesh;
    clearPathLines(): void;
    clearTileLabels(): void;
    private createMeshes;
    private createPlanetMesh;
    getTiles(): Tile[];
    getPlanetMesh(): THREE.Mesh | undefined;
    setTileColor(tileIndex: number, color: number): void;
    regenerate(radius: number, numDivisions: number, hexSize: number): void;
}

declare class Point {
    x: number;
    y: number;
    z: number;
    faces: Face[];
    constructor(x?: number, y?: number, z?: number);
    subdivide(point: Point, count: number, checkPoint: (p: Point) => Point): Point[];
    segment(point: Point, percent: number): Point;
    project(radius: number): Point;
    registerFace(face: Face): void;
    getOrderedFaces(): Face[];
    toString(): string;
}

declare class Tile {
    centerPoint: Point;
    faces: Face[];
    boundary: Point[];
    neighborIds: string[];
    neighbors: Tile[];
    mesh?: THREE.Mesh;
    constructor(centerPoint: Point, hexSize?: number);
    getLatLon(radius: number): {
        lat: number;
        lon: number;
    };
    toString(): string;
}

export { }

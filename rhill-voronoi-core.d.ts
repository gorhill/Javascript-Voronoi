declare class Point {
    x: number;
    y: number;
}

declare class Site {
    x: number;
    y: number;
    voronoiId: number;
}

declare class Cell {
    site: Site;
    halfedges: HalfEdge[];
    closeMe: boolean;
}

declare class Edge {
    lSite: Site;
    rSite: Site;
    vb: Point;
    va: Point;
}

declare class HalfEdge {
    site: Site;
    edge: Edge;
    angle: number;
    getStartpoint(): Point;
    getEndpoint(): Point;
}

declare class BBox {
    xl: number;
    xr: number;
    yt: number;
    yb: number;
}

declare class VoronoiDiagram {
    site: any;
    cells: Cell[];
    edges: Edge[];
    vertices: Point[];
    execTime: number;
}

declare class Voronoi {
    constructor();
    compute(sites: Point[], bbox: BBox): VoronoiDiagram;
}

export = Voronoi;

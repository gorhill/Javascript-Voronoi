
declare namespace Voronoi {
    class Point {
        x: number;
        y: number;
    }

    class Site {
        x: number;
        y: number;
        voronoiId: number;
    }

    class Cell {
        site: Site;
        halfedges: HalfEdge[];
        closeMe: boolean;
    }

    class Edge {
        lSite: Site;
        rSite: Site;
        vb: Point;
        va: Point;
    }

    class HalfEdge {
        site: Site;
        edge: Edge;
        angle: number;
        getStartpoint(): Point;
        getEndpoint(): Point;
    }

    class BBox {
        xl: number;
        xr: number;
        yt: number;
        yb: number;
    }

    class VoronoiDiagram {
        site: any;
        cells: Cell[];
        edges: Edge[];
        vertices: Point[];
        execTime: number;
    }
}

declare class Voronoi {
    constructor();
    compute(sites: Voronoi.Point[], bbox: Voronoi.BBox): Voronoi.VoronoiDiagram;
}

export = Voronoi;

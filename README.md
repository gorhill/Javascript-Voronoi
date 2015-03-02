# Javascript-Voronoi

A Javascript implementation of Steven J. Fortune's algorithm to
efficiently compute Voronoi diagrams. The Voronoi object's purpose is
to solely compute a Voronoi diagram, it is completely standalone, with
no dependency on external code: it contains no rendering code: that is
left to the user of the library.

## Core files

* rhill-voronoi-core.js

Where the Voronoi object is implemented. This is a standalone library, there
is no dependency.

* rhill-voronoi-core.min.js

The minimized version (using YUI compressor)

## Demo files

* rhill-voronoi-demo1.html
* rhill-voronoi-demo2.html
* rhill-voronoi-demo3.php
* rhill-voronoi-demo4.html
* rhill-voronoi-demo5.html

Demo pages to demonstrate usage of the Voronoi object.

* excanvas/*

Used by demo pages.

ExplorerCanvas, giving pre-HTML5 Internet Explorer the ability to make sense
of HTML5's canvas element. Pulled from http://code.google.com/p/explorercanvas/

* mootools/*

Used by rhill-voronoi-demo3.php

* Above pages available at http://www.raymondhill.net/voronoi/


## Main object: Voronoi

A Javascript object which allows to compute a Voronoi diagram.
The Voronoi object doesn't render the resulting Voronoi diagram,
the user is responsible for rendering the diagram.

## Usage

Roughly:

``` javascript
var voronoi = new Voronoi();
var bbox = {xl: 0, xr: 800, yt: 0, yb: 600}; // xl is x-left, xr is x-right, yt is y-top, and yb is y-bottom
var sites = [ {x: 200, y: 200}, {x: 50, y: 250}, {x: 400, y: 100} /* , ... */ ];

// a 'vertex' is an object exhibiting 'x' and 'y' properties. The
// Voronoi object will add a unique 'voronoiId' property to all
// sites. The 'voronoiId' can be used as a key to lookup the associated cell
// in diagram.cells.

var diagram = voronoi.compute(sites, bbox);
```

The returned 'diagram' variable is a Javascript object with the
following properties:

```
diagram.vertices
```

An array of unordered, unique ```Voronoi.Vertex``` objects making up the
Voronoi diagram. Each ```Voronoi.Vertex``` object in the list is shared by
many ```Voronoi.Edge``` objects.

```
diagram.edges
```

An array of unordered, unique ```Voronoi.Edge``` objects making up the
Voronoi diagram. ```Voronoi.Edges``` are defined by two vertices,
```va``` and ```vb```, which vertices are shared by connected edges. This mean
that if you change one vertex belonging to an edge, other connected edges
will also be changed.

```
diagram.cells
```

An array of ```Voronoi.Cell``` objects making up the Voronoi diagram. A
```Voronoi.Cell``` object might have an empty array of ```halfedges```,
meaning no Voronoi cell could be computed for a particular cell.

```
diagram.execTime
```

The time it took to compute the Voronoi diagram, in milliseconds.

Added on October 12, 2013: In order to help improve performance,
`Voronoi.recycle()` has been added to allow the recycling of a returned Voronoi
diagram. Usage:

``` javascript
var diagram;
...

// some kind of loop starting here (whether outright or through a timer)
...

voronoi.recycle(diagram);
// diagram.vertices, diagram.edges and diagram.cells can no longer be used!
diagram = voronoi.compute(sites, bbox);

// do stuff with content of `diagram`
...
```

This new method helps performance significantly when re-computing a Voronoi
diagram, as it saves on memory allocation, and associated garbage collection.

## Public objects

```
Voronoi
```

The ```Voronoi``` object which computes a Voronoi diagram.

```
Voronoi.Vertex
```

* ```x```: no explanation required.

* ```y```: no explanation required.

```
Voronoi.Edge
```

* ```lSite```: the Voronoi site object at the left of this ```Voronoi.Edge```
object. The site object is just a reference to a site in the array of sites
supplied by the user when ```Voronoi.compute()``` was called.

* ```rSite```: the Voronoi site object at the right of this ```Voronoi.Edge```
object (can be null, when this is a border edge). The site object is just a
reference to a site in the array of sites supplied by the user when
```Voronoi.compute()``` was called.

* ```va```: a ```Voronoi.Vertex``` object with an ```x``` and a ```y```
property defining the start point (relative to the Voronoi site on
the left) of this ```Voronoi.Edge``` object.

* ```vb```: a ```Voronoi.Vertex``` object with an ```x``` and a ```y```
property defining the end point (relative to Voronoi site on the left)
of this ```Voronoi.Edge``` object.

```
Voronoi.Cell
```

* ```site```: the Voronoi site object associated with the Voronoi cell.

* ```halfedges```: an array of ```Voronoi.Halfedge``` objects, ordered
counterclockwise, defining the polygon for this Voronoi cell.

```
Voronoi.Halfedge
```

* ```site```: the Voronoi site object owning this ```Voronoi.Halfedge```
object.

* ```edge```: a reference to the unique ```Voronoi.Edge``` object underlying
this ```Voronoi.Halfedge``` object.

* ```getStartpoint()```: a method returning a ```Voronoi.Vertex``` of the start
point of this halfedge. Keep in mind halfedges are always counterclockwise.

* ```getEndpoint()```: a method returning a ```Voronoi.Vertex``` object with
an ```x``` and a ```y``` property for the end point of this halfedge. Keep in
mind halfedges are always counterclockwise.

## License

Copyright (c) 2010-2013 Raymond Hill 
https://github.com/gorhill/Javascript-Voronoi

Licensed under The MIT License 
http://en.wikipedia.org/wiki/MIT_License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

/*!
A custom Javascript implementation of Steven J. Fortune's algorithm to
compute Voronoi diagrams.

Copyright (C) 2010 Raymond Hill (http://www.raymondhill.net/blog/?p=9)

Licensed under The MIT License

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

*****

Author: Raymond Hill (rhill@raymondhill.net)
File: rhill-voronoi-core.js
Version: 0.90
Date: Sep. 21, 2010
Description: This is my personal Javascript implementation of
Steven Fortune's algorithm to generate Voronoi diagrams.

Portions of this software use, depend, or was inspired by the work of:

  "Fortune's algorithm" by Steven J. Fortune: For his clever
  algorithm to compute Voronoi diagrams.
  http://ect.bell-labs.com/who/sjf/

  "The Liang-Barsky line clipping algorithm in a nutshell!" by Daniel White,
  to efficiently clip a line within a rectangle.
  http://www.skytopia.com/project/articles/compsci/clipping.html

*****

History:

2011-02-14:
  Lower epsilon from 1e-5 to 1e-4, to fix problem reported at
  http://www.raymondhill.net/blog/?p=9#comment-1414

2010-09-21:
  First release.

*****

Usage:

  var vertices = [{x:300,y:300}, {x:100,y:100}, {x:200,y:500}, {x:250,y:450}, {x:600,y:150}];
  // xl, xr means x left, x right
  // yt, yb means y top, y bottom
  var bbox = {xl:0, xr:800, yt:0, yb:600};
  var voronoi = new Voronoi();
  // pass an array of objects, each of which exhibits x and y properties
  voronoi.setSites(vertices);
  // pass an object which exhibits xl, xr, yt, yb properties. The bounding
  // box will be used to connect unbound edges, and to close open cells
  result = voronoi.compute(bbox);
  // render, further analyze, etc.

Return value:
  An object with the following properties:

  result.sites = an array of unordered, unique Voronoi.Site objects underlying the Voronoi diagram.
  result.edges = an array of unordered, unique Voronoi.Edge objects making up the Voronoi diagram.
  result.cells = a dictionary of Voronoi.Cell object making up the Voronoi diagram. The Voronoi.Cell
    in the dictionary are keyed on their associated Voronoi.Site's unique id.
  result.execTime = the time it took to compute the Voronoi diagram, in milliseconds.

Voronoi.Site object:
  id: a unique id identifying this Voronoi site.
  x: the x position of this Voronoi site.
  y: the y position of this Voronoi site.
  destroy(): mark this Voronoi site object as destroyed, it will be removed from the
    internal collection and won't be part of the next Voronoi diagram computation.

  When adding vertices to the Voronoi object, through Voronoi.setSites() or
  Voronoi.addSites(), an internal collection of matching Voronoi.Site object is maintained,
  which is read accessible at all time through Voronoi.getSites(). You are allowed to
  change the x and/or y properties of any Voronoi.Site object in the array, before
  launching the computation of the Voronoi diagram. However, do *not* change the id
  of any Voronoi.Site object, this could break the computation of the Voronoi diagram.

Voronoi.Edge object:
  id: a unique id identifying this Voronoi edge.
  lSite: the Voronoi.Site object at the left of this Voronoi.Edge object.
  rSite: the Voronoi.Site object at the right of this Voronoi.Edge object (can be null).
  va: the Voronoi.Vertex object defining the start point (relative to the Voronoi.Site
    on the left) of this Voronoi.Edge object.
  vb: the Voronoi.Vertex object defining the end point (relative to Voronoi.Site on
    the left) of this Voronoi.Edge object.

  For edges which are used to close open cells (using the supplied bounding box), the
  rSite property will be null.

Voronoi.Cells object:
  A collection of Voronoi.Cell objects, keyed on the id of the associated Voronoi.Site
    object.
  numCells: the number of Voronoi.Cell objects in the collection.

Voronoi.Cell object:
  site: the Voronoi.Site object associated with the Voronoi cell.
  halfedges: an array of Voronoi.Halfedge objects, ordered counterclockwise, defining the
    polygon for this Voronoi cell.

Voronoi.Halfedge object:
  site: the Voronoi.Site object owning this Voronoi.Halfedge object.
  edge: a reference to the unique Voronoi.Edge object underlying this Voronoi.Halfedge object.
  getStartpoint(): a method returning a Voronoi.Vertex for the start point of this
    halfedge. Keep in mind halfedges are always countercockwise.
  getEndpoint(): a method returning a Voronoi.Vertex for the end point of this
    halfedge. Keep in mind halfedges are always countercockwise.

Voronoi.Vertex object:
  x: the x coordinate.
  y: the y coordinate.

*/

/*global self */

function Voronoi() {
	this.sites = [];
	this.siteEvents = [];
	this.circEvents = [];
	this.arcs = [];
	this.edges = []; /*TODO: use an object to hold edges?*/
	this.cells = new this.Cells();
	}

Voronoi.prototype.SITE_EVENT = 0;
Voronoi.prototype.CIRCLE_EVENT = 1;
Voronoi.prototype.VOID_EVENT = -1;
Voronoi.prototype.sqrt = self.Math.sqrt;
Voronoi.prototype.abs = self.Math.abs;
Voronoi.prototype.floor = self.Math.floor;
Voronoi.prototype.random = self.Math.random;
Voronoi.prototype.round = self.Math.round;
Voronoi.prototype.min = self.Math.min;
Voronoi.prototype.max = self.Math.max;
Voronoi.prototype.pow = self.Math.pow;
Voronoi.prototype.isNaN = self.isNaN;
Voronoi.prototype.PI = self.Math.PI;
Voronoi.prototype.EPSILON = 1e-4;
Voronoi.prototype.equalWithEpsilon = function(a,b){return this.abs(a-b)<1e-4;};
Voronoi.prototype.greaterThanWithEpsilon = function(a,b){return (a-b)>1e-4;};
Voronoi.prototype.greaterThanOrEqualWithEpsilon = function(a,b){return (b-a)<1e-4;};
Voronoi.prototype.lessThanWithEpsilon = function(a,b){return (b-a)>1e-4;};
Voronoi.prototype.lessThanOrEqualWithEpsilon = function(a,b){return (a-b)<1e-4;};

Voronoi.prototype.Beachsection = function(site) {
	this.site = site;
	this.edge = null;
	// below is strictly for caching purpose
	this.sweep = -Infinity;
	this.lid = 0;
	this.circleEvent = undefined;
	};

Voronoi.prototype.Beachsection.prototype.sqrt = self.Math.sqrt;

// given parabola 'site', return the intersection with parabola 'left'
// immediately to the left of x
Voronoi.prototype.Beachsection.prototype._leftParabolicCut = function(site,left,directrix) {
	// change code below at your own risk:
	// care has been taken to reduce errors due to
	// computers' finite arithmetic precision.
	// maybe can still be improved, will see if any
	// more of this kind of errors pop up again
	var rfocx = site.x;
	var rfocy = site.y;
	// parabola in degenerate case where focus is on directrix
	if (rfocy == directrix) {return rfocx;}
	var lfocx = left.x;
	var lfocy = left.y;
	// parabola in degenerate case where focus is on directrix
	if (lfocy == directrix) {return lfocx;}
	// both parabolas have same distance to directrix, thus break point is midway
	if (rfocy == lfocy) {return (rfocx+lfocx)/2;}
	// calculate break point the normal way
	var pby2 = rfocy-directrix;
	var plby2 = lfocy-directrix;
	var hl = lfocx-rfocx;
	var aby2 = 1/pby2-1/plby2;
	var b = hl/plby2;
	return (-b+this.sqrt(b*b-2*aby2*(hl*hl/(-2*plby2)-lfocy+plby2/2+rfocy-pby2/2)))/aby2+rfocx;
	};

// higher level method which caches result and attempt to reuse it
Voronoi.prototype.Beachsection.prototype.leftParabolicCut=function(left,sweep){
	if (this.sweep !== sweep || this.lid !== left.id) {
		this.sweep = sweep;
		this.lid = left.id;
		this.lBreak = this._leftParabolicCut(this.site,left,sweep);
		}
	return this.lBreak;
	};

Voronoi.prototype.Beachsection.prototype.isCollapsing=function(){
	return this.circleEvent !== undefined && this.circleEvent.type === Voronoi.prototype.CIRCLE_EVENT;
	};

Voronoi.prototype.Site = function(x,y) {
	this.id = this.constructor.prototype.idgenerator++;
	this.x = x;
	this.y = y;
	};

Voronoi.prototype.Site.prototype.destroy = function() {
	this.id = 0;
	};

Voronoi.prototype.Vertex = function(x,y) {
	this.x = x;
	this.y = y;
	};

Voronoi.prototype.Edge = function(lSite,rSite) {
	this.id = this.constructor.prototype.idgenerator++;
	this.lSite = lSite;
	this.rSite = rSite;
	this.va = this.vb = undefined;
	};

Voronoi.prototype.Halfedge = function(site,edge) {
	this.site = site;
	this.edge = edge;
	};

Voronoi.prototype.Cell = function(site) {
	this.site = site;
	this.halfedges = [];
	};

Voronoi.prototype.Cells = function() {
	this.numCells = 0;
	};

Voronoi.prototype.Cells.prototype.addCell = function(cell) {
	this[cell.site.id] = cell;
	this.numCells++;
	};

Voronoi.prototype.Cells.prototype.removeCell = function(cell) {
	delete this[cell.site.id];
	this.numCells--;
	};

// prototype our inner classes, more efficient than having these Javascript
// properties repeated for all instances.
Voronoi.prototype.Site.prototype.idgenerator = 1;

Voronoi.prototype.Edge.prototype.isLineSegment = function() {
		return this.id !== 0 && Boolean(this.va) && Boolean(this.vb);
		};

Voronoi.prototype.Edge.prototype.idgenerator = 1;

Voronoi.prototype.Halfedge.prototype.isLineSegment = function() {
		return this.edge.id !== 0 && Boolean(this.edge.va) && Boolean(this.edge.vb);
		};

Voronoi.prototype.Halfedge.prototype.getStartpoint = function() {
		return this.edge.lSite.id == this.site.id ? this.edge.va : this.edge.vb;
		};

Voronoi.prototype.Halfedge.prototype.getEndpoint = function() {
		return this.edge.lSite.id == this.site.id ? this.edge.vb : this.edge.va;
		};

//
// Fortune algorithm methods
//

// calculate the left break point of a particular beach section,
// given a particular sweep line
Voronoi.prototype.leftBreakPoint = function(iarc, sweep) {
	var arc = this.arcs[iarc];
	var site = arc.site;
	if (site.y == sweep) {return site.x;}
	if (iarc === 0) {return -Infinity;}
	return arc.leftParabolicCut(this.arcs[iarc-1].site,sweep);
	};

// calculate the right break point of a particular beach section,
// given a particular directrix
Voronoi.prototype.rightBreakPoint = function(iarc, sweep) {
	if (iarc < this.arcs.length-1) {
		return this.leftBreakPoint(iarc+1,sweep);
		}
	var site = this.arcs[iarc].site;
	return site.y == sweep ? site.x : Infinity;
	};

// find the index where a new site should be inserted.
// the index will be immediately following the left beach section.
// special case 1: the new site's parabola might not touch any beach section:
// this happens *only* when all the beach sections of the current beachline
// are on the directrix.
// In such case, the insertion point is always at the end of the list,
// since sites are processed with increasing y, then increasing x (IMPORTANT!)
// special case 2: the new site falls exactly in between two beach sections, in
// such case, the insertion point is as expected, before the right-hand beach
// section
Voronoi.prototype.findInsertionPoint = function(x, sweep) {
	var n = this.arcs.length;
	if (!n) { return 0; }
	var l = 0;
	var r = n;
	var i;
	while (l<r) {
		i = (l+r)>>1;
		if (this.lessThanWithEpsilon(x,this.leftBreakPoint(i,sweep))) {
			r = i;
			continue;
			}
		// check if x after right break point
		if (this.greaterThanOrEqualWithEpsilon(x,this.rightBreakPoint(i,sweep))) {
			l = i+1;
			continue;
			}
		return i;
		}
	return l;
	};

// INFO: Chromium profiling shows this to be a hot spot
Voronoi.prototype.findDeletionPoint = function(x, sweep) {
	var n = this.arcs.length;
	if (!n) { return 0; }
	var l = 0;
	var r = n;
	var i;
	var xcut;
	while (l<r) {
		i = (l+r)>>1;
		xcut = this.leftBreakPoint(i,sweep);
		if (this.lessThanWithEpsilon(x,xcut)) {
			r = i;
			continue;
			}
		if (this.greaterThanWithEpsilon(x,xcut)) {
			l = i+1;
			continue;
			}
		xcut = this.rightBreakPoint(i,sweep);
		if (this.greaterThanWithEpsilon(x,xcut)) {
			l = i+1;
			continue;
			}
		if (this.lessThanWithEpsilon(x,xcut)) {
			r = i;
			continue;
			}
		return i;
		}
	};

// this create and add an edge to internal collection, and also create
// two halfedges which are added to each site's counterclockwise array
// of halfedges.
Voronoi.prototype.createEdge = function(lSite,rSite,va,vb) {
	var edge = new this.Edge(lSite,rSite);
	this.edges.push(edge);
	if (va !== undefined) {
		this.setEdgeStartpoint(edge,lSite,rSite,va);
		}
	if (vb !== undefined) {
		this.setEdgeEndpoint(edge,lSite,rSite,vb);
		}
	this.cells[lSite.id].halfedges.push(new this.Halfedge(lSite,edge));
	this.cells[rSite.id].halfedges.push(new this.Halfedge(rSite,edge));
	return edge;
	};

Voronoi.prototype.createBorderEdge = function(lSite,va,vb) {
	var edge = new this.Edge(lSite,null);
	edge.va = va;
	edge.vb = vb;
	this.edges.push(edge);
	return edge;
	};

Voronoi.prototype.destroyEdge = function(edge) {
	edge.id = 0;
	};

Voronoi.prototype.setEdgeStartpoint = function(edge, lSite, rSite, vertex) {
	if (edge.va === undefined && edge.vb === undefined) {
		edge.va = vertex;
		edge.lSite = lSite;
		edge.rSite = rSite;
		}
	else if (edge.lSite.id == rSite.id) {
		edge.vb = vertex;
		}
	else {
		edge.va = vertex;
		}
	};

Voronoi.prototype.setEdgeEndpoint = function(edge, lSite, rSite, vertex) {
	this.setEdgeStartpoint(edge,rSite,lSite,vertex);
	};

Voronoi.prototype.removeArc = function(event) {
	var x = event.center.x;
	var y = event.center.y;
	var sweep = event.y;
	var deletionPoint = this.findDeletionPoint(x, sweep);
	// there could be more than one empty arc at the deletion point, this
	// happens when more than two edges are linked by the same vertex,
	// so we will collect all those edges by looking up both sides of
	// the deletion point
	// look left
	var iLeft = deletionPoint;
	while (iLeft-1 > 0 && this.arcs[iLeft-1].circleEvent && this.verticesAreEqual(event.center,this.arcs[iLeft-1].circleEvent.center) ) {
		iLeft--;
		}
	// look right
	var iRight = deletionPoint;
	while (iRight+1 < this.arcs.length && this.arcs[iRight+1].circleEvent && this.verticesAreEqual(event.center,this.arcs[iRight+1].circleEvent.center) ) {
		iRight++;
		}

	// walk through all the collapsed beach sections and set the start point
	// of their left edge
	var lArc, rArc;
	for (var iArc=iLeft; iArc<=iRight+1; iArc++) {
		lArc = this.arcs[iArc-1];
		rArc = this.arcs[iArc];
		this.setEdgeStartpoint(rArc.edge,lArc.site,rArc.site,new this.Vertex(x,y));
		}

	// void circle events of collapsed beach sections and adjacent beach sections
	this.voidCircleEvents(iLeft-1,iRight+1);

	// removed collapsed beach sections from beachline
	this.arcs.splice(iLeft,iRight-iLeft+1);

	// create new edge as we have a new transition between
	// two beach sections which were previously not adjacent
	lArc = this.arcs[iLeft-1];
	rArc = this.arcs[iLeft];

	rArc.edge = this.createEdge(lArc.site,rArc.site,undefined,new this.Vertex(x,y));

	// create circle events if any for beach sections left in the beachline
	// adjacent to collapsed sections
	this.addCircleEvents(iLeft-1,sweep);
	this.addCircleEvents(iLeft,sweep);
	};

Voronoi.prototype.addArc = function(site) {
	// find insertion point of new beach section on the beachline
	var newArc = new this.Beachsection(site);
	var insertionPoint = this.findInsertionPoint(site.x,site.y);

	// case: insert as last beach section, this case can happen only
	// when *all* previously processed sites have exactly the same
	// y coordinate.
	// this case can't result in collapsing beach sections, thus
	// no circle events need to be generated.
	if (insertionPoint == this.arcs.length) {

		// add new beach section
		this.arcs.push(newArc);

		// case: first beach section ever means no transitions, means
		// no edge is created
		if (insertionPoint === 0) {return;}

		// case: a new transition between two beach sections is
		// created, create an edge for these two beach sections
		newArc.edge = this.createEdge(this.arcs[insertionPoint-1].site,newArc.site);

		return;
		}

	var lArc, rArc;

	// case: new beach section to insert falls exactly
	// in between two existing beach sections:
	// the net result is that the transition between two existing beach
	// sections is destroyed -- aka a new end point for one edge is
	// defined, and two new transitions are created -- aka two new edges
	// are defined.
	if (insertionPoint > 0 &&
	    this.equalWithEpsilon(site.x,this.rightBreakPoint(insertionPoint-1,site.y)) &&
	    this.equalWithEpsilon(site.x,this.leftBreakPoint(insertionPoint,site.y))) {

		// before adding dddd:
		//   arcs: aaaaaaaa bbbbbbbb cccccccc
		//  edges:          ab       bc
		//                  ^
		// after adding dddd:
		//   arcs: aaaaaaaa dddd bbbbbbbb cccccccc
		//  edges:          ad   bd       bc
		//                  ^
		// transition ab disappears, meaning a new vertex is defined,
		// while transition ad and bd appear, meaning two new edges are
		// defined
		lArc = this.arcs[insertionPoint-1];
		rArc = this.arcs[insertionPoint];

		// invalidate circle events of left and right sites
		this.voidCircleEvents(insertionPoint-1,insertionPoint);

		// an existing transition disappears, meaning a vertex is defined at the
		// disappearance point
		var circle = this.circumcircle(lArc.site,site,rArc.site);
		this.setEdgeStartpoint(rArc.edge, lArc.site, rArc.site, new this.Vertex(circle.x,circle.y));

		// two new transitions appear at the new vertex location
		newArc.edge = this.createEdge(lArc.site,newArc.site,undefined,new this.Vertex(circle.x,circle.y));
		rArc.edge = this.createEdge(newArc.site,rArc.site,undefined,new this.Vertex(circle.x,circle.y));

		// insert new beach section
		this.arcs.splice(insertionPoint,0,newArc);

		// check whether the left and right beach sections are collapsing
		// and if so create circle events, to handle the point of collapse.
		this.addCircleEvents(insertionPoint-1,site.y);
		this.addCircleEvents(insertionPoint+1,site.y);

		return;
		}

	// case: this is the most-likely case, where an existing beach section
	// is split by the new beach section to insert.
	// adding a new beach section in the middle of an existing one causes two new 
	// transitions to appear -- but since both transitions involve the same two
	// sites, only one single edge is created, and assigned to two beach front
	// transitions (the 'edge' member of the beach section.)

	// invalidate circle event possibly associated with the beach section
	// to split
	this.voidCircleEvents(insertionPoint);

	// before:
	//   arcs: aaaaaaaa bbbbbbbb cccccccc
	//  edges:          ab       bc
	// after:
	//   arcs: aaaaaaaa bbbb dddd bbbb cccccccc
	//  edges:          ab   bd   db   bc
	//                        ^   ^
	// bd & db are actually the same edge, the orientation has just
	// not been decided yet

	// insert new beach section into beachline
	lArc = this.arcs[insertionPoint];
	rArc = new this.Beachsection(lArc.site);

	// insert new beach section into beachline
	this.arcs.splice(insertionPoint+1,0,newArc,rArc);

	// since we have a new transition between two beach sections,
	// a new edge is born
	newArc.edge = rArc.edge = this.createEdge(lArc.site,newArc.site);

	// check whether the left and right beach sections are collapsing
	// and if so create circle events, to handle the point of collapse.
	this.addCircleEvents(insertionPoint,site.y);
	this.addCircleEvents(insertionPoint+2,site.y);
	};

Voronoi.prototype.circumcircle = function(a,b,c) {
	var ax=a.x;
	var ay=a.y;
	var bx=b.x-ax;
	var by=b.y-ay;
	var cx=c.x-ax;
	var cy=c.y-ay;
	var d=2*(bx*cy-by*cx);
	var hb=bx*bx+by*by;
	var hc=cx*cx+cy*cy;
	var x=(cy*hb-by*hc)/d;
	var y=(bx*hc-cx*hb)/d;
	return {x:x+ax,y:y+ay,radius:this.sqrt(x*x+y*y)};
	};

Voronoi.prototype.addCircleEvents = function(iArc,sweep) {
	if (iArc <= 0 || iArc >= this.arcs.length-1) {return;}
	var arc=this.arcs[iArc];
	var lSite=this.arcs[iArc-1].site;
	var cSite=this.arcs[iArc].site;
	var rSite=this.arcs[iArc+1].site;
	// if any two sites are repeated in the same beach section triplet,
	// there can't be convergence
	if (lSite.id==rSite.id || lSite.id==cSite.id || cSite.id==rSite.id) {return;}
	// if points l->c->r are clockwise, then center beach section does not
	// converge, hence it can't end up as a vertex
	if ((lSite.y-cSite.y)*(rSite.x-cSite.x)<=(lSite.x-cSite.x)*(rSite.y-cSite.y)) {return;}
	// find circumscribed circle 
	var circle=this.circumcircle(lSite,cSite,rSite);
	// not valid if the bottom-most point of the circumcircle
	// is above the sweep line
	// TODO: And what if it is on the sweep line, should it be discarded if it is
	// *before* the last processed x value? Need to think about this.
	var ybottom=circle.y+circle.radius;
	if (!this.greaterThanOrEqualWithEpsilon(ybottom,sweep)) {return;}
	var circEvent={
		type: this.CIRCLE_EVENT,
		site: cSite,
		x: circle.x,
		y: ybottom,
		center: {x:circle.x, y:circle.y}
		};
	arc.circleEvent = circEvent;
	this.queuePushCircle(circEvent);
	};

Voronoi.prototype.voidCircleEvents = function(iLeft,iRight) {
	if ( iRight === undefined ) {iRight = iLeft;}
	iLeft = this.max(iLeft,0);
	iRight = this.min(iRight,this.arcs.length-1);
	while (iLeft <= iRight) {
		var arc = this.arcs[iLeft];
		if ( arc.circleEvent !== undefined ) {
			arc.circleEvent.type = this.VOID_EVENT;
			// after profiling in Chromium, found out assigning 'undefined' is much more efficient than
			// using 'delete' on the property, possibly because 'delete' causes a 're-classify' to trigger
			arc.circleEvent = undefined;
			}
		iLeft++;
		}
	};

// get rid of void events from the circle events queue
Voronoi.prototype.queueSanitize = function() {
	// ideally, the circle events queue should have *less*
	// circle events as there are beach sections on the
	// beachline -- all beach sections *cannot* be collapsing all at
	// the same time.
	// but void events other than at the end pile up and cause
	// the finding of insertion point for new circle events to
	// take longer and longer -- even though a binary search is used.
	// to remedy this, a threshold is used to completely clean up
	// the circle events queue from void events.
	// currently, I arbitrarily set the treshold at more than twice
	// the number of beach sections on the beachline.
	// also, we want to splice from right to left to minimize the size
	// of memory moves.
	var q = this.circEvents;
	var iRight = q.length;
	if (!iRight) {return;}
	// remove trailing void events only
	var iLeft = iRight;
	while (iLeft && q[iLeft-1].type === this.VOID_EVENT) {iLeft--;}
	var nEvents = iRight-iLeft;
	if (nEvents) {
		q.splice(iLeft,nEvents);
		}
	// remove all void events if queue grew too large
	var nArcs = this.arcs.length;
	if (q.length < nArcs*2) {return;}
	while (true) {
		iRight = iLeft-1;
		// find a right-most void event
		while (iRight>0 && q[iRight-1].type !== this.VOID_EVENT) {iRight--;}
		if (iRight<=0) {break;}
		// find a right-most non-void event immediately to the left of iRight
		iLeft = iRight-1;
		while (iLeft>0 && q[iLeft-1].type === this.VOID_EVENT) {iLeft--;}
		nEvents = iRight-iLeft;
		q.splice(iLeft,nEvents);
		// abort if queue has gotten small enough, this allow
		// to avoid having to go through the whole array, most
		// circle events are added toward the end of the queue
		if (q.length < nArcs) {return;}
		}
	};

Voronoi.prototype.queuePop = function() {
	// we will return a site or circle event
	var siteEvent = this.siteEvents.length > 0 ? this.siteEvents[this.siteEvents.length-1] : null;
	var circEvent = this.circEvents.length > 0 ? this.circEvents[this.circEvents.length-1] : null;
	// if one and only one is null, the other is a valid event
	if ( Boolean(siteEvent) !== Boolean(circEvent) ) {
		return siteEvent ? this.siteEvents.pop() : this.circEvents.pop();
		}
	// both queues are empty
	if (!siteEvent) {
		return null;
		}
	// both queues have valid events, return 'earliest'
	if (siteEvent.y < circEvent.y || (siteEvent.y == circEvent.y && siteEvent.x < circEvent.x)) {
		return this.siteEvents.pop();
		}
	return this.circEvents.pop();
	};

// rhill 2011-05-17:
//   Using Array.sort() after an Array.push() is out of question,
//   horrible exponential decrease in performance -- expected, but
//   I wanted to confirm. Confirmed.
Voronoi.prototype.queuePushCircle = function(o) {
	var q = this.circEvents;
	var r = q.length;
	if (r) {
		var l = 0;
		var i, c;
		while (l<r) {
			i = (l+r)>>1;
			c = o.y-q[i].y;
			if (!c) {c = o.x-q[i].x;}
			if (c>0) {r = i;}
			else {l = i+1;}
			}
		q.splice(l,0,o);
		}
	else {
		q.push(o);
		}
	};

Voronoi.prototype.getBisector = function(va,vb) {
	var r = {x:(va.x+vb.x)/2,y:(va.y+vb.y)/2};
	if (vb.y==va.y) {return r;}
	r.m = (va.x-vb.x)/(vb.y-va.y);
	r.b = r.y-r.m*r.x;
	return r;
	};

// connect a dangling edge (not if a cursory test tells us
// it is not going to be visible.
// return value:
//   false: the dangling endpoint couldn't be connected
//   true: the dangling endpoint could be connected
Voronoi.prototype.connectEdge = function(edge,bbox) {
	// skip if end point already connected
	var vb = edge.vb;
	if (!!vb) {return true;}

	// make local copy for performance purpose
	var va = edge.va;
	var xl = bbox.xl;
	var xr = bbox.xr;
	var yt = bbox.yt;
	var yb = bbox.yb;

	// get the line formula of the bisector
	var lSite = edge.lSite;
	var rSite = edge.rSite;
	var f = this.getBisector(lSite,rSite);

	// remember, direction of line (relative to left site):
	// upward: left.x < right.x
	// downward: left.x > right.x
	// horizontal: left.x == right.x
	// upward: left.x < right.x
	// rightward: left.y < right.y
	// leftward: left.y > right.y
	// vertical: left.y == right.y

	// depending on the direction, find the best side of the
	// bounding box to use to determine a reasonable start point

	// special case: vertical line
	if (f.m === undefined) {
		// doesn't intersect with viewport
		if (f.x < xl || f.x >= xr) {return false;}
		// downward
		if (lSite.x > rSite.x) {
			if (va === undefined) {
				va = new this.Vertex(f.x,yt);
				}
			else if (va.y >= yb) {
				return false;
				}
			vb = new this.Vertex(f.x,yb);
			}
		// upward
		else {
			if (va === undefined) {
				va = new this.Vertex(f.x,yb);
				}
			else if (va.y < yt) {
				return false;
				}
			vb = new this.Vertex(f.x,yt);
			}
		}
	// closer to horizontal than vertical, connect start point to the
	// left or right side of the bounding box
	else if (f.m < 1) {
		// rightward
		if (lSite.y < rSite.y) {
			if (va === undefined) {
				va = new this.Vertex(xl,f.m*xl+f.b);
				}
			else if (va.x >= xr) {
				return false;
				}
			vb = new this.Vertex(xr,f.m*xr+f.b);
			}
		// leftward
		else {
			if (va === undefined) {
				va = new this.Vertex(xr,f.m*xr+f.b);
				}
			else if (va.x < xl) {
				return false;
				}
			vb = new this.Vertex(xl,f.m*xl+f.b);
			}
		}
	// closer to vertical than horizontal, connect start point to the
	// top or bottom side of the bounding box
	else {
		// downward
		if (lSite.x > rSite.x) {
			if (va === undefined) {
				va = new this.Vertex((yt-f.b)/f.m,yt);
				}
			else if (va.y >= yb) {
				return false;
				}
			vb = new this.Vertex((yb-f.b)/f.m,yb);
			}
		// upward
		else {
			if (va === undefined) {
				va = new this.Vertex((yb-f.b)/f.m,yb);
				}
			else if (va.y < yt) {
				return false;
				}
			vb = new this.Vertex((yt-f.b)/f.m,yt);
			}
		}

	edge.va = va;
	edge.vb = vb;
	return true;
	};

// line-clipping code taken from:
//   Liang-Barsky function by Daniel White @ http://www.skytopia.com/project/articles/compsci/clipping.html
// Thanks!
// A bit modified to minimize code paths
Voronoi.prototype.clipEdge = function(edge,bbox) {
	var ax = edge.va.x;
	var ay = edge.va.y;
	var bx = edge.vb.x;
	var by = edge.vb.y;
	var t0 = 0;
	var t1 = 1;
	var dx = bx-ax;
	var dy = by-ay;
	// left
	var q = ax-bbox.xl;
	if (dx===0 && q<0) {return false;}
	var r = -q/dx;
	if (dx<0) {
		if (r<t0) {return false;}
		else if (r<t1) {t1=r;}
		}
	else if (dx>0) {
		if (r>t1) {return false;}
		else if (r>t0) {t0=r;}
		}
	// right
	q = bbox.xr-ax;
	if (dx===0 && q<0) {return false;}
	r = q/dx;
	if (dx<0) {
		if (r>t1) {return false;}
		else if (r>t0) {t0=r;}
		}
	else if (dx>0) {
		if (r<t0) {return false;}
		else if (r<t1) {t1=r;}
		}
	// top
	q = ay-bbox.yt;
	if (dy===0 && q<0) {return false;}
	r = -q/dy;
	if (dy<0) {
		if (r<t0) {return false;}
		else if (r<t1) {t1=r;}
		}
	else if (dy>0) {
		if (r>t1) {return false;}
		else if (r>t0) {t0=r;}
		}
	// bottom		
	q = bbox.yb-ay;
	if (dy===0 && q<0) {return false;}
	r = q/dy;
	if (dy<0) {
		if (r>t1) {return false;}
		else if (r>t0) {t0=r;}
		}
	else if (dy>0) {
		if (r<t0) {return false;}
		else if (r<t1) {t1=r;}
		}
	// edge intersect, clip it
	edge.va.x = ax+t0*dx;
	edge.va.y = ay+t0*dy;
	edge.vb.x = ax+t1*dx;
	edge.vb.y = ay+t1*dy;
	return true;
	};

// coming soon, last part for the Voronoi diagram
// to be complete et usable.
Voronoi.prototype.clipEdges = function(bbox) {
	// connect all dangling edges to bounding box
	// or get rid of them if it can't be done
	var edges = this.edges;
	var nEdges = edges.length;
	var edge;
	// iterate backward so we can splice safely and efficiently
	for (var iEdge=nEdges-1; iEdge>=0; iEdge-=1) {
		edge = edges[iEdge];
		if (!this.connectEdge(edge,bbox) || !this.clipEdge(edge,bbox) || this.verticesAreEqual(edge.va,edge.vb)) {
			this.destroyEdge(edge);
			edges.splice(iEdge,1);
			}
		}
	};

Voronoi.prototype.verticesAreEqual = function(a,b) {
	return this.equalWithEpsilon(a.x,b.x) && this.equalWithEpsilon(a.y,b.y);
	};

// this function is used to sort halfedges counterclockwise
Voronoi.prototype.sortHalfedgesCallback = function(a,b) {
	var ava = a.getStartpoint();
	var avb = a.getEndpoint();
	var bva = b.getStartpoint();
	var bvb = b.getEndpoint();
	return self.Math.atan2(bvb.y-bva.y,bvb.x-bva.x) - self.Math.atan2(avb.y-ava.y,avb.x-ava.x);
	};

// Close the cells.
// The cells are bound by the supplied bounding box.
// Each cell refers to its associated site, and a list
// of halfedges ordered counterclockwise.
Voronoi.prototype.closeCells = function(bbox) {
	var xl = bbox.xl;
	var xr = bbox.xr;
	var yt = bbox.yt;
	var yb = bbox.yb;
	// clip edges to bounding box
	this.clipEdges(bbox);
	// prune and order halfedges
	var cells = this.cells;
	var cell;
	var iLeft, iRight;
	var halfedges, nHalfedges;
	var edge;
	var startpoint, endpoint;
	var va, vb;
	for (var cellid in cells) {
		cell = cells[cellid];
		if (!(cell instanceof this.Cell)) {continue;}
		halfedges = cell.halfedges;
		iLeft = halfedges.length;
		// get rid of unused halfedges
		while (iLeft) {
			iRight = iLeft;
			while (iRight>0 && halfedges[iRight-1].isLineSegment()) {iRight--;}
			iLeft = iRight;
			while (iLeft>0 && !halfedges[iLeft-1].isLineSegment()) {iLeft--;}
			if (iLeft === iRight) {break;}
			halfedges.splice(iLeft,iRight-iLeft);
			}
		// remove cell if it has zero halfedges
		if (halfedges.length === 0) {
			cells.removeCell(cell);
			continue;
			}
		// reorder halfedges counterclockwise
		halfedges.sort(this.sortHalfedgesCallback);
		// close open cells
		// step 1: find first 'unclosed' point, if any.
		// an 'unclosed' point will be the end point of a halfedge which
		// does not match the start point of the following halfedge
		nHalfedges = halfedges.length;
		// special case: only one site, in which case, the viewport is the cell
		// ...
		// all other cases
		iLeft = 0;
		while (iLeft < nHalfedges) {
			iRight = (iLeft+1) % nHalfedges;
			endpoint = halfedges[iLeft].getEndpoint();
			startpoint = halfedges[iRight].getStartpoint();
			if (!this.verticesAreEqual(endpoint,startpoint)) {
				// if we reach this point, cell needs to be closed by walking
				// counterclockwise along the bounding box until it connects
				// to next halfedge in the list
/*
				// Debugging code to alert of instances of 'unclosable'
				// polygons
				if (!this.equalWithEpsilon(startpoint.x,xl) &&
				    !this.equalWithEpsilon(startpoint.x,xr) &&
				    !this.equalWithEpsilon(startpoint.y,yt) &&
				    !this.equalWithEpsilon(startpoint.y,yb)) {
					debugger;
					}
*/
				va = new this.Vertex(endpoint.x,endpoint.y);
				// walk downward along left side
				if (this.equalWithEpsilon(endpoint.x,xl) && this.lessThanWithEpsilon(endpoint.y,yb)) {
					vb = new this.Vertex(xl,this.equalWithEpsilon(startpoint.x,xl) ? startpoint.y : yb);
					}
				// walk rightward along bottom side
				else if (this.equalWithEpsilon(endpoint.y,yb) && this.lessThanWithEpsilon(endpoint.x,xr)) {
					vb = new this.Vertex(this.equalWithEpsilon(startpoint.y,yb) ? startpoint.x : xr,yb);
					}
				// walk upward along right side
				else if (this.equalWithEpsilon(endpoint.x,xr) && this.greaterThanWithEpsilon(endpoint.y,yt)) {
					vb = new this.Vertex(xr,this.equalWithEpsilon(startpoint.x,xr) ? startpoint.y : yt);
					}
				// walk leftward along top side
				else if (this.equalWithEpsilon(endpoint.y,yt) && this.greaterThanWithEpsilon(endpoint.x,xl)) {
					vb = new this.Vertex(this.equalWithEpsilon(startpoint.y,yt) ? startpoint.x : xl,yt);
					}
				edge = this.createBorderEdge(cell.site,va,vb);
				halfedges.splice(iLeft+1,0,new this.Halfedge(cell.site,edge));
				nHalfedges = halfedges.length;
				}
			iLeft++;
			}
		}
	};

Voronoi.prototype.addSites = function(vertices) {
	var nVertices = vertices.length;
	var v;
	for (var iVertex=0; iVertex<nVertices; iVertex++) {
		v = vertices[iVertex];
		this.sites.push(new this.Site(v.x,v.y));
		}
	};

Voronoi.prototype.setSites = function(vertices) {
	this.sites = [];
	this.addSites(vertices);
	};

Voronoi.prototype.getSites = function() {
	return this.sites;
	};

Voronoi.prototype.compute = function(bbox) {
	// to measure execution time
	var startTime = new Date();

	// init events queue
	this.siteEvents = [];
	this.circEvents = [];

	// rhill 2011-05017:
	//   Sort Voronoi sites first, for performance purpose. This
	//   way we no longer need Voronoi.queuePushSite()
	var sites = this.sites;
	sites.sort(function(a,b){
		var r = a.y - b.y;
		if (!r) {
			r = a.x - b.x;
			}
		return r;
		});

	// populate site events queue
	var nSites = sites.length,
		iSite = nSites,
		q = this.siteEvents,
		site, previous;
	while (--iSite >= 0) {
		site = sites[iSite];
		// prune voided sites
		if (!site.id) {
			sites.splice(iSite,1);
			continue;
			}
		// avoid duplicate sites
		if (previous && site.y == previous.y && site.x == previous.x) {
			continue;
			}
		q.push({type:this.SITE_EVENT, x:site.x, y:site.y, site:site});
		previous = site;
		}

	// init internal state
	this.arcs = [];
	this.edges = [];
	this.cells = new this.Cells();

	// process event queue
	var event = this.queuePop();
	while (event) {
		// add beach section
		if (event.type === this.SITE_EVENT) {
			this.cells.addCell(new this.Cell(event.site));
			this.addArc(event.site);
			}
		// remove beach section
		else if (event.type === this.CIRCLE_EVENT) {
			this.removeArc(event);
			}
		// void event, sanitize queue
		else {
			this.queueSanitize();
			}
		// next event
		event = this.queuePop();
		}

	// wrap-up: discard edges completely outside bounding box
	// and close all open cells
	this.closeCells(bbox);

	// to measure execution time
	var stopTime = new Date();

	// prepare return values
	var result = {
		sites: this.sites,
		cells: this.cells,
		edges: this.edges,
		execTime: stopTime.getTime()-startTime.getTime()
		};

	// clean up, no need to keep these around
	this.arcs = [];
	this.edges = [];
	this.cells = new this.Cells();

	return result;
	};

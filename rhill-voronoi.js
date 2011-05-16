/*!
Copyright 2010 Raymond Hill

Author: Raymond Hill
File: rhill-voronoi.js
Version: 0.9
Date: Sep. 12, 2010
Description: This is my personal Javascript implementation of
Steven Fortune's algorithm to generate Voronoi diagrams.

Portions of this software use, or depend on the work of:

* "Fortune's algorithm" by Steven Fortune: For his clever
  algorithm to compute Voronoi diagrams.
  http://ect.bell-labs.com/who/sjf/

* Alec McEachran's code to translate a parabola's focus &
  directrix into parameters for HTML5 canvas' quadraticCurveTo() method.
  http://alecmce.com/as3/parabolas-and-quadratic-bezier-curves

* "The Liang-Barsky line clipping algorithm in a nutshell!", to
  efficiently clip a line within a rectangle.
  http://www.skytopia.com/project/articles/compsci/clipping.html

* "Event properties / Mouse position" by Peter-Paul Koch, for
  his code snippet on how to correctly detect mouse coordinates.
  http://www.quirksmode.org/js/events_properties.html#position

Permission to use, copy, modify, and distribute this software for any
purpose without fee is hereby granted, provided that this entire notice
is included in all copies of any software which is or includes a copy
or modification of this software and in all copies of the supporting
documentation for such software.

THIS SOFTWARE IS BEING PROVIDED "AS IS", WITHOUT ANY EXPRESS OR IMPLIED
WARRANTY.  IN PARTICULAR, NEITHER THE AUTHORS NOR AT&T MAKE ANY
REPRESENTATION OR WARRANTY OF ANY KIND CONCERNING THE MERCHANTABILITY
OF THIS SOFTWARE OR ITS FITNESS FOR ANY PARTICULAR PURPOSE.

Update:

2011-02-14:
  Lower epsilon from 1e-5 to 1e-4, to fix problem reported at
  http://www.raymondhill.net/blog/?p=9#comment-1414

*/

/*global self */

var Voronoi = {
	//
	// Properties
	//
	sites: [],
	siteEvents: [],
	circEvents: [],
	arcs: [],
	edges: [],
	sweep: 0,
	SITE_EVENT: 0,
	CIRCLE_EVENT: 1,
	VOID_EVENT: -1,
	DEFAULT_NUM_SITES: 100,
	NUM_SITES_PROCESSED: 0,
	BINARY_SEARCHES: 0,
	BINARY_SEARCH_ITERATIONS: 0,
	PARABOLIC_CUT_CALCS: 0,
	ALL_PARABOLIC_CUT_CALCS: 0,
	BEACHLINE_SIZE: 0,
	CIRCLE_QUEUE_SIZE: 0,
	NUM_VOID_EVENTS: 0,
	NUM_CIRCLE_EVENTS: 0,
	TOTAL_NUM_EDGES: 0,
	NUM_DESTROYED_EDGES: 0,
	sqrt: self.Math.sqrt,
	abs: self.Math.abs,
	floor: self.Math.floor,
	random: self.Math.random,
	round: self.Math.round,
	min: self.Math.min,
	max: self.Math.max,
	pow: self.Math.pow,
	PI: self.Math.PI,
	isNaN: self.isNaN,
	DEFAULT_CANVAS_WIDTH: 800,
	DEFAULT_CANVAS_HEIGHT: 600,
	canvas: null,
	canvasMargin: 0,
	bbox: {xl:0,xr:800,yt:0,yb:600},

	//
	// Objects
	//
	Beachsection: function(site) {
		this.site = site;
		this.edge = null;
		// below is strictly for caching purpose
		this.sweep = -Infinity;
		this.lid = 0;
		this.circleEvent = undefined;
		},

	Site: function(x,y) {
		this.id = this.constructor.prototype.idgenerator++;
		this.x = x;
		this.y = y;
		},

	Cell: function(site) {
		this.site = site;
		this.halfedges = [];
		},

	Edge: function(lSite,rSite) {
		this.id = this.constructor.prototype.idgenerator++;
		this.lSite = lSite;
		this.rSite = rSite;
		this.va = this.vb = undefined;
		},

	Vertex: function(x,y) {
		this.x = x;
		this.y = y;
		},

	Halfedge: function(site,edge) {
		this.site = site;
		this.edge = edge;
		},

	//
	// Debugging stuff
	//
	assert: function(v) {
		if (!v) {debugger;}
		},

	//
	//  Methods
	//
	init: function() {
		// prototype our inner classes, more efficient than having these Javascript
		// properties repeated for all instances.
		this.Beachsection.prototype.PARENT = this;
		this.Beachsection.prototype.sqrt = self.Math.sqrt;
		// given parabola 'site', return the intersection with parabola 'left'
		// immediately to the left of x
		this.Beachsection.prototype._leftParabolicCut=function(site,left,directrix) {
			// change code below at your own risk:
			// care has been taken to reduce errors due to
			// computers' finite arithmetic precision.
			// maybe can still be improved, will see if any
			// more of this kind of errors pop up again
			this.PARENT.PARABOLIC_CUT_CALCS++;
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
		this.Beachsection.prototype.leftParabolicCut=function(left,sweep){
			this.PARENT.ALL_PARABOLIC_CUT_CALCS++;
			if (this.sweep !== sweep || this.lid !== left.id) {
				this.sweep = sweep;
				this.lid = left.id;
				this.lBreak = this._leftParabolicCut(this.site,left,sweep);
				}
			return this.lBreak;
			};
		this.Beachsection.prototype.isCollapsing=function(){
			return this.circleEvent !== undefined && this.circleEvent.type === this.PARENT.CIRCLE_EVENT;
			};

		this.Site.prototype.idgenerator = 1;

		this.Edge.prototype.isLineSegment = function() {
			return Boolean(this.id) && Boolean(this.va) && Boolean(this.vb);
			};
		this.Edge.prototype.idgenerator = 1;

		this.Halfedge.prototype.isLineSegment = function() {
			return Boolean(this.edge.id) && Boolean(this.edge.va) && Boolean(this.edge.vb);
			};
		this.Halfedge.prototype.getStartpoint = function() {
			return this.edge.lSite.id == this.site.id ? this.edge.va : this.edge.vb;
			};
		this.Halfedge.prototype.getEndpoint = function() {
			return this.edge.lSite.id == this.site.id ? this.edge.vb : this.edge.va;
			};

		// prepare canvas
		this.initCanvas();

		// and randomly generate a bunch of sites to have something to see
		this.generateSites(this.DEFAULT_NUM_SITES);
		},

	//
	// Epsilon-based comparison methods
	//
	// Note: changed to 1e-5, 1e-6 was still causing errors once in a while
	EPSILON: 1e-4,
	equalWithEpsilon: function(a,b){return this.abs(a-b)<1e-4;},
	greaterThanWithEpsilon: function(a,b){return (a-b)>1e-4;},
	greaterThanOrEqualWithEpsilon: function(a,b){return (b-a)<1e-4;},
	lessThanWithEpsilon: function(a,b){return (b-a)>1e-4;},
	lessThanOrEqualWithEpsilon: function(a,b){return (a-b)<1e-4;},

	//
	// Sites management methods
	//
	clearSites: function() {
		this.sites = [];
		this.reset();
		// reset id generators
		this.Site.prototype.idgenerator = 1;
		this.Edge.prototype.idgenerator = 1;
		},

	addSite: function(x,y) {
		this.sites.push(new this.Site(x,y));
		this.reset();
		this.processQueueAll();
		},

	generateSites: function(n) {
		this.randomSites(n);
		this.reset();
		this.processQueueAll();
		},

	randomSites: function(n) {
		var margin = this.canvasMargin;
		var xo = this.bbox.xl+margin;
		var dx = this.bbox.xr-margin*2;
		var yo = this.bbox.yt+margin;
		var dy = this.bbox.yb-margin*2;
		for (var i=0; i<n; i++) {
			this.sites.push(new this.Site(this.round(xo+this.random()*dx),this.round(yo+this.random()*dy)));
			}
		},

	parseSites: function(s) {
		// split string into values, eliminate all NaNs
		var values=s.split(/[^0-9-.+e]+/);
		var nValues=values.length;
		var iValue=0;
		while (iValue<nValues) {
			if (this.isNaN(parseFloat(values[iValue]))) {
				values.splice(iValue,1);
				nValues--;
				}
			else {
				iValue++;
				}
			}
		// number of x,y pairs
		var nPairs = values.length & 0xfffe;
		var x; var y;
		for (var iPair=0; iPair<nPairs; iPair+=2) {
			x = parseFloat(values[iPair]);
			y = parseFloat(values[iPair+1]);
			if (!this.isNaN(x) && !this.isNaN(y)) {
				this.sites.push(new this.Site(x,y));
				}
			}
		this.reset();
		this.processQueueAll();
		},

	parseLattices: function(s) {
		// split string into values, eliminate all NaNs
		var values = s.split(/[^0-9-.+e]+/);
		var nValues = values.length;
		var iValue = 0;
		while (iValue < nValues) {
			if (this.isNaN(self.parseFloat(values[iValue]))) {
				values.splice(iValue,1);
				nValues--;
				}
			else {
				iValue++;
				}
			}
		// number of quadruplets
		var nQuads = values.length & 0xfffc;
		var w = this.canvas.width;
		var h = this.canvas.height;
		var offx; var offy;
		var dx; var dy;
		for (var iQuad=0; iQuad<nQuads; iQuad+=4) {
			offx = self.parseFloat(values[iQuad]);
			offy = self.parseFloat(values[iQuad+1]);
			dx = self.parseFloat(values[iQuad+2]);
			dy = self.parseFloat(values[iQuad+3]);
			if (!this.isNaN(offx) && !this.isNaN(offy) && !this.isNaN(dx) && !this.isNaN(dy)) {
				for (var y=offy; y<(h+dy); y+=dy) {
					for (var x=offx; x<=(w+dx); x+=dx) {
						this.sites.push(new this.Site(x,y));
						}
					}
				}
			}
		this.reset();
		this.processQueueAll();
		},

	//
	// Fortune algorithm methods
	//
	reset: function() {
		this.NUM_SITES_PROCESSED = 0;
		this.BINARY_SEARCHES = 0;
		this.BINARY_SEARCH_ITERATIONS = 0;
		this.PARABOLIC_CUT_CALCS = 0;
		this.ALL_PARABOLIC_CUT_CALCS = 0;
		this.BEACHLINE_SIZE = 0;
		this.CIRCLE_QUEUE_SIZE = 0;
		this.LARGEST_CIRCLE_QUEUE_SIZE = 0;
		this.NUM_VOID_EVENTS = 0;
		this.NUM_CIRCLE_EVENTS = 0;
		this.TOTAL_NUM_EDGES = 0;
		this.NUM_DESTROYED_EDGES = 0;
		this.cellsClosed = false;
		this.queueInit();
		this.dumpBeachline();
		this.draw();
		},

	// calculate the left break point of a particular beach section,
	// given a particular sweep line
	leftBreakPoint: function(iarc, sweep) {
		var arc = this.arcs[iarc];
		var site = arc.site;
		if (site.y == sweep) {return site.x;}
		if (iarc === 0) {return -Infinity;}
		return arc.leftParabolicCut(this.arcs[iarc-1].site,sweep);
		},

	// calculate the right break point of a particular beach section,
	// given a particular directrix
	rightBreakPoint: function(iarc, sweep) {
		if (iarc < this.arcs.length-1) {
			return this.leftBreakPoint(iarc+1,sweep);
			}
		var site = this.arcs[iarc].site;
		return site.y == sweep ? site.x : Infinity;
		},

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
	findInsertionPoint: function(x, sweep) {
		this.BINARY_SEARCHES++;
		var n = this.arcs.length;
		if (!n) { return 0; }
		var l = 0;
		var r = n;
		var i;
		while (l<r) {
			this.BINARY_SEARCH_ITERATIONS++;
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
		},

	// INFO: Chromium profiling shows this a hot spot
	findDeletionPoint: function(x, sweep) {
		this.BINARY_SEARCHES++;
		var n = this.arcs.length;
		if (!n) { return 0; }
		var l = 0;
		var r = n;
		var i;
		var xcut;
		while (l<r) {
			this.BINARY_SEARCH_ITERATIONS++;
			i = (l+r)>>1;
			xcut = this.leftBreakPoint(i,sweep);
			if (this.lessThanWithEpsilon(x,xcut)) {
				r=i;
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
		//this.assert(false);
		},

	// this create and add an edge to internal collection, and also create
	// two halfedges which are added to each site's counterclockwise array
	// of halfedges.
	createEdge: function(lSite,rSite,va,vb) {
		var edge = new this.Edge(lSite,rSite);
		this.edges.push(edge);
		//this.assert(this.cells[lSite.id] != undefined);
		//this.assert(this.cells[rSite.id] != undefined);
		if (va !== undefined) {
			this.setEdgeStartpoint(edge,lSite,rSite,va);
			}
		if (vb !== undefined) {
			this.setEdgeEndpoint(edge,lSite,rSite,vb);
			}
		this.cells[lSite.id].halfedges.push(new this.Halfedge(lSite,edge));
		this.cells[rSite.id].halfedges.push(new this.Halfedge(rSite,edge));
		return edge;
		},

	createBorderEdge: function(lSite,va,vb) {
		var edge = new this.Edge(lSite,null);
		edge.va = va;
		edge.vb = vb;
		this.edges.push(edge);
		return edge;
		},

	destroyEdge: function(edge) {
		edge.id = edge.va = edge.vb = undefined;
		},

	setEdgeStartpoint: function(edge, lSite, rSite, vertex) {
		//this.assert((edge.lSite.id == lSite.id && edge.rSite.id == rSite.id) || (edge.rSite.id == lSite.id && edge.lSite.id == rSite.id));

		// I use to assert both va and vb weren't the same, but this
		// can happen under normal circumstances, this should not be
		// treated as an error

		if (edge.va === undefined && edge.vb === undefined) {
			edge.va = vertex;
			edge.lSite = lSite;
			edge.rSite = rSite;
			}
		else if (edge.lSite.id == rSite.id) {
			//this.assert(edge.vb === undefined);
			edge.vb = vertex;
			}
		else {
			//this.assert(edge.va === undefined);
			edge.va = vertex;
			}
		},
	setEdgeEndpoint: function(edge, lSite, rSite, vertex) {
		this.setEdgeStartpoint(edge,rSite,lSite,vertex);
		},

	removeArc: function(event) {
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
		while (iLeft-1 > 0 && this.equalWithEpsilon(x,this.leftBreakPoint(iLeft-1,sweep)) ) {
			iLeft--;
			}
		// look right
		var iRight = deletionPoint;
		while (iRight+1 < this.arcs.length && this.equalWithEpsilon(x,this.rightBreakPoint(iRight+1,sweep)) ) {
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
		},

	addArc: function(site) {
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
			this.setEdgeStartpoint(rArc.edge,lArc.site,rArc.site,new this.Vertex(circle.x,circle.y));

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
		this.arcs.splice(insertionPoint+1,0,newArc,rArc);

		// since we have a new transition between two beach sections,
		// a new edge is born
		newArc.edge = rArc.edge = this.createEdge(lArc.site,newArc.site);

		// check whether the left and right beach sections are collapsing
		// and if so create circle events, to handle the point of collapse.
		this.addCircleEvents(insertionPoint,site.y);
		this.addCircleEvents(insertionPoint+2,site.y);
		},

	circumcircle: function(a,b,c) {
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
		},

	addCircleEvents: function(iArc,sweep) {
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
		},

	voidCircleEvents: function(iLeft,iRight) {
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
		},

	queueInit: function() {
		this.sweep = 0;
		this.siteEvents = [];
		var n = this.sites.length;
		for (var i=0; i<n; i++) {
			var site = this.sites[i];
			this.queuePushSite({type:this.SITE_EVENT, x:site.x, y:site.y, site:site});
			}
		this.NUM_SITES_PROCESSED = this.siteEvents.length;
		this.circEvents = [];
		this.arcs = [];
		this.edges = [];
		this.cells = {};
		},

	// get rid of void events from the circle events queue
	queueSanitize: function() {
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
			this.NUM_VOID_EVENTS += nEvents;
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
			this.NUM_VOID_EVENTS += nEvents;
			q.splice(iLeft,nEvents);
			// abort if queue has gotten small enough, this allow
			// to avoid having to go through the whole array, most
			// circle events are added toward the end of the queue
			if (q.length < nArcs) {return;}
			}
		},

	queueIsEmpty: function() {
		this.queueSanitize();
		return this.siteEvents.length === 0 && this.circEvents.length === 0;
		},

	queuePeek: function() {
		this.queueSanitize();
		// we will return a site or circle event
		var siteEvent = this.siteEvents.length > 0 ? this.siteEvents[this.siteEvents.length-1] : null;
		var circEvent = this.circEvents.length > 0 ? this.circEvents[this.circEvents.length-1] : null;
		// if one and only one is null, the other is a valid event
		if ( Boolean(siteEvent) !== Boolean(circEvent) ) {
			return siteEvent ? siteEvent : circEvent;
			}
		// both queues are empty
		if (!siteEvent) {
			return null;
			}
		// both queues have valid events, return 'earliest'
		if (siteEvent.y < circEvent.y || (siteEvent.y == circEvent.y && siteEvent.x < circEvent.x)) {
			return siteEvent;
			}
		return circEvent;
		},

	queuePop: function() {
		var event = this.queuePeek();
		if (event) {
			if (event.type === this.SITE_EVENT) {
				this.siteEvents.pop();
				}
			else {
				this.circEvents.pop();
				}
			}
		return event;
		},

	queuePushSite: function(o) {
		var q = this.siteEvents;
		var r = q.length;
		if (r) {
			var l = 0;
			var i, c;
			while (l<r) {
				i = (l+r)>>1;
				c = o.y-q[i].y;
				if (!c) {c = o.x-q[i].x;}
				if (c>0) {r = i;}
				else if (c<0) {l = i+1;}
				else {return; /*Duplicate sites not allowed, quietly ignored*/ }
				}
			q.splice(l,0,o);
			}
		else {
			q.push(o);
			}
		},

	queuePushCircle: function(o) {
		this.NUM_CIRCLE_EVENTS++;
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
		},

	processQueueOne: function() {
		var event = this.queuePop();
		if (!event) {return;}
		this.sweep = event.y;
		if ( event.type === this.SITE_EVENT ) {
			//this.assert(this.cells[event.site.id] === undefined);
			this.cells[event.site.id] = new this.Cell(event.site);
			// add beach section
			this.addArc(event.site);
			this.BEACHLINE_SIZE += this.arcs.length;
			this.CIRCLE_QUEUE_SIZE += this.circEvents.length;
			this.LARGEST_CIRCLE_QUEUE_SIZE = this.max(this.circEvents.length,this.LARGEST_CIRCLE_QUEUE_SIZE);
			}
		else {
			//this.assert(event.type === this.CIRCLE_EVENT);
			// remove beach section
			this.removeArc(event);
			}
		// wrap-up: close all cells
		if (this.queueIsEmpty()) {
			this.closeCells();
			}
		},

	processQueueN: function(n) {
		while (n > 0 && !this.queueIsEmpty()) {
			this.processQueueOne();
			n -= 1;
			}
		if (this.queueIsEmpty()) {
			this.sweep = this.max(this.sweep,this.canvas.height);
			}
		},

	processQueueAll: function() {
		this.processQueueN(999999999);
		this.sweep = this.max(this.sweep,this.canvas.height);
		this.dumpBeachline();
		this.draw();
		},

	processUpTo: function(y) {
		var event;
		while (!this.queueIsEmpty()) {
			event = this.queuePeek();
			if (event.y > y) {break;}
			this.processQueueOne();
			}
		// let's not go backward
		this.sweep = this.max(this.sweep,y);
		// empty queue if sweep line is no longer visible
		if (this.sweep > this.canvas.height) {
			this.processQueueN(999999999);
			}
		},

	getBisector: function(va,vb) {
		var r = {x:(va.x+vb.x)/2,y:(va.y+vb.y)/2};
		if (vb.y==va.y) {return r;}
		r.m = (va.x-vb.x)/(vb.y-va.y);
		r.b = r.y-r.m*r.x;
		return r;
		},

	// connect a dangling edge (not if a cursory test tells us
	// it is not going to be visible.
	// return value:
	//   false: the dangling endpoint couldn't be connected
	//   true: the dangling endpoint could be connected
	connectEdge: function(edge) {
		var vb = edge.vb;
		if (!!vb) {return true;}
		var va = edge.va;
		var xl = this.bbox.xl;
		var xr = this.bbox.xr;
		var yt = this.bbox.yt;
		var yb = this.bbox.yb;

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
			//this.assert(lSite.x === rSite.x);
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

		//this.assert(va !== undefined && vb !== undefined);
		edge.va = va;
		edge.vb = vb;
		return true;
		},

	// line-clipping code taken from:
	// The Liang-Barsky line clipping algorithm in a nutshell!
	// http://www.skytopia.com/project/articles/compsci/clipping.html
	// Thanks!
	// A bit modified to minimize code paths
	clipEdge: function(edge) {
		// at this point no dangling edge is expected
		//this.assert(edge.va !== undefined && edge.vb !== undefined);
		var ax = edge.va.x;
		var ay = edge.va.y;
		var bx = edge.vb.x;
		var by = edge.vb.y;
		var t0 = 0;
		var t1 = 1;
		var dx = bx-ax;
		var dy = by-ay;
		// left
		var q = ax-this.bbox.xl;
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
		q = this.bbox.xr-ax;
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
		q = ay-this.bbox.yt;
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
		q = this.bbox.yb-ay;
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
		},

	// coming soon, last part for the Voronoi diagram
	// to be complete et usable.
	clipEdges: function() {
		// connect all dangling edges to bounding box
		// or get rid of them if it can't be done
		var edges = this.edges;
		var nEdges = this.TOTAL_NUM_EDGES = edges.length;
		var edge;
		// iterate backward so we can splice safely and efficiently
		for (var iEdge=nEdges-1; iEdge>=0; iEdge-=1) {
			edge = edges[iEdge];
			if (!this.connectEdge(edge) || !this.clipEdge(edge) || this.verticesAreEqual(edge.va,edge.vb)) {
				this.NUM_DESTROYED_EDGES++;
				this.destroyEdge(edge);
				edges.splice(iEdge,1);
				}
			}
		},

	verticesAreEqual: function(a,b) {
		return this.equalWithEpsilon(a.x,b.x) && this.equalWithEpsilon(a.y,b.y);
		},

	// this function is used to sort halfedges counterclockwise
	sortHalfedgesCallback: function(a,b) {
		var ava = a.getStartpoint();
		var avb = a.getEndpoint();
		var bva = b.getStartpoint();
		var bvb = b.getEndpoint();
		return self.Math.atan2(bvb.y-bva.y,bvb.x-bva.x) - self.Math.atan2(avb.y-ava.y,avb.x-ava.x);
		},

	validateCells: function(cell) {
		var halfedges = cell.halfedges;
		var nHalfedges = halfedges.length;
		var halfedge;
		for (var iHalfedge=0; iHalfedge<nHalfedges; iHalfedge++) {
			halfedge = halfedges[iHalfedge];
			//this.assert(halfedge.edge.va !== undefined && halfedge.edge.vb !== undefined);
			//this.assert(!this.verticesAreEqual(halfedge.edge.va,halfedge.edge.vb));
			}
		},

	// Close the cells.
	// The cells are bound by the supplied bounding box.
	// Each cell refers to its associated site, and a list
	// of halfedges ordered counterclockwise.
	closeCells: function() {
		if (this.cellsClosed) {return;}
		var xl = this.bbox.xl;
		var xr = this.bbox.xr;
		var yt = this.bbox.yt;
		var yb = this.bbox.yb;
		// clip edges to viewport
		this.clipEdges();
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
				delete cells[cellid];
				continue;
				}
			// reorder segments counterclockwise
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
		this.cellsClosed = true;
		},

	getCells: function() {
		this.closeCells();
		return this.cells;
		},

	initCanvas: function() {
		if (this.canvas) {return;}
		var canvas = document.getElementById('voronoiCanvas');
		if (!canvas.getContext) {return;}
		var ctx = canvas.getContext('2d');
		if (!ctx) {return;}
		canvas.width = this.DEFAULT_CANVAS_WIDTH;
		canvas.height = this.DEFAULT_CANVAS_HEIGHT;
		ctx.fillStyle='#fff';
		ctx.rect(0,0,canvas.width,canvas.height);
		ctx.fill();
		ctx.strokeStyle = '#888';
		ctx.stroke();
		this.canvas = canvas;

		// event handlers
		var me = this;
		canvas.onclick = function(e) {
			if (!e) {e=self.event;}
			// -----
			// http://www.quirksmode.org/js/events_properties.html#position
			var x = 0;
			var y = 0;
			if (e.pageX || e.pageY) {
				x = e.pageX;
				y = e.pageY;
				}
			else if (e.clientX || e.clientY) {
				x = e.clientX+document.body.scrollLeft+document.documentElement.scrollLeft;
				y = e.clientY+document.body.scrollTop+document.documentElement.scrollTop;
				}
			// -----
			me.addSite(x-this.offsetLeft,y-this.offsetTop);
			};
		},

	setCanvasSize: function(w,h) {
		if (this.isNaN(w) || this.isNaN(h)) {return;}
		this.canvas.width = this.max(Number(w),100);
		this.canvas.height = this.max(Number(h),100);
		this.bbox.xl = 0;
		this.bbox.xr = w;
		this.bbox.yt = 0;
		this.bbox.yb = h;
		this.canvasMargin = this.min(this.canvasMargin,w/4,h/4);
		this.draw();
		},

	setCanvasMargin: function(margin) {
		if (this.isNaN(margin) || margin < 0) {return;}
		this.canvasMargin = Number(margin);
		},

	draw: function() {
		var ctx = this.canvas.getContext('2d');
		this.drawBackground(ctx);
		this.drawSites(ctx);
		// sweep line
		if (this.sweep < this.canvas.height) {
			ctx.globalAlpha=0.9;
			ctx.strokeStyle='#00f';
			ctx.lineWidth=0.5;
			ctx.beginPath();
			ctx.moveTo(0,this.sweep);
			ctx.lineTo(this.canvas.width,this.sweep);
			ctx.stroke();
			}
		this.drawEdges(ctx);
		if (!this.queueIsEmpty()) {
			this.drawVertices(ctx);
			}
		if (this.sweep < this.canvas.height) {
			this.drawBeachline(ctx);
			}
		},

	drawBackground: function(ctx) {
		ctx.globalAlpha = 1;
		ctx.beginPath();
		ctx.rect(0,0,this.canvas.width,this.canvas.height);
		ctx.fillStyle = '#fff';
		ctx.fill();
		ctx.strokeStyle = '#888';
		ctx.stroke();
		},

	drawSites: function(ctx) {
		var queueIsEmpty = this.queueIsEmpty();
		ctx.beginPath();
		var nSites=this.sites.length;
		for (var iSite=0; iSite<nSites; iSite++){
			var site=this.sites[iSite];
			if (queueIsEmpty) {
				ctx.rect(site.x-0.25,site.y-0.25,1.5,1.5);
				}
			else {
				ctx.rect(site.x-0.5,site.y-0.5,2,2);
				}
			}
		ctx.globalAlpha = 1;
		ctx.fillStyle = '#000';
		ctx.fill();
		},

	drawCells: function() {
		var colvalues = '0123456789ABCDEF';
		var ctx = this.canvas.getContext('2d');
		var cells = this.getCells();
		if (!cells) {return;}
		var halfedges, nHalfedges, iHalfedge;
		var v;
		for (var cellid in cells) {
			halfedges = cells[cellid].halfedges;
			nHalfedges = halfedges.length;
			//this.assert(nSegments > 0);
			v = halfedges[0].getStartpoint();
			ctx.beginPath();
			ctx.moveTo(v.x,v.y);
			for (iHalfedge=0; iHalfedge<nHalfedges; iHalfedge++) {
				v = halfedges[iHalfedge].getEndpoint();
				ctx.lineTo(v.x,v.y);
				}
			ctx.fillStyle='#'+colvalues[(this.random()*16)&15]+colvalues[(this.random()*16)&15]+colvalues[(this.random()*16)&15];
			ctx.fill();
			}
		},

	drawBeachline: function(ctx) {
		// skip if no beach sections
		var nArcs=this.arcs.length;
		if (!nArcs) {return;}
		// prepare canvas drawing
		var cw = this.canvas.width;
		ctx.lineWidth = 1;
		// sweep line is parabolas' directrix
		var directrix = this.sweep;
		// prime left cut coordinates, this way
		// we have only one cut to compute for
		// each arc as we walk through them from left
		// to right
		var arc = this.arcs[0];
		var xl = 0;
		var yl, xr, yr;
		var focx = arc.site.x;
		var focy = arc.site.y;
		var p;
		if (focy == directrix) {
			xl = focx;
			yl = 0;
			}
		else {
			p = (focy-directrix)/2;
			yl = (focx*focx)/(4*p)+focy-p;
			}
		// walk through all beach sections
		var neighbour;
		var ac_x, ac_y, bc_x, bc_y, gx, gy, n;
		var pi_by_2 = this.PI*2;
		for (var iArc=0; iArc<nArcs; iArc++) {
			arc = this.arcs[iArc];
			// site is parabola's focus
			focx=arc.site.x;
			focy=arc.site.y;
			// draw circle event associated with the beach section
			if ( arc.isCollapsing() ) {
				var circEvent = arc.circleEvent;
				ctx.save();
				ctx.globalAlpha=0.25;
				ctx.fillStyle='#800';
				ctx.fillRect(circEvent.center.x-0.5,circEvent.center.y-0.5,2,2);
				ctx.beginPath();
				ctx.arc(circEvent.center.x,circEvent.center.y,circEvent.y-circEvent.center.y,0,pi_by_2,true);
				ctx.strokeStyle='#aaa';
				ctx.stroke();
				ctx.fillStyle='#aaa';
				ctx.beginPath();
				ctx.fillRect(circEvent.x-0.5,circEvent.y-0.5,2,2);
				ctx.restore();
				}
			// degenerate case where the focus of the parabola is on the directrix
			if (focy == directrix) {
				xr = focx;
				// since focus is on directrix, parabola is really a vertical line.
				// the top endpoint of the vertical line can be found by computing
				// the y value of the adajacent parabola on the left or right which
				// is not also on the directrix.
				// In the rare occurrence where no adjacent arcs are present,
				// than the line is terminated by the top of the
				// bounding box.
				neighbour = iArc>0 ? this.arcs[iArc-1] : null;
				// neighbour is also a degenerate?
				if (!neighbour || neighbour.site.y == directrix) {
					neighbour = iArc < this.arcs.length-1 ? this.arcs[iArc+1] : null;
					}
				// both neighbours are degenerate?
				if (!neighbour || neighbour.site.y == directrix) {
					yr = 0;
					}
				// found a nice neighbour, compute quadratic equation as usual
				else {
					p = (neighbour.site.y-directrix)/2;
					yr = this.pow(focx-neighbour.site.x,2)/(4*p)+neighbour.site.y-p;
					}
				ctx.strokeStyle = '#080';
				ctx.beginPath();
				ctx.moveTo(focx,focy);
				ctx.lineTo(focx,yr);
				ctx.stroke();
				xl=xr;
				yl=yr;
				continue;
				}
			// typical case, we need to find right cut point, oh and btw,
			// no need to go beyond the viewport
			xr = this.min(this.rightBreakPoint(iArc,directrix),cw);
			p = (focy-directrix)/2;
			yr = this.pow(xr-focx,2)/(4*p)+focy-p;
			// bother to draw only if beach section is within sight
			if (xr >= 0 && xl < cw && xr > xl) {
				// non-collapsing beach sections in green, collapsing ones in red
				ctx.strokeStyle = arc.isCollapsing() ? '#800' : '#080';
				// How to draw a parabola segment using canvas' quadraticCurveTo:
				// http://alecmce.com/as3/parabolas-and-quadratic-bezier-curves
				// Thanks!
				// Of course, I was able to simplify code because here I only draw parabolas
				// which are oriented vertically and always pointing up
				ac_x = focx-xl;
				ac_y = focy-directrix;
				bc_x = focx-xr;
				bc_y = focy-directrix;
				gx = (xr+focx)/2;
				gy = (directrix+focy)/2;
				n = ((gx-(xl+focx)/2)*ac_x+(gy-(directrix+focy)/2)*ac_y)/(bc_y*ac_x-bc_x*ac_y);
				ctx.beginPath();
				ctx.moveTo(xl,yl);
				ctx.quadraticCurveTo(gx-bc_y*n,gy+bc_x*n,xr,yr);
				ctx.stroke();
				}
			// current right cut become next iteration's left cut
			xl=xr;
			yl=yr;
			}
		},

	drawVertices: function(ctx) {
		ctx.beginPath();
		ctx.globalAlpha=1;
		var nEdges=this.edges.length;
		var edge;
		var va, vb;
		for (var iEdge=0; iEdge<nEdges; iEdge++) {
			edge=this.edges[iEdge];
			va = edge.va;
			if (va !== undefined) {
				ctx.rect(va.x-0.75,va.y-0.75,2.5,2.5);
				}
			vb = edge.vb;
			if (vb !== undefined) {
				ctx.rect(vb.x-0.75,vb.y-0.75,2.5,2.5);
				}
			}
		ctx.fillStyle='#07f';
		ctx.fill();
		},

	drawEdges: function(ctx) {
		ctx.beginPath();
		ctx.lineWidth=0.5;
		ctx.globalAlpha=1;
		var nEdges=this.edges.length;
		var edge;
		var va, vb;
		for (var iEdge=0; iEdge<nEdges; iEdge++) {
			edge=this.edges[iEdge];
			// skip dangling edges, they will be connected in some future
			if (edge.va === undefined || edge.vb === undefined) {continue;}
			va = edge.va;
			vb = edge.vb;
			ctx.moveTo(va.x,va.y);
			ctx.lineTo(vb.x,vb.y);
			}
		ctx.strokeStyle='#000';
		ctx.stroke();
		},

	dumpBeachline: function() {
		var html='';
		// various stats
		html+='Total number of sites processed: '+this.NUM_SITES_PROCESSED;
		html+='<br>Number of binary searches: '+this.BINARY_SEARCHES+'<br>Avg number of iterations per binary search: '+(this.BINARY_SEARCH_ITERATIONS/this.BINARY_SEARCHES).toFixed(2);
		html+='<br>Number of parabolic cut calculations: '+this.PARABOLIC_CUT_CALCS+' out of '+this.ALL_PARABOLIC_CUT_CALCS+' total';
		html+='<br>Average beachline size: '+(this.BEACHLINE_SIZE/this.sites.length).toFixed(2);
		html+='<br>Average circle event queue size: '+(this.CIRCLE_QUEUE_SIZE/this.sites.length).toFixed(2);
		html+='<br>Total number of cancelled circle events: '+this.NUM_VOID_EVENTS+' out of '+this.NUM_CIRCLE_EVENTS+' total ('+(this.NUM_VOID_EVENTS/this.NUM_CIRCLE_EVENTS*100).toFixed(0)+'%)';
		html+='<br>Largest circle events queue size: '+this.LARGEST_CIRCLE_QUEUE_SIZE+' events';
		html+='<br>Number of destroyed edges (outside the viewport): '+this.NUM_DESTROYED_EDGES+' out of a total of '+this.TOTAL_NUM_EDGES+' edges<br><br>';

		// Beachline
		var arc;
		var edge;
		var htmledge;
		var nArcs=this.arcs.length;
		html+='Beachline is composed of '+nArcs+' beach sections:<br>';
		for (var iArc=0; iArc<nArcs; iArc++) {
			arc=this.arcs[iArc];
			// first show edge details, since it's always the edge on the
			// left, thus the one shared with the beach section on the left
			htmledge='edge: ';
			edge=arc.edge;
			if (edge) {
				htmledge+='id='+edge.id;
				if (edge.va) {htmledge+=', start=(x:<b>'+(edge.va.x).toFixed(1)+'</b>, y:<b>'+(edge.va.y).toFixed(1)+'</b>)';}
				if (edge.vb) {htmledge+=', end=(x:<b>'+(edge.vb.x).toFixed(1)+'</b>, y:<b>'+(edge.vb.y).toFixed(1)+'</b>)';}
				}
			else {
				htmledge+='none';
				}
			if (!edge) {
				htmledge='<span style="margin-left:2em;color:#ccc">'+htmledge;
				}
			else if (!edge.va && !edge.vb) {
				htmledge='<span style="margin-left:2em;color:#888">'+htmledge;
				}
			else {
				//this.assert((edge.va === undefined) != (edge.vb === undefined));
				htmledge='<span style="margin-left:2em;color:#444">'+htmledge;
				}
			html+=htmledge+'</span><br>';
			// then display beach section details
			var xleft=this.leftBreakPoint(iArc,this.sweep);
			var xright=this.rightBreakPoint(iArc,this.sweep);
			html+='<span style="color:'+(arc.isCollapsing()?'#800':'#080')+'">';
			html+='xl=<b>'+xleft.toFixed(4)+'</b>, xr=<b>'+xright.toFixed(4)+'</b>, site={id:'+arc.site.id+', x:<b>'+arc.site.x+'</b>, y:<b>'+arc.site.y+'</b>}';
			if (arc.isCollapsing()) {
				html+=', collapsing at {x:<b>'+arc.circleEvent.x.toFixed(4)+'</b>, y:<b>'+arc.circleEvent.y.toFixed(4)+'</b>}';
				}
			html+='</span><br>';
			}
		var el=document.getElementById('console');
		if (el) {el.innerHTML=html;}
		}
	};

// TODO: fix this
var VoronoiAnimateTimer;
var VoronoiAnimatePixels;
var VoronoiAnimateDelay;
function VoronoiAnimateCallback() {
	VoronoiAnimateTimer = undefined;
	Voronoi.processUpTo(Voronoi.sweep+VoronoiAnimatePixels);
	Voronoi.draw();
	if (!Voronoi.queueIsEmpty() || Voronoi.sweep < Voronoi.bbox.yb) {
		VoronoiAnimateTimer = setTimeout(VoronoiAnimateCallback,VoronoiAnimateDelay);
		}
	else {
		Voronoi.dumpBeachline();
		}
	}
function VoronoiAnimate(px,ms) {
	if (VoronoiAnimateTimer !== undefined) {
		clearTimeout(VoronoiAnimateTimer);
		VoronoiAnimateTimer = undefined;
		}
	if (Voronoi.queueIsEmpty()) {
		Voronoi.reset();
		}
	// sanitize parameters
	VoronoiAnimatePixels = self.isNaN(px) ? 5 : Voronoi.max(px,1);
	// 10ms looks crazy but Chromium is lightning fast
	VoronoiAnimateDelay = self.isNaN(ms) ? 200 : Voronoi.max(ms,1);
	VoronoiAnimateTimer = setTimeout(VoronoiAnimateCallback,VoronoiAnimateDelay);
	}
function VoronoiAnimateStop() {
	if (VoronoiAnimateTimer !== undefined) {
		clearTimeout(VoronoiAnimateTimer);
		VoronoiAnimateTimer = undefined;
		Voronoi.dumpBeachline();
		}
	}

/*!
A custom Javascript implementation of Steven J. Fortune's algorithm to
compute Voronoi diagrams.
Copyright (C) 2010 Raymond Hill

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

*****

Author: Raymond Hill (rhill@raymondhill.net)
File: rhill-voronoi-core.js
Version: 0.9
Date: Sep. 21, 2010
Description: This is my personal Javascript implementation of
Steven Fortune's algorithm to generate Voronoi diagrams.

Portions of this software use, or depend on the work of:

  "Fortune's algorithm" by Steven J. Fortune: For his clever
  algorithm to compute Voronoi diagrams.
  http://ect.bell-labs.com/who/sjf/

  "The Liang-Barsky line clipping algorithm in a nutshell!" by Daniel White,
  to efficiently clip a line within a rectangle.
  http://www.skytopia.com/project/articles/compsci/clipping.html

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
function Voronoi(){this.sites=[];this.siteEvents=[];this.circEvents=[];this.arcs=[];this.edges=[];this.cells=new this.Cells()}Voronoi.prototype.SITE_EVENT=0;Voronoi.prototype.CIRCLE_EVENT=1;Voronoi.prototype.VOID_EVENT=-1;Voronoi.prototype.sqrt=self.Math.sqrt;Voronoi.prototype.abs=self.Math.abs;Voronoi.prototype.floor=self.Math.floor;Voronoi.prototype.random=self.Math.random;Voronoi.prototype.round=self.Math.round;Voronoi.prototype.min=self.Math.min;Voronoi.prototype.max=self.Math.max;Voronoi.prototype.pow=self.Math.pow;Voronoi.prototype.isNaN=self.isNaN;Voronoi.prototype.PI=self.Math.PI;Voronoi.prototype.EPSILON=0.00001;Voronoi.prototype.equalWithEpsilon=function(d,c){return this.abs(d-c)<0.00001};Voronoi.prototype.greaterThanWithEpsilon=function(d,c){return(d-c)>0.00001};Voronoi.prototype.greaterThanOrEqualWithEpsilon=function(d,c){return(c-d)<0.00001};Voronoi.prototype.lessThanWithEpsilon=function(d,c){return(c-d)>0.00001};Voronoi.prototype.lessThanOrEqualWithEpsilon=function(d,c){return(d-c)<0.00001};Voronoi.prototype.Beachsection=function(a){this.site=a;this.edge=null;this.sweep=-Infinity;this.lid=0;this.circleEvent=undefined};Voronoi.prototype.Beachsection.prototype.sqrt=self.Math.sqrt;Voronoi.prototype.Beachsection.prototype._leftParabolicCut=function(a,e,f){var m=a.x;var l=a.y;if(l==f){return m}var h=e.x;var g=e.y;if(g==f){return h}if(l==g){return(m+h)/2}var k=l-f;var d=g-f;var c=h-m;var j=1/k-1/d;var i=c/d;return(-i+this.sqrt(i*i-2*j*(c*c/(-2*d)-g+d/2+l-k/2)))/j+m};Voronoi.prototype.Beachsection.prototype.leftParabolicCut=function(b,a){if(this.sweep!==a||this.lid!==b.id){this.sweep=a;this.lid=b.id;this.lBreak=this._leftParabolicCut(this.site,b,a)}return this.lBreak};Voronoi.prototype.Beachsection.prototype.isCollapsing=function(){return this.circleEvent!==undefined&&this.circleEvent.type===Voronoi.prototype.CIRCLE_EVENT};Voronoi.prototype.Site=function(a,b){this.id=this.constructor.prototype.idgenerator++;this.x=a;this.y=b};Voronoi.prototype.Site.prototype.destroy=function(){this.id=0};Voronoi.prototype.Vertex=function(a,b){this.x=a;this.y=b};Voronoi.prototype.Edge=function(b,a){this.id=this.constructor.prototype.idgenerator++;this.lSite=b;this.rSite=a;this.va=this.vb=undefined};Voronoi.prototype.Halfedge=function(a,b){this.site=a;this.edge=b};Voronoi.prototype.Cell=function(a){this.site=a;this.halfedges=[]};Voronoi.prototype.Cells=function(){this.numCells=0};Voronoi.prototype.Cells.prototype.addCell=function(a){this[a.site.id]=a;this.numCells++};Voronoi.prototype.Cells.prototype.removeCell=function(a){delete this[a.site.id];this.numCells--};Voronoi.prototype.Site.prototype.idgenerator=1;Voronoi.prototype.Edge.prototype.isLineSegment=function(){return this.id!==0&&Boolean(this.va)&&Boolean(this.vb)};Voronoi.prototype.Edge.prototype.idgenerator=1;Voronoi.prototype.Halfedge.prototype.isLineSegment=function(){return this.edge.id!==0&&Boolean(this.edge.va)&&Boolean(this.edge.vb)};Voronoi.prototype.Halfedge.prototype.getStartpoint=function(){return this.edge.lSite.id==this.site.id?this.edge.va:this.edge.vb};Voronoi.prototype.Halfedge.prototype.getEndpoint=function(){return this.edge.lSite.id==this.site.id?this.edge.vb:this.edge.va};Voronoi.prototype.leftBreakPoint=function(d,c){var b=this.arcs[d];var a=b.site;if(a.y==c){return a.x}if(d===0){return -Infinity}return b.leftParabolicCut(this.arcs[d-1].site,c)};Voronoi.prototype.rightBreakPoint=function(c,b){if(c<this.arcs.length-1){return this.leftBreakPoint(c+1,b)}var a=this.arcs[c].site;return a.y==b?a.x:Infinity};Voronoi.prototype.findInsertionPoint=function(a,e){var f=this.arcs.length;if(!f){return 0}var b=0;var d=f;var c;while(b<d){c=(b+d)>>1;if(this.lessThanWithEpsilon(a,this.leftBreakPoint(c,e))){d=c;continue}if(this.greaterThanOrEqualWithEpsilon(a,this.rightBreakPoint(c,e))){b=c+1;continue}return c}return b};Voronoi.prototype.findDeletionPoint=function(a,e){var g=this.arcs.length;if(!g){return 0}var b=0;var d=g;var c;var f;while(b<d){c=(b+d)>>1;f=this.leftBreakPoint(c,e);if(this.lessThanWithEpsilon(a,f)){d=c;continue}if(this.greaterThanWithEpsilon(a,f)){b=c+1;continue}f=this.rightBreakPoint(c,e);if(this.greaterThanWithEpsilon(a,f)){b=c+1;continue}if(this.lessThanWithEpsilon(a,f)){d=c;continue}return c}};Voronoi.prototype.createEdge=function(e,a,d,b){var c=new this.Edge(e,a);this.edges.push(c);if(d!==undefined){this.setEdgeStartpoint(c,e,a,d)}if(b!==undefined){this.setEdgeEndpoint(c,e,a,b)}this.cells[e.id].halfedges.push(new this.Halfedge(e,c));this.cells[a.id].halfedges.push(new this.Halfedge(a,c));return c};Voronoi.prototype.createBorderEdge=function(d,c,a){var b=new this.Edge(d,null);b.va=c;b.vb=a;this.edges.push(b);return b};Voronoi.prototype.destroyEdge=function(a){a.id=0};Voronoi.prototype.setEdgeStartpoint=function(b,d,a,c){if(b.va===undefined&&b.vb===undefined){b.va=c;b.lSite=d;b.rSite=a}else{if(b.lSite.id==a.id){b.vb=c}else{b.va=c}}};Voronoi.prototype.setEdgeEndpoint=function(b,d,a,c){this.setEdgeStartpoint(b,a,d,c)};Voronoi.prototype.removeArc=function(a){var g=a.center.x;var d=a.center.y;var i=a.y;var e=this.findDeletionPoint(g,i);var c=e;while(c-1>0&&this.equalWithEpsilon(g,this.leftBreakPoint(c-1,i))){c--}var h=e;while(h+1<this.arcs.length&&this.equalWithEpsilon(g,this.rightBreakPoint(h+1,i))){h++}var j,b;for(var f=c;f<=h+1;f++){j=this.arcs[f-1];b=this.arcs[f];this.setEdgeStartpoint(b.edge,j.site,b.site,new this.Vertex(g,d))}this.voidCircleEvents(c-1,h+1);this.arcs.splice(c,h-c+1);j=this.arcs[c-1];b=this.arcs[c];b.edge=this.createEdge(j.site,b.site,undefined,new this.Vertex(g,d));this.addCircleEvents(c-1,i);this.addCircleEvents(c,i)};Voronoi.prototype.addArc=function(a){var e=new this.Beachsection(a);var b=this.findInsertionPoint(a.x,a.y);if(b==this.arcs.length){this.arcs.push(e);if(b===0){return}e.edge=this.createEdge(this.arcs[b-1].site,e.site);return}var c,f;if(b>0&&this.equalWithEpsilon(a.x,this.rightBreakPoint(b-1,a.y))&&this.equalWithEpsilon(a.x,this.leftBreakPoint(b,a.y))){c=this.arcs[b-1];f=this.arcs[b];this.voidCircleEvents(b-1,b);var d=this.circumcircle(c.site,a,f.site);this.setEdgeStartpoint(f.edge,c.site,f.site,new this.Vertex(d.x,d.y));e.edge=this.createEdge(c.site,e.site,undefined,new this.Vertex(d.x,d.y));f.edge=this.createEdge(e.site,f.site,undefined,new this.Vertex(d.x,d.y));this.arcs.splice(b,0,e);this.addCircleEvents(b-1,a.y);this.addCircleEvents(b+1,a.y);return}this.voidCircleEvents(b);c=this.arcs[b];f=new this.Beachsection(c.site);this.arcs.splice(b+1,0,e,f);e.edge=f.edge=this.createEdge(c.site,e.site);this.addCircleEvents(b,a.y);this.addCircleEvents(b+2,a.y)};Voronoi.prototype.circumcircle=function(q,o,l){var e=q.x;var r=q.y;var m=o.x-e;var k=o.y-r;var g=l.x-e;var f=l.y-r;var j=2*(m*f-k*g);var i=m*m+k*k;var h=g*g+f*f;var p=(f*i-k*h)/j;var n=(m*h-g*i)/j;return{x:p+e,y:n+r,radius:this.sqrt(p*p+n*n)}};Voronoi.prototype.addCircleEvents=function(g,i){if(g<=0||g>=this.arcs.length-1){return}var d=this.arcs[g];var a=this.arcs[g-1].site;var h=this.arcs[g].site;var e=this.arcs[g+1].site;if(a.id==e.id||a.id==h.id||h.id==e.id){return}if((a.y-h.y)*(e.x-h.x)<=(a.x-h.x)*(e.y-h.y)){return}var c=this.circumcircle(a,h,e);var f=c.y+c.radius;if(!this.greaterThanOrEqualWithEpsilon(f,i)){return}var b={type:this.CIRCLE_EVENT,site:h,x:c.x,y:f,center:{x:c.x,y:c.y}};d.circleEvent=b;this.queuePushCircle(b)};Voronoi.prototype.voidCircleEvents=function(c,b){if(b===undefined){b=c}c=this.max(c,0);b=this.min(b,this.arcs.length-1);while(c<=b){var a=this.arcs[c];if(a.circleEvent!==undefined){a.circleEvent.type=this.VOID_EVENT;a.circleEvent=undefined}c++}};Voronoi.prototype.queueSanitize=function(){var d=this.circEvents;var c=d.length;if(!c){return}var e=c;while(e&&d[e-1].type===this.VOID_EVENT){e--}var b=c-e;if(b){d.splice(e,b)}var a=this.arcs.length;if(d.length<a*2){return}while(true){c=e-1;while(c>0&&d[c-1].type!==this.VOID_EVENT){c--}if(c<=0){break}e=c-1;while(e>0&&d[e-1].type===this.VOID_EVENT){e--}b=c-e;d.splice(e,b);if(d.length<a){return}}};Voronoi.prototype.queuePop=function(){var a=this.siteEvents.length>0?this.siteEvents[this.siteEvents.length-1]:null;var b=this.circEvents.length>0?this.circEvents[this.circEvents.length-1]:null;if(Boolean(a)!==Boolean(b)){return a?this.siteEvents.pop():this.circEvents.pop()}if(!a){return null}if(a.y<b.y||(a.y==b.y&&a.x<b.x)){return this.siteEvents.pop()}return this.circEvents.pop()};Voronoi.prototype.queuePushSite=function(f){var e=this.siteEvents;var d=e.length;if(d){var a=0;var b,g;while(a<d){b=(a+d)>>1;g=f.y-e[b].y;if(!g){g=f.x-e[b].x}if(g>0){d=b}else{if(g<0){a=b+1}else{return}}}e.splice(a,0,f)}else{e.push(f)}};Voronoi.prototype.queuePushCircle=function(f){var e=this.circEvents;var d=e.length;if(d){var a=0;var b,g;while(a<d){b=(a+d)>>1;g=f.y-e[b].y;if(!g){g=f.x-e[b].x}if(g>0){d=b}else{a=b+1}}e.splice(a,0,f)}else{e.push(f)}};Voronoi.prototype.getBisector=function(c,a){var b={x:(c.x+a.x)/2,y:(c.y+a.y)/2};if(a.y==c.y){return b}b.m=(c.x-a.x)/(a.y-c.y);b.b=b.y-b.m*b.x;return b};Voronoi.prototype.connectEdge=function(b,l){var i=b.vb;if(!!i){return true}var j=b.va;var g=l.xl;var c=l.xr;var k=l.yt;var h=l.yb;var a=b.lSite;var d=b.rSite;var e=this.getBisector(a,d);if(e.m===undefined){if(e.x<g||e.x>=c){return false}if(a.x>d.x){if(j===undefined){j=new this.Vertex(e.x,k)}else{if(j.y>=h){return false}}i=new this.Vertex(e.x,h)}else{if(j===undefined){j=new this.Vertex(e.x,h)}else{if(j.y<k){return false}}i=new this.Vertex(e.x,k)}}else{if(e.m<1){if(a.y<d.y){if(j===undefined){j=new this.Vertex(g,e.m*g+e.b)}else{if(j.x>=c){return false}}i=new this.Vertex(c,e.m*c+e.b)}else{if(j===undefined){j=new this.Vertex(c,e.m*c+e.b)}else{if(j.x<g){return false}}i=new this.Vertex(g,e.m*g+e.b)}}else{if(a.x>d.x){if(j===undefined){j=new this.Vertex((k-e.b)/e.m,k)}else{if(j.y>=h){return false}}i=new this.Vertex((h-e.b)/e.m,h)}else{if(j===undefined){j=new this.Vertex((h-e.b)/e.m,h)}else{if(j.y<k){return false}}i=new this.Vertex((k-e.b)/e.m,k)}}}b.va=j;b.vb=i;return true};Voronoi.prototype.clipEdge=function(d,i){var b=d.va.x;var l=d.va.y;var h=d.vb.x;var g=d.vb.y;var f=0;var e=1;var k=h-b;var j=g-l;var c=b-i.xl;if(k===0&&c<0){return false}var a=-c/k;if(k<0){if(a<f){return false}else{if(a<e){e=a}}}else{if(k>0){if(a>e){return false}else{if(a>f){f=a}}}}c=i.xr-b;if(k===0&&c<0){return false}a=c/k;if(k<0){if(a>e){return false}else{if(a>f){f=a}}}else{if(k>0){if(a<f){return false}else{if(a<e){e=a}}}}c=l-i.yt;if(j===0&&c<0){return false}a=-c/j;if(j<0){if(a<f){return false}else{if(a<e){e=a}}}else{if(j>0){if(a>e){return false}else{if(a>f){f=a}}}}c=i.yb-l;if(j===0&&c<0){return false}a=c/j;if(j<0){if(a>e){return false}else{if(a>f){f=a}}}else{if(j>0){if(a<f){return false}else{if(a<e){e=a}}}}d.va.x=b+f*k;d.va.y=l+f*j;d.vb.x=b+e*k;d.vb.y=l+e*j;return true};Voronoi.prototype.clipEdges=function(d){var a=this.edges;var e=a.length;var c;for(var b=e-1;b>=0;b-=1){c=a[b];if(!this.connectEdge(c,d)||!this.clipEdge(c,d)||this.verticesAreEqual(c.va,c.vb)){this.destroyEdge(c);a.splice(b,1)}}};Voronoi.prototype.verticesAreEqual=function(d,c){return this.equalWithEpsilon(d.x,c.x)&&this.equalWithEpsilon(d.y,c.y)};Voronoi.prototype.sortHalfedgesCallback=function(d,c){var f=d.getStartpoint();var e=d.getEndpoint();var h=c.getStartpoint();var g=c.getEndpoint();return self.Math.atan2(g.y-h.y,g.x-h.x)-self.Math.atan2(e.y-f.y,e.x-f.x)};Voronoi.prototype.closeCells=function(o){var g=o.xl;var d=o.xr;var l=o.yt;var h=o.yb;this.clipEdges(o);var q=this.cells;var m;var f,k;var n,c;var b;var e,p;var j,i;for(var a in q){m=q[a];if(!(m instanceof this.Cell)){continue}n=m.halfedges;f=n.length;while(f){k=f;while(k>0&&n[k-1].isLineSegment()){k--}f=k;while(f>0&&!n[f-1].isLineSegment()){f--}if(f===k){break}n.splice(f,k-f)}if(n.length===0){q.removeCell(m);continue}n.sort(this.sortHalfedgesCallback);c=n.length;f=0;while(f<c){k=(f+1)%c;p=n[f].getEndpoint();e=n[k].getStartpoint();if(!this.verticesAreEqual(p,e)){j=new this.Vertex(p.x,p.y);if(this.equalWithEpsilon(p.x,g)&&this.lessThanWithEpsilon(p.y,h)){i=new this.Vertex(g,this.equalWithEpsilon(e.x,g)?e.y:h)}else{if(this.equalWithEpsilon(p.y,h)&&this.lessThanWithEpsilon(p.x,d)){i=new this.Vertex(this.equalWithEpsilon(e.y,h)?e.x:d,h)}else{if(this.equalWithEpsilon(p.x,d)&&this.greaterThanWithEpsilon(p.y,l)){i=new this.Vertex(d,this.equalWithEpsilon(e.x,d)?e.y:l)}else{if(this.equalWithEpsilon(p.y,l)&&this.greaterThanWithEpsilon(p.x,g)){i=new this.Vertex(this.equalWithEpsilon(e.y,l)?e.x:g,l)}}}}b=this.createBorderEdge(m.site,j,i);n.splice(f+1,0,new this.Halfedge(m.site,b));c=n.length}f++}}};Voronoi.prototype.addSites=function(b){var d=b.length;var a;for(var c=0;c<d;c++){a=b[c];this.sites.push(new this.Site(a.x,a.y))}};Voronoi.prototype.setSites=function(a){this.sites=[];this.addSites(a)};Voronoi.prototype.getSites=function(){return this.sites};Voronoi.prototype.compute=function(h){var f=new Date();this.siteEvents=[];this.circEvents=[];var e=this.sites.length;var c;for(var b=e-1;b>=0;b--){c=this.sites[b];if(!c.id){this.sites.splice(b,1)}else{this.queuePushSite({type:this.SITE_EVENT,x:c.x,y:c.y,site:c})}}this.arcs=[];this.edges=[];this.cells=new this.Cells();var g=this.queuePop();while(g){if(g.type===this.SITE_EVENT){this.cells.addCell(new this.Cell(g.site));this.addArc(g.site)}else{if(g.type===this.CIRCLE_EVENT){this.removeArc(g)}else{this.queueSanitize()}}g=this.queuePop()}this.closeCells(h);var d=new Date();var a={sites:this.sites,cells:this.cells,edges:this.edges,execTime:d.getTime()-f.getTime()};this.arcs=[];this.edges=[];this.cells=new this.Cells();return a};

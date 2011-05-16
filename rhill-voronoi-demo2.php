<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>Javascript implementation of Steven Fortune's algorithm to compute Voronoi diagrams: Demo 2</title>
<meta name="Keywords" lang="en" content="voronoi, fortune, javascript, raymond hill"/>
<!--[if IE]><script type="text/javascript" src="excanvas/excanvas.compiled.js"></script><![endif]-->
<script type="text/javascript" src="rhill-voronoi-core.js"></script>
<style type="text/css">
body {font-family:tahoma,verdana,arial;font-size:13px;margin:0;padding:0}
body > div {margin-left:4px;margin-right:4px;}
body > div > div {margin:0;border:1px solid #ccc;border-top:0;padding:4px;}
h1 {font:bold 20px sans-serif;margin:0 0 0.5em 0;padding:4px;background-color:#c9d7f1;}
h4 {font-size:14px;margin:0.5em 0 0 0;border:0;border-bottom:solid 1px #c9d7f1;padding:2px;background-color:#e5ecf9;}
h4 > span {cursor:pointer}
#canvasParent {margin-top:0;margin-bottom:1em;padding:0;border:0}
#voronoiCode {font:11px monospace;overflow:auto;color:gray;}
#voronoiCode span {color:green;font-weight:bold;}
</style>
<script type="text/javascript">
<!--
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-5586753-2']);
_gaq.push(['_trackPageview']);
(function() {
	var ga = document.createElement('script');
	ga.type = 'text/javascript';
	ga.async = true;
	ga.src = 'http://www.google-analytics.com/ga.js';
	var s = document.getElementsByTagName('script')[0];
	s.parentNode.insertBefore(ga, s);
	})();
// -->
</script>
<script type="text/javascript">
<!--
var VoronoiDemo = {

	voronoi: new Voronoi(),
	diagram: null,
	margin: 100,
	canvas: null,
	bbox: {xl:0,xr:800,yt:0,yb:600},

	normalizeEventCoords: function(target,e) {
		// http://www.quirksmode.org/js/events_properties.html#position
		// =====
		if (!e) {e=self.event;}
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
		// =====
		return {x:x-target.offsetLeft,y:y-target.offsetTop};
		},

	init: function() {
		var me = this;
		this.canvas = document.getElementById('voronoiCanvas');
		this.canvas.onmousemove = function(e) {
			var sites = me.voronoi.getSites();
			if (!sites || !sites.length) {return;}
			var site = sites[0];
			var mouse = me.normalizeEventCoords(me.canvas,e);
			site.x = mouse.x;
			site.y = mouse.y;
			me.diagram = me.voronoi.compute(me.bbox);
			me.render();
			};
		this.canvas.onclick = function(e) {
			var mouse = me.normalizeEventCoords(me.canvas,e);
			me.addSite(mouse.x,mouse.y);
			me.diagram = me.voronoi.compute(me.bbox);
			me.render();
			};
		this.randomSites(10,true);
		this.render();
		},

	clearSites: function() {
		// we want at least one site, the one tracking the mouse
		this.voronoi.setSites([{x:0,y:0}]);
		this.diagram = this.voronoi.compute(this.bbox);
		},

	randomSites: function(n,clear) {
		if (clear) {this.clearSites();}
		var xo = this.margin;
		var dx = this.canvas.width-this.margin*2;
		var yo = this.margin;
		var dy = this.canvas.height-this.margin*2;
		var vertices = [];
		for (var i=0; i<n; i++) {
			vertices.push({x:self.Math.round(xo+self.Math.random()*dx),y:self.Math.round(yo+self.Math.random()*dy)});
			}
		// make sites from vertices and compute resulting Voronoi diagram
		this.voronoi.addSites(vertices);
		this.diagram = this.voronoi.compute(this.bbox);
		},

	addSite: function(x,y) {
		this.voronoi.addSites([{x:x,y:y}]);
		this.diagram = this.voronoi.compute(this.bbox);
		},

	render: function() {
		var ctx = this.canvas.getContext('2d');
		// background
		ctx.globalAlpha = 1;
		ctx.beginPath();
		ctx.rect(0,0,this.canvas.width,this.canvas.height);
		ctx.fillStyle = '#fff';
		ctx.fill();
		ctx.strokeStyle = '#888';
		ctx.stroke();
		// voronoi
		if (!this.diagram) {return;}
		ctx.strokeStyle='#000';
		// edges
		var edges = this.diagram.edges;
		var nEdges = edges.length;
		if (nEdges) {
			var edge, v;
			ctx.beginPath();
			for (var iEdge=nEdges-1; iEdge>=0; iEdge-=1) {
				edge = edges[iEdge];
				v = edge.va;
				ctx.moveTo(v.x,v.y);
				v = edge.vb;
				ctx.lineTo(v.x,v.y);
				}
			ctx.stroke();
			}
		// how many sites do we have?
		var sites = this.diagram.sites;
		var nSites = sites.length;
		if (nSites === 0) {return;}
		// highlight cell under mouse
		var cell = this.diagram.cells[this.diagram.sites[0].id];
		// there is no guarantee a Voronoi cell will exist for any
		// particular site
		if (cell !== undefined) {
			var halfedges = cell.halfedges;
			var nHalfedges = halfedges.length;
			if (nHalfedges < 3) {return;}
			var v = halfedges[0].getStartpoint();
			ctx.beginPath();
			ctx.moveTo(v.x,v.y);
			for (var iHalfedge=0; iHalfedge<nHalfedges; iHalfedge++) {
				v = halfedges[iHalfedge].getEndpoint();
				ctx.lineTo(v.x,v.y);
				}
			ctx.fillStyle = '#faa';
			ctx.fill();
			}
		// draw sites
		var site;
		ctx.beginPath();
		for (var iSite=nSites-1; iSite>=0; iSite-=1) {
			site = sites[iSite];
			ctx.rect(site.x-0.5,site.y-0.5,1,1);
			}
		ctx.stroke();
		},
	};
// -->
</script>
</head>
<body onload="VoronoiDemo.init();">
<h1>Javascript implementation of Steven Fortune's algorithm to compute Voronoi diagrams<br/>Demo 2: A bit of interactivity added</h1>
<div id="divroot" style="width:800px;">
<p style="margin-top:0;"><a href="/voronoi/rhill-voronoi.php">&lt; Back to main page</a> | <a href="/voronoi/rhill-voronoi-demo1.php">Demo 1: measuring peformance</a> | <b>Demo 2: a bit of interactivity</b></p>
<h4 class="divhdr">Sites generator</h4>
<div class="divinfo" id="voronoiGenerator">
<input type="button" value="Generate" onclick="VoronoiDemo.randomSites(parseInt(document.getElementById('voronoiNumberSites').value,10),true);VoronoiDemo.render();"/> or <input type="button" value="Add" onclick="VoronoiDemo.randomSites(parseInt(document.getElementById('voronoiNumberSites').value,10),false);VoronoiDemo.render();"/><input id="voronoiNumberSites" type="text" value="10" size="5" maxlength="5"/> sites randomly (Warning: performance might suffer the more sites you add.)
<br/><input id="voronoiClearSites" type="button" value="Clear all sites" onclick="VoronoiDemo.clearSites();VoronoiDemo.render();"/>
</div>
<h4 class="divhdr">Canvas</h4>
<div id="canvasParent">
<noscript>You need to enable Javascript in your browser for this page to display properly.</noscript>
<canvas id="voronoiCanvas" style="cursor:crosshair" width="800" height="600"></canvas>
<div id="voronoiNoCanvasAlert" style="display:none;padding:1em;background-color:#fcc;color:black;">
<p>Your browser doesn't support the HTML5 &lt;canvas&gt; element technology.</p>
<p>See <a target="_blank" href="http://en.wikipedia.org/wiki/Canvas_(HTML_element)">Wikipedia</a> for information on which browsers support the <u>HTML5 &lt;canvas&gt;</u> technology.</p>
</div>
</div>
<h4 class="divhdr">Javascript source code for this page</h4>
<div class="divinfo" id="voronoiCode">
<pre>
<span>&lt;script type=&quot;text/javascript&quot; src=&quot;<a href="rhill-voronoi-core.js" target="_blank">rhill-voronoi-core.js</a>&quot;&gt;&lt;/script&gt;</span>

...

&lt;script type=&quot;text/javascript&quot;&gt;
var VoronoiDemo = {

  <span>voronoi: new Voronoi(),</span>
  <span>diagram: null,</span>
  margin: 100,
  canvas: null,
  <span>bbox: {xl:0,xr:800,yt:0,yb:600},</span>

  normalizeEventCoords: function(target,e) {
    // http://www.quirksmode.org/js/events_properties.html#position
    // -----
    if (!e) {e=self.event;}
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
    return {x:x-target.offsetLeft,y:y-target.offsetTop};
    },

  init: function() {
    var me = this;
    this.canvas = document.getElementById('voronoiCanvas');
    this.canvas.onmousemove = function(e) {
      <span>var sites = me.voronoi.getSites();</span>
      if (!sites || !sites.length) {return;}
      var site = sites[0];
      var mouse = me.normalizeEventCoords(me.canvas,e);
      site.x = mouse.x;
      site.y = mouse.y;
      <span>me.diagram = me.voronoi.compute(me.bbox);</span>
      me.render();
      };
    this.canvas.onclick = function(e) {
      var mouse = me.normalizeEventCoords(me.canvas,e);
      me.addSite(mouse.x,mouse.y);
      <span>me.diagram = me.voronoi.compute(me.bbox);</span>
      me.render();
      };
    this.randomSites(10,true);
    this.render();
    },

  clearSites: function() {
    // we want at least one site, the one tracking the mouse
    <span>this.voronoi.setSites([{x:0,y:0}]);</span>
    <span>this.diagram = this.voronoi.compute(this.bbox);</span>
    },

  randomSites: function(n,clear) {
    if (clear) {this.clearSites();}
    var xo = this.margin;
    var dx = this.canvas.width-this.margin*2;
    var yo = this.margin;
    var dy = this.canvas.height-this.margin*2;
    var vertices = [];
    for (var i=0; i&lt;n; i++) {
      vertices.push({x:self.Math.round(xo+self.Math.random()*dx),y:self.Math.round(yo+self.Math.random()*dy)});
      }
    // make sites from vertices and compute resulting Voronoi diagram
    <span>this.voronoi.addSites(vertices);</span>
    <span>this.diagram = this.voronoi.compute(this.bbox);</span>
    },

  addSite: function(x,y) {
    <span>this.voronoi.addSites([{x:x,y:y}]);</span>
    <span>this.diagram = this.voronoi.compute(this.bbox);</span>
    },

  render: function() {
    var ctx = this.canvas.getContext('2d');
    // background
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.rect(0,0,this.canvas.width,this.canvas.height);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.stroke();
    // voronoi
    <span>if (!this.diagram) {return;}</span>
    ctx.strokeStyle='#000';
    // edges
    <span>var edges = this.diagram.edges;</span>
    var nEdges = edges.length;
    if (nEdges) {
      var edge, v;
      ctx.beginPath();
      for (var iEdge=nEdges-1; iEdge&gt;=0; iEdge--) {
        edge = edges[iEdge];
        v = edge.va;
        ctx.moveTo(v.x,v.y);
        v = edge.vb;
        ctx.lineTo(v.x,v.y);
        }
      ctx.stroke();
      }
    // how many sites do we have?
    <span>var sites = this.diagram.sites;</span>
    var nSites = sites.length;
    if (nSites === 0) {return;}
    // highlight cell under mouse
    <span>var cell = this.diagram.cells[this.diagram.sites[0].id];</span>
    // there is no guarantee a Voronoi cell will exist for any
    // particular site
    if (cell !== undefined) {
      var halfedges = cell.halfedges;
      var nHalfedges = halfedges.length;
      if (nHalfedges &lt; 3) {return;}
      var v = halfedges[0].getStartpoint();
      ctx.beginPath();
      ctx.moveTo(v.x,v.y);
      for (var iHalfedge=0; iHalfedge&lt;nHalfedges; iHalfedge++) {
        v = halfedges[iHalfedge].getEndpoint();
        ctx.lineTo(v.x,v.y);
        }
      ctx.fillStyle = '#faa';
      ctx.fill();
      }
    // draw sites
    var site;
    ctx.beginPath();
    for (var iSite=nSites-1; iSite&gt;=0; iSite--) {
      site = sites[iSite];
      ctx.rect(site.x-0.5,site.y-0.5,1,1);
      }
    ctx.stroke();
    },
  };
&lt;/script&gt;

...

&lt;body onload=&quot;VoronoiDemo.init();&quot;&gt;

...
</pre>
</div>
</div>
</body>
</html>

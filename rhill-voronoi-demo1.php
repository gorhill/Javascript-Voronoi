<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>Javascript implementation of Steven Fortune's algorithm to compute Voronoi diagrams: Demo 1</title>
<meta name="Keywords" lang="en" content="voronoi, fortune, javascript, raymond hill"/>
<!--[if IE]><script type="text/javascript" src="excanvas/excanvas.compiled.js"></script><![endif]-->
<script type="text/javascript" src="rhill-voronoi-core.js"></script>
<style type="text/css">
body {font-family:tahoma,verdana,arial;font-size:13px;margin:0;padding:0}
body > div {margin-left:4px;margin-right:4px;}
body > div > div {margin:0;border:1px solid #ccc;border-top:0;padding:4px;}
h1 {margin:0 0 0.5em 0;padding: 4px 5em 4px 4px;font:bold 20px sans-serif;background-color:#c9d7f1;}
h4 {font-size:14px;margin:0.5em 0 0 0;border:0;border-bottom:solid 1px #c9d7f1;padding:2px;background-color:#e5ecf9;}
#canvasParent {margin-top:0;margin-bottom:1em;padding:0;border:0}
#voronoiCode {font:11px monospace;overflow:auto;color:#666;}
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
	sites: [],
	diagram: null,
	margin: 50,
	canvas: null,
	bbox: {xl:0,xr:800,yt:0,yb:600},

	init: function() {
		this.canvas = document.getElementById('voronoiCanvas');
		this.randomSites(100,true);
		this.render();
		},

	clearSites: function() {
		this.sites = [];
		this.diagram = this.voronoi.compute(this.sites, this.bbox);
		this.updateStats();
		},

	randomSites: function(n,clear) {
		if (clear) {this.sites = [];}
		// create vertices
		var xo = this.margin;
		var dx = this.canvas.width-this.margin*2;
		var yo = this.margin;
		var dy = this.canvas.height-this.margin*2;
		for (var i=0; i<n; i++) {
			this.sites.push({x:self.Math.round((xo+self.Math.random()*dx)*10)/10,y:self.Math.round((yo+self.Math.random()*dy)*10)/10});
			}
		this.diagram = this.voronoi.compute(this.sites, this.bbox);
		this.updateStats();
		},

	updateStats: function() {
		if (!this.diagram) {return;}
		var e = document.getElementById('voronoiStats');
		if (!e) {return;}
		e.innerHTML = '('+this.diagram.cells.numCells+' Voronoi cells computed from '+this.diagram.cells.numCells+' Voronoi sites in '+this.diagram.execTime+' ms &ndash; rendering <i>not</i> included)';
		},

	render: function() {
		var ctx = this.canvas.getContext('2d');
		// background
		ctx.globalAlpha = 1;
		ctx.beginPath();
		ctx.rect(0,0,this.canvas.width,this.canvas.height);
		ctx.fillStyle = 'white';
		ctx.fill();
		ctx.strokeStyle = '#888';
		ctx.stroke();
		// voronoi
		if (!this.diagram) {return;}
		// edges
		ctx.beginPath();
		ctx.strokeStyle='#000';
		var edges = this.diagram.edges,
			iEdge = edges.length,
			edge, v;
		while (iEdge--) {
			edge = edges[iEdge];
			v = edge.va;
			ctx.moveTo(v.x,v.y);
			v = edge.vb;
			ctx.lineTo(v.x,v.y);
			}
		ctx.stroke();
		// sites
		ctx.beginPath();
		ctx.fillStyle = '#44f';
		var sites = this.sites,
			iSite = sites.length;
		while (iSite--) {
			v = sites[iSite];
			ctx.rect(v.x-2/3,v.y-2/3,2,2);
			}
		ctx.fill();
		},
	};
// -->
</script>
</head>
<body onload="VoronoiDemo.init();">
<a href="http://github.com/gorhill/Javascript-Voronoi"><img style="position:absolute;top:0;right:0;border:0;" src="https://d3nwyuy0nl342s.cloudfront.net/img/7afbc8b248c68eb468279e8c17986ad46549fb71/687474703a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f6461726b626c75655f3132313632312e706e67" alt="Fork me on GitHub"></a>
<h1>Javascript implementation of Steven Fortune's algorithm to compute Voronoi diagrams<br/>Demo 1: measuring peformance</h1>
<div id="divroot" style="width:800px;">
<p style="margin-top:0;"><a href="/voronoi/rhill-voronoi.php">&lt; Back to main page</a> | <b>Demo 1: measuring peformance</b> | <a href="rhill-voronoi-demo2.php">Demo 2: a bit of interactivity</a> | <a href="rhill-voronoi-demo3.php">Demo 3: Fancy tiling</a> | <a href="http://www.raymondhill.net/blog/?p=458#comments">Comments</a></p>
<h4 class="divhdr">Sites generator</h4>
<div class="divinfo" id="voronoiGenerator">
<input type="button" value="Generate" onclick="VoronoiDemo.randomSites(parseInt(document.getElementById('voronoiNumberSites').value,10),true);VoronoiDemo.render();"/> or <input type="button" value="Add" onclick="VoronoiDemo.randomSites(parseInt(document.getElementById('voronoiNumberSites').value,10),false);VoronoiDemo.render();"/><input id="voronoiNumberSites" type="text" value="100" size="5" maxlength="5"/> sites randomly (Warning: performance might suffer the more sites you add.)
<br/><input id="voronoiClearSites" type="button" value="Clear all sites" onclick="VoronoiDemo.clearSites();VoronoiDemo.render();"/>
</div>
<h4 class="divhdr">Canvas <span id="voronoiStats" style="font:normal 11px sans"></span></h4>
<div id="canvasParent">
<noscript>You need to enable Javascript in your browser for this page to display properly.</noscript>
<canvas id="voronoiCanvas" width="800" height="600"></canvas>
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

<?php
echo htmlentities(<<<EOT
<script type="text/javascript">
<!--
var VoronoiDemo = {

	voronoi: new Voronoi(),
	sites: [],
	diagram: null,
	margin: 50,
	canvas: null,
	bbox: {xl:0,xr:800,yt:0,yb:600},

	init: function() {
		this.canvas = document.getElementById('voronoiCanvas');
		this.randomSites(100,true);
		this.render();
		},

	clearSites: function() {
		this.sites = [];
		this.diagram = this.voronoi.compute(this.sites, this.bbox);
		this.updateStats();
		},

	randomSites: function(n,clear) {
		if (clear) {this.sites = [];}
		// create vertices
		var xo = this.margin;
		var dx = this.canvas.width-this.margin*2;
		var yo = this.margin;
		var dy = this.canvas.height-this.margin*2;
		for (var i=0; i<n; i++) {
			this.sites.push({x:self.Math.round((xo+self.Math.random()*dx)*10)/10,y:self.Math.round((yo+self.Math.random()*dy)*10)/10});
			}
		this.diagram = this.voronoi.compute(this.sites, this.bbox);
		this.updateStats();
		},

	updateStats: function() {
		if (!this.diagram) {return;}
		var e = document.getElementById('voronoiStats');
		if (!e) {return;}
		e.innerHTML = '('+this.diagram.cells.numCells+' Voronoi cells computed from '+this.diagram.cells.numCells+' Voronoi sites in '+this.diagram.execTime+' ms &ndash; rendering <i>not</i> included)';
		},

	render: function() {
		var ctx = this.canvas.getContext('2d');
		// background
		ctx.globalAlpha = 1;
		ctx.beginPath();
		ctx.rect(0,0,this.canvas.width,this.canvas.height);
		ctx.fillStyle = 'white';
		ctx.fill();
		ctx.strokeStyle = '#888';
		ctx.stroke();
		// voronoi
		if (!this.diagram) {return;}
		// edges
		ctx.beginPath();
		ctx.strokeStyle='#000';
		var edges = this.diagram.edges;
		var nEdges = edges.length;
		var edge, v;
		for (var iEdge=nEdges-1; iEdge>=0; iEdge-=1) {
			edge = edges[iEdge];
			v = edge.va;
			ctx.moveTo(v.x,v.y);
			v = edge.vb;
			ctx.lineTo(v.x,v.y);
			}
		ctx.stroke();
		// sites
		ctx.beginPath();
		ctx.fillStyle = '#44f';
		var sites = this.sites;
		var nSites = sites.length;
		for (var iSite=nSites-1; iSite>=0; iSite-=1) {
			v = sites[iSite];
			ctx.rect(v.x-2/3,v.y-2/3,2,2);
			}
		ctx.fill();
		},
	};
// -->
</script>
EOT
, ENT_QUOTES);
?>

...
</pre>
</div>
</div>
</body>
</html>

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>Javascript implementation of Steven Fortune's algorithm to compute Voronoi diagrams: Demo 3</title>
<meta name="Keywords" lang="en" content="voronoi, fortune, javascript, raymond hill"/>
<!--[if IE]><script type="text/javascript" src="excanvas/excanvas.compiled.js"></script><![endif]-->
<script type="text/javascript" src="mootools/mootools-core-1.3.2.js"></script>
<script type="text/javascript" src="mootools/mootools-more-1.3.2.1.js"></script>
<script type="text/javascript" src="rhill-voronoi-core.js"></script>
<style type="text/css">
body {font-family:tahoma,verdana,arial;font-size:13px;margin:0;padding:0}
body > div {margin-left:4px;margin-right:4px;}
body > div > div {margin:0;border:1px solid #ccc;border-top:0;padding:4px;}
h1 {font:bold 20px sans-serif;margin:0 0 0.5em 0;padding:4px;background-color:#c9d7f1;}
h4 {font-size:14px;margin:0.5em 0 0 0;border:0;border-bottom:solid 1px #c9d7f1;padding:2px;background-color:#e5ecf9;}
h4 > span {cursor:pointer}
#hLegend {display:inline-block;font-size:12px;vertical-align:bottom}
#hLegend > span {margin-top:2px;padding:0 0 2px 0;display:block;height:14px;text-align:right}
.tileParms {display:inline-block;font-size:12px;vertical-align:bottom}
.tileParms > div {margin:0;border:0;padding:0;display:inline-block}
.tileParms > div > input {margin-top:2px;border:1px solid gray;display:block;width:60px;height:14px}
.tileParms > div > div {border:1px solid #888;width:60px;height:60px;position:relative}
.tileParms > div > div > div {border:0;width:10px;height:10px;position:absolute}
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
	sites: [],
	diagram: null,
	canvas: null,
	generators: [],
	grout: true,
	controls: [],
	presets: [
		[[10,10,0,0],[5,5,0.5,0.5],[5,5,0,0]],
		[[7,12,0,0],[7,12,0.5,0.5],[0,0,0,0]],
		[[10,10,-0.5,-0.5],[5,5,0.5,0.5],[5,5,0,0]],
		[[10,10,0,0],[10,10,0.5,0.5],[0,0,0,0]],
		[[7,7,0,0],[10,10,0,0],[0,0,0,0]],
		[[10,10,0,0],[10,10,0.5,0.5],[12,9,0,0]],
		[[9,12,0,0],[8,11,0.5,0.5],[7,7,0,0]]
		],

	init: function() {
		var demo = this;

		this.canvas = $('voronoiCanvas');
		this.generators.push(this.createGenerator({r:1,g:0.5,b:0.5}));
		this.generators.push(this.createGenerator({r:0.5,g:1,b:0.5}));
		this.generators.push(this.createGenerator({r:0.5,g:0.5,b:1}));
		// GUI stuff
		var handleStepChange = function(el,iGenerator,iValue) {
				var generator = demo.generators[iGenerator];
				var value = parseInt(el.value);
				if (isNaN(value)) {value=0;}
				generator.values[iValue] = Math.min(Math.max(value,0),50);
				generator.render();
				demo.renderCanvas();
				demo.syncFields(iGenerator);
				};
		var handleOffsetChange = function(el,iGenerator,iValue) {
				var generator = demo.generators[iGenerator];
				var value = parseInt(el.value);
				if (isNaN(value)) {value=0;}
				generator.values[iValue] = Math.min(Math.max(value/100,-0.5),0.5);
				generator.render();
				demo.renderCanvas();
				demo.syncFields(iGenerator);
				};
		var handleStepDragger = function(el,iGenerator) {
			var coords = el.getCoordinates(el.getOffsetParent()),
				generator = demo.generators[iGenerator],
				values = generator.values,
				hadTiles = values[0] && values[1];
			values[0] = coords.left;
			values[1] = coords.top;
			var	hasTiles = values[0] && values[1];
			generator.render();
			demo.syncTextFields(iGenerator);
			if (hadTiles || hasTiles) {
				demo.renderCanvas();
				}
			};
		var handleOffsetDragger = function(el,iGenerator) {
			var coords = el.getCoordinates(el.getOffsetParent()),
				generator = demo.generators[iGenerator],
				values = generator.values,
				hasTiles = values[0] && values[1];
			values[2] = coords.left / 50 - 0.5;
			values[3] = coords.top / 50 - 0.5;
			generator.render();
			demo.syncTextFields(iGenerator);
			if (hasTiles) {
				demo.renderCanvas();
				}
			};
		$$('#voronoiGenerator .tileParms').each(function(el,iGenerator){
			var controls = [
				el.getElement('div:nth-of-type(1) > input:nth-of-type(1)'),
				el.getElement('div:nth-of-type(1) > input:nth-of-type(2)'),
				el.getElement('div:nth-of-type(2) > input:nth-of-type(1)'),
				el.getElement('div:nth-of-type(2) > input:nth-of-type(2)'),
				el.getElement('div:nth-of-type(1) > div > div'),
				el.getElement('div:nth-of-type(2) > div > div')
				];
			demo.controls[iGenerator] = controls;
			new Drag(el.getElement('div:nth-of-type(1) > div > div'), {
					snap: 1,
					limit:{x:[0,50],y:[0,50]},
					onDrag: function(el){handleStepDragger(el,iGenerator);}
					});
			new Drag(el.getElement('div:nth-of-type(2) > div > div'), {
					snap: 1,
					limit:{x:[0,50],y:[0,50]},
					onDrag: function(el){handleOffsetDragger(el,iGenerator);}
					});
				controls[0].addEvent('change',function(){var el=this;handleStepChange(el,iGenerator,0);});
				controls[1].addEvent('change',function(){var el=this;handleStepChange(el,iGenerator,1);});
				controls[2].addEvent('change', function(){var el=this;handleOffsetChange(el,iGenerator,2);});
				controls[3].addEvent('change', function(){var el=this;handleOffsetChange(el,iGenerator,3);});
			});
		// initalize UI as per internal state
		this.selectPreset(0);
		this.syncFields();
		this.renderCanvas();
		},

	renderCanvas: function() {
		this.compositeGenerators();
		this.diagram = this.voronoi.compute(this.sites, {xl:0,xr:this.canvas.width,yt:0,yb:this.canvas.height});
		var ctx = this.canvas.getContext('2d');
		// background
		ctx.globalAlpha = 1;
		ctx.beginPath();
		ctx.rect(0,0,this.canvas.width,this.canvas.height);
		ctx.fillStyle = '#fff';
		ctx.fill();
		ctx.strokeStyle = '#888';
		ctx.stroke();
		ctx.lineWidth = 0.5;
		// voronoi
		if (!this.diagram) {return;}
		var cells = this.diagram.cells;
		var cellid, cell;
		for (cellid in cells) {
			cell = cells[cellid];
			if (!(cell instanceof Voronoi.prototype.Cell)) {continue;}
			var halfedges = cell.halfedges;
			var nHalfedges = halfedges.length;
			var v = halfedges[0].getStartpoint();
			ctx.beginPath();
			ctx.moveTo(v.x,v.y);
			for (var iHalfedge=0; iHalfedge<nHalfedges; iHalfedge++) {
				v = halfedges[iHalfedge].getEndpoint();
				ctx.lineTo(v.x,v.y);
				}
			ctx.fillStyle = 'rgb(' + String(Math.round(cell.site.color.r*255)) + ',' + String(Math.round(cell.site.color.g*255)) + ',' + String(Math.round(cell.site.color.b*255)) + ')';
			ctx.fill();
			if (this.grout) {ctx.stroke();}
			}
		},

	createGenerator: function(color) {
		var generator = {
			values: [0,0,0,0],
			rotate: 0.0,
			color: color,
			sites: [],
			render: function() {
				this.sites = [];
				if (!this.values[0] || !this.values[1]) {return};
				var sites = this.sites,
					yinc = 1/this.values[1],
					ystep = this.values[1] + 2,
					y = -yinc + this.values[3] * yinc,
					xinc = 1/this.values[0],
					xstep, x;
				while (ystep-- > 0) {
					x = -xinc + this.values[2] * xinc;
					xstep = this.values[0] + 2;
					while (xstep-- > 0) {
						sites.push({x:x, y:y, color:this.color});
						x += xinc;
						}
					y += yinc;
					}
				}
			};
		return generator;
		},

	compositeGenerators: function() {
		this.sites = [];
		var w = this.canvas.width;
		var h = this.canvas.height;
		var sitemap = {},
			generators = this.generators,
			nGenerators = generators.length,
			generator,
			sites, nSites, iSite, site,
			sitecolor, sitekey;
		for (iGenerator = 0; iGenerator<nGenerators; iGenerator++) {
			generator = generators[iGenerator];
			sites = generator.sites;
			nSites = generator.sites.length;
			for (iSite = 0; iSite<nSites; iSite++) {
				site = sites[iSite];
				x = Math.round(w*site.x*100)/100;
				y = Math.round(h*site.y*100)/100;
				sitecolor = {r:generator.color.r, g:generator.color.g, b:generator.color.b};
				sitekey = x * 10000 + y; // 10000, or whatever is over w and h
				if (sitemap[sitekey]) {
					sitecolor = sitemap[sitekey].color;
					sitecolor.r = Math.min(Math.max(sitecolor.r, site.color.r, 0), 1.0);
					sitecolor.g = Math.min(Math.max(sitecolor.g, site.color.g, 0), 1.0);
					sitecolor.b = Math.min(Math.max(sitecolor.b, site.color.b, 0), 1.0);
					}
				else {
					site = {x:x, y:y, color:sitecolor};
					sitemap[sitekey] = site;
					this.sites.push(site);
					}
				}
			}
		},

	syncTextFields: function(which) {
		var generators = this.generators,
			nGenerators = generators.length,
			iGenerator, generator, controls;
		for (iGenerator=0; iGenerator<nGenerators; iGenerator++) {
			if (which === undefined || iGenerator === which) {
				generator = generators[iGenerator];
				controls = this.controls[iGenerator];
				controls[0].value = generator.values[0];
				controls[1].value = generator.values[1];
				controls[2].value = (generator.values[2] * 100).toFixed(0) + '%';
				controls[3].value = (generator.values[3] * 100).toFixed(0) + '%';
				}
			}
		},

	syncDragFields: function(which) {
		var panes = $$('#voronoiGenerator .tileParms'),
			generators = this.generators,
			nGenerators = generators.length,
			iGenerator, generator, knob;
		for (iGenerator=0; iGenerator<nGenerators; iGenerator++) {
			if (which === undefined || iGenerator === which) {
				generator = generators[iGenerator];
				knob = this.controls[iGenerator][4];
				knob.style.left = generator.values[0] + 'px';
				knob.style.top = generator.values[1] + 'px';
				knob = this.controls[iGenerator][5];
				knob.style.left = String(Math.floor((generator.values[2] + 0.5) * 50)) + 'px';
				knob.style.top  = String(Math.floor((generator.values[3] + 0.5) * 50)) + 'px';
				}
			}
		},

	syncFields: function(which) {
		this.syncTextFields(which);
		this.syncDragFields(which);
		},

	selectPreset: function(iPreset) {
		if (iPreset<0 || iPreset>=this.presets.length) {return;}
		var preset = this.presets[iPreset],
			generator;
		for (var iGenerator=0; iGenerator<Math.min(this.generators.length,preset.length); iGenerator++) {
			generator = this.generators[iGenerator];
			for (var iValue=0; iValue<4; iValue++) {
				generator.values[iValue] = preset[iGenerator][iValue];
				}
			generator.render();
			}
		this.syncFields();
		this.renderCanvas();
		}
	}

window.addEvent('domready',function(){VoronoiDemo.init();});
// -->
</script>
</head>
<body>
<h1>Javascript implementation of Steven Fortune's algorithm to compute Voronoi diagrams<br/>Demo 3: Fancy tiling</h1>
<div id="divroot" style="width:800px;">
<p style="margin-top:0;"><a href="/voronoi/rhill-voronoi.php">&lt; Back to main page</a> | <a href="rhill-voronoi-demo1.php">Demo 1: measuring peformance</a> | <a href="rhill-voronoi-demo2.php">Demo 2: a bit of interactivity</a> | <b>Demo 3: Fancy tiling</b></p>
<h4 class="divhdr">Sites generator</h4>
<div class="divinfo" id="voronoiGenerator">
<div id="hLegend">
	<span>horizontal</span>
	<span>vertical</span>
	</div>		
<div class="tileParms">
	<div>
		<span>Steps</span>
		<div><div style="background:#f77;"></div></div>
		<input type="text" size="6">
		<input type="text" size="6">
		</div>
	<div>
		<span>Offset</span>
		<div><div style="background:#f77;"></div></div>
		<input type="text" size="6">
		<input type="text" size="6">
		</div>
	</div>
<span>+</span>
<div class="tileParms">
	<div>
		<span>Steps</span>
		<div><div style="background:#7f7;"></div></div>
		<input type="text" size="6">
		<input type="text" size="6">
		</div>
	<div>
		<span>Offset</span>
		<div><div style="background:#7f7;"></div></div>
		<input type="text" size="6">
		<input type="text" size="6">
		</div>
	</div>
<span>+</span>
<div class="tileParms">
	<div>
		<span>Steps</span>
		<div><div style="left:18px;top:24px;background:#77f;"></div></div>
		<input type="text" size="6">
		<input type="text" size="6">
		</div>
	<div>
		<span>Offset</span>
		<div><div style="left:0;top:0;background:#77f;"></div></div>
		<input type="text" size="6">
		<input type="text" size="6">
		</div>
	</div>		
<div style="margin-left:1em;display:inline-block">
	Presets:<br>
	<button onclick="VoronoiDemo.selectPreset(0);">1</button>
	<button onclick="VoronoiDemo.selectPreset(1);">2</button>
	<button onclick="VoronoiDemo.selectPreset(2);">3</button><br>
	<button onclick="VoronoiDemo.selectPreset(3);">4</button>
	<button onclick="VoronoiDemo.selectPreset(4);">5</button>
	<button onclick="VoronoiDemo.selectPreset(5);">6</button><br>
	<button onclick="VoronoiDemo.selectPreset(6);">7</button>
	</div>
</div>
<h4 class="divhdr">Canvas</h4>
<div id="canvasParent">
<noscript>You need to enable Javascript in your browser for this page to display properly.</noscript>
<canvas id="voronoiCanvas" style="cursor:crosshair" width="600" height="600"></canvas>
<div id="voronoiNoCanvasAlert" style="display:none;padding:1em;background-color:#fcc;color:black;">
<p>Your browser doesn't support the HTML5 &lt;canvas&gt; element technology.</p>
<p>See <a target="_blank" href="http://en.wikipedia.org/wiki/Canvas_(HTML_element)">Wikipedia</a> for information on which browsers support the <u>HTML5 &lt;canvas&gt;</u> technology.</p>
</div>
</div>
</div>
</body>
</html>

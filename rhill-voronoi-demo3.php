<!DOCTYPE html>
<html>
<head>
<style type="text/css">
body {font-family:tahoma,verdana,arial;font-size:13px;margin:0;padding:0}
body > div {margin-left:4px;margin-right:4px;}
body > div > div {margin:0;border:1px solid #ccc;border-top:0;padding:4px;}
div.pane {margin:0;border:0;padding:0;display:inline-block;vertical-align:top}
h1 {margin:0 0 0.5em 0;padding: 4px 5em 4px 4px;font:bold large sans-serif;background-color:#c9d7f1;}
h4 {font-size:14px;margin:0;border:0;border-bottom:solid 1px #c9d7f1;padding:2px;background-color:#e5ecf9;}
h4 > span {cursor:pointer}
#voronoiGenerators {font-size:12px}
#voronoiGenerators input,#voronoiGenerators button {font-size:inherit}
.tileParms {margin-bottom:1em;vertical-align:bottom}
.tileParms > div {margin:0;border:0;padding:0}
.tileParms input {margin-top:2px;border:1px solid gray;width:60px;height:14px}
div.colorValues {margin:2px 0 2px 15px}
div.colorValues > img {vertical-align:bottom}
div.hLegend,div.repeatValues,div.offsetValues,div.rotateValues {display:inline-block;vertical-align:bottom}
div.hLegend {width:12px}
div.hLegend > span {margin-top:2px;padding:0 0 2px 0;display:block;height:14px;text-align:right}
div.repeatValues > div,div.offsetValues > div,div.rotateValues > div {border:1px solid #888;height:60px;position:relative;color:#aaa;text-align:center;line-height:60px}
div.repeatValues > div,div.offsetValues > div {width:60px}
div.rotateValues > div {width:25px}
div.repeatValues > div > div,div.offsetValues > div > div,div.rotateValues > div > div {border:0;position:absolute;left:0;top:0}
div.repeatValues > div > div,div.offsetValues > div > div {width:10px;height:10px;background:url('knob-dragger.png') no-repeat}
div.rotateValues > div > div {width:25px;height:5px;background:url('knob-slider.png') no-repeat}
div.rotateValues > input {width:25px;}
#canvasParent {margin-top:0;margin-bottom:1em;padding:0;border:0}
#voronoiCode {font:11px monospace;overflow:auto;color:gray;}
#voronoiCode span {color:green;font-weight:bold;}
</style>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>Javascript implementation of Steven Fortune's algorithm to compute Voronoi diagrams: Demo 3</title>
<meta name="Keywords" lang="en" content="voronoi, fortune, javascript, raymond hill"/>
<script type="text/javascript" src="mootools/mootools-core-1.3.2.js"></script>
<script type="text/javascript" src="mootools/mootools-more-1.3.2.1.js"></script>
<!--[if lte IE 8]>
	<script type="text/javascript" src="excanvas/excanvas.compiled.js"></script>
	<![endif]-->
<script type="text/javascript" src="rhill-voronoi-core.min.js"></script>
<?php
if ( isset($_REQUEST['generators']) && preg_match('/^([0-9a-fA-F]+(-|$))+$/', $_REQUEST['generators']) ) {
	$match = explode('-', $_REQUEST['generators']);
	if ( (count($match) % 3) == 0 ) {
		$tiles = array();
		$valuesPerTiles = count($match) / 3;
		if ( $valuesPerTiles >= 6 && $valuesPerTiles <= 8 ) {
			for ( $iTile = 0; $iTile < 3; $iTile++ ) {
				$index = $iTile * $valuesPerTiles;
				$xstep = min(max(hexdec($match[$index++]),0),50);
				$ystep = min(max(hexdec($match[$index++]),0),50);
				$xoffset = min(max(hexdec($match[$index++]) / 1000 - 0.5,-0.5),0.5);
				$yoffset = min(max(hexdec($match[$index++]) / 1000 - 0.5,-0.5),0.5);
				$angle = $valuesPerTiles != 7 ? min(max(hexdec($match[$index++])/1000,0),1) : 0;
				$tile = "repeatx:{$xstep}, repeaty:{$ystep}, offsetx:{$xoffset}, offsety:{$yoffset}, rotate:{$angle}";
				if ( preg_match('/^[0-9a-fA-F]{6}$/', $match[$index]) ) {
					$tile .= ", color:'#{$match[$index]}'";
					}
				$tiles[] = "{{$tile}}";
				}
			$preset = '[' . implode(',', $tiles) . ']'; 
			}
		}
	}
?>
<script type="text/javascript">
<!--
// Copyright 2011 Raymond Hill
// MIT license
var VoronoiDemo = {

	voronoi: new Voronoi(),
	sites: [],
	diagram: null,
	canvas: null,
	generators: [],
	backgroundGenerator: null,
	dragging: false,
	hasRotation: false,
	showGrout: true,
	showSites: false,
	controls: [],
	presets: [
		[
			{repeatx:10, repeaty:10},
			{repeatx:5, repeaty:5, offsetx:0.5, offsety:0.5},
			{repeatx:5, repeaty:5}
			],
		[
			{repeatx:7, repeaty:12},
			{repeatx:7, repeaty:12, offsetx:0.5,  offsety:0.5}
			],
		[
			{repeatx:10, repeaty:10, offsetx:-0.5, offsety:-0.5},
			{repeatx:5, repeaty:5, offsetx:0.5, offsety:0.5},
			{repeatx:5, repeaty:5}
			],
		[
			{repeatx:10, repeaty:10},
			{repeatx:10, repeaty:10, offsetx:0.5, offsety:0.5}
			],
		[
			{repeatx:9, repeaty:11, color:'#ffccaa'},
			{repeatx:10, repeaty:10, color:'#ccaa88'}
			],
		[
			{repeatx:24, repeaty:24, rotate:0.25, color:'#ffccaa'},
			{repeatx:24, repeaty:24, color:'#ccaa88'}
			],
		[
			{repeatx:9, repeaty:12},
			{repeatx:8, repeaty:11, offsetx:0.5, offsety:0.5},
			{repeatx:7, repeaty:7}
			],
		[
			{repeatx:1, repeaty:20},
			{repeatx:2, repeaty:2, offsetx:0.5, offsety:0.5},
			{repeatx:2, repeaty:2}
			],
		[
			{repeatx:10, repeaty:5, offsety:0.5},
			{repeatx:5, repeaty:5, offsetx:0.5, offsety:0.5},
			{repeatx:5, repeaty:5}
			],
		[
			{repeatx:20, repeaty:20, color:'#efe4b0'},
			{repeatx:21, repeaty:21, color:'#b5e61d'},
			{repeatx:22, repeaty:22, color:'#c8bfe7'}
			]
		],
	<?php if ( isset($preset) ) { echo "urlpreset: {$preset},\n"; } ?>

	init: function() {
		var demo = this;

		this.canvasWidth = this.canvasHeight = 640;
		this.canvas = $('voronoiCanvas');
		this.canvas.width = this.canvas.height = this.canvasWidth;
/*
		this.canvasPattern = $('canvasPattern');
		this.canvasPattern.width = this.canvasPattern.height = this.canvasWidth / 4;
		this.canvasPreview = $('canvasTilingPreview');
		this.canvasPreview.width = this.canvasPreview.height = this.canvasWidth;
*/
		this.generators.push(this.createGenerator([255,128,128]));
		this.generators.push(this.createGenerator([128,255,128]));
		this.generators.push(this.createGenerator([128,128,255]));
		// GUI stuff
		var handleColorChange = function(iGenerator, newColor) {
				var generator = demo.generators[iGenerator];
				if (/^#?([0-9a-fA-F]|([0-9a-fA-F]{2})){3}$/.test(newColor)) {
					if (!/^#/.test(newColor)) {
						newColor = '#' + newColor;
						}
					generator.color = newColor.hexToRgb(true);
					}
				generator.render();
				demo.renderVoronoi();
				demo.renderCanvas();
				demo.syncFields(iGenerator);
				demo.updatePermalink();
				};
		var handleValueChange = function(iGenerator, member, value) {
				if (isNaN(value)) {value=0;}
				var generator = demo.generators[iGenerator];
				generator[member] = value;
				generator.render();
				demo.renderVoronoi();
				demo.renderCanvas();
				demo.syncFields(iGenerator);
				demo.updatePermalink();
				};
		var handleStepChange = function(el,iGenerator,member) {
				handleValueChange(iGenerator,member,Math.min(Math.max(parseInt(el.value,10),0),50));
				};
		var handleOffsetChange = function(el,iGenerator,member) {
				handleValueChange(iGenerator,member,Math.min(Math.max(parseFloat(el.value),-0.5),0.5));
				};
		var handleAngleChange = function(el,iGenerator,member) {
				handleValueChange(iGenerator,member,Math.min(Math.max(parseFloat(el.value),0),1));
				};
		var handleStepDragger = function(el,iGenerator) {
			var coords = el.getCoordinates(el.getOffsetParent()),
				generator = demo.generators[iGenerator],
				hadTiles = generator.repeatx && generator.repeaty;
			generator.repeatx = coords.left;
			generator.repeaty = coords.top;
			var	hasTiles = generator.repeatx && generator.repeaty;
			generator.render();
			demo.syncTextFields(iGenerator, 'repeat');
			if (hadTiles || hasTiles) {
				demo.renderVoronoi();
				demo.renderCanvas();
				}
			};
		var handleOffsetDragger = function(el,iGenerator) {
			var coords = el.getCoordinates(el.getOffsetParent()),
				generator = demo.generators[iGenerator],
				hasTiles = generator.repeatx && generator.repeaty;
			generator.offsetx = coords.left / 50 - 0.5;
			generator.offsety = coords.top / 50 - 0.5;
			generator.render();
			demo.syncTextFields(iGenerator, 'offset');
			if (hasTiles) {
				demo.renderVoronoi();
				demo.renderCanvas();
				}
			};
		var handleRotationDragger = function(el,iGenerator) {
			var coords = el.getCoordinates(el.getOffsetParent()),
				generator = demo.generators[iGenerator],
				hasTiles = generator.repeatx && generator.repeaty;
			generator.rotate = coords.top / 55;
			generator.render();
			demo.syncTextFields(iGenerator, 'rotate');
			if (hasTiles) {
				demo.renderVoronoi();
				demo.renderCanvas();
				}
			};
		$$('#voronoiGenerators .tileParms').each(function(el,iGenerator){
			var controls = {
				color: el.getElement('.colorValues > input'),
				repeatx: el.getElement('.repeatValues > input:nth-of-type(1)'),
				repeaty: el.getElement('.repeatValues > input:nth-of-type(2)'),
				offsetx: el.getElement('.offsetValues > input:nth-of-type(1)'),
				offsety: el.getElement('.offsetValues > input:nth-of-type(2)'),
				rotate: el.getElement('.rotateValues > input:nth-of-type(1)'),
				repeatKnob: el.getElement('.repeatValues > div > div'),
				offsetKnob: el.getElement('.offsetValues > div > div'),
				rotateKnob: el.getElement('.rotateValues > div > div')
				};
			demo.controls[iGenerator] = controls;
			var dummy = new Drag(el.getElement(controls.repeatKnob), {
					snap: 1,
					limit:{x:[0,50],y:[0,50]},
					onStart: function(){demo.dragging=true;},
					onDrag: function(el){
						handleStepDragger(el,iGenerator);
						},
					onComplete: function(){
						demo.dragging=false;
						demo.renderCanvas();
						demo.updatePermalink();
						}
					});
			dummy = new Drag(el.getElement(controls.offsetKnob), {
					snap: 1,
					limit:{x:[0,50],y:[0,50]},
					onStart: function(){demo.dragging=true;},
					onDrag: function(el){
						handleOffsetDragger(el,iGenerator);
						},
					onComplete: function(){
						demo.dragging=false;
						demo.renderCanvas();
						demo.updatePermalink();
						}
					});
			dummy = new Drag(el.getElement(controls.rotateKnob), {
					snap: 1,
					limit:{x:[0,0],y:[0,55]},
					onStart: function(){demo.dragging=true;},
					onDrag: function(el){
						handleRotationDragger(el,iGenerator);
						},
					onComplete: function(){
						demo.dragging=false;
						demo.renderCanvas();
						demo.updatePermalink();
						}
					});
			controls.color.addEvent('change',function(){handleColorChange(iGenerator,this.value);});
			controls.repeatx.addEvent('change',function(){handleStepChange(this,iGenerator,'repeatx');});
			controls.repeaty.addEvent('change',function(){handleStepChange(this,iGenerator,'repeaty');});
			controls.offsetx.addEvent('change', function(){handleOffsetChange(this,iGenerator,'offsetx');});
			controls.offsety.addEvent('change', function(){handleOffsetChange(this,iGenerator,'offsety');});
			controls.rotate.addEvent('change', function(){handleAngleChange(this,iGenerator,'rotate');});
			});
		// global controls
		$('showGrout').addEvent('change',function(){
			demo.showGrout=this.checked;
			demo.renderCanvas();
			});
		$('showSites').addEvent('change',function(){
			demo.showSites=this.checked;
			demo.renderCanvas();
			});
		// initalize UI as per internal state
		this.selectPreset(this.urlpreset || this.presets[0]);
		this.syncFields();
		this.renderVoronoi();
		this.renderCanvas();
		this.updatePermalink();
		},

	renderVoronoi: function() {
		this.compositeGenerators();
		this.diagram = this.voronoi.compute(this.sites, {xl:0,xr:this.canvas.width,yt:0,yb:this.canvas.height});
		},

	renderCanvas: function() {
		var ctx = this.canvas.getContext('2d'),
			backgroundGenerator = this.backgroundGenerator;
		// background
		ctx.globalAlpha = 1;
		ctx.beginPath();
		ctx.rect(0,0,this.canvas.width,this.canvas.height);
		ctx.fillStyle = this.hasRotation || !backgroundGenerator ? '#fff' : backgroundGenerator.color.rgbToHex();
		ctx.fill();
		// voronoi
		if (!this.diagram) {return;}
		ctx.save();
		// disk-like canvas if at least one rotation is applied: this
		// because the canvas is not 'tilable' whenever at least one generator
		// has a non-zero rotation value
		if (this.hasRotation) {
			ctx.beginPath();
			ctx.arc(this.canvas.width/2,this.canvas.height/2, this.canvas.width/2, 0, 2*Math.PI, false);
			ctx.clip();
			if (backgroundGenerator) {
				ctx.fillStyle = backgroundGenerator.color.rgbToHex();
				ctx.fill();
				}
			}
		ctx.lineWidth = 0.5;
		ctx.strokeStyle = '#888';
		var cells = this.diagram.cells,
			iCell = cells.length,
			cell,
			halfedges, nHalfedges, iHalfedge, v,
			showGrout = !this.dragging && this.showGrout,
			showSites = this.showSites,
			mustFill;
		while (iCell--) {
			cell = cells[iCell];
			halfedges = cell.halfedges;
			nHalfedges = halfedges.length;
			if (nHalfedges) {
				mustFill = !backgroundGenerator || backgroundGenerator !== cell.site.generator;
				if (showGrout || mustFill) {
					v = halfedges[0].getStartpoint();
					ctx.beginPath();
					ctx.moveTo(v.x,v.y);
					for (iHalfedge=0; iHalfedge<nHalfedges; iHalfedge++) {
						v = halfedges[iHalfedge].getEndpoint();
						ctx.lineTo(v.x,v.y);
						}
					if (mustFill) {
						ctx.fillStyle = cell.site.color.rgbToHex();
						ctx.fill();
						}
					if (showGrout) {
						ctx.stroke();
						}
					}
				if (showSites) {
					ctx.fillStyle = 'black';
					ctx.fillRect(cell.site.x-0.5,cell.site.y-0.5,1.5,1.5);
					}
				}
			}
		ctx.restore();
/*		// bird's view tiling
		if (!this.dragging) {
			ctx = this.canvasPattern.getContext('2d');
			ctx.drawImage(this.canvas,0,0,this.canvasPattern.width,this.canvasPattern.height)
			ctx = this.canvasPreview.getContext('2d');
			var pattern = ctx.createPattern(this.canvasPattern,'repeat')
			ctx.fillStyle = pattern;
			ctx.fillRect(0,0,this.canvasPreview.width,this.canvasPreview.height);
			}
*/		},

	createGenerator: function(color) {
		var generator = {
			repeatx: 0,
			repeaty: 0,
			offsetx: 0,
			offsety: 0,
			rotate: 0,
			color: color,
			sites: [],
			render: function() {
				this.sites = [];
				if (!this.repeatx || !this.repeaty) {return;}
				var sites = this.sites,
					yinc = 1/this.repeaty,
					ystep = this.repeaty + 2,
					yoffset = this.offsety * yinc,
					yin = -yinc,
					xinc = 1/this.repeatx,
					xstep,
					xoffset = this.offsetx * xinc,
					xin,
					xout, yout,
					radian = this.rotate*Math.PI,
					cosfactor = Math.cos(radian),
					sinfactor = Math.sin(radian),
					xtransient, ytransient;
				while (ystep-- > 0) {
					xin = -xinc;
					xstep = this.repeatx + 2;
					radius = Math.sqrt(yinc*yinc+xinc*xinc) / 2;
					while (xstep-- > 0) {
						xout = xin + xoffset;
						yout = yin + yoffset;
						if (radian) {
							xtransient = xout - 0.5; // bring center to origin
							ytransient = yout - 0.5;
							xout = xtransient*cosfactor - ytransient*sinfactor + 0.5;
							yout = xtransient*sinfactor + ytransient*cosfactor + 0.5;
							}
						sites.push({x:xout, y:yout, color:this.color});
						xin += xinc;
						}
					yin += yinc;
					}
				}
			};
		return generator;
		},

	compositeGenerators: function() {
		this.sites = [];
		this.hasRotation = false;
		var w = this.canvas.width,
			h = this.canvas.height,
			sitemap = {},
			generators = this.generators,
			nGenerators = generators.length,
			iGenerator, generator,
			backgroundGenerator,
			sites, nSites, iSite, site,
			sitecolor, sitekey,
			x, y;
		for (iGenerator = 0; iGenerator<nGenerators; iGenerator++) {
			generator = generators[iGenerator];
			sites = generator.sites;
			nSites = generator.sites.length;
			if (!backgroundGenerator || nSites>backgroundGenerator.sites.length) {
				backgroundGenerator = generator;
				}
			for (iSite = 0; iSite<nSites; iSite++) {
				site = sites[iSite];
				x = site.x;
				y = site.y;
				// ~~(a+0.5) == Math.round(a)
				// as per http://jsperf.com/math-round-vs-hack/3 ~~ is likely faster
				// as of now. It matters here since we could be in an interactive loop
				x = (~~(w*x*100+0.5))/100;
				y = (~~(h*y*100+0.5))/100;
				sitekey = x * 10000 + y; // 10000, or whatever is safely over w and h
				if (sitemap[sitekey]) {
					// color mix = additive
					sitecolor = sitemap[sitekey].color.slice(0);
					sitecolor[0] = Math.max(sitecolor[0], generator.color[0]);
					sitecolor[1] = Math.max(sitecolor[1], generator.color[1]);
					sitecolor[2] = Math.max(sitecolor[2], generator.color[2]);
					sitemap[sitekey].color = sitecolor;
					sitemap[sitekey].generator = null;
					}
				else {
					site = {x:x, y:y, color:generator.color, generator:generator};
					sitemap[sitekey] = site;
					this.sites.push(site);
					}
				}
			this.hasRotation = this.hasRotation || (generator.rotate && generator.repeatx && generator.repeaty);
			}
		this.backgroundGenerator = backgroundGenerator;
		},

	syncTextFields: function(whichGenerator, whichControl) {
		var generators = this.generators,
			nGenerators = generators.length,
			iGenerator, generator, controls;
		for (iGenerator=0; iGenerator<nGenerators; iGenerator++) {
			generator = generators[iGenerator];
			if (whichGenerator === undefined || iGenerator === whichGenerator) {
				controls = this.controls[iGenerator];
				if (!whichControl || /^color/.test(whichControl)) {
					controls.color.value = generator.color.rgbToHex();
					controls.repeatKnob.style.backgroundColor =
					controls.offsetKnob.style.backgroundColor =
					controls.rotateKnob.style.backgroundColor = controls.color.value;
					}
				if (!whichControl || /^repeat/.test(whichControl) ) {
					controls.repeatx.value = generator.repeatx;
					controls.repeaty.value = generator.repeaty;
					}
				if (!whichControl || /^(offset|rotate)/.test(whichControl) ) {
					controls.offsetx.value = generator.offsetx.toFixed(3);
					controls.offsety.value = generator.offsety.toFixed(3);
					controls.rotate.value = generator.rotate.toFixed(3);
					}
				}
			}
		},

	syncDragFields: function(which) {
		var generators = this.generators,
			nGenerators = generators.length,
			iGenerator, generator, knob;
		for (iGenerator=0; iGenerator<nGenerators; iGenerator++) {
			if (which === undefined || iGenerator === which) {
				generator = generators[iGenerator];
				knob = this.controls[iGenerator].repeatKnob;
				knob.style.left = generator.repeatx + 'px';
				knob.style.top = generator.repeaty + 'px';
				knob = this.controls[iGenerator].offsetKnob;
				knob.style.left = String(Math.floor((generator.offsetx + 0.5) * 50)) + 'px';
				knob.style.top  = String(Math.floor((generator.offsety + 0.5) * 50)) + 'px';
				knob = this.controls[iGenerator].rotateKnob;
				knob.style.top  = String(Math.floor((generator.rotate) * 55)) + 'px';
				}
			}
		},

	syncFields: function(which) {
		this.syncTextFields(which);
		this.syncDragFields(which);
		},

	selectPreset: function(preset) {
		var nGenerators = this.generators.length,
			iGenerator, generator, preset_generator,
			defaultColors = ['#ff8080','#80ff80','#8080ff'];
		for (iGenerator=0; iGenerator<nGenerators; iGenerator++) {
			generator = this.generators[iGenerator];
			preset_generator = preset[iGenerator] || {};
			generator.repeatx = preset_generator.repeatx || 0;
			generator.repeaty = preset_generator.repeaty || 0;
			generator.offsetx = preset_generator.offsetx || 0;
			generator.offsety = preset_generator.offsety || 0;
			generator.rotate = preset_generator.rotate || 0;
			generator.color = (preset_generator.color || defaultColors[iGenerator] || '#999999').hexToRgb(true);
			generator.render();
			}
		this.syncFields();
		this.renderVoronoi();
		this.renderCanvas();
		this.updatePermalink();
		},

	updatePermalink: function(){
		var query = [],
			generators = this.generators,
			nGenerators = generators.length,
			iGenerator, generator;
		for (iGenerator=0; iGenerator<nGenerators; iGenerator++) {
			generator = generators[iGenerator];
			query.push(generator.repeatx.toString(16));
			query.push(generator.repeaty.toString(16));
			query.push(Math.round((generator.offsetx+0.5)*1000).toString(16));
			query.push(Math.round((generator.offsety+0.5)*1000).toString(16));
			query.push(Math.round((generator.rotate)*1000).toString(16));
			query.push(generator.color.rgbToHex().substr(1));
			}
		var permalink = location.protocol+'//'+location.host+location.pathname+'?generators='+query.join('-');
		var el = $('permalink');
		el.innerHTML = permalink;
		el.href = permalink;
		}
	};

window.addEvent('domready',function(){VoronoiDemo.init();});
// -->
</script>
</head>
<body>
<a href="https://github.com/gorhill/Javascript-Voronoi"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://s3.amazonaws.com/github/ribbons/forkme_right_red_aa0000.png" alt="Fork me on GitHub"></a>
<h1>Javascript implementation of Steven Fortune's algorithm to compute Voronoi diagrams<br/>Demo 3: Fancy tiling</h1>
<div id="divroot">
<p style="margin-top:0;margin-bottom:0"><a href="/voronoi/rhill-voronoi.html">&lt; Back to main page</a><ul style="margin-top:0">
<li><a href="rhill-voronoi-demo1.html">Demo 1: measuring peformance</a>
<li><a href="rhill-voronoi-demo2.html">Demo 2: a bit of interactivity</a>
<li><b>Demo 3: Fancy tiling</b>
<li><a href="rhill-voronoi-demo4.html">Demo 4: Looking up a Voronoi cell using a quadtree</a>
<li><a href="rhill-voronoi-demo5.html">Demo 5: Lloyd's relaxation</a>
<li><a href="http://www.raymondhill.net/blog/?p=458#comments">Comments</a>
</ul></p>
<div class="pane" id="canvasParent">
<h4 class="divhdr">Canvas</h4>
<noscript>You need to enable Javascript in your browser for this page to display properly.</noscript>
<canvas id="voronoiCanvas" style="cursor:crosshair" width="640" height="640"></canvas>
<div id="voronoiNoCanvasAlert" style="display:none;padding:1em;background-color:#fcc;color:black;">
<p>Your browser doesn't support the HTML5 &lt;canvas&gt; element technology.</p>
<p>See <a target="_blank" href="http://en.wikipedia.org/wiki/Canvas_(HTML_element)">Wikipedia</a> for information on which browsers support the <u>HTML5 &lt;canvas&gt;</u> technology.</p>
</div>
</div>
&nbsp;
<div class="pane" id="voronoiGenerators">
<h4 class="divhdr">1st-degree generators</h4>
<span style="margin-bottom:0.5em;display:inline-block;width:160px;font-size:xx-small;color:gray">(This page works best on latest <a style="color:inherit" href="http://www.opera.com/browser/">Opera browser</a>: I measured fastest execution + it natively supports HTML5 color picker)</span>
<div class="tileParms">
	<div class="colorValues">
		Color: <input type="color" value="#ff8080"> <a target="_blank" href="http://www.html5tutorial.info/html5-color.php">?</a>
		</div>
	<div class="hLegend">
		<span>h</span>
		<span>v</span>
		</div>
	<div class="repeatValues">
		<div>Steps<div style="background-color:#f77;"></div></div>
		<input type="text" size="6"><br>
		<input type="text" size="6">
		</div>
	<div class="offsetValues">	
		<div>Offset<div style="background-color:#f77;"></div></div>
		<input type="text" size="6"><br>
		<input type="text" size="6">
		</div>
	<div class="rotateValues">
		<div>Rot<div style="background-color:#f77;"></div></div>
		<input type="text" size="6"><br>
		<input type="text" size="6" style="visibility:hidden">
		</div>
	</div>	
<div class="tileParms">
	<div class="colorValues">
		Color: <input type="color" value="#80ff80">
		</div>
	<div class="hLegend">
		<span>h</span>
		<span>v</span>
		</div>
	<div class="repeatValues">
		<div><div style="background-color:#7f7;"></div>Steps</div>
		<input type="text" size="6"><br>
		<input type="text" size="6">
		</div>
	<div class="offsetValues">
		<div><div style="background-color:#7f7;"></div>Offset</div>
		<input type="text" size="6"><br>
		<input type="text" size="6">
		</div>
	<div class="rotateValues">
		<div><div style="background-color:#7f7;"></div>Rot</div>
		<input type="text" size="6"><br>
		<input type="text" size="6" style="visibility:hidden">
		</div>
	</div>
<div class="tileParms">
	<div class="colorValues">
		Color: <input type="color" value="#8080ff">
		</div>
	<div class="hLegend">
		<span>h</span>
		<span>v</span>
		</div>
	<div class="repeatValues">
		<div><div style="background-color:#77f;"></div>Steps</div>
		<input type="text" size="6"><br>
		<input type="text" size="6">
		</div>
	<div class="offsetValues">
		<div><div style="background-color:#77f;"></div>Offset</div>
		<input type="text" size="6"><br>
		<input type="text" size="6">
		</div>
	<div class="rotateValues">
		<div><div style="background-color:#77f;"></div>Rot</div>
		<input type="text" size="6"><br>
		<input type="text" size="6" style="visibility:hidden">
		</div>
	</div>
<div style="margin-top:1em">
	<input id="showGrout" type="checkbox" checked="checked" value="">Show grout<br>
	<input id="showSites" type="checkbox" value="">Show Voronoi sites
	</div>
<div style="margin-top:1em">
	Presets:<br>
	<script type="text/javascript">
	<!--
	(function(){
		for (var i=0; i<VoronoiDemo.presets.length; i++) {
			document.write('<button onclick="VoronoiDemo.selectPreset(VoronoiDemo.presets['+i+']);">'+String(i+1)+'</button>');
			document.write((i+1) % 3 ? ' ' : '<br>');
			}
		if (VoronoiDemo.urlpreset) {
			document.write('<button onclick="VoronoiDemo.selectPreset(VoronoiDemo.urlpreset);">URL</button>');
			}
		}());
	// -->
	</script>
	</div>
</div>
</div>
<div>
	<h4>Permalink for the above Voronoi diagram</h4>
	<p style="margin-top:0.5em"><a id="permalink" href="#"></a></p>
	</div>
<!-- 
<div>
	<h4>Tiling preview</h4>
	<canvas id="canvasPattern" style="display:none;width:100px;height:100px;"></canvas>
	<canvas id="canvasTilingPreview" style="width:640px;height:640px;"></canvas>
	</div>
-->
<div>
	<h4>Export as SVG</h4>
	<p style="margin-top:0.5em">Coming soon (I guess...)</p>
	</div>
<div>
	<h4>Further reading</h4>
	<p style="margin-top:0.5em"><a href="http://www.cs.washington.edu/homes/csk/tile/papers/kaplan_isama1999.pdf">Voronoi diagrams and ornamental design (PDF file)</a> by Craig S. Kaplan.<br><a href="http://www.josleys.com/show_gallery.php?galid=284">Mathematical imagery</a> by Jos Leys.</p>
	</div>
</body>
</html>

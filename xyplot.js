/*
Ver. 1.1 (02.12.2022)
Fixed Bug in suggestAxis

*/

function time()
{
	return (Date.now() / 1000.0);
}

function strftime_date(fmt, date)
{
	const weekday_en = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
	const weekday_de = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
	var wd   = weekday_de[date.getDay()].substr(0, 2);
	var yr   = "" + date.getFullYear();
	var mon  = ("0" + (date.getMonth() + 1)).substr(-2);
	var day  = ("0" + date.getDate()       ).substr(-2);	
	var h    = ("0" + date.getHours()      ).substr(-2);
	var m    = ("0" + date.getMinutes()    ).substr(-2);
	var s    = ("0" + date.getSeconds()    ).substr(-2);
	return fmt.
		replace('%H', h).replace('%M', m).replace('%S', s).
		replace('%y', yr).replace('%m', mon).replace('%d', day).replace('%w', wd);
}

function strftime(fmt, t)
{
	return strftime_date(fmt, new Date(t * 1000));
}

function xToStr(x, axis)
{
	return axis.isTime ? strftime(axis.timefmt, x) : x.toFixed(axis.fmtPrec);
}

function initProperty(obj, name, defVal)
{
	if (name in obj)
		return true;
	else
		obj[name] = defVal;
	return false;
}

function xToW(x, gd)
{
	return ((gd.plotRect.Width * (x - gd.xAxis.min)) / gd.xAxis.range) + gd.plotRect.Left;
}

function wToX(w, gd)
{
	return (((w - gd.plotRect.Left) * gd.xAxis.range) / gd.plotRect.Width) + gd.xAxis.min;
}

function yToH(y, gd)
{
	return gd.plotRect.Top + gd.plotRect.Height - ((gd.plotRect.Height * (y - gd.yAxis.min)) / gd.yAxis.range);
}

function hToY(h, gd)
{
	return gd.yAxis.min - (((h - gd.plotRect.Top - gd.plotRect.Height) * gd.yAxis.range) / gd.plotRect.Height);
}

function xyplot_setPoints(gd, points, xMin = Number.NaN)
{
	if (gd.points == null)
		gd.points = [];
		
	if (Number.isFinite(xMin))
	{
		gd.points = gd.points.concat(points);
		// delete too-old points:
		while (gd.points.length > 0)
		{
			if (gd.points[0][0] < xMin)
				gd.points.shift();
			else
				break;
		}
	}
	else
	{
		gd.points = points;
	}

	gd.dataChanged = true;
	refreshGraph(gd);
}

function drawGraphBackgnd(gd)
{	
	function anticolor(hexColorStr)
	{
		hexColorStr = hexColorStr.replace('#', '0x');
		var c = parseInt(hexColorStr, 16) ^ 0xffffff;
		return '#' + c.toString(16).padStart(6, '0');		
	}
	
	var canvas = gd.canvas;
	var ctx    = gd.ctx;
	
	// calc plot rect
	canvas.width  = 1.0 * window.innerWidth - 40; // 40 is approx size of the vert. scroll bar
	canvas.height = 0.5 * window.innerHeight;

	gd.margin		 = canvas.height / 12;
	gd.fontSizeBig   = 3 * gd.margin / 4;
	gd.fontSizeSmall = 2 * gd.margin / 5;
	gd.fontPattern   = gd.ctx.font.replace(/\d+px/, "#px");	
	gd.fontBig       = gd.fontPattern.replace("#", gd.fontSizeBig);
	gd.fontSmall     = gd.fontPattern.replace("#", gd.fontSizeSmall);
	
	ctx.setLineDash([]);

	// plot rect
	var plotRect    = { Left:0, Right:0, Width:0, Height:0 };
	plotRect.Left   = 2 * gd.margin;
	plotRect.Width  = canvas.width - 3 * gd.margin;
	plotRect.Right  = plotRect.Left + plotRect.Width;
	plotRect.Top    = gd.margin;
	plotRect.Height = canvas.height - 2.5 * gd.margin;
	plotRect.Bottom = plotRect.Top + plotRect.Height;
	gd.plotRect     = plotRect;

	// background
	ctx.fillStyle = gd.backColor;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.lineWidth = 0;

	// outer frame
	ctx.strokeStyle = gd.plotColor; //  fontColor;
	ctx.beginPath();	
	ctx.rect(ctx.lineWidth, ctx.lineWidth, canvas.width - 2 * ctx.lineWidth, canvas.height - 2 * ctx.lineWidth);
	ctx.stroke();
	
	gd.plotColorNeg = anticolor(ctx.strokeStyle);	

	// Main Caption
	ctx.strokeStyle = gd.axisColor;	
	ctx.fillStyle = gd.plotColor; //  fontColor;
	ctx.font = gd.fontBig;
	ctx.textAlign = "center";
	ctx.fillText(gd.caption, canvas.width / 2, plotRect.Top - 5);
	ctx.fillStyle = gd.fontColor;
	
	// dragRect
	if (gd.showDragRect)
	{
		ctx.fillStyle = gd.plotColorNeg; // gd.axisColor;
		var w1 = xToW(gd.dragXPos1, gd);
		var w2 = xToW(gd.dragXPos2, gd);
		ctx.fillRect(w1, gd.plotRect.Top, w2 - w1, gd.plotRect.Height);
	}

	// Captions
	ctx.fillStyle = gd.axisColor;
	ctx.font = gd.fontSmall;
	
	ctx.setLineDash([1, 2]);

	// xLabels
	ctx.textAlign = "center";
	var ylabelsOffs = plotRect.Top + plotRect.Height + 10 * gd.fontSizeSmall / 6;	
	for (var i=0; i < gd.xAxis.labels.length; i++)
	{
		var xPos = plotRect.Left + (i * plotRect.Width) / (gd.xAxis.labels.length - 1);	
		ctx.beginPath();
		ctx.moveTo(xPos, plotRect.Top);
		ctx.lineTo(xPos, plotRect.Bottom);
		ctx.stroke();
		ctx.fillText(gd.xAxis.labels[i], xPos, ylabelsOffs);
	}

	// yLabels
	ctx.textAlign = "right";
	var xLabelsOffs = plotRect.Top + gd.fontSizeSmall / 2;
	for (var i=0; i < gd.yAxis.ticksCount + 1; i++)
	{
		var y = gd.yAxis.min + (i * gd.yAxis.range) / (gd.yAxis.ticksCount);
		
		ctx.setLineDash((y == 0) ? [4, 2] : [1, 2]);		
		
		var h = yToH(y, gd);
		ctx.beginPath();
		ctx.moveTo(plotRect.Left,  h);
		ctx.lineTo(plotRect.Right, h);
		ctx.stroke();
		//var label = gd.yLabels[i];
		var label = y.toFixed(gd.yAxis.fmtPrec);
		ctx.fillText(label, plotRect.Left - 5, h + gd.fontSizeSmall / 2);
	}

	//if (gd.debugText != null)
	{
		var dbgText = (gd.debugText != null) ? gd.debugText : strftime('printed: %y-%m-%d, %H:%M:%S', time());

		ctx.fillStyle = gd.axisColor;
		ctx.strokeStyle = gd.plotColor;	
		ctx.textAlign = "left";
		ctx.fillText(dbgText, gd.fontSizeSmall, gd.canvas.height - 2*gd.fontSizeSmall/3);	
	}
}

function drawPoints(gd)
{
	if ((gd.points == null) || (gd.points.length == 0))
		return;	

	var ctx  = gd.ctx;	
	var tNow = time();
	var prevPoint   = null;
	var h0 = yToH(Math.max(0, gd.yAxis.min), gd);
	var x, y, w, h;
	

	ctx.strokeStyle = gd.plotColor;
	ctx.fillStyle   = gd.plotColor;	

	var dHiliteMin = Number.MAX_VALUE, iHilite = 0, xHilite = 0, yHilite = 0;

	ctx.setLineDash([]);

	var plotColor, hiliteColor;
	for (var i=0; i < gd.points.length; i++)
	{
		x = gd.points[i][0];
		y = gd.points[i][1];

		if (gd.liveMode)
			x -= tNow;

		if (x < gd.xAxis.min)
			continue;
		
		var yNeg = (y < 0);
		if (gd.flipNegY)	
		{
			y = Math.abs(y);
		}		
		
		var plotColor = (yNeg && gd.useNegYColor) ? gd.plotColorNeg : gd.plotColor;
		ctx.strokeStyle = plotColor;
		ctx.fillStyle   = plotColor;
		
		if (gd.hiliteXEnable)
		{
			var d = Math.abs(x - gd.hiliteXPos);
			if (d < dHiliteMin)
			{
				dHiliteMin = d;
				iHilite = i;
				xHilite = x;
				yHilite = y;
				hiliteColor = plotColor;
			}			
		}

		w = xToW(x, gd);
		h = yToH(y, gd);

		if (gd.drawLines && (prevPoint != null))
		{	
			ctx.beginPath();
			ctx.moveTo(prevPoint.w, prevPoint.h);
			ctx.lineTo(w, h);	
			ctx.stroke();				
		}
		
		if (gd.drawBars)
		{
			ctx.beginPath();
			ctx.moveTo(w, h0);
			ctx.lineTo(w, h);	
			ctx.stroke();	
		}		

		if (gd.drawPoints)
		{
			ctx.beginPath();	
			ctx.arc(w, h, 2, 0, 2 * Math.PI);
			ctx.stroke();
		}
		
		prevPoint = {w:w, h:h};
	}
	
	/*
	if (gd.liveMode)
	{
		var tstr = (new Date()).toLocaleTimeString();
		var txt  = y.toFixed(gd.yAxis.fmtPrec) + gd.unit + ", " + tstr;
		ctx.fillStyle = ctx.strokeStyle;
		ctx.textAlign = "right";
		ctx.fillText(txt, gd.plotRect.Right - 5, gd.plotRect.Top - 5);	
	}
	*/

	if (gd.hiliteXEnable)
	{
		w = xToW(xHilite, gd);
		h = yToH(yHilite, gd);		
		ctx.strokeStyle = hiliteColor;			
		
		ctx.beginPath();	
		ctx.arc(w, h, 2, 0, 2 * Math.PI);
		ctx.stroke();
			
		ctx.setLineDash([1, 2]);
		
		ctx.beginPath();
		ctx.moveTo(w, gd.plotRect.Top);
		ctx.lineTo(w, gd.plotRect.Bottom);	
		ctx.stroke();
		
		ctx.beginPath();		
		ctx.moveTo(gd.plotRect.Left,  h);
		ctx.lineTo(gd.plotRect.Right, h);
		ctx.stroke();		
		
		
		var dxTxt = "";
		if (gd.showDragRect)
		{
			var dx = gd.dragXPos2 - gd.dragXPos1;
			dxTxt = " (dx=" + dx.toFixed(gd.xAxis.fmtPrec) + ")";
		}

		var hoverText = xToStr(xHilite, gd.xAxis) + "/" + yHilite.toFixed(gd.yAxis.fmtPrec) + gd.yAxis.unit + dxTxt;
		ctx.fillStyle = gd.axisColor;
		ctx.fillText(hoverText, w, h);	
	}
}

function suggestAxis(axis)
{
	axis.ticksCount = 10; // initial axis.ticksCount - thats about the amount of ticks that is requested
	axis.fmtPrec = 0; // initial axis.fmtPrec - thats about the amount of ticks that is requested	
	return axis.isTime ? suggestTimeAxis(axis) : suggestPhyAxis(axis);	
}

function suggestTimeAxis(axis)
{
	axis.range = axis.max - axis.min;
	console.log("suggestTimeAxis: IN   axis=%o", axis);

	var rangeDefs =
	[  //  size, sapacing, fmt
		[         0,       10,  2, '%H:%M:%S'],   //  0
		[        60,       10,  2, '%H:%M:%S'],   //  1
		[       300,       30,  2, '%H:%M:%S'],   //  2
		[       600,       60,  2, '%H:%M'],      //  3
		[      1200,       60,  2, '%H:%M'],      //  4
		[      3600,      300,  3, 'a%H:%M'],     //  5
		[      7200,      900,  3, 'b%H:%M'],     //  6
		[     86400,     3600,  3, '%H:'],        //  7
		[ 7 * 86400,     3600,  3, '%w,%H:'],     //  8
		[ Number.MAX_VALUE, 3600, 3, 'x%H:%M:%S'],//  9
	];

	var i;
	for (i=1; i < rangeDefs.length; i++)
	{
		if ((axis.range >= rangeDefs[i-1][0]) && (axis.range <= rangeDefs[i][0]))	
		{
			console.log("RangeHit %d: [%d ... %d ... %d]", i, 
			rangeDefs[i-1][0], axis.range, rangeDefs[i][0]



			);
			break;
		}
	}

	var spacing     = rangeDefs[i][1];
	var tickReduce  = 3; // rangeDefs[i][2];
	axis.timefmt    = rangeDefs[i][3];	
	axis.min        = Math.floor(axis.min / spacing) * spacing;
	axis.max        = Math.ceil (axis.max / spacing) * spacing;
	axis.range      = axis.max - axis.min;
	axis.ticksCount = axis.range / spacing;
	while (axis.ticksCount > 30)
		axis.ticksCount = axis.ticksCount / tickReduce;
	console.log("suggestTimeAxis: spacing=" + spacing);	
	console.log("suggestTimeAxis: OUT  axis=%o", axis);	
}

function suggestPhyAxis(axis)
{
	console.log("suggestPhyAxis: IN  axis=%o", axis);

	function niceRange(u) // https://stackoverflow.com/questions/326679/choosing-an-attractive-linear-scale-for-a-graphs-y-axis
	{
		var h = u;
		
		var x = 1;
		while (u < 0.1) // expand u
		{
			u *= 10.0;
			x /= 10.0;
		}
		
		while (u > 1.0) // shrink u
		{
			u /= 10.0;
			x *= 10.0;
		}
		var steps = [0.1, 0.2, 0.25, 0.5, 1.0];

		var r = 0;
		for (var i=0; i < steps.length - 1; i++)
		{
			if (u >= steps[i])
			{
				r = steps[i + 1];
			}
		}

		//console.log("niceRange: " + h + " -> " + u + " -> " + r + " -> " + r * x);	
		
		r *= x;
		return r;
	}

	function hasFract(x)
	{
		return (x - Math.floor(x)) > 0.0;
	}	

	// https://stackoverflow.com/questions/326679/choosing-an-attractive-linear-scale-for-a-graphs-y-axis	
	var range = Math.abs(axis.max - axis.min);

	console.log("suggestPhyAxis:     Range=[" + axis.min + " ... " + axis.max + "] range=" + range);

	if (range == 0)
		return;
	
	var ntRange = niceRange(range / axis.ticksCount);
	axis.min = ntRange * Math.floor(axis.min / ntRange);
	axis.max = ntRange * Math.ceil (axis.max / ntRange);
	var rRange  = Math.abs(axis.max - axis.min);
	
	axis.ticksCount = rRange / ntRange;
	
	axis.fmtPrec = 0;
	
	var rTickWidth = rRange / axis.ticksCount;
	
	var rrMag   = Math.log10(rRange);
	if (rrMag > 0)
	{
		axis.fmtPrec = hasFract(rTickWidth) ? 1 : 0;
	}
	else
	{
		axis.fmtPrec = Math.ceil( - rrMag) + 1;
	}
	
	axis.range = axis.max - axis.min;
	
	console.log("suggestAxis: OUT axis=%o", axis);
}

function initAxisFromData(axis, points, col, flipNeg)
{
	if (points == null)
		return;

	if (axis.autoScale)
	{
		if (points.length > 1)
		{
			axis.min = Number.MAX_VALUE;
			axis.max = Number.MIN_VALUE;
			for (var i=0; i<points.length; i++)
			{
				var p = points[i][col];
				
				if (flipNeg)
					p = Math.abs(p);

				axis.min = Math.min(axis.min, p);
				axis.max = Math.max(axis.max, p);
			}
		}	
	}	
	
	suggestAxis(axis);	

	if (axis.labels == null)
	{
		var labelGap = (axis.ticksCount > 10) ? 2 : 1;
		axis.labels = [];
		for (var i=0; i<axis.ticksCount+1; i++)
		{
			var x = axis.min + (i * axis.range) / axis.ticksCount;
			var txt = (i%labelGap==0) ? xToStr(x, axis) : "";
			axis.labels.push(txt);
		}		
	}
}

function refreshGraph(gd)
{
	if (gd.dataChanged)
	{
		gd.xAxis._name = gd.xAxis.isTime ? "T" : "X";
		gd.yAxis._name = "Y"; 		
		initAxisFromData(gd.xAxis, gd.points, 0, false);
		initAxisFromData(gd.yAxis, gd.points, 1, gd.flipNegY);
		gd.dataChanged = false;
	}
	drawGraphBackgnd(gd);
	drawPoints(gd);
}

function xyplot_createGraph(gd)
{
	initProperty(gd, 'drawLines',  true);
	initProperty(gd, 'drawPoints', true);
	initProperty(gd, 'drawBars',   false);
	initProperty(gd, 'drawArea',   false);	
	initProperty(gd, 'debugText', null);
	initProperty(gd, 'hoverModeEnabled', true);
	initProperty(gd, 'dragModeEnabled', false);
	initProperty(gd, 'liveMode', false);
	initProperty(gd, 'flipNegY', false);
	initProperty(gd, 'useNegYColor', false);
	initProperty(gd.xAxis, 'isTime', false);
	initProperty(gd.xAxis, 'autoScale', true);
	initProperty(gd.yAxis, 'autoScale', true);

	if (gd.flipNegY) { gd.useNegYColor = true; }

	gd.canvas  = document.getElementById(gd.id);
	gd.ctx     = gd.canvas.getContext("2d");
	gd.canvas.graphDef = gd;
	
	gd.dataChanged = true;
	refreshGraph(gd);	
	
	console.log("createGraph: gd=%o", gd);

	gd.canvas.addEventListener('mousedown', onMouseEvents);
	gd.canvas.addEventListener('mousemove', onMouseEvents);
	gd.canvas.addEventListener('mouseup',   onMouseEvents);
}

// ---- mouse stuff ----

const Zone = { CENTER:0, LEFT:-1, RIGHT:1, TOP:2, BOTTOM:-2 };

function getClickPos(gd, event)
{
	const cliRect = gd.canvas.getBoundingClientRect();
	return {
		x: event.clientX - cliRect.left,
		y: event.clientY - cliRect.top
	};	
}

function onMouseEvents(event)
{
	function canvasPosToPlotCoords(gd, p)
	{
		var z = Zone.CENTER;
		if (p.x < gd.plotRect.Left)
			z = Zone.LEFT;
		else if (p.x > gd.plotRect.Right)	
			z = Zone.RIGHT;
		else if (p.y < gd.plotRect.Top)	
			z = Zone.TOP;
		else if (p.y > gd.plotRect.Bottom)	
			z = Zone.BOTTOM;

		return {
			zone: z,
			x: wToX(p.x, gd),
			y: hToY(p.y, gd)
		};
	}
	
	var gd = event.target.graphDef;
	var p = getClickPos(gd, event);
	p = canvasPosToPlotCoords(gd, p);
	
	if (event.type == "mousedown")
	{
		gd.mouseDown = true;
		gd.dragXPos1 = p.x;
		gd.dragXPos2 = p.x;
	}
	else if (event.type == "mousemove")
	{
		gd.hiliteXEnable = gd.hoverModeEnabled && (p.zone == Zone.CENTER);
		gd.hiliteXPos = p.x;

		if (gd.mouseDown) // dragging ...
		{
			gd.showDragRect = gd.dragModeEnabled;
			gd.dragXPos2 = p.x;
		}
	}
	else if (event.type == "mouseup")
	{
		gd.mouseDown = false;
		gd.hiliteXPos = p.x;
	}
	refreshGraph(gd);
}

var color_choices = [
    "#FF00FF",
    "#8622FF",
    "#FE0056",
    "#00FFCE",
    "#FF8000",
    "#00B7EB",
    "#FFFF00",
    "#0E7AFE",
    "#FFABAB",
    "#0000FF",
    "#CCCCCC",
];

var radiansPer45Degrees = Math.PI / 4;

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var img = new Image();
var rgb_color = color_choices[Math.floor(Math.random() * color_choices.length)] 
var opaque_color =  'rgba(0,0,0,0.5)';

var scaleFactor = 1;
var scaleSpeed = 0.01;

var points = [];
var regions = [];

var currX = 0;
var currY = 0;

// TODO: store points as 1D array -- better performance than 2D array since each point has exactly two elements
// https://github.com/mwomick/bench/tree/main/web/js-arrays
// access masterPoints[n].x by points[n * 2] and masterPoints[n].y by points[n * 2 + 1]
var masterPoints = [];

// TODO: supported verbs are 'moveto', 'lineto', and 'closepath' as defined in the SVG spec
// https://www.w3.org/TR/SVG/paths.html
// 'm' marks a new sub-path (polygon or line), 'l' marks a line, 'z' marks end of closed path (i.e. polygon)
// for now, sub-paths will be treated as distinct paths
// var masterVerbs = [];

var masterColors = [];

var showNormalized = false;
var drawMode = "polygon";
var constrainAngles = false;

var modeMessage = document.querySelector('#mode');
var coords = document.querySelector('#coords');

// if user presses L key, change draw mode to line and change cursor to cross hair
document.addEventListener('keydown', function(e) {
    if (e.key == 'l' || e.key == 'L') {
        drawMode = "line";
        canvas.style.cursor = 'crosshair';
        modeMessage.innerHTML = "Draw Mode: Line (press <kbd>p</kbd> to change to polygon drawing)";
    }
    if (e.key == 'p' || e.key == 'P') {
        drawMode = "polygon";
        canvas.style.cursor = 'crosshair';
        modeMessage.innerHTML = 'Draw Mode: Polygon (press <kbd>l</kbd> to change to line drawing)';
    }
});

function clipboard(selector) {
    var copyText = document.querySelector(selector).innerText;
    navigator.clipboard.writeText(copyText);
}

function zoom(clicks) {
    // if w > 60em, stop
    if ((scaleFactor + clicks * scaleSpeed) * img.width > 40 * 16) {
        return;
    }
    scaleFactor += clicks * scaleSpeed;
    scaleFactor = Math.max(0.1, Math.min(scaleFactor, 0.8));
    var w = img.width * scaleFactor;
    var h = img.height * scaleFactor;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
}

// placeholder image
img.src = 'https://assets.website-files.com/5f6bc60e665f54545a1e52a5/63d3f236a6f0dae14cdf0063_drag-image-here.png';
img.onload = function() {
    scaleFactor = 0.5;
    canvas.style.width = img.width * scaleFactor + 'px';
    canvas.style.height = img.height * scaleFactor + 'px';
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
};

function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    // set widht
    ctx.lineWidth = 5;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function getScaledCoords(e) {
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    return [x / scaleFactor, y / scaleFactor];
}

function drawAllPolygons () {
    // draw all points for previous regions
    for (var i = 0; i < masterPoints.length; i++) {
        var newpoints = masterPoints[i];
        // set color
        ctx.strokeStyle = masterColors[i];
        for (var j = 1; j < newpoints.length; j++) {
            // draw all lines
            drawLine(newpoints[j - 1][0], newpoints[j - 1][1], newpoints[j][0], newpoints[j][1]);
        }
        drawLine(newpoints[newpoints.length - 1][0], newpoints[newpoints.length - 1][1], newpoints[0][0], newpoints[0][1]);
        // draw arc around each point
        for (var j = 0; j < newpoints.length; j++) {
            ctx.beginPath();
            ctx.strokeStyle = masterColors[i];
            ctx.arc(newpoints[j][0], newpoints[j][1], 5, 0, 2 * Math.PI);
            // fill with white
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.stroke();
        }
        // fill
        ctx.beginPath();
        ctx.fillStyle = opaque_color;
        ctx.moveTo(newpoints[0][0], newpoints[0][1]);
        for (var j = 1; j < newpoints.length; j++) {
            ctx.lineTo(newpoints[j][0], newpoints[j][1]);
        }
        ctx.closePath();
        ctx.fill();
    }
}

function clearall() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    points = [];
    masterPoints = [];
    document.querySelector('#json').innerHTML = '';
    document.querySelector('#python').innerHTML = '';
}

document.querySelector('#clear').addEventListener('click', function(e) {
    e.preventDefault();
    clearall();
});

document.querySelector('#clipboard').addEventListener('click', function(e) {
    e.preventDefault();
    clipboard("#clipboard");
});

document.querySelector('#clipboardJSON').addEventListener('click', function(e) {
    e.preventDefault();
    clipboard("#clipboardJSON");
});

canvas.addEventListener('dragover', function(e) {
    e.preventDefault();
});

canvas.addEventListener('wheel', function(e) {
    var delta = Math.sign(e.deltaY);
    zoom(delta);
});

document.querySelector('#saveImage').addEventListener('click', function(e) {
    e.preventDefault();
    var link = document.createElement('a');
    link.download = 'image.png';
    link.href = canvas.toDataURL();
    link.click();
});

// on canvas hover, if cursor is crosshair, draw line from last point to cursor
canvas.addEventListener('mousemove', function(e) {
    var x = getScaledCoords(e)[0];
    var y = getScaledCoords(e)[1];

    x = Math.round(x);
    y = Math.round(y);

    // update x y coords
    var xcoord = document.querySelector('#x');
    var ycoord = document.querySelector('#y');

    if(constrainAngles) {
        var lastPoint = points[points.length - 1];
        var dx = x - lastPoint[0];
        var dy = y - lastPoint[1];
        var angle = Math.atan2(dy, dx);
        var length = Math.sqrt(dx * dx + dy * dy);
        const snappedAngle = Math.round(angle / radiansPer45Degrees) * radiansPer45Degrees;
        var new_x = lastPoint[0] + length * Math.cos(snappedAngle);
        var new_y = lastPoint[1] + length * Math.sin(snappedAngle);
        x = Math.round(new_x);
        y = Math.round(new_y);
    }

    xcoord.innerHTML = x;
    ycoord.innerHTML = y;

    currX = x;
    currY = y;

    if (canvas.style.cursor == 'crosshair') {
        //ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        for (var i = 0; i < points.length - 1; i++) {
            // draw arc around each point
            ctx.beginPath();
            ctx.strokeStyle = rgb_color;
            ctx.arc(points[i][0], points[i][1], 5, 0, 2 * Math.PI);
            // fill with white
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.stroke();
            drawLine(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
        }
        if ((points.length > 0 && drawMode == "polygon") || (points.length > 0 && points.length < 2 && drawMode == "line")) {
            ctx.beginPath();
            ctx.strokeStyle = rgb_color;
            ctx.arc(points[i][0], points[i][1], 5, 0, 2 * Math.PI);
            // fill with white
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.stroke();
            drawLine(points[points.length - 1][0], points[points.length - 1][1], x, y);

            if (points.length == 2 && drawMode == "line") {
                console.log("line");
                // draw arc around each point
                ctx.beginPath();
                ctx.strokeStyle = rgb_color;
                ctx.arc(points[0][0], points[0][1], 5, 0, 2 * Math.PI);
                // fill with white
                ctx.fillStyle = 'white';
                ctx.fill();
                ctx.stroke();
                masterPoints.push(points);
                points = [];
            }
        }
        var parentPoints = [];

        for (var i = 0; i < masterPoints.length; i++) {
            parentPoints.push(masterPoints[i]);
        }
        parentPoints.push(points);

        drawAllPolygons();
    }
});

window.addEventListener('keydown', function(e) {
    // TODO: consider changing to switch statement
    if (e.key === 'Enter') {
        canvas.style.cursor = 'default';
        // remove line drawn by mouseover
        // ctx.clearRect(0, 0, canvas.width, canvas.height);
        // join the dots
        drawLine(points[0][0], points[0][1], points[points.length - 1][0], points[points.length - 1][1]);
        // fill polygon with color
        if (drawMode == 'polygon') {
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            ctx.fillStyle = opaque_color;
            for (var i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
            ctx.fill();
            // draw line connecting last two points
        }
        masterPoints.push(points);
        // draw arc around last point
        ctx.beginPath();
        ctx.strokeStyle = rgb_color;
        ctx.arc(points[points.length - 1][0], points[points.length - 1][1], 5, 0, 2 * Math.PI);
        // fill with white
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.stroke();
        points = [];
        // dont choose a color that has already been chosen
        var remaining_choices = color_choices.filter(function(x) {
            return !masterColors.includes(x);
        });
        
        if (remaining_choices.length == 0) {
            remaining_choices = color_choices;
        }

        rgb_color = remaining_choices[Math.floor(Math.random() * remaining_choices.length)];
    
        masterColors.push(rgb_color);
    }
    else if (e.key === 'Escape') {
        // TODO: change to line and move if in polygon mode
        // if (drawMode == 'polygon') {
        // }
    }
    else if (e.key === 'Shift') {
        constrainAngles = true;
    }
    else if((e.ctrlKey || e.metaKey) && e.key === 'z') {
        // disable browser undo, e.g. in Safari
        e.preventDefault();
        if (points.length > 0) {
            points.pop();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            // TODO: could be refactored into a single refresh/redraw function
            for (var i = 0; i < points.length - 1; i++) {
                // draw arc around each point
                ctx.beginPath();
                ctx.strokeStyle = rgb_color;
                ctx.arc(points[i][0], points[i][1], 5, 0, 2 * Math.PI);
                // fill with white
                ctx.fillStyle = 'white';
                ctx.fill();
                ctx.stroke();
                drawLine(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
            } 
            if ((points.length > 0 && drawMode == "polygon") || (points.length > 0 && points.length < 2 && drawMode == "line")) {
                ctx.beginPath();
                ctx.strokeStyle = rgb_color;
                ctx.arc(points[i][0], points[i][1], 5, 0, 2 * Math.PI);
                // fill with white
                ctx.fillStyle = 'white';
                ctx.fill();
                ctx.stroke();
                drawLine(points[points.length - 1][0], points[points.length - 1][1], currX, currY);

                if (points.length == 2 && drawMode == "line") {
                    console.log("line");
                    // draw arc around each point
                    ctx.beginPath();
                    ctx.strokeStyle = rgb_color;
                    ctx.arc(points[0][0], points[0][1], 5, 0, 2 * Math.PI);
                    // fill with white
                    ctx.fillStyle = 'white';
                    ctx.fill();
                    ctx.stroke();
                    masterPoints.push(points);
                    points = [];
                }
            }
            var parentPoints = [];

            for (var i = 0; i < masterPoints.length; i++) {
                parentPoints.push(masterPoints[i]);
            }
            // add "points"
            parentPoints.push(points);
        
            writePoints(parentPoints);

            drawAllPolygons();
        }
    }
});

window.addEventListener('keyup', function(e) {
    if (e.key === 'Shift') {
        constrainAngles = false;
    }
});

canvas.addEventListener('drop', function(e) {
    e.preventDefault();
    var file = e.dataTransfer.files[0];
    var reader = new FileReader();
    
    reader.onload = function(event) {
        // only allow image files
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);

    var mime_type = file.type;

    if (
        mime_type != 'image/png' &&
        mime_type != 'image/jpeg' &&
        mime_type != 'image/jpg'
    ) {
        alert('Only PNG, JPEG, and JPG files are allowed.');
        return;
    }

    img.onload = function() {
        scaleFactor = 0.25;
        canvas.style.width = img.width * scaleFactor + 'px';
        canvas.style.height = img.height * scaleFactor + 'px';
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.style.borderRadius = '10px';
        ctx.drawImage(img, 0, 0);
    };
    // show coords
    document.getElementById('coords').style.display = 'inline-block';
});

function writePoints(parentPoints) {
    var normalized = [];

    // if normalized is true, normalize all points
    var imgHeight = img.height;
    var imgWidth = img.width;
    if (showNormalized) {
        for (var i = 0; i < parentPoints.length; i++) {
            var normalizedPoints = [];
            for (var j = 0; j < parentPoints[i].length; j++) {
                normalizedPoints.push([
                    Math.round(parentPoints[i][j][0] / imgWidth * 100) / 100,
                    Math.round(parentPoints[i][j][1] / imgHeight * 100) / 100
                ]);
            }
            normalized.push(normalizedPoints);
        }
        parentPoints = normalized;
    }

    // create np.array list
    var code_template = `
[
${parentPoints.map(function(points) {
return `np.array([
${points.map(function(point) {
    return `[${point[0]}, ${point[1]}]`;
}).join(',')}
])`;
}).join(',')}
]
    `;
    document.querySelector('#python').innerHTML = code_template;

    var json_template = `
{
${parentPoints.map(function(points) {
return `[
${points.map(function(point) {
return `{"x": ${point[0]}, "y": ${point[1]}}`;
}).join(',')}
]`;
}).join(',')}
}
    `;
    document.querySelector('#json').innerHTML = json_template;
}

canvas.addEventListener('click', function(e) {
    // set cursor to crosshair
    canvas.style.cursor = 'crosshair';
    // if line mode and two points have been drawn, add to masterPoints
    if (drawMode == 'line' && points.length == 2) {
        masterPoints.push(points);
        points = [];
    }
    var x = getScaledCoords(e)[0];
    var y = getScaledCoords(e)[1];
    x = Math.round(x);
    y = Math.round(y);

    if(constrainAngles) {
        var lastPoint = points[points.length - 1];
        var dx = x - lastPoint[0];
        var dy = y - lastPoint[1];
        var angle = Math.atan2(dy, dx);
        var length = Math.sqrt(dx * dx + dy * dy);
        const snappedAngle = Math.round(angle / radiansPer45Degrees) * radiansPer45Degrees;
        var new_x = lastPoint[0] + length * Math.cos(snappedAngle);
        var new_y = lastPoint[1] + length * Math.sin(snappedAngle);
        x = Math.round(new_x);
        y = Math.round(new_y);
    }

    points.push([x, y]);
    ctx.beginPath();
    ctx.strokeStyle = rgb_color;
    // add rgb_color to masterColors
    
    if (masterColors.length == 0) {
        masterColors.push(rgb_color);
    }

    ctx.arc(x, y, 155, 0, 2 * Math.PI);
    // concat all points into one array
    var parentPoints = [];

    for (var i = 0; i < masterPoints.length; i++) {
        parentPoints.push(masterPoints[i]);
    }
    // add "points"
    parentPoints.push(points);

    writePoints(parentPoints);
});

document.querySelector('#normalize_checkbox').addEventListener('change', function(e) {
    showNormalized = e.target.checked;
    // normalize all
    var parentPoints = [];

    for (var i = 0; i < masterPoints.length; i++) {
        parentPoints.push(masterPoints[i]);
    }

    parentPoints.push(points);

    writePoints(parentPoints);
});
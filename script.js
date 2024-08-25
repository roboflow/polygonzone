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
var fill_color =  'rgba(0,0,0,0.35)';

var scaleFactor = 1;
var scaleSpeed = 0.01;

var points = [];
var regions = [];
var masterPoints = [];
var masterColors = [];

var drawMode
setDrawMode('polygon')
var constrainAngles = false;
var showNormalized = false;

var modeMessage = document.querySelector('#mode');
// var coords = document.querySelector('#coords');

function clipboard(selector) {
    var copyText = document.querySelector(selector).innerText;
    navigator.clipboard.writeText(copyText);
}

function clearDrawings() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
}

function isClockwise(vertices) {
    let sum = 0;
    for (let i = 0; i < vertices.length; i++) {
        const [x1, y1] = vertices[i];
        const [x2, y2] = vertices[(i + 1) % vertices.length];
        sum += (x2 - x1) * (y2 + y1);
    }
    return sum > 0;
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

function closePath() {
    canvas.style.cursor = 'default';
    // we do this to avoid clearing overlapping polygons
    if (isClockwise(points)) {
        points = points.reverse();
    }
    masterPoints.push(points);
    points = [];
    masterColors.push(rgb_color);
    clearDrawings();
    drawAllPolygons();

    // dont choose a color that has already been chosen
    var remaining_choices = color_choices.filter(function(x) {
        return !masterColors.includes(x);
    });
    
    if (remaining_choices.length == 0) {
        remaining_choices = color_choices;
    }

    rgb_color = remaining_choices[Math.floor(Math.random() * remaining_choices.length)];
}

// placeholder image
img.src = 'https://assets.website-files.com/5f6bc60e665f54545a1e52a5/63d3f236a6f0dae14cdf0063_drag-image-here.png';
img.onload = function() {
    scaleFactor = 0.69;
    canvas.style.width = img.width * scaleFactor + 'px';
    canvas.style.height = img.height * scaleFactor + 'px';
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
};

function drawLine(x1, y1, x2, y2) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
}

function getScaledCoords(e) {
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    return [x / scaleFactor, y / scaleFactor];
}

function drawAllPolygons () {
    // draw polygons as subpaths and fill all at once
    // we do this to avoid overlapping polygons becoming opaque
    ctx.beginPath();
    ctx.fillStyle = fill_color;
    for (var i = 0; i < masterPoints.length; i++) {
        var newpoints = masterPoints[i];
        for (var j = 1; j < newpoints.length; j++) {
            drawLine(newpoints[j - 1][0], newpoints[j - 1][1], newpoints[j][0], newpoints[j][1]);
            ctx.moveTo(newpoints[0][0], newpoints[0][1]);
            for (var j = 1; j < newpoints.length; j++) {
                ctx.lineTo(newpoints[j][0], newpoints[j][1]);
            }
            drawLine(newpoints[newpoints.length - 1][0], newpoints[newpoints.length - 1][1], newpoints[0][0], newpoints[0][1]);
        }
    }
    ctx.fill();
    
    ctx.lineWidth = 5;
    ctx.lineJoin = 'bevel';
    for (var i = 0; i < masterPoints.length; i++) {
        var newpoints = masterPoints[i];
        ctx.strokeStyle = masterColors[i];

        ctx.beginPath();
        for (var j = 1; j < newpoints.length; j++) {
            drawLine(newpoints[j - 1][0], newpoints[j - 1][1], newpoints[j][0], newpoints[j][1]);
            ctx.moveTo(newpoints[0][0], newpoints[0][1]);
            for (var j = 1; j < newpoints.length; j++) {
                ctx.lineTo(newpoints[j][0], newpoints[j][1]);
            }   
        }
        ctx.closePath();
        ctx.stroke();

        // draw arc around each point
        for (var j = 0; j < newpoints.length; j++) {
            ctx.beginPath();
            ctx.arc(newpoints[j][0], newpoints[j][1], 5, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.stroke();
        }
    }
}

function getParentPoints () {
    var parentPoints = [];
    for (var i = 0; i < masterPoints.length; i++) {
        parentPoints.push(masterPoints[i]);
    }
    parentPoints.push(points);
    return parentPoints;
}

window.addEventListener('keyup', function(e) {
    if (e.key === 'Shift') {
        constrainAngles = false;
    }
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
    e.preventDefault()
    var delta = Math.sign(e.deltaY);
    zoom(delta);
});

canvas.addEventListener('mouseleave', function(e) {
    var xcoord = document.querySelector('#x');
    var ycoord = document.querySelector('#y'); 
    xcoord.innerHTML = '';
    ycoord.innerHTML = '';
});

// on canvas hover, if cursor is crosshair, draw line from last point to cursor
canvas.addEventListener('mousemove', function(e) {
    var x = getScaledCoords(e)[0];
    var y = getScaledCoords(e)[1];
    // round
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

    // sometimes, a mousemove event is leaving the canvas and has coordinates outside the canvas
    // however, due to the cursors being used, we do not need to check if it is larger than canvas.width or canvas.height
    if (x < 0 || y < 0 ){
        xcoord.innerHTML = '';
        ycoord.innerHTML = '';
        return;
    }
    xcoord.innerHTML = x;
    ycoord.innerHTML = y;

    if (canvas.style.cursor == 'crosshair') {
        clearDrawings();
        drawAllPolygons();

        for (var i = 0; i < points.length - 1; i++) {
            ctx.strokeStyle = rgb_color;
            ctx.beginPath();
            ctx.lineJoin = 'bevel';
            drawLine(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
            ctx.closePath();
            ctx.stroke();
            // draw arc around each point
            ctx.beginPath();
            ctx.arc(points[i][0], points[i][1], 5, 0, 2 * Math.PI);
            // fill with white
            ctx.fillStyle = 'white';
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }


        if ((points.length > 0 && drawMode == "polygon") || (points.length > 0 && points.length < 2 && drawMode == "line")) {
            ctx.beginPath();
            ctx.lineJoin = 'bevel';
            ctx.strokeStyle = rgb_color;
            drawLine(points[points.length - 1][0], points[points.length - 1][1], x, y);
            ctx.closePath();

            ctx.stroke();
            ctx.beginPath();
            ctx.arc(points[i][0], points[i][1], 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'white';
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
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
    // document.getElementById('coords').style.display = 'inline-block';
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

    // clean empty points
    parentPoints = parentPoints.filter(points => !!points.length);

    if (!parentPoints.length) {
        document.querySelector('#python').innerHTML = '';
        document.querySelector('#json').innerHTML;
        return;
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

    if (points.length > 2 && drawMode == "polygon") {
        distX = x - points[0][0];
        distY = y - points[0][1];
        // stroke is 3px and centered on the circle (i.e. 1/2 * 3px) and arc radius is 
        if(Math.sqrt(distX * distX + distY * distY) <= 6.5) {
            closePath();
            return;
        }
    }

    points.push([x, y]);

    ctx.beginPath();
    ctx.strokeStyle = rgb_color;
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.stroke();

    if(drawMode == "line" && points.length == 2) {
        closePath();
    }
    
    // ctx.arc(x, y, 155, 0, 2 * Math.PI);
    // concat all points into one array
    var parentPoints = [];

    for (var i = 0; i < masterPoints.length; i++) {
        parentPoints.push(masterPoints[i]);
    }
    // add "points"
    if(points.length > 0) {
        parentPoints.push(points);
    }

    writePoints(parentPoints);
});

document.querySelector('#normalize-checkbox').addEventListener('change', function(e) {
    showNormalized = e.target.checked;
    var parentPoints = getParentPoints();
    writePoints(parentPoints);
});

function setDrawMode(mode) {
    drawMode = mode
    canvas.style.cursor = 'crosshair';
    document.querySelectorAll('.t-mode').forEach(el => el.classList.remove('active'))
    document.querySelector(`#mode-${mode}`).classList.add('active')
}

document.querySelector('#mode-polygon').addEventListener('click', function(e) {
    setDrawMode('polygon')
})

document.querySelector('#mode-line').addEventListener('click', function(e) {
    setDrawMode('line')
})

document.addEventListener('keydown', function(e) {
    if (e.key == 'l' || e.key == 'L') {
        setDrawMode('line')
    }
    if (e.key == 'p' || e.key == 'P') {
        setDrawMode('polygon')
    }
})

function draw () {
    drawAllPolygons()
    var parentPoints = getParentPoints()
    writePoints(parentPoints)
}

function highlightButtonInteraction (buttonId) {
    document.querySelector(buttonId).classList.add('active')
    setTimeout(() => document.querySelector(buttonId).classList.remove('active'), 100)
}

function undo () {
    highlightButtonInteraction('#undo')

    if (points.length > 0) {

        points.pop()
        
        clearDrawings()
        draw()

        if(points.length === 0){
            return;
        }
        ctx.strokeStyle = rgb_color;
        var i = 0;
        for (; i < points.length - 1; i++) {
            drawLine(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
            ctx.stroke();
            // draw arc around each point
            ctx.beginPath();
            ctx.arc(points[i][0], points[i][1], 5, 0, 2 * Math.PI);
            // fill with white
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.stroke();
        }

            // draw arc around point n
            ctx.beginPath();
            ctx.arc(points[i][0], points[i][1], 5, 0, 2 * Math.PI);
            // fill with white
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.stroke();
    }
}

document.querySelector('#undo').addEventListener('click', function(e) {
    undo()
})

function discardCurrentPolygon () {
    highlightButtonInteraction('#discard-current')

    points = []
    clearDrawings()
    draw()
}

document.querySelector('#discard-current').addEventListener('click', function(e) {
    discardCurrentPolygon()
})

function clearAll() {
    highlightButtonInteraction('#clear')
    clearDrawings()
    points = []
    masterPoints = []
    masterColors = []
    document.querySelector('#json').innerHTML = ''
    document.querySelector('#python').innerHTML = ''
}

document.querySelector('#clear').addEventListener('click', function(e) {
    clearAll()
})

function saveImage () {
    highlightButtonInteraction('#save-image')

    var link = document.createElement('a')
    link.download = 'image.png'
    link.href = canvas.toDataURL()
    link.click()
}

document.querySelector('#save-image').addEventListener('click', function(e) {
    saveImage()
})

window.addEventListener('keydown', function(e) {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        e.stopImmediatePropagation()
        undo()
    }

    if (e.key === 'Shift') {
        constrainAngles = true;
    }

    if (e.key === 'Escape') {
        discardCurrentPolygon()
    }

    if (e.key === 'e' && (e.ctrlKey || e.metaKey)) {
        clearAll()
    }

    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        e.stopImmediatePropagation()

        saveImage()
    }

    if (e.key === 'Enter') {
        if(points.length > 2) {
            closePath()
        }
    }
})
let shapes = [];
const NUM_SHAPES = 80; // More shapes = more insane
const MOUSE_REPEL_RADIUS = 150;
const MOUSE_REPEL_FORCE = 1.5; // How strongly mouse pushes shapes
const SHAPE_REPEL_RADIUS = 50;
const SHAPE_REPEL_FORCE = 0.8;
const CENTER_ATTRACT_FORCE = 0.005; // Gentle pull towards center
const MAX_SPEED = 5;
const FRICTION = 0.98; // Slows shapes down gradually (0.99 = less friction)
const SHAPE_TYPES = ['circle', 'square', 'triangle', 'pentagon', 'star'];

// --- p5.js Setup Function ---
function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-container'); // Place canvas in our div

    // Create initial shapes
    for (let i = 0; i < NUM_SHAPES; i++) {
        shapes.push(new InsaneShape(random(width), random(height)));
    }
    colorMode(HSB, 360, 100, 100, 100); // Use HSB color mode for easier hue cycling
    noStroke(); // Default to no outlines for shapes
}

// --- p5.js Draw Loop Function (Runs continuously) ---
function draw() {
    // Semi-transparent background for trails effect
    background(0, 0, 5, 15); // Black with low alpha

    let mousePos = createVector(mouseX, mouseY);
    let centerPos = createVector(width / 2, height / 2);

    for (let i = 0; i < shapes.length; i++) {
        let shape = shapes[i];

        // 1. Apply Forces
        // Mouse Repulsion
        let mouseDist = dist(shape.pos.x, shape.pos.y, mousePos.x, mousePos.y);
        if (mouseDist < MOUSE_REPEL_RADIUS) {
            let repel = p5.Vector.sub(shape.pos, mousePos);
            let strength = map(mouseDist, 0, MOUSE_REPEL_RADIUS, MOUSE_REPEL_FORCE, 0);
            repel.setMag(strength);
            shape.applyForce(repel);
        }

        // Shape-Shape Repulsion
        for (let j = 0; j < shapes.length; j++) {
            if (i === j) continue; // Don't repel self
            let other = shapes[j];
            let shapeDist = dist(shape.pos.x, shape.pos.y, other.pos.x, other.pos.y);
            let minDist = (shape.size / 2) + (other.size / 2) + 10; // Minimum distance + buffer

            if (shapeDist < SHAPE_REPEL_RADIUS && shapeDist < minDist) {
                 let repel = p5.Vector.sub(shape.pos, other.pos);
                 // Stronger repulsion if very close
                 let strength = map(shapeDist, 0, minDist, SHAPE_REPEL_FORCE * 2, SHAPE_REPEL_FORCE * 0.1);
                 repel.setMag(strength);
                 shape.applyForce(repel);
            }
        }

        // Gentle Center Attraction
        let attract = p5.Vector.sub(centerPos, shape.pos);
        attract.mult(CENTER_ATTRACT_FORCE);
        shape.applyForce(attract);

        // 2. Update Shape Physics
        shape.update();

        // 3. Handle Screen Boundaries (Wrap around)
        shape.wrapEdges();

        // 4. Draw the Shape
        shape.display();
    }

     // Optional: Draw lines between close shapes for a network effect
     drawConnections();
}

// --- InsaneShape Class ---
class InsaneShape {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.random2D().mult(random(1, 3)); // Initial velocity
        this.acc = createVector(0, 0);
        this.size = random(15, 45);
        this.type = random(SHAPE_TYPES);
        this.baseHue = random(360); // Base color hue
        this.hueShiftSpeed = random(-1, 1); // How fast color changes
        this.rotation = random(TWO_PI);
        this.rotationSpeed = random(-0.05, 0.05);
        this.wobbleOffset = random(1000); // For perlin noise wobble
        this.wobbleSpeed = random(0.01, 0.05);
        this.wobbleAmount = random(0.1, 0.4); // Proportion of size to wobble
    }

    applyForce(force) {
        this.acc.add(force);
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(MAX_SPEED);
        this.pos.add(this.vel);
        this.vel.mult(FRICTION); // Apply friction
        this.acc.mult(0); // Reset acceleration

        // Update dynamic properties
        this.rotation += this.rotationSpeed + map(this.vel.mag(), 0, MAX_SPEED, 0, 0.05); // Faster rotation when moving fast
        this.baseHue = (this.baseHue + this.hueShiftSpeed) % 360;
        if (this.baseHue < 0) this.baseHue += 360; // Keep hue positive
    }

    wrapEdges() {
        if (this.pos.x > width + this.size) this.pos.x = -this.size;
        else if (this.pos.x < -this.size) this.pos.x = width + this.size;
        if (this.pos.y > height + this.size) this.pos.y = -this.size;
        else if (this.pos.y < -this.size) this.pos.y = height + this.size;
    }

    display() {
        push(); // Isolate transformations and styles
        translate(this.pos.x, this.pos.y);
        rotate(this.rotation);

        // Calculate wobble using Perlin noise for smooth randomness
        let wobble = (noise(this.wobbleOffset + frameCount * this.wobbleSpeed) - 0.5) * 2; // Range -1 to 1
        let currentSize = this.size + this.size * this.wobbleAmount * wobble;
        let currentHue = this.baseHue;
        // Optional: Shift hue based on velocity
        currentHue = (currentHue + map(this.vel.mag(), 0, MAX_SPEED, 0, 30)) % 360;

        fill(currentHue, 90, 95, 85); // HSB color with some transparency

        // Draw the specific shape
        switch (this.type) {
            case 'circle':
                ellipse(0, 0, currentSize, currentSize);
                break;
            case 'square':
                rectMode(CENTER);
                rect(0, 0, currentSize, currentSize);
                break;
            case 'triangle':
                let h = (sqrt(3) / 2) * currentSize; // Height of equilateral triangle
                triangle(0, -h / 1.5, -currentSize / 2, h / 2.5, currentSize / 2, h / 2.5);
                break;
            case 'pentagon':
                drawPolygon(0, 0, currentSize / 2, 5);
                break;
            case 'star':
                drawStar(0, 0, currentSize / 2, currentSize / 4, 5);
                break;
        }

        pop(); // Restore previous drawing state
    }
}

// --- Helper Functions ---

// Draws a regular polygon
function drawPolygon(x, y, radius, npoints) {
    let angle = TWO_PI / npoints;
    beginShape();
    for (let a = -PI/2; a < TWO_PI -PI/2; a += angle) { // Start from top
        let sx = x + cos(a) * radius;
        let sy = y + sin(a) * radius;
        vertex(sx, sy);
    }
    endShape(CLOSE);
}

// Draws a star
function drawStar(x, y, radius1, radius2, npoints) {
    let angle = TWO_PI / npoints;
    let halfAngle = angle / 2.0;
    beginShape();
    for (let a = -PI/2; a < TWO_PI - PI/2; a += angle) { // Start from top
        let sx = x + cos(a) * radius1;
        let sy = y + sin(a) * radius1;
        vertex(sx, sy);
        sx = x + cos(a + halfAngle) * radius2;
        sy = y + sin(a + halfAngle) * radius2;
        vertex(sx, sy);
    }
    endShape(CLOSE);
}

// Draws lines between nearby shapes
function drawConnections() {
    strokeWeight(0.5);
    let connectDist = 100; // Max distance to draw a line

    for (let i = 0; i < shapes.length; i++) {
        for (let j = i + 1; j < shapes.length; j++) { // Avoid duplicates and self-connection
            let d = dist(shapes[i].pos.x, shapes[i].pos.y, shapes[j].pos.x, shapes[j].pos.y);

            if (d < connectDist) {
                // Line transparency based on distance
                let alpha = map(d, 0, connectDist, 60, 0); // Fades out
                 // Line color slightly based on the average hue of connected shapes
                let avgHue = (shapes[i].baseHue + shapes[j].baseHue) / 2;
                stroke(avgHue, 50, 100, alpha); // White-ish with hue tint & alpha
                line(shapes[i].pos.x, shapes[i].pos.y, shapes[j].pos.x, shapes[j].pos.y);
            }
        }
    }
    noStroke(); // Reset stroke for shapes
}


// --- p5.js Interaction Functions ---

// Make shapes explode outwards from click point
function mousePressed() {
    let mousePos = createVector(mouseX, mouseY);
    let explosionRadius = 200;
    let explosionForce = 15; // Strong initial push

    for (let shape of shapes) {
        let d = dist(shape.pos.x, shape.pos.y, mousePos.x, mousePos.y);
        if (d < explosionRadius) {
            let force = p5.Vector.sub(shape.pos, mousePos);
             // Scale force - strongest at center, weaker at edge
            let strength = map(d, 0, explosionRadius, explosionForce, 1);
            force.setMag(strength);
            shape.applyForce(force);
            // Add a bit of spin on click maybe?
            shape.rotationSpeed += random(-0.2, 0.2);
        }
    }
}

// Adjust canvas size if window is resized
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    // Optional: Could reposition shapes if needed, but wrapping usually handles it ok
}
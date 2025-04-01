let shapes = [];
let particles = [];
let shockwaves = [];

const NUM_SHAPES = 90; // Even more shapes
const MOUSE_REPEL_RADIUS = 180; // Wider mouse influence
const MOUSE_REPEL_FORCE = 1.8;  // Stronger mouse push
const SHAPE_REPEL_RADIUS = 60;
const SHAPE_REPEL_FORCE = 1.0; // Slightly stronger shape push
const CENTER_ATTRACT_FORCE = 0.003; // Weaker center pull for more chaos
const MAX_SPEED = 7;           // Faster max speed
const FRICTION = 0.975;        // Lower friction = more sliding/chaos
const SHAPE_TYPES = ['circle', 'square', 'triangle', 'pentagon', 'star', 'hexagram']; // Added Hexagram

const PARTICLE_LIFESPAN = 60; // Frames
const PARTICLE_EMIT_RATE = 0.5; // Chance per frame per shape to emit based on speed
const MAX_PARTICLES = 1500; // Performance safety net

// --- p5.js Setup Function ---
function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-container');

    // Create initial shapes
    for (let i = 0; i < NUM_SHAPES; i++) {
        shapes.push(new InsaneShape(random(width), random(height)));
    }
    colorMode(HSB, 360, 100, 100, 100);
    noStroke();
    rectMode(CENTER); // Set once for efficiency
}

// --- p5.js Draw Loop Function (Runs continuously) ---
function draw() {
    // Dynamic Background using noise
    let bgHueNoise = noise(frameCount * 0.001);
    let bgBrightNoise = noise(frameCount * 0.005 + 100);
    let bgHue = map(bgHueNoise, 0, 1, 220, 260); // Shifts between blue/purple
    let bgBright = map(bgBrightNoise, 0, 1, 5, 15); // Pulses brightness slightly
    background(bgHue, 80, bgBright, 30); // Semi-transparent background

    let mousePos = createVector(mouseX, mouseY);
    let centerPos = createVector(width / 2, height / 2);

    // --- Update and Draw Shapes ---
    for (let i = shapes.length - 1; i >= 0; i--) { // Iterate backwards for potential removal later
        let shape = shapes[i];

        // Apply Forces (Mouse, Shape-Shape, Center) - Same logic as before
        applyForces(shape, mousePos, centerPos);

        shape.update();
        shape.wrapEdges();
        shape.display();

        // Emit particles based on velocity
        shape.emitParticles();
    }

     // --- Update and Draw Particles ---
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].display();
        if (particles[i].isDead()) {
            particles.splice(i, 1); // Remove dead particles
        }
    }

     // --- Update and Draw Shockwaves ---
     for (let i = shockwaves.length - 1; i >= 0; i--) {
        shockwaves[i].update();
        shockwaves[i].display();
        if (shockwaves[i].isDead()) {
            shockwaves.splice(i, 1);
        }
    }


    // Optional: Draw lines between close shapes
    // drawConnections(); // Can make it *too* busy with particles, uncomment if desired
}

// --- Apply Forces Logic (extracted for clarity) ---
function applyForces(shape, mousePos, centerPos) {
     // Mouse Repulsion
     let mouseDist = dist(shape.pos.x, shape.pos.y, mousePos.x, mousePos.y);
     if (mouseDist < MOUSE_REPEL_RADIUS && mouseDist > 0) { // Added > 0 check
         let repel = p5.Vector.sub(shape.pos, mousePos);
         let strength = map(mouseDist, 0, MOUSE_REPEL_RADIUS, MOUSE_REPEL_FORCE, 0);
         repel.setMag(strength);
         shape.applyForce(repel);
     }

     // Shape-Shape Repulsion
     for (let j = 0; j < shapes.length; j++) {
         // Avoid self and check index range (though backwards iteration handles removal)
         if (shapes[j] === shape || !shapes[j]) continue;
         let other = shapes[j];
         let shapeDist = dist(shape.pos.x, shape.pos.y, other.pos.x, other.pos.y);
         let minDist = (shape.currentVisualSize / 2) + (other.currentVisualSize / 2) + 5; // Use current size

         if (shapeDist < SHAPE_REPEL_RADIUS && shapeDist < minDist && shapeDist > 0) {
              let repel = p5.Vector.sub(shape.pos, other.pos);
              let strength = map(shapeDist, 0, minDist, SHAPE_REPEL_FORCE * 2, SHAPE_REPEL_FORCE * 0.1);
              repel.setMag(strength);
              shape.applyForce(repel);
         }
     }

     // Gentle Center Attraction
     let attract = p5.Vector.sub(centerPos, shape.pos);
     attract.mult(CENTER_ATTRACT_FORCE);
     shape.applyForce(attract);
}


// --- InsaneShape Class ---
class InsaneShape {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.random2D().mult(random(1, 4)); // Slightly faster start
        this.acc = createVector(0, 0);
        this.baseSize = random(10, 40); // Base size for pulsing
        this.sizePulseSpeed = random(0.02, 0.08);
        this.sizePulseAmount = random(0.1, 0.3); // How much size changes
        this.currentVisualSize = this.baseSize; // Store the size used for drawing/collision

        this.type = random(SHAPE_TYPES);
        this.baseHue = random(360);
        this.hueShiftSpeed = random(-1.5, 1.5); // Faster color shifts
        this.rotation = random(TWO_PI);
        this.rotationSpeed = random(-0.07, 0.07); // Faster rotation
        this.wobbleOffset = random(1000);
        this.wobbleSpeed = random(0.02, 0.06);
        this.wobbleAmount = random(0.1, 0.4);

        // For variable shapes (like stars)
        this.numPoints = (this.type === 'star' || this.type === 'hexagram') ? floor(random(4, 9)) : 5;
    }

    applyForce(force) {
        // Limit force magnitude to prevent extreme acceleration instability
        const maxForce = 2.0;
        if (force.magSq() > maxForce * maxForce) {
             force.setMag(maxForce);
        }
        this.acc.add(force);
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(MAX_SPEED);
        this.pos.add(this.vel);
        this.vel.mult(FRICTION);
        this.acc.mult(0);

        this.rotation += this.rotationSpeed + map(this.vel.mag(), 0, MAX_SPEED, 0, 0.08);
        this.baseHue = (this.baseHue + this.hueShiftSpeed) % 360;
        if (this.baseHue < 0) this.baseHue += 360;

        // Calculate pulsing size using noise
        let sizePulse = noise(this.wobbleOffset + frameCount * this.sizePulseSpeed); // Reuse offset noise
        this.currentVisualSize = this.baseSize + this.baseSize * this.sizePulseAmount * map(sizePulse, 0, 1, -1, 1);
    }

    emitParticles() {
         // Emit more particles when moving faster
        let emitChance = map(this.vel.mag(), 0, MAX_SPEED, 0, PARTICLE_EMIT_RATE * 2);
        if (random() < emitChance && particles.length < MAX_PARTICLES) {
            let pVel = p5.Vector.random2D().mult(random(0.5, 1.5)); // Particles fly off slowly
            let pSize = this.currentVisualSize * random(0.1, 0.3);
            particles.push(new Particle(this.pos.x, this.pos.y, pVel, this.baseHue, pSize));
        }
    }


    wrapEdges() {
        let buffer = this.currentVisualSize; // Use current size for wrapping buffer
        if (this.pos.x > width + buffer) this.pos.x = -buffer;
        else if (this.pos.x < -buffer) this.pos.x = width + buffer;
        if (this.pos.y > height + buffer) this.pos.y = -buffer;
        else if (this.pos.y < -buffer) this.pos.y = height + buffer;
    }

    display() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.rotation);

        let wobble = (noise(this.wobbleOffset + frameCount * this.wobbleSpeed) - 0.5) * 2;
        let size = this.currentVisualSize + this.currentVisualSize * this.wobbleAmount * wobble;
        let currentHue = (this.baseHue + map(this.vel.mag(), 0, MAX_SPEED, 0, 45)) % 360; // More hue shift with speed
        let fillSat = map(this.vel.mag(), 0, MAX_SPEED, 70, 100); // More saturated when faster
        let fillBright = 95;
        let fillAlpha = 90;

        // --- Glow Effect ---
        let glowColor = color(currentHue, fillSat, fillBright, fillAlpha * 0.6); // Slightly less opaque glow
        drawingContext.shadowBlur = size * 1.5; // Blur radius based on size
        drawingContext.shadowColor = glowColor.toString(); // p5 color needs toString for canvas context

        // --- Draw Shape ---
        fill(currentHue, fillSat, fillBright, fillAlpha);
        noStroke(); // Ensure no stroke on the main shape

        switch (this.type) {
            case 'circle':
                ellipse(0, 0, size, size);
                break;
            case 'square':
                rect(0, 0, size, size);
                break;
            case 'triangle':
                let h = (sqrt(3) / 2) * size;
                triangle(0, -h / 1.5, -size / 2, h / 2.5, size / 2, h / 2.5);
                break;
            case 'pentagon':
                drawPolygon(0, 0, size / 2, 5);
                break;
            case 'star':
                drawStar(0, 0, size / 2, size / 4, this.numPoints); // Use variable points
                break;
             case 'hexagram': // Draw a hexagram (Star of David)
                drawStar(0, 0, size / 2, size / 2, 3); // First triangle
                push();
                rotate(PI); // Rotate the second triangle
                drawStar(0, 0, size / 2, size / 2, 3);
                pop();
                break;
        }

         // Reset glow effect for subsequent drawings
        drawingContext.shadowBlur = 0;

        pop();
    }
}

// --- Particle Class ---
class Particle {
    constructor(x, y, vel, hue, size) {
        this.pos = createVector(x, y);
        this.vel = vel.copy();
        this.lifespan = PARTICLE_LIFESPAN + random(-10, 10); // Vary lifespan slightly
        this.initialLifespan = this.lifespan;
        this.baseHue = hue;
        this.size = size * random(0.8, 1.2); // Vary size slightly
    }

    update() {
        this.lifespan--;
        this.vel.mult(0.98); // Particles slow down
        this.pos.add(this.vel);
    }

    display() {
        let alpha = map(this.lifespan, 0, this.initialLifespan, 0, 70); // Fade out
        let currentHue = (this.baseHue + (this.initialLifespan - this.lifespan) * 0.5) % 360; // Slight hue shift over life
        let bright = map(this.lifespan, 0, this.initialLifespan, 50, 100); // Dim over life

        fill(currentHue, 90, bright, alpha);
        noStroke();
        ellipse(this.pos.x, this.pos.y, this.size, this.size); // Simple circle particles
    }

    isDead() {
        return this.lifespan <= 0;
    }
}

// --- Shockwave Class ---
class Shockwave {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.radius = 0;
        this.maxRadius = random(250, 450); // Vary max size
        this.speed = random(8, 15);      // Vary expansion speed
        this.life = 1.0;                // Use 1.0 -> 0 for alpha/fade
        this.hue = random(360);         // Random shockwave color
        this.weight = random(5, 15);     // Initial stroke weight
    }

    update() {
        this.radius += this.speed;
        this.life -= 0.025; // Fading speed
        this.speed *= 0.98; // Expansion slows down
        this.weight *= 0.96; // Thickness decreases
    }

    display() {
        if (this.life > 0) {
            let alpha = map(this.life, 1.0, 0, 80, 0);
            strokeWeight(max(1, this.weight)); // Ensure weight is at least 1
            stroke(this.hue, 90, 100, alpha);
            noFill();
            ellipse(this.pos.x, this.pos.y, this.radius * 2, this.radius * 2); // Radius is half diameter
        }
    }

    isDead() {
        return this.life <= 0;
    }
}


// --- Helper Functions --- (drawPolygon, drawStar remain the same)
function drawPolygon(x, y, radius, npoints) {
    let angle = TWO_PI / npoints;
    beginShape();
    for (let a = -PI/2; a < TWO_PI -PI/2; a += angle) {
        let sx = x + cos(a) * radius;
        let sy = y + sin(a) * radius;
        vertex(sx, sy);
    }
    endShape(CLOSE);
}

function drawStar(x, y, radius1, radius2, npoints) {
    // Ensure npoints is at least 3 for drawing
    if (npoints < 3) npoints = 3;
    let angle = TWO_PI / npoints;
    let halfAngle = angle / 2.0;
    beginShape();
    for (let a = -PI/2; a < TWO_PI - PI/2; a += angle) {
        let sx = x + cos(a) * radius1;
        let sy = y + sin(a) * radius1;
        vertex(sx, sy);
        sx = x + cos(a + halfAngle) * radius2;
        sy = y + sin(a + halfAngle) * radius2;
        vertex(sx, sy);
    }
    endShape(CLOSE);
}

// Optional Connection Lines (Can be very noisy now)
/*
function drawConnections() {
    strokeWeight(0.5);
    let connectDist = 100;

    for (let i = 0; i < shapes.length; i++) {
        for (let j = i + 1; j < shapes.length; j++) {
             if (!shapes[i] || !shapes[j]) continue; // Check if shapes exist
            let d = dist(shapes[i].pos.x, shapes[i].pos.y, shapes[j].pos.x, shapes[j].pos.y);

            if (d < connectDist) {
                let alpha = map(d, 0, connectDist, 30, 0); // Reduced alpha
                 let avgHue = (shapes[i].baseHue + shapes[j].baseHue) / 2;
                stroke(avgHue, 50, 100, alpha);
                line(shapes[i].pos.x, shapes[i].pos.y, shapes[j].pos.x, shapes[j].pos.y);
            }
        }
    }
    noStroke();
}
*/


// --- p5.js Interaction Functions ---
function mousePressed() {
    let mousePos = createVector(mouseX, mouseY);
    let explosionRadius = 250; // Larger explosion reach
    let explosionForce = 20; // Stronger explosion

    // Apply force to shapes
    for (let shape of shapes) {
         if (!shape) continue; // Check if shape exists
        let d = dist(shape.pos.x, shape.pos.y, mousePos.x, mousePos.y);
        if (d < explosionRadius) {
            let force = p5.Vector.sub(shape.pos, mousePos);
            let strength = map(d, 0, explosionRadius, explosionForce, 1);
             // Give a slight upwards bias to the explosion for visual flair
             force.add(0, -strength * 0.1);
            force.setMag(strength);
            shape.applyForce(force);
            shape.rotationSpeed += random(-0.3, 0.3); // More spin on click
             shape.hueShiftSpeed += random(-1, 1); // Jolt color shift speed
        }
    }

    // Create shockwave effect
    shockwaves.push(new Shockwave(mouseX, mouseY));
    // Add a smaller secondary one for more visual noise
    if(random() < 0.5) {
        shockwaves.push(new Shockwave(mouseX + random(-20, 20), mouseY + random(-20, 20)));
    }

}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

let particles = [];
const particleCount = 150; // Adjust for performance/density
const maxConnectionDistSq = Math.pow(100, 2); // Max distance squared for connections (faster check)
const connectionOpacityFactor = 0.8; // How much opacity fades with distance

const mouse = {
    x: null,
    y: null,
    radius: 150 // Area of influence for mouse interaction
};

// --- Particle Class ---
class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 1; // Size between 1 and 3
        this.baseX = this.x; // Store original position (not used here, but useful sometimes)
        this.baseY = this.y;
        this.density = (Math.random() * 30) + 1; // Affects how much mouse pushes/pulls
        this.vx = (Math.random() - 0.5) * 1; // Initial velocity
        this.vy = (Math.random() - 0.5) * 1;
        this.hue = Math.random() * 360; // Color
    }

    update() {
        // --- Mouse Interaction (Attraction/Repulsion) ---
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distSq = dx * dx + dy * dy; // Use squared distance for performance
        let mouseInfluenceRadiusSq = Math.pow(mouse.radius, 2);

        if (distSq < mouseInfluenceRadiusSq && mouse.x !== null) {
            let distance = Math.sqrt(distSq);
            if (distance === 0) distance = 0.001; // Avoid division by zero
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;

            // Force scales inversely with distance (stronger when closer)
            // The 'density' property makes some particles react more strongly
            let force = (mouseInfluenceRadiusSq - distSq) / mouseInfluenceRadiusSq * (this.density / 5);

            // Apply force (attraction towards mouse)
            this.vx += forceDirectionX * force * 0.1; // Adjust multiplier for strength
            this.vy += forceDirectionY * force * 0.1;

            // Add slight repulsion close to mouse center to prevent perfect collapse
             let repulsionForce = Math.max(0, (30 - distance) / 30) * 0.5; // Repel within 30px
             this.vx -= forceDirectionX * repulsionForce;
             this.vy -= forceDirectionY * repulsionForce;

        }

        // --- Friction / Damping ---
        this.vx *= 0.97; // Slows down over time (e.g., 0.97 means 3% friction per frame)
        this.vy *= 0.97;

        // --- Add tiny random jitter ---
         this.vx += (Math.random() - 0.5) * 0.05;
         this.vy += (Math.random() - 0.5) * 0.05;


        // --- Update Position ---
        this.x += this.vx;
        this.y += this.vy;

        // --- Boundary Handling (Wrap Around) ---
        if (this.x > width + this.size) this.x = -this.size;
        else if (this.x < -this.size) this.x = width + this.size;
        if (this.y > height + this.size) this.y = -this.size;
        else if (this.y < -this.size) this.y = height + this.size;

        // --- Update Color slightly ---
        this.hue = (this.hue + 0.5) % 360;
    }

    draw() {
        ctx.fillStyle = `hsl(${this.hue}, 100%, 70%)`; // Bright, saturated colors
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- Initialization ---
function init() {
    particles = []; // Clear existing particles
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

// --- Draw Connections ---
function drawConnections() {
    let opacity;
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) { // Check only subsequent particles (j=i+1)
            const p1 = particles[i];
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < maxConnectionDistSq) {
                opacity = 1 - (distSq / maxConnectionDistSq) * connectionOpacityFactor; // Closer = more opaque
                // Use average hue for connection color, maybe? Or fixed color.
                // let avgHue = (p1.hue + p2.hue) / 2;
                // ctx.strokeStyle = `hsla(${avgHue}, 100%, 70%, ${opacity})`;
                ctx.strokeStyle = `hsla(240, 100%, 80%, ${opacity * 0.5})`; // Subtle blueish-white connection
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    }
}


// --- Animation Loop ---
function animate() {
    // Clear canvas with semi-transparent background for trails
    ctx.fillStyle = 'rgba(10, 10, 20, 0.15)'; // Dark blue-ish, low alpha
    ctx.fillRect(0, 0, width, height);

    // Update and draw particles
    for (const particle of particles) {
        particle.update();
        particle.draw();
    }

    // Draw connections
    drawConnections();

    // Request next frame
    requestAnimationFrame(animate);
}

// --- Event Listeners ---
window.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
});

window.addEventListener('mouseout', () => {
    mouse.x = null; // Stop interaction when mouse leaves window
    mouse.y = null;
});

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    // Re-initialize if needed, or just let particles adapt
    // init(); // Option: reset particles on resize
    mouse.radius = Math.min(width, height) * 0.2; // Adjust mouse radius based on screen size
    maxConnectionDistSq = Math.pow(Math.min(width, height) * 0.1, 2); // Adjust connection distance too
});

// --- Start ---
init();
animate();
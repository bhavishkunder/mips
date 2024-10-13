// Scene, Camera, and Renderer setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 40; // Adjust the camera's Z position to fit the entire globe
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Constants and Variables
const radius = 15;
const offset = 0.99899;
const sprites = [];
let isMouseDown = false;
let startX = 0;
let isHovering = false;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let globe, cloudsGlobe;

// Initialize the 3D environment
function init() {
  setupBackground();
  setupGlobe();
  setupLighting();
  setupLocations();
  addEventListeners();
  animate();
  
  // Start counters after a short delay to ensure everything is loaded
  setTimeout(startCounters, 1000);
}

// Setup background with stars
function setupBackground() {
  const bgGeometry = new THREE.PlaneGeometry(500, 500);
  const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x00001d });
  const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
  bgMesh.position.set(0, 0, -21);
  scene.add(bgMesh);

  for (let i = 0; i < 20; i++) {
    let starGeometry = new THREE.CircleGeometry(0.15, 5);
    let starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    let starSphere = new THREE.Mesh(starGeometry, starMaterial);
    starSphere.position.set(
      Math.random() * 100 - 50,
      Math.random() * 80 - 40,
      -20
    );
    scene.add(starSphere);
  }
}

// Setup globe with texture and clouds
function setupGlobe() {
  const textureLoader = new THREE.TextureLoader();

  const texture = textureLoader.load(
    "https://raw.githubusercontent.com/PedroOndh/personal-projects-assets/main/globe/earth-texture.jpg",
    undefined,
    undefined,
    (error) => console.error("Error loading globe texture", error)
  );

  const alphaTexture = textureLoader.load(
    "https://raw.githubusercontent.com/PedroOndh/personal-projects-assets/main/globe/earth-alpha-map.jpg",
    undefined,
    undefined,
    (error) => console.error("Error loading alpha texture", error)
  );

  const globeGeometry = new THREE.SphereGeometry(radius, 64, 32);
  const globeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x80c0a1,
    map: texture,
    roughness: 0.4,
    transmission: 0.5,
    thickness: 1,
    reflectivity: 0.7,
    iridescence: 0.7,
    transparent: true,
    opacity: 90.0, // Set transparency to 10%
    side: THREE.DoubleSide,
    alphaMap: alphaTexture
  });

  globe = new THREE.Mesh(globeGeometry, globeMaterial);
  globe.castShadow = true;
  scene.add(globe);

  const cloudsTexture = textureLoader.load(
    "https://raw.githubusercontent.com/PedroOndh/personal-projects-assets/main/globe/clouds-texture.jpg",
    undefined,
    undefined,
    (error) => console.error("Error loading clouds texture", error)
  );

  const cloudsGeometry = new THREE.SphereGeometry(radius + 0.1, 64, 32);
  const cloudsMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    opacity: 0.9,
    transparent: true,
    side: THREE.DoubleSide,
    alphaMap: cloudsTexture
  });

  cloudsGlobe = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
  scene.add(cloudsGlobe);
}

// Setup lighting
function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0x888888);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 50, 100).normalize();
  scene.add(directionalLight);
}

// Setup location icons with interactivity
function setupLocations() {
  const locations = [
    { name: "Japan", lat: 35.6895, lon: 139.6917, projects: ["Maysons Systems Japan", "FASMAC"], scale: 3 },
    { name: "USA", lat: 38.9072, lon: -77.0369, projects: ["Deloitte and Touche ", "Owens Corning"], scale: 3 },
    { name: "United Kingdom", lat: 51.5074, lon: -0.1278, projects: ["Genesys Software Inc UK & India", "TASMAC University of South Wales UK"], scale: 3 },
    { name: "India", lat: 20.5937, lon: 78.9629, projects: ["Honeywell", "Hughes Network Systems", "Owens Corning", "Genesys Software Inc (UK & India)","Netrack Enclosures Pvt Ltd"], scale: 1.5 },
    { name: "Karnataka", lat: 15.3173, lon: 75.7139, projects: ["Beml Bangalore ", "Bhel Bangalore","Jindal steels","Karnataka energy regulation commission","Dept. Of cooperation gvt of Karnataka","KSRTC"], scale: 1.2 },
    { name: "Bengaluru", lat: 12.9716, lon: 77.5946, projects: ["MSRIT", "JSS","SMVIT","BIT","BMSCE"], scale: 1 }
  ];

  // Load the new icon texture
  const iconTexture = new THREE.TextureLoader().load(
    "https://img.icons8.com/?size=100&id=bJnM1gM6mcLw&format=png&color=FA5252" // New red icon
  );

  locations.forEach(location => {
    const position = latLonToVector3(location.lat, location.lon, radius);
    
    const iconMaterial = new THREE.SpriteMaterial({ map: iconTexture });
    const icon = new THREE.Sprite(iconMaterial);
    
    // Set the scale of the icon based on the location's scale property
    const iconScale = location.scale;
    icon.scale.set(iconScale, iconScale, 1);
    
    // Calculate the offset based on the icon's scale
    const scaledOffset = offset * (iconScale / 3); // Normalize offset based on original scale of 3
    
    // Adjust the position so that the icon just touches the surface of the globe
    const adjustedPosition = position.clone().normalize().multiplyScalar(radius + scaledOffset);
    
    icon.position.copy(adjustedPosition);

    icon.name = location.name;
    icon.userData = { projects: location.projects };
    sprites.push(icon);

    globe.add(icon);

    icon.onClick = function() {
      showTooltip(icon, location);
    };
  });
}

// Convert latitude and longitude to 3D vector
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));

  return new THREE.Vector3(x, y, z);
}

// Add event listeners for interaction
function addEventListeners() {
  window.addEventListener("resize", onWindowResize);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mouseout', onMouseOut);
}

// Handle window resize
function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

// Handle mouse down
function onMouseDown(event) {
  isMouseDown = true;
  startX = event.clientX;

  const intersects = checkIntersection();
  if (intersects.length > 0) {
    const intersected = intersects[0].object;
    isHovering = true;
    intersected.onClick(); // Handle the click event (e.g., showing alert)
  } else {
    isHovering = false;
  }
}

// Handle mouse move
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  const intersects = checkIntersection();
  if (intersects.length > 0) {
    const intersected = intersects[0].object;
    showTooltip(event, intersected.name, intersected.userData.projects);
    intersected.onMouseOver(); // Optional hover effect
  } else {
    hideTooltip();
  }

  if (isMouseDown && !isHovering) {
    const deltaX = event.clientX - startX;
    globe.rotation.y += deltaX * 0.01;
    cloudsGlobe.rotation.y += deltaX * 0.01;
    startX = event.clientX;
  }
}

// Handle mouse up
function onMouseUp() {
  isMouseDown = false;
}

// Handle mouse out
function onMouseOut() {
  isMouseDown = false;
}

// Check intersection with objects
function checkIntersection() {
  raycaster.setFromCamera(mouse, camera);
  return raycaster.intersectObjects(sprites);
}

// Tooltip handling
function showTooltip(event, name, projects) {
  const tooltip = document.getElementById('tooltip');
  tooltip.style.display = 'block';

  // Render the country name and project names on the same line
  tooltip.innerHTML = `
      <strong>${name}</strong>${projects.map(project => `<div>${project}</div>`).join('')}
  `;

  // Adjust tooltip width based on the content
  const tooltipWidth = Math.min(500, tooltip.scrollWidth + 30); // Set width dynamically with a max of 500px
  const tooltipHeight = tooltip.offsetHeight;
  const padding = 20;

  // Calculate position
  let left = event.clientX + padding;
  let top = event.clientY - tooltipHeight - padding;

  // Adjust if tooltip goes off-screen
  if (left + tooltipWidth > window.innerWidth) {
      left = window.innerWidth - tooltipWidth - padding;
  }

  if (top < 0) {
      top = event.clientY + padding;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.width = `${tooltipWidth}px`; // Set the calculated width
}


function hideTooltip() {
  const tooltip = document.getElementById('tooltip');
  tooltip.style.display = 'none';
}

// Main animation loop
function animate() {
  requestAnimationFrame(animate);

  // Rotate the globe and clouds
  if (globe && cloudsGlobe) {
    globe.rotation.y += 0.002; // Adjust the rotation speed as needed
    cloudsGlobe.rotation.y += 0.002; // Same here
  }

  renderer.render(scene, camera);
}

// Counter animation function
function animateCounter(elementId, start, end, duration) {
    let current = start;
    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const element = document.getElementById(elementId);

    const timer = setInterval(() => {
        current += increment;
        element.textContent = current + "+"; // Add "+" postfix here
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}

// Start counter animations
function startCounters() {
    animateCounter('turnover-counter', 0, 500, 2000); // 2 seconds duration
    animateCounter('companies-counter', 0, 30, 2000); // 2 seconds duration
}

// Initialize the environment
init();
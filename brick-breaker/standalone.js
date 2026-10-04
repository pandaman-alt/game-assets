var finishedLoading = false;

(() => {

const [WIDTH, HEIGHT, SCALE] = (() => {

	const [EXPECTED_WIDTH, EXPECTED_HEIGHT] = [1200, 800];
	const ASPECT_RATIO = EXPECTED_WIDTH/EXPECTED_HEIGHT;

	const padding = 20;

	// Source - https://stackoverflow.com/a/8876069
	// Posted by ryanve, modified by community. See post 'Timeline' for change history
	// Retrieved 2026-09-27, License - CC BY-SA 4.0

	// Get viewport WIDTH and HEIGHT
	let vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) - padding * 2;
	let vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) - padding * 2;
    
	// Scale the vh so that it would be equal to hw if they had the desired aspect ratio
	let scaledVH = vh * ASPECT_RATIO;

	// Find out which dimension is the constraining one;
	let min = Math.min(vw, scaledVH);

	if (min === vw) {
		return [vw, vw / ASPECT_RATIO, vw/EXPECTED_WIDTH];
	} else {
		return [vh * ASPECT_RATIO, vh, vh/EXPECTED_HEIGHT];
	}
})();

const colors = {
	darkBlack: color(10, 5, 5),
	black: color(25, 20, 20),
	lightBlack: color(35, 25, 25),
	white: color(200),

	red: color(202, 66, 62),
	green: color(59, 133, 75),
	orange: color(237, 129, 35),
	blue: color(87, 132, 230),
	yellow: color(236, 196, 68),
};

let click = false;
let keys = {};

let score = 0;
let lives = 3;
let mode = 2;

const highScoreLocalStorageKey = "60f3f0fc-3733-4228-98cc-0c5f8f3fa8e4-brick-breaker-high-score";

let highScore = (() => {
	let stored = localStorage.getItem(highScoreLocalStorageKey);

	if (stored) return stored;

	localStorage.setItem(highScoreLocalStorageKey, 0);

	return 0;
})();

const copyObj = obj => JSON.parse(JSON.stringify(obj));
const padScore = score => String(score).padStart(5, '0');
const AABB = (a, b) => a.x + a.width  / 2 > b.x - b.width  / 2 &&
						   b.x + b.width  / 2 > a.x - a.width  / 2 && 
						   a.y + a.height / 2 > b.y - b.height / 2 &&
						   b.y + b.height / 2 > a.y - a.height / 2;
const randomArrayInd = (arr) => Math.floor(Math.random() * arr.length);

let useAudio = false;

function playMusic () {
    musicPlayer.start();
}

function playExplosion () {
    if (!useAudio) return;
	explodePlayer.start();
}

function playBounce () {
    if (!useAudio) return;
	bouncePlayer.start();
}

const images = (() => {

	const images = {
		title () {

			const g = createGraphics(WIDTH, HEIGHT);

			g.noStroke();
			g.fill(colors.white);
			g.textFont("Anton");
			g.textSize(150 * SCALE);
			g.textAlign(CENTER, CENTER);

			g.text("BREAK   UT!", 600 * SCALE, 400 * SCALE);

			g.noStroke();
			g.fill(colors.red)
			g.rect(662 * SCALE, 317 * SCALE, 70 * SCALE, 120 * SCALE);

			return g.get();
		},

		healthUpgrade () {
			const g = createGraphics(600, 600);
			g.noStroke();
			g.fill(colors.white);
			g.rect(0, 220, 600, 160);
			g.rect(220, 0, 160, 600);

			return g.get();
		},

		healthIcon () {
			const g = createGraphics(600, 600);
			g.noStroke();
			g.fill(255, 70);
			g.rect(0, 220, 600, 160);
			g.rect(220, 0, 160, 220);
			g.rect(220, 380, 160, 220);

			return g.get();
		},

		tntUpgrade () {
			const g = createGraphics(600, 600);
			g.noStroke();
			g.fill(colors.white);
			g.beginShape();

			for (var i = PI/2; i < PI * 1.4; i += PI/20) {
			    g.vertex(300 + cos(i) * 200, 300 + sin(i) * 200);
			}

			g.vertex(250, 60);
			g.vertex(350, 60);

			for (var i = PI * 1.65; i < PI * 5/2; i += PI/20) {
			    g.vertex(300 + cos(i) * 200, 300 + sin(i) * 200);
			}

			g.endShape(CLOSE);

			g.stroke(colors.white);
			g.noFill();
			g.strokeWeight(20);
			g.arc(350, 55, 100, 90, Math.PI, Math.PI * 1.8);

			return g.get();
		},

		tntIcon () {
			const g = createGraphics(600, 600);
			g.noStroke();
			g.fill(255, 70);
			g.beginShape();

			for (var i = PI/2; i < PI * 1.4; i += PI/20) {
			    g.vertex(300 + cos(i) * 200, 300 + sin(i) * 200);
			}

			g.vertex(250, 60);
			g.vertex(350, 60);

			for (var i = PI * 1.65; i < PI * 5/2; i += PI/20) {
			    g.vertex(300 + cos(i) * 200, 300 + sin(i) * 200);
			}

			g.endShape(CLOSE);

			g.stroke(255, 70);
			g.noFill();
			g.strokeWeight(20);
			g.arc(350, 55, 100, 90, Math.PI, Math.PI * 1.8);

			return g.get();
		},

		fullScreen () {
			const g = createGraphics(600, 600);
			g.fill(colors.white);
			g.noStroke();

			g.rect(20, 20, 200, 70);
			g.rect(20, 20, 70, 200);

			g.rect(380, 20, 200, 70);
			g.rect(510, 20, 70, 200);

			g.rect(380, 510, 200, 70);
			g.rect(510, 380, 70, 200);

			g.rect(20, 510, 200, 70);
			g.rect(20, 380, 70, 200);

			return g.get();
		},

	};

	return images;
})();

const Vector = (() => {

	class Vector {
		constructor (x = 0, y = 0, z = 0) {
			this.x = x;
			this.y = y;
			this.z = z;
		}

		add (v, y, z) {
			if (y == null || z == null) return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);
			else return new Vector(this.x + v, this.y + y, this.z + z);
		}

		sub (v, y, z) {
			if (y == null || z == null) return new Vector(this.x - v.x, this.y - v.y, this.z - v.z);
			else return new Vector(this.x - v, this.y - y, this.z - z);
		}

		mult (s) {
			return new Vector(this.x * s, this.y * s, this.z * s);
		}

		div (s) {
			return this.mult(1/s);
		}

		toString () {
			return `x: ${this.x}, y: ${this.y}, z: ${this.z}`
		}
	}

	return Vector
})();

const buttons = (() => {
	
	// Default properties for buttons
	let defaults = {
		textFont: "Anton",
		textSize: 40 * SCALE,
		textColor: colors.black,
		fillColor: colors.white,
		borderWeight: 0,
		hoverEffect: "stretch"
	};

	const hoverEffects = (() => {
		const easeIn = x => - ((x - 1) ** 2) + 1;

		return {
			stretch (button, amt, dir) {
				let change = 20 * SCALE;

				if (dir > 0) button.width = button.originals.width + change * easeIn(amt);
				else button.width = button.originals.width + change - change * easeIn(1 - amt);
			},

			none () {},
		}
	})();

	class Button {
		constructor (config) {

			if (config.scene == null) throw "scene is required";
			this.scene = config.scene;
			this.scenes = config.scenes ?? [];

			this.x = config.x ?? 0;
			this.y = config.y ?? 0;
			this.width = config.width ?? defaults.width ?? 20;
			this.height = config.height ?? defaults.height ?? 20;

			this.fillColor = config.fillColor ?? defaults.fillColor ?? color(255);

			this.borderColor = config.borderColor ?? defaults.borderColor ?? color(0);
			this.borderWeight = config.borderWeight ?? defaults.borderWeight ?? 1;
			this.borderRadius = config.borderRadius ?? defaults.borderRadius ?? 0;

			this.text = config.text ?? "";
			this.textColor = config.textColor ?? defaults.textColor ?? color(0);
			this.textSize = config.textSize ?? defaults.textSize ?? 10;
			this.textFont = config.textFont ?? defaults.textFont ?? "Sans Serif";
			this.textYOffset = config.textYOffset ?? 0;

			this.image = config.image;

			if (typeof config.onClick !== "function") throw "onClick is required";
			this.onClick = config.onClick;

			// Keep start state for hover effects
			this.originals = {
				width: this.width,
			};

			this.hoverEffect = config.hoverEffect ?? defaults.hoverEffect ?? false;
			this.hoverProgress = 0;

			if (this.hoverEffect) this.hoverFunc = hoverEffects[this.hoverEffect];


		}

		mouseOver (x, y) {
			return x > this.x - this.width/2 &&
				   x < this.x + this.width/2 &&
				   y > this.y - this.height/2 &&
				   y < this.y + this.height/2;
		}

		display () {

			if (this.image) {
				image(images[this.image], this.x - this.width/2, this.y - this.height/2, this.width, this.height);
				return;
			}

			push();

			fill(this.fillColor);
			stroke(this.borderColor);
			strokeWeight(this.borderWeight);

			rect(this.x - this.width/2, this.y - this.height/2, this.width, this.height, this.borderRadius);

			noStroke();
			fill(this.textColor);
			textSize(this.textSize);
			textFont(this.textFont);
			textAlign(CENTER, CENTER);

			text(this.text, this.x, this.y + this.textYOffset);

			pop();
		}

		handleHoverEffects (data) {
			if (this.mouseOver(data.mouseX, data.mouseY)) {

				this.hoverProgress = Math.min(this.hoverProgress + 0.05, 1);
				this.hoverFunc(this, this.hoverProgress, 1);

			} else if (this.hoverProgress > 0) {

				this.hoverProgress = Math.max(this.hoverProgress - 0.05, 0);
				this.hoverFunc(this, this.hoverProgress, -1);
			}
		}

		handleClick (data) {
			if (data.click && this.mouseOver(data.mouseX, data.mouseY)) this.onClick();
		}

		update (data) {
			this.handleHoverEffects(data);
			this.handleClick(data)
		}

		run (data) {
			this.update(data);
			this.display(data);
		}
	}

	const buttons = {
		buttons: [],

		run (data) {
			for (const i of this.buttons) {
				if (
					scenes.currentScene === i.scene || 
					scenes.nextScene === i.scene || 
					i.scenes.includes(scenes.currentScene) ||
					i.scenes.includes(scenes.nextScene)
					) i.run(data);
			}
		},

		add (config) {
			const btn = new Button(config);
			this.buttons.push(btn);
			return btn;
		},

		getByText (text) {
			for (const i of this.buttons) {
				if (i.text === text) return i;
			}
		},
	};

	buttons.add({
		scene: "dead",
		scenes: ["win", "how", "mode"],
		x: 420 * SCALE,
		y: 550 * SCALE,
		width: 250 * SCALE,
		height: 110 * SCALE,
		textSize: 100 * SCALE,
		textYOffset: 15 * SCALE,
		text: "HOME",
		onClick: function () {
			scenes.transition({ to: "home" });
		},
	})
  
	buttons.add({
		scene: "dead",
		scenes: ["win", "how", "mode"],
		x: 780 * SCALE,
		y: 550 * SCALE,
		width: 250 * SCALE,
		height: 110 * SCALE,
		textSize: 100 * SCALE,
		textYOffset: 15 * SCALE,
		text: "PLAY",
		onClick: function () {
			scenes.transition({ to: "play", sceneData: { reset: true } });
		},
	})

	buttons.add({
		scene: "audio",
		x: 420 * SCALE,
		y: 550 * SCALE,
		width: 250 * SCALE,
		height: 110 * SCALE,
		textSize: 100 * SCALE,
		textYOffset: 15 * SCALE,
		text: "NO",
		onClick: function () {
			scenes.transition({ to: "home" });
		},
	})

	buttons.add({
		scene: "audio",
		x: 780 * SCALE,
		y: 550 * SCALE,
		width: 250 * SCALE,
		height: 110 * SCALE,
		textSize: 100 * SCALE,
		textYOffset: 15 * SCALE,
		text: "YES",
		onClick: function () {
			playMusic();
			useAudio = true;
			scenes.transition({ to: "home" });
		},
	})

	buttons.add({
		scene: "home",
		x: 300 * SCALE,
		y: 550 * SCALE,
		width: 250 * SCALE,
		height: 140 * SCALE,
		textSize: 100 * SCALE,
		textYOffset: 15 * SCALE,
		fillColor: colors.blue,
		text: "HOW",
		onClick: function () {
			scenes.transition({ to: "how" });
		},
	})

	buttons.add({
		scene: "home",
		x: 600 * SCALE,
		y: 550 * SCALE,
		width: 250 * SCALE,
		height: 140 * SCALE,
		textSize: 100 * SCALE,
		textYOffset: 15 * SCALE,
		fillColor: colors.yellow,
		text: "PLAY",
		onClick: function () {
			scenes.transition({ to: "play", sceneData: { reset: true } });
		},
	})

	buttons.add({
		scene: "home",
		x: 900 * SCALE,
		y: 550 * SCALE,
		width: 250 * SCALE,
		height: 140 * SCALE,
		textSize: 100 * SCALE,
		textYOffset: 15 * SCALE,
		fillColor: colors.green,
		text: "MODE",
		onClick: function () {
			scenes.transition({ to: "mode" });
		},
	})

	buttons.add({
		scene: "mode",
		x: 300 * SCALE,
		y: 380 * SCALE,
		width: 250 * SCALE,
		height: 110 * SCALE,
		textSize: 100 * SCALE,
		textYOffset: 15 * SCALE,
		text: "EASY",
		onClick: function () {
			mode = 1;
		},
	})

	buttons.add({
		scene: "mode",
		x: 600 * SCALE,
		y: 380 * SCALE,
		width: 250 * SCALE,
		height: 110 * SCALE,
		textSize: 100 * SCALE,
		textYOffset: 15 * SCALE,
		text: "MED",
		onClick: function () {
			mode = 2;
		},
	})

	buttons.add({
		scene: "mode",
		x: 900 * SCALE,
		y: 380 * SCALE,
		width: 250 * SCALE,
		height: 110 * SCALE,
		textSize: 100 * SCALE,
		textYOffset: 15 * SCALE,
		text: "HARD",
		onClick: function () {
			mode = 3;
		},
	})

	return buttons;
})();

const particles = (() => {
	class Particle {
		constructor (config) {
			this.position = new Vector(config.x ?? 0, config.y ?? 0);
			this.velocity = new Vector(config.xv ?? 0, config.yv ?? 0);

			this.angle = config.angle ?? 0;
			this.angularVelocity = config.angularVelocity ?? 0;

			this.drag = 0.99;
			this.angularDrag = 0.99;

			this.shape = config.shape ?? "square";
			this.size = config.size ?? 20 * SCALE;

			this.color = config.color ?? colors.white;

			this.lifeTime = config.lifeTime ?? 10;
			this.maxLife = this.lifeTime;
		}

		get dead () {
			return this.lifeTime <= 0;
		}

		applyVelocity () {
			this.position = this.position.add(this.velocity);
			this.angle += this.angularVelocity;
		}

		applyDrag () {
			this.velocity = this.velocity.mult(this.drag);
			this.angularVelocity *= this.angularDrag;
		}

		update () {
			this.applyVelocity();
			this.applyDrag();

			this.lifeTime --;
		}

		display () {
			push();
			
			fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], 255 * this.lifeTime/this.maxLife);
			noStroke();

			switch (this.shape) {
			case "square":
				translate(this.position.x + this.size/2, this.position.y + this.size/2);
				rotate(this.angle);
				rect(-this.size/2, -this.size/2, this.size, this.size);
				break;
			}

			pop();
		}

		run () {
			this.update();
			this.display();
			return this.dead;
		}
	}

	const particles = {
		particles: [],

		run () {
			for (var i = this.particles.length - 1; i >= 0; i--) {
				if (this.particles[i].run()) this.particles.splice(i, 1);
			}
		},

		add (config) {
			if (config.type === "breaking") {
				for (let i = 0; i < 5; i ++) {
					for (let j = 0; j < 8; j ++) {

						let ang = Math.atan2((i - 2.5) * config.height/5, (j - 4) * config.width/8) + Math.random() * PI/5;
						let speed = Math.random() * 2 + 2;

						this.add({
							x: config.x + j * config.width/8,
							y: config.y + i * config.height/5,
							xv: Math.cos(ang) * speed,
							yv: Math.sin(ang) * speed,
							angularVelocity: Math.random() * PI/10 - PI/20,
							size: config.width/8,
							lifeTime: 15,
							color: config.color,
						})
					}
				}				
			} else {
				this.particles.push(new Particle(config));
			}
		},

		reset () {
			this.particles = [];
		},
	};

	return particles;
})();

const powerups = (() => {

	const powerupFunctions = {
		health () {
			lives ++;
		},
		tnt () {
			console.log("boom");
		},
	};

	class Powerup {
		constructor (config) {
			this.x = config.x;
			this.y = config.y;

			this.type = config.type;

			this.size = 30 * SCALE;

			this.dead = false;

			this.onUsed = powerupFunctions[this.type];
		}

		update (player) {
			this.y += 2;

			if (AABB(player, {x: this.x, y: this.y, width: this.size, height: this.size})) {
				this.onUsed();
				this.dead = true;
			}
		}

		display () {
			push();

			switch (this.type) {
			case "health":
				image(images.healthUpgrade, this.x - this.size/2, this.y - this.size/2, this.size, this.size);
				break;
			case "tnt":
				image(images.tntUpgrade, this.x - this.size/2, this.y - this.size/2, this.size, this.size);
				break;
			}

			pop();
		}

		run (data) {
			this.update(data.player);
			this.display();
			return this.dead;
		}
	}

	const powerups = {
		powerups: [],

		run (data) {
			for (var i = this.powerups.length - 1; i >= 0; i--) {
				if (this.powerups[i].run(data)) this.powerups.splice(i, 1);
			}
		},

		add (config) {
			this.powerups.push(new Powerup(config));
		},

		reset () {
			this.powerups = [];
		},
	};

	return powerups;
})();

const player = (() => {

	const calculateTopSpeed = (speed, drag) => (speed * drag) / (1 - drag)

	class Player {
		constructor (config = {}) {
			this.config = config;
			this.reset();
		}

		get x () {
			return this.position.x;
		}

		get y () {
			return this.position.y;
		}

		reset () {
			
			const config = this.config;

			this.position = new Vector(config.x ?? 0, config.y ?? 0);
			this.velocity = new Vector();

			this.width = config.width ?? 20 * SCALE;
			this.height = config.height ?? 20 * SCALE;

			this.speed = config.speed ?? 6 * SCALE;
			this.drag = config.drag ?? 0.6;

			this.topSpeed = calculateTopSpeed(this.speed, this.drag);

			this.angle = 0;
			this.maxAngle = PI/40;
		}

		run (data) {
			this.update(data);
			this.display(data);
		}

		handleMovement (keys) {
			if (keys.a || keys.arrowleft) this.velocity.x -= this.speed;
			if (keys.d || keys.arrowright) this.velocity.x += this.speed;
		}

		applyVelocity () {
			this.position = this.position.add(this.velocity);
		}

		applyDrag () {
			this.velocity = this.velocity.mult(this.drag);
		}

		handleAngle () {
			this.angle = this.maxAngle * this.velocity.x / this.topSpeed;
		}

		update (data) {
			this.handleMovement(data.keys);
			this.applyVelocity();
			this.applyDrag();
			this.handleAngle();
		}

		display () {
			push();

			translate(this.x, this.y);
			rotate(this.angle);

			noStroke();
			fill(colors.white);
			rect(-this.width/2, -this.height/2, this.width, this.height);

			pop();
		}
	}

	return new Player({
		x: 600 * SCALE,
		y: 760 * SCALE,
		width: 200 * SCALE,
		height: 40 * SCALE,
	});
})();

const ball = (() => {

	class Ball {
		constructor (config) {
			this.position = new Vector(config.x ?? 0, config.y ?? 0);
			this.lastX = this.position.x;
			this.lastY = this.position.y;
			this.velocity = new Vector();

			this.size = 20 * SCALE;
			this.speed = 10 * SCALE;
		}

		get x () {
			return this.position.x;
		}

		get y () {
			return this.position.y;
		}

		get width () {
			return this.size;
		}

		get height () {
			return this.size;
		}

		run (data) {
			this.update(data);
			this.display();
		}

		reset () {
			this.speed = (5 + 3 * mode) * SCALE;
			this.position.x = WIDTH / 2;
			this.position.y = HEIGHT / 2;

			this.hitBottom = false;

			this.startInRandomDirection();
		}

		startInRandomDirection () {
			const angle = Math.random() * -PI/2 - PI/4;

			this.velocity.x = cos(angle) * this.speed;
			this.velocity.y = sin(angle) * this.speed; 
		}

		bounceOffEdges () {
			
			const s = this.size/2;

			let [xs, xb, ys, yb] = [
				this.position.x - s < 0,
				this.position.x + s > WIDTH,
				this.position.y - s < 0,
				this.position.y + s > HEIGHT
			];

			if (xs || xb) this.velocity.x *= -1;
			if (ys || yb) this.velocity.y *= -1;

			if (xs) this.position.x = s;
			if (xb) this.position.x = WIDTH - s;
			if (ys) this.position.y = s;
			if (yb) this.position.y = HEIGHT - s;

			// Loose a life
			if (yb) this.hitBottom = true;
		}

		setVelForAngle (angle) {
			this.velocity.x = cos(angle) * this.speed;
			this.velocity.y = sin(angle) * this.speed;
		}

		bounceOffBox (box) {
			// Only continue if we are colliding
			if (!AABB(this, box)) return false;

			let bounce = {};

			// Bounce off of top
			if (this.lastY + this.size/2 < box.y - box.height/2) {
				this.position.y = box.y - box.height/2 - this.size/2;
				this.velocity.y *= -1;
				bounce.top = true;
			}

			// Bounce off of bottom
			if (this.lastY - this.size/2 > box.y + box.height/2) {
				this.position.y = box.y + box.height/2 + this.size/2;
				this.velocity.y *= -1;
				bounce.bottom = true;
			}

			// Bounce off of left
			if (this.lastX + this.size/2 < box.x - box.width/2) {
				this.position.x = box.x - box.width/2 - this.size/2;
				this.velocity.x *= -1;
				bounce.left = true;
			}

			// Bounce off of right
			if (this.lastX - this.size/2 > box.x + box.width/2) {
				this.position.x = box.x + box.width/2 + this.size/2;
				this.velocity.x *= -1;
				bounce.right = true;
			}

			return bounce;
		}

		bounceOffPlayer (player) {
			const res = this.bounceOffBox(player);

			if (res && res.top) {
				playBounce();
				const curAngle = Math.atan2(this.velocity.y, this.velocity.x);

				if (player.velocity.x > 0.2) this.setVelForAngle(Math.min(curAngle + PI/20, -PI/8));
				else if (player.velocity.x < 0.2) this.setVelForAngle(Math.max(curAngle - PI/20, -7 * PI/8));
			}
		}
		
		bounceOffBricks (bricks) {
			for (const i of bricks.bricks) {
				if (this.bounceOffBox(i) && !i.dead) {
					playExplosion();
					
					i.dead = true;
				}
			}
		}

		applyVelocity () {
			this.lastX = this.position.x;
			this.lastY = this.position.y;
			this.position = this.position.add(this.velocity);
		}

		update (data) {
			this.applyVelocity();
			this.bounceOffEdges();
			this.bounceOffPlayer(data.player);
			this.bounceOffBricks(data.bricks);
		}

		display () {
			push();
			noStroke();
			fill(colors.white);
			rect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
			pop();
		}
	}

	return new Ball({x: WIDTH/2, y: HEIGHT/2 });
})();

const bricks = (() => {

	const brickColors = [colors.red, colors.orange, colors.yellow, colors.green];

	const brickWidth = 109 * SCALE;
	const brickHeight = 50 * SCALE;
	const brickGap = 10 * SCALE;

	class Brick {
		constructor (config) {
			this.x = config.x ?? 0;
			this.y = config.y ?? 0;
			this.width = config.width ?? brickWidth;
			this.height = config.height ?? brickHeight;

			this.level = config.level ?? 0;
			this.dead = false;

			this.powerup = config.powerup ?? false;
		}

		run () {
			this.display();
			return this.dead;
		}

		display () {
			push();

			noStroke();
			fill(brickColors[this.level]);

			rect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);

			if (this.powerup) {
				switch (this.powerup) {
				case "health":
					image(images.healthIcon, this.x - 15 * SCALE, this.y - 15 * SCALE, 30 * SCALE, 30 * SCALE);
					break;
				case "tnt":
					image(images.tntIcon, this.x - 15 * SCALE, this.y - 15 * SCALE, 30 * SCALE, 30 * SCALE);
				}
			}

			pop();
		}
	}

	const bricks = {
		bricks: [],

		run () {
			for (var i = this.bricks.length - 1; i >= 0; i--) {
				if (this.bricks[i].run()) {

					let brick = this.bricks[i];

					score += (brick.level * 50 + 50) * mode;

					if (brick.powerup) {
						if (brick.powerup === "health") {
							powerups.add({ x: brick.x, y: brick.y, type: brick.powerup });
						} else if (brick.powerup === "tnt") {

							// blow up 3 closest bricks
							for (let j = 0; j < 3; j ++) {
								let closestDist = Infinity;
								let closestBrick;

								for (const brick2 of this.bricks) {
									let dist = (brick2.x - brick.x) ** 2 + (brick2.y - brick.y) ** 2
									if (dist < closestDist && !brick2.dead) {
										closestDist = dist;
										closestBrick = brick2;
									}
								}

								if (closestBrick) {
									closestBrick.dead = true;
								}
							}
						}
					}

					// Particle effect
					particles.add({
						type: "breaking",
						x: brick.x - brick.width/2,
						y: brick.y - brick.height/2,
						width: brick.width,
						height: brick.height,
						color: brickColors[brick.level],
					})

					// delete brick
					this.bricks.splice(i, 1);
				}
			}
		},

		add (config) {
			this.bricks.push(new Brick(config));
		},

		clear () {
			this.bricks = [];
		},

		reset () {
			this.clear();

			let powerups = Array(40).fill(false);

			let numPowerUps = {
				health: 2,
				tnt: 2,
			}

			for (const i in numPowerUps) {
				for (let j = 0; j < numPowerUps[i]; j ++) {
					powerups[randomArrayInd(powerups)] = i;
				}
			}


			for (let i = 0; i < 4; i ++) {
				
				let y = (i + 1.5) * (brickHeight + brickGap) + brickGap + brickHeight/2;

				for (let j = 0; j < 10; j ++) {

					let x = j * (brickWidth + brickGap) + brickGap + brickWidth/2;

					this.add({ x, y, level: 3 - i, powerup: powerups[i * 10 + j] });
				}
			}
		},
	};

	return bricks;
})();

const scenes = (() => {

	const sceneAfterLoading = "audio";
	
	let nextTransitionData = { transition: false };

	function resetTransitionData (data) {
		data.transition = false;
		data.to = null;
		data.getImage = null;
		data.image = null;
		data.speed = null;
		data.type = null;
	}
	
	// Let the buttons know if they need to be displayed during the transition
	let nextScene = null;

	let currentScene = "loading";

	const defaults = {
		transitionType: "slide",
		transitionSpeed: 1,
		transitionGetImage: get,

		colors: {
			transition: color(220),
			loading: {
				background: color(240),
				text: color(20),
			}
		}
	};

	const scenes = {

		// Use getters to only allow read only access
		get currentScene () {
			return currentScene;
		},

		get nextScene () {
			return nextScene;
		},

		get defaults () {
			return defaults;
		},

		setDefault (property, value) {
			const split = property.split(".");

			let current = defaults[split[0]];
			for (let i = 1; i < split.length - 1; i ++) current = current[split[i]];

			current[split[split.length - 1]] = value;
			return value;
		},

		run (deltaTime) {
			this[currentScene]({ deltaTime }); // run the current scene

			click = false;

			if (nextTransitionData.transition) {

				// Capture the image of the canvas at the end of the frame so that everythin is drawn
				if (nextTransitionData.getImage) nextTransitionData.image = nextTransitionData.getImage();

				this.runTransition({ deltaTime, transitionData: nextTransitionData });
			};
		},

		transition: (() => {
			return function (data) {
				const dataOut = nextTransitionData;
				
				if (data.to != null) dataOut.to = data.to;
				else throw "data.to is required";

				if (data.getImage != null) dataOut.getImage = data.getImage;
				else if (data.image != null) dataOut.image = data.image;
				else dataOut.getImage = scenes.defaults.transitionGetImage;

				dataOut.speed = data.speed ?? scenes.defaults.transitionSpeed;
				
				dataOut.type = data.type ?? scenes.defaults.transitionType;

				dataOut.color = data.color ?? scenes.defaults.colors.transition;

				dataOut.sceneData = data.sceneData ?? {};

				dataOut.transition = true;
			}			
		})(),
	
		runTransition: (() => {

			let amt = 0;
			let data;
			let sentSceneData = false;

			const transitionFunctions = (() => {
				const anim1 = x => 4 *(x - 0.5) ** 3 + 0.5;

				return { 

					functions: {
						slide (amt, color) {
							fill(color);
							noStroke();
							rect(-WIDTH + WIDTH * anim1(amt) * 2, 0, WIDTH, HEIGHT);
						},

						wait (amt, color) {
							let newAmt = amt < 0.4 ? 0 : (amt - 0.4) * 1.666667;
							this.slide(newAmt, color);
						},
					},

					midPoints: {
						slide: 0.5,
						wait: 0.7,
					}
				};
			})();

			const resetData = (() => {

				function copyData (data) {
					const result = {};

					for (const i in data) {

						// Copy everything except for getImage
						if (i === "getImage") continue;

						result[i] = data[i];
					}

					return result;
				}

				return function (_data) {

					// Reset data for the transition
					amt = 0;
					sentSceneData = false;
					data = copyData(_data);
					nextScene = data.to;
					currentScene = "runTransition";

					// Validate data
					const validated = validateData(data);
					if (!validated.success) throw validated.errors.join(", ");

					// Don't try to transition twice
					resetTransitionData(nextTransitionData);
				}
			})();

			const validateData = (() => {

				return function (data) {

					const errors = [];

					if (typeof data.to !== "string") errors.push("invalid data.to");

					if (typeof data.image !== "object") errors.push("invalid data.image");

					if (typeof data.speed !== "number") errors.push("invalid data.speed");

					if (typeof data.type !== "string") errors.push("invalid data.type");

					if (!Object.keys(transitionFunctions.functions).includes(data.type)) errors.push("invalid data.type");

					if (errors.length === 0) return { success: true };
					else return { errors };
				}
			})();

			const handleScene = (() => {
				return function (amt, data) {
					
					// Display image from last scene
					if (amt < transitionFunctions.midPoints[data.type] ?? 0.5) image(data.image, 0, 0, WIDTH, HEIGHT);

					// Run the next scene
					else if (amt < 1 && sentSceneData) scenes[data.to]();
					else if (amt < 1) {
						scenes[data.to](data.sceneData);
						sentSceneData = true;
					}
					
					// Switch to next scene
					else currentScene = data.to;
				}
			})();

			const displayTransition = (() => {

				return function (amt, data) {

					push();

					const functions = transitionFunctions.functions;

					for (const i in functions) if (data.type === i) {
						functions[i](amt, data.color);
						break;
					}

					pop();
				}
			})();

			function changeInAmt(dt, speed) {
				return dt/1000/speed;
			}
	
			return function (_data) {
	
				if (_data.transitionData) resetData(_data.transitionData);

				amt += changeInAmt(_data.deltaTime ?? 17, data?.speed ?? 1);

				handleScene(amt, data);
			
				displayTransition(amt, data);
			}
		})(),
	
		loading: (() => {
			
			// Convert image functions into image objects and return the progress of the loading
			const convertImages = (() => {
				
				let keys = Object.keys(images);
				let curInd = 0;
				let maxInd = keys.length;

				return function () {

					// Calculate the progress and return early if already done
					const progress = (curInd + 1)/maxInd;
					if (progress > 1) return progress;
					
					// replace the functions in the image objects with what they return
					const imageName = keys[curInd];
					if (images[imageName]) images[imageName] = images[imageName]();	

					curInd ++;

					return progress;
				}
			})();

			const displayLoadingProgress = (() => {

				function displayCircle (progress) {
					noFill();

					strokeWeight(15 * SCALE);
					stroke(scenes.defaults.colors.loading.text);

					let offset = PI/2 + progress * 0.9 * PI * 2;
					let circleProgress = 2 * PI * progress
					arc(WIDTH/2, HEIGHT/2.5, 200 * SCALE, 200 * SCALE, offset, circleProgress + offset);
				}

				function displayText (progress) {
					textAlign(CENTER, CENTER);
					textSize(100 * SCALE);
					textFont('Anton');

					fill(scenes.defaults.colors.loading.text);
					noStroke();

					text(`Loading: ${Math.round(progress * 100)}%`, WIDTH/2, HEIGHT/1.5);
				}

				return function (progress) {
					push();

					displayCircle(progress);
					displayText(progress);

					pop();
				}
			})();

			function handleTransition (progress) {
				if (progress >= 1) scenes.transition({ to: sceneAfterLoading });
			}
	
			return function () {

				push();
				
				background(scenes.defaults.colors.loading.background);

				const progress = Math.min(1, convertImages());
								
				displayLoadingProgress(progress);
				handleTransition(progress);

				pop();
			}
		})(),

		play: (() => {

			let state;

			function switchState (_state) {
				if (_state === "start") state = { state: "start", time: 1, next: "waiting" };
				else if (_state === "waiting") state = { state: "waiting", time: 60, next: "play" };
				else if (_state === "play") state = { state: "play", time: Infinity, next: null };
			}

			switchState("start");

			function handleState () {
				state.time --;
				if (state.time <= 0) switchState(state.next);
			}

			function start () {
				reset();
				bricks.reset();
				score = 0;
				lives = 3;
			}

			function reset () {
				player.reset();
				ball.reset();
				powerups.reset();
				particles.reset();
			}

			function wait () {
				player.display();
				ball.display();
				bricks.run();

				displayScore();
				displayLives();
			}

			function play () {
				player.run({ keys });
				ball.run({ player, bricks });
				powerups.run({ player });
				particles.run();
				bricks.run();

				if (ball.hitBottom) {
					lives --;
					reset();
					switchState("waiting");
				}

				displayScore();
				displayLives();

				// Update high score
				let won = bricks.bricks.length <= 0;
				let lost = lives < 1;

				if ((won || lost) && score > highScore) {
					highScore = score;
					localStorage.setItem(highScoreLocalStorageKey, highScore);
				}

				if (lost) scenes.transition({ to: "dead", type: "wait", speed: 3 })
				else if (won) scenes.transition({ to: "win", type: "wait", speed: 3 });
			}

			function displayScore () {
				push();

				fill(colors.white);
				stroke(colors.lightBlack);
				strokeWeight(10 * SCALE);

				textAlign(CENTER, CENTER);
				textFont('Google Sans Code');
				textSize(70 * SCALE);

				text(padScore(score), WIDTH/2, 59 * SCALE);

				pop();
			}

			const displayLives = (() => {

				const offset = 50 * SCALE;
				const increment = 70 * SCALE;
				const size = 50 * SCALE;

				return function () {
					push();

					stroke(colors.white);
					strokeWeight(4 * SCALE);

					for (let i = 0; i < Math.max(3, lives - 1); i ++) {
						if (i + 1 < lives) fill(colors.white);
						else noFill();

						circle(offset + i * increment, offset, size);
					}

					pop();
				}
			})();

			return function (data) {
				background(colors.black);

				if (data && data.reset) switchState("start");

				if (state.state === "start") start();
				else if (state.state === "waiting") wait(); 
				else if (state.state === "play") play();

				handleState();
			}
		})(),

		dead: (() => {
			return function () {
				push();

				background(colors.black);
				fill(colors.white);
				
				textFont("Anton");
				textSize(150 * SCALE);
				textAlign(CENTER, CENTER);

				text("YOU LOST!", WIDTH/2, 210 * SCALE);

				textSize(60 * SCALE);

				text(`Score: ${score}`, WIDTH/2, 400 * SCALE);

				pop();

				buttons.run({ mouseX, mouseY, click });
			}
		})(),

		win: (() => {
			return function () {
				push();

				background(colors.black);
				fill(colors.white);
				
				textFont("Anton");
				textSize(150 * SCALE);
				textAlign(CENTER, CENTER);

				text("YOU WON!", WIDTH/2, 210 * SCALE);

				textSize(60 * SCALE);

				text(`Score: ${score}`, WIDTH/2, 400 * SCALE);

				pop();

				buttons.run({ mouseX, mouseY, click });
			}
		})(),

		how: (() => {
			return function () {
				push();

				background(colors.black);
				fill(colors.white);
				
				textFont("Anton");
				textSize(150 * SCALE);
				textAlign(CENTER, CENTER);

				text("HOW TO PLAY", WIDTH/2, 210 * SCALE);

				textSize(40 * SCALE);
				textFont("Google Sans")

				text("WASD or ARROWS to move,\nBounce the ball to break the blocks!!", WIDTH/2, 380 * SCALE);

				pop();

				buttons.run({ mouseX, mouseY, click });
			}
		})(),

		mode: (() => {

			const easy = buttons.getByText("EASY");
			const med = buttons.getByText("MED");
			const hard = buttons.getByText("HARD");

			const btns = [easy, med, hard];

			return function () {
				push();

				background(colors.black);
				fill(colors.white);
				
				textFont("Anton");
				textSize(150 * SCALE);
				textAlign(CENTER, CENTER);

				text("CHANGE MODE", WIDTH/2, 210 * SCALE);

				noStroke();
				fill(colors.blue);

				let x = 300 * SCALE * mode;
				let y = 380 * SCALE;
				let width = btns[mode - 1].width + 10;
				let height = 120 * SCALE;

				rect(x - width/2, y - height/2, width, height);

				pop();

				buttons.run({ mouseX, mouseY, click });
			}
		})(),

		home: (() => {
			return function () {
				push();

				background(colors.black);
				fill(colors.white);
				
				image(images.title, 0, -200 * SCALE);

				textFont("Google Sans Code");
				textSize(60 * SCALE);
				textAlign(CENTER, CENTER);
				text(padScore(highScore), WIDTH/2, 370 * SCALE);

				pop();

				buttons.run({ mouseX, mouseY, click });
			}
		})(),

		audio: (() => {
			return function () {
				push();

				background(colors.black);
				fill(colors.white);
				
				textFont("Anton");
				textSize(150 * SCALE);
				textAlign(CENTER, CENTER);

				text("USE AUDIO?", WIDTH/2, 210 * SCALE);

				textSize(40 * SCALE);
				textFont("Google Sans");

				text("This game uses audio. Do you want to continue with audio?", WIDTH/2, 380 * SCALE);

				pop();

				buttons.run({ mouseX, mouseY, click });
			}
		})(),
	};

	scenes.setDefault("colors.transition", colors.darkBlack);
	scenes.setDefault("colors.loading.background", colors.black);
	scenes.setDefault("colors.loading.text", colors.white);

	return scenes;
})();

const drawFunction = (() => {

	// Delta time calculations
	let deltaTime = 17;
	let then = performance.now();

	function getDeltaTime () {
		const now = performance.now();
		const delataTime = now - then;
		then = now;

		// Limit delta time so that physics arent unpredictable when really laggy
		return Math.max(1000/30, delataTime);
	}

	// not using function x() {} notation because iife. iife is simply for organization here
	setup = function() {
	
		// this clears all animation frames preventing them from stacking up if the webpage is reloaded
		// sourced from stack overflow somewhere
		let id = window.requestAnimationFrame(function(){});
		while (id--) {
			window.cancelAnimationFrame(id);
		}
		
		createCanvas(WIDTH, HEIGHT);
		
	};
	
	setup();
	
	function loadingAssets () {
	    push();
	    background(colors.black);
	    fill(colors.white);
	    textFont("Anton");
	    textSize(90 * SCALE);
	    textAlign(CENTER, CENTER);
	    
	    text("LOADING ASSETS...", WIDTH/2, HEIGHT/2);
	    
	    pop();
	}
	
	draw = function() {
	    if (!finishedLoading) return loadingAssets();
		deltaTime = getDeltaTime();
		scenes.run(deltaTime);
	};
})();

const userInput = (() => {
	// not using function x() {} notation because iife. iife is simply for organization here

	mousePressed = function() {
		click = true;
	}

	keyPressed = function() {
		keys[key] = keys[key.toString().toLowerCase()] = true;
	}
	
	keyReleased = function() {
		keys[key] = keys[key.toString().toLowerCase()] = false;
	}
})();

class AudioPlayer {
    constructor(base64, options) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        this.base64 = base64;
        this.loop = options.loop ?? false;
        
        this.buffer = null;
        this.sourceNode = null;

        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = options.volume ?? 1;
        this.gainNode.connect(this.audioCtx.destination);
    }
    
    getBuffer () {
        let binary = atob(this.base64.split(",")[1]);
        var bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
        return this.audioCtx.decodeAudioData(bytes.buffer);
    }
    
    resetSource () {
        // Credit to Arrow
        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
            } 
            catch (e) {
                console.warn("source stop failed or already stopped:", e);
            }
            this.sourceNode.disconnect();
        }
        
        this.sourceNode = this.audioCtx.createBufferSource();
        this.sourceNode.buffer = this.buffer;

        this.sourceNode.loop = this.loop;
        this.sourceNode.loopEnd = this.buffer.duration;
    }
    
    loadAudio () {                    
        return this.getBuffer().then(buffer => {
            this.buffer = buffer;
        })
    }
    
    start () {
        this.resetSource();
        this.sourceNode.connect(this.gainNode);
        this.sourceNode.start();
    }
}

var musicPlayer = new AudioPlayer(musicBase64, { loop: true, volume: 0.4 });
var bouncePlayer = new AudioPlayer(bounceBase64, { volume: 0.6 });
var explodePlayer = new AudioPlayer(explodeBase64, { volume: 0.6 });

// Only execute once fonts are all loaded
Promise.all([
    musicPlayer.loadAudio(),
    explodePlayer.loadAudio(),
    bouncePlayer.loadAudio(),
	document.fonts.load('400 1em "Anton"'),
	document.fonts.load('400 1em "Google Sans"'),
	document.fonts.load('400 1em "Google Sans Code"'),
]).then(() => {
    finishedLoading = true;
});

})();

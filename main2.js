/** R3 Jens2 jens
 * Space Stratego Game
 * A multiplayer strategy game built with p5.js and p5.party
 */

//===================================================
// CONSTANTS AND GLOBAL VARIABLES
//===================================================
const room = new URLSearchParams(location.search).get("room");

// Party System Global Variables jens3    
let shared;
let me;
//let guests;
let guests;

let spacecrafts = [];
let gameObjects = []; // Initialize as empty array

let backgroundManager;

// Game Dimensions
const SCREEN_WIDTH = 2400; // Game: 2400  // DEV: 1200
const SCREEN_HEIGHT = 1200; // Game: 1200 // DEV: 1000
const GAME_AREA_X = 300; // Game: 600 // DEV: 300
const GAME_AREA_Y = 50; // Game: 50 // DEV: 50
const GAME_AREA_WIDTH = 1200; // Game: 1200 // DEV: 500
const GAME_AREA_HEIGHT = 650; // Game: 700 // DEV: 500
const GAME_AREA_RIGHT = GAME_AREA_X + GAME_AREA_WIDTH;
const GAME_AREA_BOTTOM = GAME_AREA_Y + GAME_AREA_HEIGHT;

// Background manager Constants ========.
const CIRCLE_RADIUS = 400;
const IMAGE_SIZE = 120;
const ANIMATION_FRAMES = 180; // 3 seconds at 60fps.
const SUPERNOVA_MAX_SIZE = 10001;
const SUPERNOVA_THRESHOLD = 0.7;

// Gameplay Constants 
const TOTAL_NUMBER_OF_PLAYERS = 14
const SPACECRAFT_SIZE = 60; // Was 40
const SPACECRAFT_SPEED = 8;
const MAX_PLAYERS_PER_TEAM = 15;
const BATTLE_RESOLUTION_TIME = 4000; // 5 seconds in milliseconds
const GAME_TRANSITION_TIME = 4000; // 5 seconds in milliseconds
const WARP_COOLDOWN_TIME = 10000; // 3 seconds in milliseconds
const BULLET_SPEED = 4;
const BULLET_DIAMETER = 10;

// UI Variables
let nameInput;
let chooseTeamBlueButton;
let chooseTeamGreenButton;
let message = "";

// Game Controle Variables
let fixedMinimap
let selectedPlanet
let solarSystem
let planetIndexBlue = 0
let planetIndexGreen = 1
let canonTowersGenerated = false;
let isWarpingUp = false;
let hasWarped = false;
let supernovaStarIndex = -1;

// Variables only for statistics
let totalNumberOfVisualBullets = 0;
let totalNumberOfBullets = 0;

//let backgroundColor = [20, 30, 40]; // Default background color
let backgroundColor = [10, 20, 30]; // Default background color

// Add a centralized planet color palette
const planetColors = {
    0: { // Blue planet
        center: [20, 50, 160],
        edge: [80, 120, 200],
        name: "Rocky"
    },
    1: { // Green planet
        center: [20, 120, 40],
        edge: [100, 180, 100],
        name: "Organic"
    },
    2: { // Red planet
        center: [120, 20, 20],
        edge: [200, 100, 100],
        name: "Budda"
    },
    3: { // Yellow planet
        center: [120, 120, 20],
        edge: [200, 200, 100],
        name: "Ice cube"
    },
    4: { // Purple planet
        center: [80, 20, 120],
        edge: [150, 80, 200],
        name: "Insect swarm"
    }
};


// Character Definitions
const CHARACTER_DEFINITIONS = [
    { rank: -1, name: "Core Command", id: "F", count: 1, color: 'purple', isCoreCommand: true },
    { rank: 10, name: "Star Commander", id: "10", count: 1, color: 'cyan', isStarCommand: true },
    { rank: 9, name: "Fleet Admiral", id: "9", count: 1, color: 'magenta' },
    { rank: 8, name: "Star Captain", id: "8", count: 2, color: 'lime' },
    { rank: 7, name: "Squadron Leader", id: "7", count: 3, color: 'teal' },
    { rank: 6, name: "Ship Captain", id: "6", count: 4, color: 'lavender' },
    { rank: 5, name: "Lt. Commander", id: "5", count: 4, color: 'maroon' },
    { rank: 4, name: "Chief P. Officer", id: "4", count: 4, color: 'olive' },
    { rank: 3, name: "Engineer", id: "3", count: 5, color: 'yellow', isEngineer: true }, // Special ability
    { rank: 2, name: "Power Glider", id: "2", count: 8, color: 'purple' },
    { rank: 1, name: "Stealth Squad", id: "S", count: 1, color: 'orange', isStealthSquad: true }, // Special ability
    { rank: 0, name: "Recon Drone", id: "D", count: 6, color: 'brown', isReconDrone: true }, // Special rank 0 for Bomb
];

// Verify total piece count jens
let totalPieces = 0;
CHARACTER_DEFINITIONS.forEach(def => totalPieces += def.count);
console.log("Total pieces per team:", totalPieces);

//===================================================
// SETUP AND INITIALIZATION
//===================================================

function preload() {
    partyConnect(
        "wss://demoserver.p5party.org",
        "jkv-strategoCoreV6",
        room 
    );
//        "wss://p5js-spaceman-server-29f6636dfb6c.herokuapp.com",

    shared = partyLoadShared("shared", {
        gameState: "GAME-SETUP",
        winningTeam: null,
        resetFlag: false,
        coreCommandDisconnected: false,
        characterList: [],
        blueWins: 0,
        greenWins: 0,
        draws: 0,
        resetTimerStartTime: null,
        resetTimerSeconds: null,
        gameStartTimerStartTime: null,
        gameStartTimerSeconds: null,
        currentTime: null,
        showGraphics: false,
        showStarSystem: false,
        showBackroundStarts: false,
        showBlurAndTintEffects: false,
        gameObjects: [],  // Start with empty array jens
        canonTowerHits: Array(15).fill(0),
        canonTowerCount: 1,
        canonTowerShootingInterval: 2000,
        spacecraftSize: SPACECRAFT_SIZE,
        spacecraftSpeed: SPACECRAFT_SPEED,
        bulletSpeed: BULLET_SPEED,
        numberOfSimuntaneousBullets: 3,
    });

    me = partyLoadMyShared({
        playerName: "observer",
        lastWarpTime: 0 // Track when player last used a warp gate
    });

    guests = partyLoadGuestShareds();

    backgroundManager = new BackgroundManager();
}

function setup() {
    createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
    frameRate(60);
    noStroke();
    backgroundManager.initialize();
    createNameInput();
    initializeCharacterList();

    createSpacecrafts();

    // Only generate new Towers one time when a new host is assigned
    if (!canonTowersGenerated && partyIsHost()) {
        canonTowersGenerated = true;
        updateTowerCount();
    }

    fixedMinimap = new BasicMinimap(x = 1250, y = 900, diameter = 300, color = 'grey', diameterPlanet = 3000);
    solarSystem = new SolarSystem(xSolarSystemCenter = 1250, ySolarSystemCenter = 900);

    if (me.playerName === "observer") {
        joinGame();
        return;
    }

    console.log("My ID (will populate):", me.playerNumber);
}

//=================================================== jens
// MAIN DRAW FUNCTION
//===================================================

function draw() {
    background(backgroundColor[0], backgroundColor[1], backgroundColor[2]);
    //    background(20, 30, 40);
    //    background(0);

    if (me.playerNumber === undefined || me.playerNumber === null) {
        joinGame();
        return;
    }

    // Ensure me.size and me.diameter reflect the shared.spacecraftSize
    // This change will propagate to other players' 'guests' array for this player,
    // and then into their local 'spacecrafts' array via stepLocal().
    if (me.size !== shared.spacecraftSize) {
        me.size = shared.spacecraftSize;
    }
    // Assuming diameter should always match the effective size
    if (me.diameter !== shared.spacecraftSize) { 
        me.diameter = shared.spacecraftSize;
    }

    //   console.log(gameObjects)
    //    console.log(shared.gameObjects)
    //    shared.gameObjects

    resolvePlayerNumberConflicts()

    //guests = guests.filter(p => p.isReady && (p.team === 'blue' || p.team === 'green')) //[me, ...guests]; JENS 

    //console.log(spacecrafts)  
    //console.log(me.hits)

    // copy data from guest to local objects
    stepLocal()

    if (partyIsHost()) {
        //       console.log('shared.gameObjects', shared.gameObjects)
        //      console.log('shared.canonTowerHits', shared.canonTowerHits) 

        handleHostDuties();
    } else {
        //        console.log('gameObjects', gameObjects) jens
        receiveNewDataFromHost(); // Uncomment this line to enable tower syncing for clients
    }

    // Client-side state synchronization
    updateLocalStateFromSharedList();

    // Check for reset signal from host
    if (shared.resetFlag && !me.lastProcessedResetFlag) {
        resetClientState();
        me.lastProcessedResetFlag = true;
    } else if (!shared.resetFlag && me.lastProcessedResetFlag) {
        me.lastProcessedResetFlag = false;
    }

    // State machine for game phases
    // If player hasn't chosen a team yet, always show setup screen
    if (!me.isReady) {
        // Draw background elements (stars, etc.) jens
        backgroundManager.drawBackground();

        drawGameSetup();
    } else {
        switch (shared.gameState) {
            case "GAME-SETUP":
                backgroundManager.drawBackground();
                drawGameSetup();
                break;
            case "IN-GAME":
                selectedPlanet = solarSystem.planets[me.planetIndex];
                fixedMinimap.update(selectedPlanet.diameterPlanet, selectedPlanet.xWarpGateUp, selectedPlanet.yWarpGateUp, selectedPlanet.xWarpGateDown, selectedPlanet.yWarpGateDown, selectedPlanet.diameterWarpGate);

                if (shared.showGraphics) {
                    backgroundManager.drawBackground();
                    drawGameAreaBackground();
                } else {
                    drawGameAreaBackground();
                    backgroundManager.drawBackground();
                }
                backgroundManager.drawBackground();

                drawMinimap()
                push();
                drawCharacterListAndInfo();
                pop()
                drawCanonTowers();
                drawSpacecrafts();

                handlePlayerMovement();
                handleBulletMovement();
                checkCollisionsWithWarpGate();
                checkBulletCollisions()
                break;
            case "GAME-FINISHED":
                drawGameAreaBackground();
                backgroundManager.drawBackground();
                drawMinimap()
                drawGameFinished();
                break;
        }
    }


    // Always draw player info
    drawPlayerInfo();

    // Always draw status messages
    drawStatusMessages();

    // Draw game statistics
    drawGameStats();

    // Draw character legend if player is ready
    if (me.isReady) {
        drawCharacterLegend();
    }
}

function receiveNewDataFromHost() {

    // Ensure client has same number of towers as host
    while (gameObjects.length < shared.gameObjects.length) {
        const i = gameObjects.length;
        gameObjects.push(new Canon({
            objectNumber: i,
            objectName: `canon${i}`,
            xGlobal: shared.gameObjects[i].xGlobal,
            yGlobal: shared.gameObjects[i].yGlobal,
            diamter: 60,
            color: 'grey',
            xSpawnGlobal: shared.gameObjects[i].xSpawnGlobal,
            ySpawnGlobal: shared.gameObjects[i].ySpawnGlobal,
            planetIndex: shared.gameObjects[i].planetIndex,

        }));
    }
    // Remove extra towers if host has fewer
    while (gameObjects.length > shared.gameObjects.length) {
        gameObjects.pop();
    }
    // Update existing towers
    gameObjects.forEach((canon, index) => {
        canon.diameter = shared.gameObjects[index].diameter;
        canon.color = shared.gameObjects[index].color;

        canon.xGlobal = shared.gameObjects[index].xGlobal;
        canon.yGlobal = shared.gameObjects[index].yGlobal;
        canon.bullets = shared.gameObjects[index].bullets;
        canon.angle = shared.gameObjects[index].angle;
        canon.lastShotTime = shared.gameObjects[index].lastShotTime; // Sync lastShotTime
        canon.hits = shared.gameObjects[index].hits || Array(15).fill(0);
        canon.planetIndex = shared.gameObjects[index].planetIndex;
    });
}

//===================================================
// Copy data from guest to local objects
//===================================================

function stepLocal() {

    spacecrafts.forEach(spacecraft => {
        const guest = guests.find((p) => p.playerName === spacecraft.playerName);
        if (guest) {
            spacecraft.syncFromShared(guest);
        } else {
            spacecraft.planetIndex = -1;
        }
    });

}

function createSpacecrafts() {
    for (let i = 0; i < TOTAL_NUMBER_OF_PLAYERS; i++) {

        let teamName;
        if (i <= TOTAL_NUMBER_OF_PLAYERS / 2) {
            teamName = 'blue';
        } else {
            teamName = 'green';
        }

        spacecrafts.push(new Spacecraft({
            playerNumber: i,
            playerName: "player" + i,
            playerDisplayName: "",
            team: teamName,
            characterId: null,
            characterRank: null,
            characterName: null,
            characterInstanceId: null,
            size: SPACECRAFT_SIZE,
            isReady: false,
            hasCharacter: false,
            isRevealed: false,
            hasBattled: false,
            status: "available",
            lastProcessedResetFlag: false,
            xLocal: GAME_AREA_WIDTH / 2 + 100,
            yLocal: GAME_AREA_HEIGHT / 2,
            xGlobal: 3000 / 2 - GAME_AREA_WIDTH / 2 + 400,
            yGlobal: 3500 / 2 - GAME_AREA_HEIGHT / 2,
            diameter: SPACECRAFT_SIZE,
            xMouse: 0,
            yMouse: 0,
            color: "",
            bullets: [],
            hits: Array(15).fill(0),
            planetIndex: -1,
        }));
    }
}

function joinGame() {

    // don't let current players double join
    if (me.playerName.startsWith("player")) return;

    for (let spacecraft of spacecrafts) {
        console.log("Checking spacecraft:", spacecraft.playerName);
        if (!guests.find((p) => p.playerName === spacecraft.playerName)) {
            spawn(spacecraft);
            return;
        }
    }
}

function spawn(spacecraft) {
    console.log("Spawning spacecraft:", spacecraft.playerName);
    me.playerNumber = spacecraft.playerNumber;
    me.playerName = spacecraft.playerName;
    me.playerDisplayName = spacecraft.playerDisplayName;
    me.team = spacecraft.team;
    me.characterId = spacecraft.characterId;
    me.characterRank = spacecraft.characterRank;
    me.characterName = spacecraft.characterName;
    me.characterInstanceId = spacecraft.characterInstanceId;
    me.size = spacecraft.size;
    me.isReady = spacecraft.isReady;
    me.hasCharacter = spacecraft.hasCharacter;
    me.isRevealed = spacecraft.isRevealed;
    me.hasBattled = spacecraft.hasBattled;
    me.status = spacecraft.status;
    me.lastProcessedResetFlag = spacecraft.lastProcessedResetFlag;
    me.xLocal = spacecraft.xLocal;
    me.yLocal = spacecraft.yLocal;
    me.xGlobal = spacecraft.xGlobal;
    me.yGlobal = spacecraft.yGlobal;
    me.diameter = spacecraft.diameter;
    me.color = spacecraft.color;
    me.bullets = [];
    me.hits = Array(15).fill(0);
    me.planetIndex = -1;
    me.lastWarpTime = 0; // Reset warp cooldown when spawning
}
//===================================================
// DRAWING FUNCTIONS
//===================================================

function drawMinimap() {
    if (shared.showStarSystem) {
        push();
        angleMode(DEGREES);

        solarSystem.update();
        solarSystem.draw();
        pop()
    } else {
        fixedMinimap.draw();

    }
}

function drawGameAreaBackground() {

    if (shared.showGraphics) {

    } else {
        // Get colors consistent with the planet type
        const colorScheme = getPlanetColorScheme(me.planetIndex);

        // Draw the planet with a radial gradient
        drawRadialGradient(
            GAME_AREA_X - me.xGlobal + selectedPlanet.diameterPlanet / 2,
            GAME_AREA_Y - me.yGlobal + selectedPlanet.diameterPlanet / 2,
            selectedPlanet.diameterPlanet,
            colorScheme.center,
            colorScheme.edge
        );

        // Black out areas outside the game area
        //fill('black');
        fill(backgroundColor[0], backgroundColor[1], backgroundColor[2])
        rect(0, 0, GAME_AREA_X, SCREEN_HEIGHT); // Black out left side
        rect(0, 0, SCREEN_WIDTH, GAME_AREA_Y); // Black out top side
        rect(GAME_AREA_RIGHT, 0, SCREEN_WIDTH, SCREEN_HEIGHT); // Black out right side
        rect(0, GAME_AREA_BOTTOM, SCREEN_WIDTH, SCREEN_HEIGHT); // Black out bottom side

        // Also draw warp gates in non-image mode
        drawWarpGatesOnGameArea();

        // Draw planet name in the bottom right of the game area
        push();
        fill('white');
        textAlign(RIGHT, BOTTOM);
        textSize(16);
        text(`${colorScheme.name}`,
            //            screenLayout.xGameArea + screenLayout.cropWidth - 20,
            //            screenLayout.yGameArea + screenLayout.cropHeight - 10);
            GAME_AREA_X + GAME_AREA_WIDTH - 20,
            GAME_AREA_Y + GAME_AREA_HEIGHT - 10);
        pop();
    }

}

function drawPlayerInfo() {
    const infoX = 40;
    const infoStartY = SCREEN_HEIGHT - 20;
    const infoLineHeight = 20;
    let currentY = infoStartY;

    if (partyIsHost()) {
        fill(255, 223, 0);
        textSize(16);
        text("HOST", infoX, currentY);
        fill(255);
        textSize(14);
    }
}

function drawStatusMessages() {
    const statusMsgX = GAME_AREA_X + GAME_AREA_WIDTH / 2;
    const statusMsgY = GAME_AREA_Y - 30;

    // Find the player's current character data from shared list
    let myCharacterData = shared.characterList.find(c => c.instanceId === me.characterInstanceId);

    // Battle outcome message
    if (shared.gameState !== 'GAME-FINISHED' && me.hasCharacter &&
        myCharacterData && myCharacterData.status === 'inBattle' &&
        myCharacterData.battleOutcomeResult) {

        fill(255, 255, 0);
        textAlign(CENTER, CENTER);
        textSize(20);

        // Calculate countdown time
        let remainingSeconds = 0;
        if (myCharacterData.battleStartTime) {
            // Correct elapsed time calculation
            //            const elapsed = millis() - myCharacterData.battleStartTime;
            const elapsed = shared.currentTime - myCharacterData.battleStartTime;
            // Use BATTLE_RESOLUTION_TIME for countdown duration
            remainingSeconds = Math.max(0, Math.ceil(BATTLE_RESOLUTION_TIME / 1000) - Math.floor(elapsed / 1000));
        }

        let outcomeMsg = "";

        if (myCharacterData.battleOpponentInfo) {
            // Include opponent player name in the message
            const opponentPlayerName = myCharacterData.battleOpponentInfo?.playerName || 'Unknown Player';
            const opponentCharacterName = myCharacterData.battleOpponentInfo?.name || '??';
            outcomeMsg = `You ${myCharacterData.battleOutcomeResult} a battle vs a ${opponentCharacterName} (${opponentPlayerName})! (${remainingSeconds})`;
        } else {
            outcomeMsg = `${myCharacterData.battleOutcomeResult} (${remainingSeconds})`;
        }

        text(outcomeMsg, statusMsgX, statusMsgY);
    }
    // General game message (including team full messages) 
    else if (message) {
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(24);
        text(message, statusMsgX, statusMsgY);
        // Clear message after displaying once to avoid persistence
        // Consider a timed clear if needed
        // message = ""; // Optional: Clear immediately
    }
    // Game start countdown
    else if (shared.gameState === 'GAME-SETUP' && shared.gameStartTimerStartTime) {
        fill(200);
        textSize(18);
        textAlign(CENTER, CENTER);
        text(`A new game is starting in ${shared.gameStartTimerSeconds} seconds...`, statusMsgX, statusMsgY);
    }
    // Game reset countdown
    else if (shared.gameState === 'GAME-FINISHED' && shared.resetTimerStartTime) {
        fill(200);
        textSize(18);
        textAlign(CENTER, CENTER);
        text(`A new game will be setup in ${shared.resetTimerSeconds} seconds...`, statusMsgX, statusMsgY);
    }
}

function drawTopLeftInfo() {
    if (me.isReady) {
        fill(255);
        textSize(18);
        textAlign(LEFT, TOP);
        if (partyIsHost()) {
            text(`(Host)`, 10, 5);
        }
        text(`Welcome, ${me.playerDisplayName}! Team: ${me.team === 'blue' ? 'Blue' : 'Green'}.`, 10, 20);
        if (me.hasCharacter) {
            text(`You are a: ${me.characterName}`, 10, 50);
        } else {
            text("Choose your Spacecraft:", 10, 50);
        }
    }
}

function drawGameStats() {
    const statsWidth = 300; // Approximate width for the stats box
    const statsX = SCREEN_WIDTH - statsWidth - 3; // Position from the right edge of the screen
    const statsY = 20;
    const lineHeight = 20;

    fill(200);
    textSize(14);
    textAlign(LEFT, TOP);

    text("Game Stats:", statsX, statsY);
    fill(0, 150, 255); // Blue color
    text(`Blue Wins: ${shared.blueWins || 0}`, statsX, statsY + lineHeight);
    fill(0, 200, 100); // Green color
    text(`Green Wins: ${shared.greenWins || 0}`, statsX, statsY + lineHeight * 2);
    fill(200); // White/Gray color
    text(`Draws: ${shared.draws || 0}`, statsX, statsY + lineHeight * 3);

    // Calculate team player counts
    let blueTeamCount = guests.filter(p => p.isReady && p.team === 'blue').length;
    let greenTeamCount = guests.filter(p => p.isReady && p.team === 'green').length;

    // Some render performance stats 
    //fill(100);
    //text(`Number of visual bullets: ${totalNumberOfVisualBullets}`, statsX, statsY + lineHeight * 7);
    //text(`Number of  bullets: ${totalNumberOfBullets}`, statsX, statsY + lineHeight * 8);

    //   Some player info to detect players with the same player name because of simultaneous joining 
    fill(0, 150, 255); // Blue color
    text(`Players on the blue team: (${blueTeamCount})`, statsX, statsY + lineHeight * 5);

    guests.filter(p => p.isReady && p.team === 'blue').forEach((p, index) => {
        fill(0, 150, 255); // Blue color
        text(`${p.playerName},${p.playerNumber}: ${me.status}`, statsX, statsY + lineHeight * (6 + index));
    });
    fill(0, 200, 100); // Green color
    text(`Players on the green team: (${greenTeamCount})`, statsX, statsY + lineHeight * (7 + guests.filter(p => p.isReady && p.team === 'blue').length));
    guests.filter(p => p.isReady && p.team === 'green').forEach((p, index) => {
        fill(0, 200, 100); // Green color
        text(`${p.playerName},${p.playerNumber}: ${me.status}`, statsX, statsY + lineHeight * (8 + guests.filter(p => p.isReady && p.team === 'blue').length + index));
    });

    if (twoPlayersWithTheSamePlayerNumberExist()) {
        fill(255, 0, 0); // Red color
        text(`Two players have the same playerNumber`, statsX, statsY + lineHeight * (9 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
        text(`One of them must refresh the browser.`, statsX, statsY + lineHeight * (10 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    }

    fill(200); // White/Gray color
    if (partyIsHost()) {
    text(`Spacecraft size (Key: 1 or 2): ${shared.spacecraftSize}`, statsX, statsY + lineHeight * (12 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    text(`Spacecraft speed (Key: 3 or 4): ${shared.spacecraftSpeed}`, statsX, statsY + lineHeight * (13 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    text(`bulletSpeed (Key: 5 or 6): ${shared.bulletSpeed}`, statsX, statsY + lineHeight * (14 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    text(`Simuntaneous bullets (Key: 7 or 8): ${shared.numberOfSimuntaneousBullets}`, statsX, statsY + lineHeight * (15 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    text(`Canon towers (Key: j, l or k): ${shared.canonTowerCount}`, statsX, statsY + lineHeight * (16 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    text(`Show graphics (Key: p): ${shared.showGraphics}`, statsX, statsY + lineHeight * (17 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    text(`Show star system (Key: o): ${shared.showStarSystem}`, statsX, statsY + lineHeight * (18 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    text(`Show effects (Key: u): ${shared.showBlurAndTintEffects}`, statsX, statsY + lineHeight * (19 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    } else {
    text(`Spacecraft size: ${shared.spacecraftSize}`, statsX, statsY + lineHeight * (12 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    text(`Spacecraft speed: ${shared.spacecraftSpeed}`, statsX, statsY + lineHeight * (13 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    text(`bulletSpeed: ${shared.bulletSpeed}`, statsX, statsY + lineHeight * (14 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    text(`Simuntaneous bullets: ${shared.numberOfSimuntaneousBullets}`, statsX, statsY + lineHeight * (15 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    text(`Canon towers: ${shared.canonTowerCount}`, statsX, statsY + lineHeight * (16 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    text(`Show graphics: ${shared.showGraphics}`, statsX, statsY + lineHeight * (17 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    text(`Show star system: ${shared.showStarSystem}`, statsX, statsY + lineHeight * (18 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    text(`Show effects: ${shared.showBlurAndTintEffects}`, statsX, statsY + lineHeight * (19 + guests.filter(p => p.isReady && p.team === 'blue').length + guests.filter(p => p.isReady && p.team === 'green').length));
    }
} 

function drawCharacterLegend() {
    const legendX = GAME_AREA_RIGHT + 50; // Position where stats used to be
    const legendTitleY = 20; // Position at the top of this panel area

    // Title
    fill(200);
    textSize(20); // Title text size
    textAlign(LEFT, TOP);
    text("Kill the opponents Core Command to win the game!", legendX, legendTitleY);

    const circleDiameter = 50; // 96px
    const itemVerticalPadding = 4;
    const itemHeight = circleDiameter + itemVerticalPadding;
    const textOffsetX = circleDiameter + 20;
    const specialRuleTextStartX = legendX + textOffsetX + 230;

    let currentItemContentStartY = legendTitleY + 40; // Y for the top of the first item's content area (after title + some padding)

    backgroundManager.resetStarHoverStates();
    let itemCount = 0;
    CHARACTER_DEFINITIONS.forEach(def => {
        // Draw colored circle
        fill(def.color);
        noStroke();
        ellipse(legendX + circleDiameter / 2, currentItemContentStartY + circleDiameter / 2, circleDiameter, circleDiameter);

        if (dist(mouseX, mouseY, legendX + circleDiameter / 2, currentItemContentStartY + circleDiameter / 2) < circleDiameter / 2) {
            backgroundManager.getDecorativeStars()[itemCount].setButtonHovered(true);
        }
        itemCount++;

        // Text for name and rank
        fill(220);
        textSize(14);
        textAlign(LEFT, CENTER);

        const textBlockCenterY = currentItemContentStartY + circleDiameter / 2;

        let rankText = def.rank === -1 ? "F" : def.rank;
        text(`(${def.id}) ${def.name} (Rank: ${rankText})`, legendX + textOffsetX, textBlockCenterY);

        // Add special rules descriptions
        let specialRuleText = "";
        if (def.isEngineer && def.id === "3") {
            specialRuleText = "Wins vs Recon Drone";
        } else if (def.isReconDrone && def.id === "D") {
            specialRuleText = "Draws vs all except Engineer";
        } else if (def.isStealthSquad && def.id === "S") {
            specialRuleText = "Wins vs Star Commander";
        } else if (def.isCoreCommand && def.id === "F") {
            specialRuleText = "Loses to any attacker";
        } else if (def.isStarCommand && def.id === "10") {
            specialRuleText = "Loses to Stealth Squad";
        }

        if (specialRuleText) {
            fill(180);
            //            textSize(11); 
            textAlign(LEFT, CENTER);
            text(specialRuleText, specialRuleTextStartX, textBlockCenterY);
        }

        currentItemContentStartY += itemHeight;
    });
    textSize(14);
}

function numberOfBullets() {

    gameObjects.forEach(canon => {
        numberOfBullets += canon.bullets.length;
        // Count visible bullets
        canon.bullets.forEach(bullet => {
            let xLocal = bullet.xGlobal - me.xGlobal;
            let yLocal = bullet.yGlobal - me.yGlobal;
            if (onLocalScreenArea(xLocal, yLocal)) {
                totalNumberOfVisualBullets++;
            }
            totalNumberOfBullets++;
        });
    });
}


function drawSpacecraft(playerData, characterData) {
    // Skip drawing if not valid or lost
    if (!playerData || !playerData.hasCharacter ||
        playerData.status === 'lost' ||
        playerData.x < -playerData.size ||
        playerData.y < -playerData.size) {
        return;
    }

    // Use characterData from shared list to check status
    if (!characterData || characterData.status === 'lost') {
        return;
    }

    let drawX = constrain(playerData.x, GAME_AREA_X + playerData.size / 2, GAME_AREA_RIGHT - playerData.size / 2);
    let drawY = constrain(playerData.y, GAME_AREA_Y + playerData.size / 2, GAME_AREA_BOTTOM - playerData.size / 2);

    // Define RGB values directly instead of using color()
    let r, g, b;
    if (playerData.team === 'blue') {
        r = 0; g = 150; b = 255;
    } else if (playerData.team === 'green') {
        r = 0; g = 200; b = 100;
    } else {
        r = 150; g = 150; b = 150;
    }

    // Apply appropriate stroke style
    if (playerData.playerNumber === me.playerNumber) {
        stroke(255, 255, 0);
        strokeWeight(2);
    } else if (playerData.hasBattled) {
        stroke(255);
        strokeWeight(3);
    } else {
        noStroke();
    }

    fill(r, g, b);
    ellipse(drawX, drawY, playerData.size, playerData.size);
    noStroke();

    // Reveal rank if appropriate
    const shouldRevealRank = playerData.isRevealed ||
        playerData.playerNumber === me.playerNumber ||
        characterData.status === 'inBattle' ||
        shared.gameState === 'GAME-FINISHED';

    if (shouldRevealRank && playerData.characterId) {
        // Calculate brightness directly from RGB values
        let brightness = (r * 299 + g * 587 + b * 114) / 1000;
        fill(brightness > 125 ? 0 : 255);
        textSize(playerData.size * 0.45);
        textAlign(CENTER, CENTER);
        text(playerData.characterId, drawX, drawY + 1);
    }

    fill(200);
    textSize(10);
    textAlign(CENTER, BOTTOM);
    text(playerData.playerDisplayName || '?', drawX, drawY + playerData.size / 2 + 12);
}

//===================================================
// GAME STATE FUNCTIONS
//===================================================

function drawGameSetup() {
    if (!me.isReady) {
        // Show name input elements 
        fill(255);
        textSize(20);
        textAlign(CENTER, CENTER);
        text("Enter your player name and choose a team:", width / 2, height / 2 - 100);

        // Calculate team counts
        let blueTeamCount = guests.filter(p => p.isReady && p.team === 'blue').length;
        let greenTeamCount = guests.filter(p => p.isReady && p.team === 'green').length;

        // Conditionally show buttons or full message
        if (blueTeamCount >= MAX_PLAYERS_PER_TEAM && greenTeamCount >= MAX_PLAYERS_PER_TEAM) {
            // Both teams full
            if (nameInput) nameInput.show();
            if (chooseTeamBlueButton) chooseTeamBlueButton.hide();
            if (chooseTeamGreenButton) chooseTeamGreenButton.hide();
            fill(255, 100, 100);
            textSize(18);
            textAlign(CENTER, CENTER);
            text("New players cannot join because both teams are full.", width / 2, height / 2 + 30);
        } else {
            // At least one team has space
            if (nameInput) nameInput.show();
            if (chooseTeamBlueButton) {
                if (blueTeamCount < MAX_PLAYERS_PER_TEAM) chooseTeamBlueButton.show();
                else {
                    chooseTeamBlueButton.hide();
                    fill(150); textSize(14); textAlign(CENTER, CENTER);
                    text("Blue Team Full", chooseTeamBlueButton.x + chooseTeamBlueButton.width / 2,
                        chooseTeamBlueButton.y + chooseTeamBlueButton.height + 10);
                }
            }
            if (chooseTeamGreenButton) {
                if (greenTeamCount < MAX_PLAYERS_PER_TEAM) chooseTeamGreenButton.show();
                else {
                    chooseTeamGreenButton.hide();
                    fill(150); textSize(14); textAlign(CENTER, CENTER);
                    text("Green Team Full", chooseTeamGreenButton.x + chooseTeamGreenButton.width / 2,
                        chooseTeamGreenButton.y + chooseTeamGreenButton.height + 10);
                }
            }
        }
    } else {
        // Hide initial setup UI
        if (nameInput) nameInput.hide();
        if (chooseTeamBlueButton) chooseTeamBlueButton.hide();
        if (chooseTeamGreenButton) chooseTeamGreenButton.hide();

        // Draw welcome text and character list
        drawTopLeftInfo();
        drawCharacterList();

        // Display setup messages if countdown hasn't started
        if (!shared.gameStartTimerStartTime) {
            const statusMsgX = GAME_AREA_X + GAME_AREA_WIDTH / 2;
            const statusMsgY = GAME_AREA_Y - 30;

            let blueFlagSelected = shared.characterList.some(c => c.team === 'blue' && c.id === 'F' && c.takenByPlayerId !== null);
            let greenFlagSelected = shared.characterList.some(c => c.team === 'green' && c.id === 'F' && c.takenByPlayerId !== null);
            let myTeamFlagChosen = shared.characterList.some(c => c.team === me.team && c.id === 'F' && c.takenByPlayerId !== null);

            fill(255, 100, 100);
            textAlign(CENTER, CENTER);
            textSize(20);

            let statusText = "";

            if (!blueFlagSelected || !greenFlagSelected) {
                if (!myTeamFlagChosen) {
                    statusText = "A player from your team must select a Core Command...";
                } else if (me.hasCharacter) {
                    statusText = "Waiting for the other team to choose a Core Command...";
                }
            }

            if (statusText) {
                text(statusText, statusMsgX, statusMsgY);
            }
        }
    }
}

function drawCharacterListAndInfo() {

    // Draw welcome text and character list
    if (me.isReady) {
        drawTopLeftInfo();
        drawCharacterList();
    }
}

function drawCanonTowers() {
    if (!gameObjects) return;

    // Draw Canon Towers for all players - only on planet 3
    if (me.planetIndex === 3) {
        gameObjects.forEach(canon => {
            canon.drawCanonTower();
            canon.drawBullets();
        });
    }
}

function drawSpacecrafts() {
    // Draw all active spacecraft 
    /*
        guests.forEach(p => {
            const characterData = shared.characterList.find(c => c.instanceId === p.characterInstanceId);
            if (p.hasCharacter && characterData && characterData.status !== 'lost') {
                let spacecraft = spacecrafts.find(s => s.playerNumber === p.playerNumber);
                drawSpacecraft(p, characterData);
            }
        }); 
    */
    spacecrafts.forEach((spacecraft) => {
        //        console.log({spacecraft})
        //        console.log(me) 

        if (spacecraft.planetIndex === me.planetIndex) {
            const characterData = shared.characterList.find(c => c.instanceId === spacecraft.characterInstanceId);
            //console.log("CharacterData:", characterData);
            if (spacecraft.hasCharacter && characterData && characterData.status !== 'lost') {
                //console.log("Drawing spacecraft:", spacecraft.playerName);

                spacecraft.drawBullets();
                spacecraft.drawSpacecraft(characterData);
            }
        }
    });
}

function drawGameFinished() {

    // Draw welcome text and character list
    if (me.isReady) {
        drawTopLeftInfo();
        drawCharacterList();
    }

    // Draw all remaining spacecraft (revealed)
    guests.forEach(p => {
        const characterData = shared.characterList.find(c => c.instanceId === p.characterInstanceId);
        if (characterData && !characterData.isPermanentlyLost) {
            let tempData = { ...p, isRevealed: true };
            drawSpacecraft(tempData, characterData);
        }
    });

    // Display Winner Message
    const winMsgX = GAME_AREA_X + GAME_AREA_WIDTH / 2;
    const winMsgY = GAME_AREA_Y + GAME_AREA_HEIGHT / 2;
    fill(255, 223, 0);
    textSize(36);
    textAlign(CENTER, CENTER);

    let winText = "Game Over!";
    if (shared.coreCommandDisconnected) {
        winText = `${shared.winningTeam.toUpperCase()} TEAM WINS! (because Core Command disconnected)`;
    } else if (shared.winningTeam === "draw") {
        winText = `DRAW as the two Core Commanders were in battle! `;
    } else if (shared.winningTeam) {
        winText = `${shared.winningTeam.toUpperCase()} TEAM WINS!`;
        if (shared.winningPlayerName) {
            winText += `\n(Core Command captured by ${shared.winningPlayerName})`;
            textSize(24);
        } else {
            winText += `\n(Core Command was hit too many times)`;
        }
    }
    text(winText, winMsgX, winMsgY - 20);
}

//===================================================
// USER INTERFACE FUNCTIONS
//===================================================

function createNameInput() {
    let inputX = width / 2 - 150;
    let inputY = height / 2 - 50;

    // Generate a default player name
    const randomNum = Math.floor(Math.random() * 999) + 1;
    const defaultName = `Player${randomNum}`;

    nameInput = createInput(defaultName);
    nameInput.position(inputX, inputY);
    nameInput.size(300, 30);
    nameInput.attribute('placeholder', 'Enter Player Name');

    chooseTeamBlueButton = createButton('Join Blue Team');
    chooseTeamBlueButton.position(inputX, inputY + 50);
    chooseTeamBlueButton.size(145, 40);
    chooseTeamBlueButton.style('background-color', 'lightblue');
    chooseTeamBlueButton.mousePressed(() => setPlayerInfo('blue'));

    chooseTeamGreenButton = createButton('Join Green Team');
    chooseTeamGreenButton.position(inputX + 155, inputY + 50);
    chooseTeamGreenButton.size(145, 40);
    chooseTeamGreenButton.style('background-color', 'lightgreen');
    chooseTeamGreenButton.mousePressed(() => setPlayerInfo('green'));
}

function setPlayerInfo(team) {
    const playerDisplayName = nameInput.value().trim();
    message = ""; // Clear previous messages

    if (playerDisplayName.length > 0) {
        // Check team count before joining
        let blueTeamCount = guests.filter(p => p.isReady && p.team === 'blue').length;
        let greenTeamCount = guests.filter(p => p.isReady && p.team === 'green').length;

        if (team === 'blue' && blueTeamCount >= MAX_PLAYERS_PER_TEAM) {
            // alert("Cannot join Blue Team, it is full (max 3 players).");
            message = "Cannot join Blue Team, it is full.";
            return;
        }

        if (team === 'green' && greenTeamCount >= MAX_PLAYERS_PER_TEAM) {
            // alert("Cannot join Green Team, it is full (max 3 players).");
            message = "Cannot join Green Team, it is full.";
            return;
        }

        if (team === 'blue') {
            me.planetIndex = planetIndexBlue;
        } else {
            me.planetIndex = planetIndexGreen;
        }

        me.xGlobal = 3000 / 2 - GAME_AREA_WIDTH / 2 + 400;
        me.yGlobal = 3000 / 2 - GAME_AREA_HEIGHT / 2;
        me.xLocal = GAME_AREA_WIDTH / 2 + 100;
        me.yLocal = GAME_AREA_HEIGHT / 2;

        me.playerDisplayName = playerDisplayName;
        me.team = team;
        me.isReady = true;
        nameInput.hide();
        chooseTeamBlueButton.hide();
        chooseTeamGreenButton.hide();
    } else {
        // alert("Please enter a player name.");
        message = "Please enter a player name.";
    }
}

//===================================================
// Lets have an easy way to turn of performance heavy graphics
//===================================================

function keyPressed() {

    if (!partyIsHost()) return;

    if (keyCode === 49) { // 1
        shared.spacecraftSize = constrain(shared.spacecraftSize - 10, 40, 120);
    } else if (keyCode === 50) { // 2
        shared.spacecraftSize = constrain(shared.spacecraftSize + 10, 40, 120);
    } else if (keyCode === 51) { // 3
        shared.spacecraftSpeed = constrain(shared.spacecraftSpeed - 1, 1, 14);
    } else if (keyCode === 52) { // 4
        shared.spacecraftSpeed = constrain(shared.spacecraftSpeed + 1, 1, 14);
    } else if (keyCode === 53) { // 5
        shared.bulletSpeed = constrain(shared.bulletSpeed - 1, 1, 5);
    } else if (keyCode === 54) { // 6
        shared.bulletSpeed = constrain(shared.bulletSpeed + 1, 1, 5);
    } else if (keyCode === 55) { // 7
        shared.numberOfSimuntaneousBullets = constrain(shared.numberOfSimuntaneousBullets - 1, 0, 5);
    } else if (keyCode === 56) { // 8
        shared.numberOfSimuntaneousBullets = constrain(shared.numberOfSimuntaneousBullets + 1, 0, 5);
    }

    // https://www.toptal.com/developers/keycode
    if (keyCode === 80) { // p 
        shared.showGraphics = !shared.showGraphics;
    }
    if (keyCode === 79) { // o
        shared.showStarSystem = !shared.showStarSystem;
    }
    if (keyCode === 73) { // i
        shared.showBackroundStarts = !shared.showBackroundStarts;
    }
    if (keyCode === 85) { // u
        shared.showBlurAndTintEffects = !shared.showBlurAndTintEffects;
    }
    if (keyCode === 76) { // l
        shared.canonTowerCount = 24;
        updateTowerCount();
    }
    if (keyCode === 75) { // k
        shared.canonTowerCount = 16;
        updateTowerCount();
    }
    if (keyCode === 74) { // j
        shared.canonTowerCount = 1;
        updateTowerCount();
    }
}

//===================================================
// CHARACTER MANAGEMENT
//===================================================

function initializeCharacterList() {
    if (partyIsHost()) {
        shared.characterList = [];
        const teams = ['blue', 'green'];

        teams.forEach(team => {
            CHARACTER_DEFINITIONS.forEach(def => {
                for (let i = 0; i < def.count; i++) {
                    shared.characterList.push({
                        // Core definition properties
                        ...def,
                        // Instance specific properties
                        team: team,
                        instanceId: `${team}_${def.id}_${i}`,
                        takenByPlayerName: null,
                        takenByPlayerId: null,
                        isPermanentlyLost: false,
                        // Battle/Status Fields
                        status: 'available',
                        inBattleWithInstanceId: null,
                        battleOutcomeResult: null,
                        battleOpponentInfo: null,
                        battleStartTime: null,
                        color: def.color,
                    });
                }
            });
        });
        console.log("HOST: Initialized shared.characterList with team assignments and status fields.");
    }
}

function drawCharacterList() {
    const listX = 10;
    let listY = 80;
    const itemHeight = 25;
    const itemWidth = 220;

    fill(200);
    textSize(14);
    textAlign(LEFT, TOP);

    // Filter list for player's team only
    const myTeamCharacterList = shared.characterList?.filter(item => item.team === me.team) || [];

    // Determine selection conditions
    let myTeamFlagChosen = guests.some(p => p.team === me.team && p.characterId === 'F' && p.hasCharacter);
    let canSelectAnyAvailable = me.isReady && !me.hasCharacter;

    // Filter drawable characters
    const drawableCharacters = myTeamCharacterList.filter(item => !item.isPermanentlyLost);

    drawableCharacters.forEach((item, index) => {
        let displayY = listY + index * itemHeight;
        let isAvailable = !item.takenByPlayerName;
        let canSelectItem = false;

        // Determine selectability
        if (!shared.resetFlag && canSelectAnyAvailable && isAvailable) {
            if (item.isCoreCommand) {
                // Can select flag only if team flag isn't chosen
                canSelectItem = !myTeamFlagChosen;
            } else {
                // Can select non-flag if team flag IS chosen OR game is already in progress
                canSelectItem = myTeamFlagChosen || shared.gameState !== 'GAME-SETUP';
            }
        }

        // Highlighting logic
        if (mouseX > listX && mouseX < listX + itemWidth &&
            mouseY > displayY && mouseY < displayY + itemHeight) {

            if (canSelectItem) {
                fill(0, 150, 200, 150); // Highlight selectable
                noStroke();
                rect(listX, displayY, itemWidth, itemHeight);
            } else if (isAvailable) {
                fill(100, 100, 100, 100); // Highlight available but not selectable
                noStroke();
                rect(listX, displayY, itemWidth, itemHeight);
            }
        }

        // Text color logic
        if (!isAvailable) fill(100); // Taken
        else if (canSelectItem) fill(255); // Selectable by me
        else fill(150); // Available but not selectable by me

        // Display text
        let displayText = `(${item.id}) ${item.name}`;

        let hitByOthers = numberOfTimesBeingHit(item.takenByPlayerId)

        if (!isAvailable) displayText += ` - ${item.takenByPlayerName} (${hitByOthers}/10)`;

        textAlign(LEFT, CENTER);
        text(displayText, listX + 5, displayY + itemHeight / 2);
    });

    textAlign(LEFT, TOP); // Reset alignment
}

function numberOfTimesBeingHit(takenByPlayerId) {
    let hitByOthers = 0;
    spacecrafts.forEach(spacecraft => {
        hitByOthers += spacecraft.hits[takenByPlayerId];
    })
    hitByOthers += shared.canonTowerHits[takenByPlayerId];

    return hitByOthers;
}

//===================================================
// USER INPUT AND INTERACTION
//===================================================

function mousePressed() {
    // Character Selection Logic
    if (me.isReady && !me.hasCharacter) {
        handleCharacterSelection();
    }

    const myCharacterData = shared.characterList.find(c => c.instanceId === me.characterInstanceId);
    if (!me.hasCharacter ||
        me.status !== 'available' ||
        !myCharacterData ||
        myCharacterData.status !== 'available' ||
        shared.coreCommandLost) return;

    // Check if player is in post-collision cooldown period
    if (me.lastCollisionTime && (millis() - me.lastCollisionTime < 2000)) {
        // Player touched an opponent less than 2 seconds ago - can't move
        return;
    }

    // Check if player is in post-collision cooldown period
    if (me.lastBulletCollisionTime && (millis() - me.lastBulletCollisionTime < 10000)) {
        // Player touched an opponent less than 2 seconds ago - can't move
        return;
    }

    if (shared.gameState != "IN-GAME" || me.bullets.length > shared.numberOfSimuntaneousBullets) return

    let bullet = {
        xLocal: me.xLocal,
        yLocal: me.yLocal,
        xStart: me.xLocal,
        yStart: me.yLocal,
        xMouseStart: me.xMouse,
        yMouseStart: me.yMouse,
        xGlobal: me.xGlobal,
        yGlobal: me.yGlobal,
    };
    me.bullets.push(bullet);
}

function handleCharacterSelection() {
    const listX = 10;
    let listY = 80;
    const itemHeight = 25;
    const itemWidth = 220;

    // Filter for player's team only
    const myTeamCharacterList = shared.characterList?.filter(item => item.team === me.team) || [];

    // Get team flag status
    let myTeamFlagChosen = guests.some(p => p.team === me.team && p.characterId === 'F' && p.hasCharacter);

    const selectableCharacters = myTeamCharacterList.filter(item => !item.isPermanentlyLost);

    for (let index = 0; index < selectableCharacters.length; index++) {
        const item = selectableCharacters[index];
        let displayY = listY + index * itemHeight;
        let isAvailable = !item.takenByPlayerName;
        let canSelectItem = false;

        if (isAvailable) {
            if (item.isCoreCommand) {
                canSelectItem = !myTeamFlagChosen;
            } else {
                canSelectItem = myTeamFlagChosen || shared.gameState !== 'GAME-SETUP';
            }
        }

        if (canSelectItem &&
            mouseX > listX && mouseX < listX + itemWidth &&
            mouseY > displayY && mouseY < displayY + itemHeight) {

            // Assign character details to 'me'
            me.characterId = item.id;
            me.characterRank = item.rank;
            me.characterName = item.name;
            me.characterInstanceId = item.instanceId;
            me.hasCharacter = true;
            me.isRevealed = false;
            me.hasBattled = false;
            me.status = "available";
            me.playerColor = item.color;

            me.xGlobal = 3000 / 2 - GAME_AREA_WIDTH / 2 + random(-200, 200);
            me.yGlobal = 3000 / 2 - GAME_AREA_HEIGHT / 2 + random(-200, 200);
            me.xLocal = GAME_AREA_WIDTH / 2;
            me.yLocal = GAME_AREA_HEIGHT / 2;

            if (me.team === 'blue') {
                me.planetIndex = planetIndexBlue;
            } else {
                me.planetIndex = planetIndexGreen;
            }

            console.log(`Selected: ${me.characterName} (${me.characterInstanceId}) for team ${me.team}`);
            break; // Exit loop once selection is made
        }
    }
}

function handlePlayerMovement() {
    // Check if player can move
    const myCharacterData = shared.characterList.find(c => c.instanceId === me.characterInstanceId);
    if (!me.hasCharacter ||
        me.status !== 'available' ||
        !myCharacterData ||
        myCharacterData.status !== 'available' ||
        shared.coreCommandLost) return;

    // Check if player is in post-collision cooldown period
    if (me.lastCollisionTime && (millis() - me.lastCollisionTime < 2000)) {
        // Player touched an opponent less than 2 seconds ago - can't move
        return;
    }

    // Check if player is in post-collision cooldown period
    if (me.lastBulletCollisionTime && (millis() - me.lastBulletCollisionTime < 2000)) {
        // Player touched an opponent less than 2 seconds ago - can't move
        return;
    }

    // Check if warp gate is in cooldown
    const currentTime = millis();

    let warpTime = int(currentTime - me.lastWarpTime)
    //    console.log(warpTime);
    if (warpTime < 2000) {
        console.log("Warp gate cooldown < 2 sec is active");
        return
    } else if ((warpTime < 4000) && !hasWarped) {
        console.log("Warp gate cooldown < 4 and !hasWarped");
        hasWarped = true;

        console.log("supernovaStarIndex", supernovaStarIndex);
        backgroundManager.decorativeStars[supernovaStarIndex].setupSupernovaProperties()

        if (isWarpingUp) {
            if (me.planetIndex === 4) {
                me.planetIndex = 0;
            } else {
                me.planetIndex++;
            }
            me.xGlobal = solarSystem.planets[me.planetIndex].xWarpGateUp - me.xLocal;
            me.yGlobal = solarSystem.planets[me.planetIndex].yWarpGateUp - me.yLocal;
        } else {
            if (me.planetIndex === 0) {
                me.planetIndex = 4;
            } else {
                me.planetIndex--;
            }
            me.xGlobal = solarSystem.planets[me.planetIndex].xWarpGateDown - me.xLocal;
            me.yGlobal = solarSystem.planets[me.planetIndex].yWarpGateDown - me.yLocal;
        }
    } else if (warpTime < 4000) {
        return
    } else if (warpTime > 4000) {
        hasWarped = false;
    }

    // Check for collisions with opponents
    const opponents = spacecrafts.filter(spacecraft =>
        spacecraft.planetIndex === me.planetIndex &&
        spacecraft.hasCharacter &&
        spacecraft.team !== me.team);

    for (const opponent of opponents) {
        // Calculate distance between player and opponent
        const d = dist(
            me.xGlobal + me.xLocal,
            me.yGlobal + me.yLocal,
            opponent.xGlobal + opponent.xLocal,
            opponent.yGlobal + opponent.yLocal
        );

        // If collision detected
        if (d < (me.diameter / 2 + opponent.diameter / 2)) {
            // Set collision timestamp
            me.lastCollisionTime = millis();
            // Exit function early - can't move after collision
            return;
        }
    }

    // Local movement (game area)
    let localOffX = 0;
    let localOffY = 0;
    const localSpeed = shared.spacecraftSpeed; // 9 or 3
    if (keyIsDown(70)) { localOffX = -localSpeed } // F
    if (keyIsDown(72)) { localOffX = localSpeed }  // H
    if (keyIsDown(84)) { localOffY = -localSpeed } // T
    if (keyIsDown(71)) { localOffY = localSpeed }  // G

    // Global movement (planet)
    const globalSpeed = shared.spacecraftSpeed; // 12 or 6
    let gOffX = 0, gOffY = 0;
    if (keyIsDown(65)) { gOffX = -globalSpeed } // A
    if (keyIsDown(68)) { gOffX = globalSpeed }  // D
    if (keyIsDown(87)) { gOffY = -globalSpeed } // W
    if (keyIsDown(83)) { gOffY = globalSpeed }  // S

    let xTemp = me.xLocal + localOffX;
    let yTemp = me.yLocal + localOffY;
    let newxGlobal = me.xGlobal + gOffX;
    let newyGlobal = me.yGlobal + gOffY;

    // Keep local position within screen bounds
    xTemp = constrain(xTemp, 0, GAME_AREA_WIDTH);
    yTemp = constrain(yTemp, 0, GAME_AREA_HEIGHT);

    // Keep global position within planet bounds
    newxGlobal = constrain(newxGlobal, 0, selectedPlanet.diameterPlanet);
    newyGlobal = constrain(newyGlobal, 0, selectedPlanet.diameterPlanet);

    if (selectedPlanet && selectedPlanet.onPlanet(xTemp + newxGlobal, yTemp + newyGlobal)) {
        me.xGlobal = newxGlobal;
        me.yGlobal = newyGlobal;
        me.xLocal = xTemp;
        me.yLocal = yTemp;
    }

    me.xMouse = mouseX - GAME_AREA_X;
    me.yMouse = mouseY - GAME_AREA_Y;

    //    console.log(me)
    //   console.log("me.xGlobal", me.xGlobal, "me.yGlobal", me.yGlobal);
    ///   console.log("me.xLocal", me.xLocal, "me.yLocal", me.yLocal);
}
function handleBulletMovement() {

    for (let i = me.bullets.length - 1; i >= 0; i--) {
        let bullet = me.bullets[i];
        let bulletVector = createVector(
            int(bullet.xMouseStart) - bullet.xStart,
            int(bullet.yMouseStart) - bullet.yStart,
        ).normalize();
        bullet.xLocal += bulletVector.x * parseInt(shared.bulletSpeed);
        bullet.yLocal += bulletVector.y * parseInt(shared.bulletSpeed);

        // Update global coordinates
        bullet.xGlobal += bulletVector.x * parseInt(shared.bulletSpeed);
        bullet.yGlobal += bulletVector.y * parseInt(shared.bulletSpeed);

        let xLocalTemp = bullet.xLocal - (me.xGlobal - bullet.xGlobal);
        let yLocalTemp = bullet.yLocal - (me.yGlobal - bullet.yGlobal);

        // Remove bullet if it's not on the screen seen from the spacecraft shooting it
        if (!selectedPlanet.onPlanet(bullet.xLocal + bullet.xGlobal, bullet.yLocal + bullet.yGlobal)

            || !onLocalScreenArea(xLocalTemp, yLocalTemp)) {
            me.bullets.splice(i, 1);
        }
    }
}
//===================================================
// STATE SYNCHRONIZATION
//===================================================

function updateLocalStateFromSharedList() {
    if (!shared.characterList || shared.characterList.length === 0) return;

    const myCharacterData = shared.characterList.find(c => c.instanceId === me.characterInstanceId);

    if (me.hasCharacter) {
        if (!myCharacterData || myCharacterData.status === 'lost') {
            // Character is now lost according to shared list
            console.log(`Client ${me.playerName}: Detected character ${me.characterInstanceId} lost via shared list.`);
            handlePlayerLoss();
        } else {
            // Sync local status based on shared status
            if (myCharacterData.status === 'available' && me.status !== 'available') {
                if (me.status === 'inBattle') { // Just finished a battle (won)
                    me.hasBattled = true; // Mark piece as having battled (visual indicator)
                    me.isRevealed = true; // Keep revealed after battle
                }
                me.status = 'available';
            } else if (myCharacterData.status === 'inBattle' && me.status !== 'inBattle') {
                me.status = 'inBattle';
                me.isRevealed = true; // Reveal during battle
            }

            // Ensure revealed in battle
            if (myCharacterData.status === 'inBattle') {
                me.isRevealed = true;
            }
        }
    }

    // --- Reset Hit Counts for Lost Opponents ---
    if (me.hits && me.hits.length > 0) {
        for (let playerId = 0; playerId < me.hits.length; playerId++) {
            // Skip self and skip if already zero
            if (playerId === me.playerNumber || me.hits[playerId] === 0) {
                continue;
            }

            // Only reset hit counts for players that are PERMANENTLY lost
            // This ensures that players in battle or temporarily without characters still maintain their hit count
            const playerIsPermanentlyLost = !shared.characterList.some(character =>
                character.takenByPlayerId === playerId &&
                !character.isPermanentlyLost
            );

            if (playerIsPermanentlyLost) {
                console.log(`Client ${me.playerName}: Resetting hits for player ${playerId} as they are permanently lost.`);
                me.hits[playerId] = 0;
            }
        }
    }
}

function handlePlayerLoss() {
    if (!me.hasCharacter) return;

    console.log(`Player ${me.playerName} processing loss of ${me.characterName} (${me.characterInstanceId}) locally.`);

    // Reset player state
    me.hasCharacter = false;
    me.characterId = null;
    me.characterRank = null;
    me.characterName = null;
    me.characterInstanceId = null;
    me.isRevealed = false;
    me.hasBattled = false;
    me.planetIndex = -1;
    me.status = 'lost'; // Intermediate status
    if (me.team === 'blue') {
        me.planetIndex = planetIndexBlue;
    } else {
        me.planetIndex = planetIndexGreen;
    }
}

function resetClientState() {
    console.log(`Client Resetting State for ${me.playerName || 'New Player'}...`);

    // Save important state to preserve
    let savedPlayerNumber = me.playerNumber;
    let savedPlayerName = me.playerName;
    let savedPlayerDisplayName = me.playerDisplayName;
    let savedTeam = me.team;
    let savedIsReady = me.isReady;

    // Reset player state jens
    Object.assign(me, {
        playerNumber: savedPlayerNumber,
        playerName: savedPlayerName,
        playerDisplayName: savedPlayerDisplayName,
        team: savedTeam,
        isReady: savedIsReady,
        characterId: null,
        characterRank: null,
        characterName: null,
        characterInstanceId: null,
        planetIndex: -1,
        hasCharacter: false,
        isRevealed: false,
        hasBattled: false,
        status: "available",
        hits: Array(15).fill(0),
    });

    message = "";

    // Reset UI elements
    if (!nameInput || !nameInput.elt) createNameInput();
    if (!chooseTeamBlueButton || !chooseTeamBlueButton.elt) createNameInput();
    if (!chooseTeamGreenButton || !chooseTeamGreenButton.elt) createNameInput();

    // Show/Hide UI based on player setup state
    if (me.isReady) {
        nameInput.hide();
        chooseTeamBlueButton.hide();
        chooseTeamGreenButton.hide();
    } else {
        nameInput.show();
        chooseTeamBlueButton.show();
        chooseTeamGreenButton.show();
    }

    console.log("Client state reset complete.");
}

//===================================================
// HOST FUNCTIONS
//===================================================

function handleHostDuties() {
    if (!partyIsHost()) return;

    shared.currentTime = millis();

    // Mark characters as permanently lost if their player disconnected
    handleDisconnectedPlayers();

    // Update shared.characterList 'takenBy' info
    updateCharacterAssignments();

    // State machine for game phases
    switch (shared.gameState) {
        case "GAME-SETUP":
            handleGameSetupHost();
            break;
        case "IN-GAME":

            if (!shared.coreCommandLost) {
                handleGameInProgressHost();
            }
            break;
        case "GAME-FINISHED":
            handleGameFinishedHost();
            break;
    }
}

// Add this function if not present:
function handleDisconnectedPlayers() {
    if (!shared.characterList) return;

    const connectedPlayerIds = new Set(guests.map(p => p.playerNumber));

    shared.characterList.forEach(character => {
        // Only process characters that are assigned and not already lost
        if (character.takenByPlayerId && !character.isPermanentlyLost) {
            if (!connectedPlayerIds.has(character.takenByPlayerId)) {
                character.isPermanentlyLost = true;
                character.takenByPlayerId = null;
                character.takenByPlayerName = null;
                character.status = 'lost';
                character.inBattleWithInstanceId = null;
                character.battleOutcomeResult = null;
                character.battleOpponentInfo = null;
                character.battleStartTime = null;
            }
        }
    });
}

function updateCharacterAssignments() {
    if (!shared.characterList) return;

    // Build map of current assignments
    let currentAssignments = new Map();
    guests.forEach(p => {
        if (p.hasCharacter && p.characterInstanceId) {
            currentAssignments.set(p.characterInstanceId, {
                name: p.playerDisplayName,
                playerNumber: p.playerNumber
            });
        }
    });

    // Update assignments in shared list
    shared.characterList.forEach(item => {
        if (!item.isPermanentlyLost) {
            const assignment = currentAssignments.get(item.instanceId);
            if (assignment) {
                if (item.takenByPlayerId !== assignment.playerNumber) {
                    item.takenByPlayerName = assignment.name;
                    item.takenByPlayerId = assignment.playerNumber;
                }
            } else if (item.takenByPlayerId !== null) {
                // Clear assignment if no longer owned
                item.takenByPlayerName = null;
                item.takenByPlayerId = null;
            }
        } else {
            // Ensure lost pieces have no owner
            if (item.takenByPlayerId !== null) {
                item.takenByPlayerName = null;
                item.takenByPlayerId = null;
            }
        }
    });
}

function handleGameSetupHost() {
    // Check if flags are selected
    let blueFlagSelected = shared.characterList.some(c => c.team === 'blue' && c.id === 'F' && c.takenByPlayerId !== null);
    let greenFlagSelected = shared.characterList.some(c => c.team === 'green' && c.id === 'F' && c.takenByPlayerId !== null);

    const conditionsMet = blueFlagSelected && greenFlagSelected;

    // Start countdown if conditions met
    if (conditionsMet && shared.gameStartTimerStartTime === null) {
        console.log("HOST: Both flags selected. Starting game start countdown timer.");
        shared.gameStartTimerStartTime = shared.currentTime;
        shared.gameStartTimerSeconds = Math.floor(GAME_TRANSITION_TIME / 1000); // Initialize with full seconds
    }

    // Cancel countdown if conditions no longer met
    if (!conditionsMet && shared.gameStartTimerStartTime !== null) {
        console.log("HOST: Flag selection condition no longer met. Cancelling game start countdown timer.");
        shared.gameStartTimerStartTime = null;
        shared.gameStartTimerSeconds = null; // Clear the seconds as well
    }

    // Update timer only if it's active
    if (shared.gameStartTimerStartTime !== null) {
        const elapsedSeconds = Math.floor((shared.currentTime - shared.gameStartTimerStartTime) / 1000);
        const remainingSeconds = Math.floor(GAME_TRANSITION_TIME / 1000) - elapsedSeconds;

        // Only update if it's a valid positive number and has changed
        if (remainingSeconds >= 0 && shared.gameStartTimerSeconds !== remainingSeconds) {
            shared.gameStartTimerSeconds = remainingSeconds;
        }

        // Start game when countdown finishes
        if (shared.currentTime - shared.gameStartTimerStartTime >= GAME_TRANSITION_TIME) {
            console.log("HOST: Game start timer finished. Starting game.");
            shared.gameState = "IN-GAME";
            shared.gameStartTimerStartTime = null; // Reset timer
            shared.gameStartTimerSeconds = null; // Clear the seconds too
        }
    }
}

function handleGameInProgressHost() {

    // Reset canon tower hits
    resetCanonTowerHitsForPlayersWithoutCharacters();

    // Move canon towers, bullets, check collisions and sync to shared object 
    updateCanonTowers()

    // Check for disconnected Core Command
    checkIfCoreCommandDisconnected()

    // Detect collisions and initiate battles
    detectCollisionsAndInitiateBattles();

    // Resolve battles after timer 
    resolveBattles();

    // Check win conditions
    checkWinConditions();
}

function updateCanonTowers() {
    if (!gameObjects || gameObjects.length === 0) return;

    // Only process canon logic if on planet 3

    gameObjects.forEach((canon, index) => {
        canon.move();
        const currentTime = millis();
        const selectedInterval = shared.canonTowerShootingInterval;
        // Check if selectedInterval is a valid number
        if (typeof selectedInterval === 'number') {
            if (currentTime - canon.lastShotTime > selectedInterval) {
                if (spacecrafts.length > 0) {
                    // Only target spacecrafts that are on planet 3
                    const spacecraftsOnPlanet3 = spacecrafts.filter(f => f.planetIndex === canon.planetIndex && f.hasCharacter);
                    if (spacecraftsOnPlanet3.length > 0) {
                        const nearestSpacecraft = canon.findNearestSpacecraft(spacecraftsOnPlanet3);

                        if (nearestSpacecraft) {
                            canon.shoot(nearestSpacecraft);
                            canon.lastShotTime = currentTime;
                        }
                    }
                }
            }
        } else {
            console.warn("Invalid shooting interval:", shootingIntervalSelect.value());
        }

        canon.moveBullets(); // Move bullets before drawing
        canon.checkCollisionsWithSpacecrafts();  // Add this line

        // Sync to shared state
        shared.gameObjects[index] = {
            ...shared.gameObjects[index],
            xGlobal: canon.xGlobal,
            yGlobal: canon.yGlobal,
            bullets: canon.bullets,
            angle: canon.angle,
            lastShotTime: canon.lastShotTime,
            hits: canon.hits,
        };
    });
    /*
        // Calculate total hits from canon towers for each player
        let totalCanonHits = Array(15).fill(0);
        gameObjects.forEach(canon => {
            for (let i = 0; i < totalCanonHits.length; i++) {
                totalCanonHits[i] += canon.hits[i];
            }
        });
        shared.canonTowerHits = totalCanonHits;
        */
    //jens 
}

function resetCanonTowerHitsForPlayersWithoutCharacters() {

    spacecrafts.forEach((spacecraft, index) => {

        if (!spacecraft.hasCharacter) {
            // Reset hits for players who have characters
            shared.canonTowerHits[spacecraft.playerNumber] = 0;
        }
    })
}

function checkIfCoreCommandDisconnected() {

    let blueFlagSelected = shared.characterList.some(c => c.team === 'blue' && c.id === 'F' && c.takenByPlayerId !== null);
    let greenFlagSelected = shared.characterList.some(c => c.team === 'green' && c.id === 'F' && c.takenByPlayerId !== null);

    if (!blueFlagSelected) {
        console.log(`HOST: GAME OVER! Green team wins as blue teams Core Command disconnected`);
        shared.winningTeam = 'green';
        shared.greenWins = (shared.greenWins || 0) + 1;
        shared.coreCommandDisconnected = true;
        shared.gameState = "GAME-FINISHED";
        return;
    }
    if (!greenFlagSelected) {
        console.log(`HOST: GAME OVER! Blue team wins as blue teams Core Command disconnected`);
        shared.winningTeam = 'blue';
        shared.blueWins = (shared.blueWins || 0) + 1;
        shared.coreCommandDisconnected = true;
        shared.gameState = "GAME-FINISHED";
        return;
    }
}

function detectCollisionsAndInitiateBattles() {

    // Only process available characters
    let activeCharacters = shared.characterList.filter(c =>
        c.takenByPlayerId !== null && c.status === 'available' && !c.isPermanentlyLost);

    // Check each pair of characters
    for (let i = 0; i < activeCharacters.length; i++) {
        let char1 = activeCharacters[i];
        let player1 = guests.find(p => p.playerNumber === char1.takenByPlayerId);
        //        let player1 = spacecrafts.find(p => p.playerNumber === char1.takenByPlayerId);

        if (!player1) {
            console.warn(`HOST: Player not found for active character ${char1.instanceId}`);
            continue;
        }

        // Check for loss due to hits ONLY if the character is currently 'available'
        // This prevents resetting the battle timer if already 'inBattle' waiting for resolution.
        if (char1.status === 'available') {
            let numberOfHits = numberOfTimesBeingHit(player1.playerNumber);

            if (numberOfHits >= 10) {
                const char1Def = CHARACTER_DEFINITIONS.find(c => c.id === char1.id);

                if (char1Def.isCoreCommand) {
                    console.log('flag hit too many times');
                    char1.battleOutcomeResult = 'You lost because you got hit by too many bullets!'
                    char1.status = 'noMoreLives';
                    char1.isPermanentlyLost = true;
                    char1.takenByPlayerId = null;
                    char1.takenByPlayerName = null;

                    // Clear battle fields
                    char1.inBattleWithInstanceId = null;
                    char1.battleOutcomeResult = null;
                    char1.battleOpponentInfo = null;
                    char1.battleStartTime = null;
                    return;
                }
                let char1Index = shared.characterList.findIndex(c => c.instanceId === char1.instanceId);

                if (char1Index === -1) {
                    console.error("HOST: Could not find character in shared list for hit limit loss!");
                    continue; // Skip this character
                }

                console.log(`HOST: Initiating 'lost by hits' battle state for ${char1.instanceId}`);
                shared.characterList[char1Index].status = 'inBattle'; // Set status to start resolution timer
                shared.characterList[char1Index].inBattleWithInstanceId = null; // No opponent
                shared.characterList[char1Index].battleOutcomeResult = 'You lost by being hit too many times'; // Set outcome message
                shared.characterList[char1Index].battleOpponentInfo = null; // No opponent info
                shared.characterList[char1Index].battleStartTime = millis(); // Set start time for resolution

                // Skip regular collision checks for this character this frame as it's now 'inBattle'
                continue; // Move to the next character in the outer loop
            }
        }

        // If the character wasn't lost by hits, proceed with collision checks
        for (let j = i + 1; j < activeCharacters.length; j++) {
            let char2 = activeCharacters[j];
            let player2 = guests.find(p => p.playerNumber === char2.takenByPlayerId);
            //            let player2 = spacecrafts.find(p => p.playerNumber === char2.takenByPlayerId);

            if (!player2) {
                console.warn(`HOST: Player not found for active character ${char2.instanceId}`);
                continue;
            }

            // Must be different teams
            if (player1.team === player2.team) continue;

            // Check collision distance using player positions
            let d = dist(player1.xGlobal + player1.xLocal, player1.yGlobal + player1.yLocal, player2.xGlobal + player2.xLocal, player2.yGlobal + player2.yLocal);
            if (d < (player1.size / 2 + player2.size / 2)) {
                //     console.log(`HOST: Collision detected between ${char1.instanceId} (${player1.playerName}) and ${char2.instanceId} (${player2.playerName}) at distance ${d.toFixed(2)}`);

                // Calculate battle outcome
                const outcome = calculateBattleOutcome(char1, char2);
                //    console.log(`HOST: Battle Outcome: ${char1.instanceId} (${outcome.char1Result}), ${char2.instanceId} (${outcome.char2Result})`);

                // Handle immediate game win (flag capture)
                if (outcome.gameWonByTeam && !outcome.coreCommandBattleDraw) {
                    //        console.log(`HOST: GAME OVER! Flag captured. Winner: ${outcome.gameWonByTeam} team by ${outcome.winningPlayerName}.`);
                    shared.gameState = "GAME-FINISHED";
                    shared.winningTeam = outcome.gameWonByTeam;
                    shared.winningPlayerName = outcome.winningPlayerName;

                    // Update statistics
                    if (shared.winningTeam === 'blue') {
                        shared.blueWins = (shared.blueWins || 0) + 1;
                    } else if (shared.winningTeam === 'green') {
                        shared.greenWins = (shared.greenWins || 0) + 1;
                    }
                    return;
                }
 
                // Find characters in shared list
                let char1Index = shared.characterList.findIndex(c => c.instanceId === char1.instanceId);
                let char2Index = shared.characterList.findIndex(c => c.instanceId === char2.instanceId);

                if (char1Index === -1 || char2Index === -1) {
                    console.error("HOST: Could not find battling characters in shared list!");
                    continue;
                }

                // Check for Core Command loss
                const char1IsFlag = CHARACTER_DEFINITIONS.find(c => c.id === char1.id)?.isCoreCommand;
                const char2IsFlag = CHARACTER_DEFINITIONS.find(c => c.id === char2.id)?.isCoreCommand;

                if (outcome.coreCommandBattleDraw ||
                    (char1IsFlag && outcome.char1Result !== 'won') ||
                    (char2IsFlag && outcome.char2Result !== 'won')) {

                    if (outcome.coreCommandBattleDraw) {
                        console.log("HOST: Core Command vs Core Command battle! Both lost.");
                    } else {
                        console.log("HOST: Core Command lost or drawn in battle!");
                    }
                    shared.coreCommandLost = true;
                }

                // Set up battle in shared list for char1
                shared.characterList[char1Index].status = 'inBattle';
                shared.characterList[char1Index].inBattleWithInstanceId = char2.instanceId;
                shared.characterList[char1Index].battleOutcomeResult = outcome.char1Result;
                // Include opponent player name
                shared.characterList[char1Index].battleOpponentInfo = { name: char2.name, rank: char2.rank, playerName: player2.playerDisplayName };
                shared.characterList[char1Index].battleStartTime = millis();

                // Set up battle in shared list for char2
                shared.characterList[char2Index].status = 'inBattle';
                shared.characterList[char2Index].inBattleWithInstanceId = char1.instanceId;
                shared.characterList[char2Index].battleOutcomeResult = outcome.char2Result;
                // Include opponent player name
                shared.characterList[char2Index].battleOpponentInfo = { name: char1.name, rank: char1.rank, playerName: player1.playerDisplayName };
                shared.characterList[char2Index].battleStartTime = millis();

                // Skip to next character
                break;
            }
        }
    }
}

function calculateBattleOutcome(char1, char2) {
    // Get character definitions
    const char1Def = CHARACTER_DEFINITIONS.find(c => c.id === char1.id);
    const char2Def = CHARACTER_DEFINITIONS.find(c => c.id === char2.id);

    // Initialize variables
    let gameWonByTeam = null;
    let winningPlayerName = null;
    let coreCommandBattleDraw = false;

    if (!char1Def || !char2Def) {
        console.error("HOST: Missing character definition during battle calculation!", char1.id, char2.id);
        return {
            char1Result: 'had draw in',
            char2Result: 'had draw in',
            gameWonByTeam,
            winningPlayerName,
            coreCommandBattleDraw
        };
    }

    let char1Result = 'pending';
    let char2Result = 'pending';

    // Handle Flag vs Flag specially
    if (char1Def.isCoreCommand && char2Def.isCoreCommand) {
        char1Result = 'had draw in';
        char2Result = 'had draw in';
        coreCommandBattleDraw = true;
    }
    // Handle Flag vs non-Flag
    else if (char1Def.isCoreCommand) {
        char1Result = 'lost';
        char2Result = 'won';
        gameWonByTeam = char2.team;
        winningPlayerName = char2.takenByPlayerName;
    }
    else if (char2Def.isCoreCommand) {
        char1Result = 'won';
        char2Result = 'lost';
        gameWonByTeam = char1.team;
        winningPlayerName = char1.takenByPlayerName;
    }
    // Handle special cases
    else if (char1Def.isEngineer && char2Def.isReconDrone) {
        char1Result = 'won';
        char2Result = 'lost';
    }
    else if (char1Def.isReconDrone && char2Def.isEngineer) {
        char1Result = 'lost';
        char2Result = 'won';
    }
    else if (char1Def.isReconDrone || char2Def.isReconDrone) {
        char1Result = 'had draw in';
        char2Result = 'had draw in';
    }
    else if (char1Def.isStealthSquad && char2Def.isStarCommand) {
        char1Result = 'won';
        char2Result = 'lost';
    }
    else if (char1Def.isStarCommand && char2Def.isStealthSquad) {
        char1Result = 'lost';
        char2Result = 'won';
    }
    // Standard rank comparison
    else if (char1.rank === char2.rank) {
        char1Result = 'had draw in';
        char2Result = 'had draw in';
    }
    else if (char1.rank > char2.rank) {
        char1Result = 'won';
        char2Result = 'lost';
    }
    else {
        char1Result = 'lost';
        char2Result = 'won';
    }

    return {
        char1Result,
        char2Result,
        gameWonByTeam,
        winningPlayerName,
        coreCommandBattleDraw
    };
}

function resolveBattles() {
    // Filter for characters truly in battle state
    let charactersInBattle = shared.characterList.filter(c => c.status === 'inBattle');
    let resolvedThisFrame = new Set();

    for (const charInBattle of charactersInBattle) {
        if (resolvedThisFrame.has(charInBattle.instanceId)) continue;

        // Check if battle timer is complete
        let readyToResolve = false;
        // Ensure battleStartTime is valid before checking timeout
        if (charInBattle.battleStartTime && (shared.currentTime - charInBattle.battleStartTime >= BATTLE_RESOLUTION_TIME)) {
            readyToResolve = true;
            console.log(`HOST: Resolution timer complete for ${charInBattle.instanceId}.`);
        }

        if (!readyToResolve) continue; // Skip if timer not finished

        // Find opponent (might be null if lost by hits)
        let opponentChar = charInBattle.inBattleWithInstanceId ?
            shared.characterList.find(c => c.instanceId === charInBattle.inBattleWithInstanceId) :
            null;

        // Handle case where opponent vanished (or was never there for 'lost by hits')
        if (charInBattle.inBattleWithInstanceId && !opponentChar) {
            console.warn(`HOST: Resolving ${charInBattle.instanceId}, but opponent ${charInBattle.inBattleWithInstanceId} not found or already resolved. Resetting character.`);

            //resetCanonTowerHits(charInBattle.inBattleWithInstanceId)
            // Reset character if opponent vanished unexpectedly
            charInBattle.status = 'available'; // Make available again
            // Clear all battle fields
            charInBattle.inBattleWithInstanceId = null;
            charInBattle.battleOutcomeResult = null;
            charInBattle.battleOpponentInfo = null;
            charInBattle.battleStartTime = null;
            resolvedThisFrame.add(charInBattle.instanceId);
            continue; // Move to the next character
        }

        console.log(`HOST: Resolving outcome for ${charInBattle.instanceId}`);

        // Resolve current character's state based on outcome
        if (charInBattle.battleOutcomeResult === 'won') {
            charInBattle.status = 'available'; // Winner becomes available
        } else { // loss, draw, or lost by hits
            //resetCanonTowerHits(charInBattle.takenByPlayerId)
            charInBattle.status = 'lost'; // Loser/Draw status is 'lost'
            // Mark as permanently lost for any non-winning outcome
            charInBattle.isPermanentlyLost = true;
            charInBattle.takenByPlayerId = null; // Remove owner
            charInBattle.takenByPlayerName = null;
        }

        // Always clear battle-related fields after resolution
        charInBattle.inBattleWithInstanceId = null;
        charInBattle.battleOutcomeResult = null;
        charInBattle.battleOpponentInfo = null;
        charInBattle.battleStartTime = null;

        resolvedThisFrame.add(charInBattle.instanceId); // Mark as resolved

        // Resolve opponent if they exist and were part of this battle
        if (opponentChar && opponentChar.status === 'inBattle' && opponentChar.inBattleWithInstanceId === charInBattle.instanceId) {
            console.log(`HOST: Resolving outcome for opponent ${opponentChar.instanceId}`);
            if (opponentChar.battleOutcomeResult === 'won') {
                opponentChar.status = 'available';
            } else { // loss, draw
                //resetCanonTowerHits()
                opponentChar.status = 'lost';
                opponentChar.isPermanentlyLost = true;
                opponentChar.takenByPlayerId = null;
                opponentChar.takenByPlayerName = null;

            }

            // Always clear opponent's battle fields jens
            opponentChar.inBattleWithInstanceId = null;
            opponentChar.battleOutcomeResult = null;
            opponentChar.battleOpponentInfo = null;
            opponentChar.battleStartTime = null;

            resolvedThisFrame.add(opponentChar.instanceId); // Mark opponent as resolved
            console.log(`HOST: Battle resolved. ${charInBattle.instanceId} status: ${charInBattle.status}, ${opponentChar.instanceId} status: ${opponentChar.status}`);

        } else if (opponentChar) {
            console.log(`HOST: Opponent ${opponentChar.instanceId} was not in battle with ${charInBattle.instanceId} during resolution or already resolved. Skipping opponent update.`);
        } else {
            // This case handles the 'lost by hits' scenario where opponentChar is null
            console.log(`HOST: 'Lost by hits' resolution complete for ${charInBattle.instanceId}. Status: ${charInBattle.status}`);
        }
    }
}

function resetCanonTowerHits(playerNumber) {
    // Reset hit counters for each individual tower
    if (gameObjects && gameObjects.length > 0) {
        gameObjects.forEach(tower => {
            tower.hits[playerNumber] = 0;
        });
    }

    // Also reset hit counters in shared gameObjects for clients
    if (shared.gameObjects && shared.gameObjects.length > 0) {
        shared.gameObjects.forEach(tower => {
            tower.hits[playerNumber] = 0;
        });
    }
}

function checkWinConditions() {
    if (shared.gameState !== "GAME-FINISHED") {
        let blueFlagExists = false;
        let greenFlagExists = false;

        // Check flags based on shared list status
        shared.characterList.forEach(c => {
            if (c.id === 'F' && !c.isPermanentlyLost && c.status !== 'lost') {
                if (c.team === 'blue') blueFlagExists = true;
                if (c.team === 'green') greenFlagExists = true;
            }
        });

        let newGameState = null;
        let newWinningTeam = null;
        shared.winningPlayerName = null;

        // Check win conditions
        if (!shared.coreCommandLost) { // Only check elimination if Core Command wasn't lost in battle
            if (!blueFlagExists && !greenFlagExists) {
                newGameState = "GAME-FINISHED";
                newWinningTeam = "draw";
                console.log("HOST: Both flags eliminated. Draw.");
            } else if (!blueFlagExists) {
                newGameState = "GAME-FINISHED";
                newWinningTeam = "green";
                console.log("HOST: Blue flag eliminated. Green wins.");
            } else if (!greenFlagExists) {
                newGameState = "GAME-FINISHED";
                newWinningTeam = "blue";
                console.log("HOST: Green flag eliminated. Blue wins.");
            }
        } else if (shared.coreCommandLost) {
            newGameState = "GAME-FINISHED";
            newWinningTeam = "draw";
            shared.winningPlayerName = "Both Core Commands Lost";
            console.log("HOST: Game ended due to Core Command loss/draw.");
        }

        // Update game state if changed
        if (newGameState && shared.gameState !== newGameState) {
            console.log(`HOST: Setting game state to ${newGameState}, Winning Team: ${newWinningTeam}, Winning Player: ${shared.winningPlayerName || 'N/A'}`);
            shared.gameState = newGameState;
            shared.winningTeam = newWinningTeam;

            // Update statistics
            if (newWinningTeam === 'blue') {
                shared.blueWins = (shared.blueWins || 0) + 1;
            } else if (newWinningTeam === 'green') {
                shared.greenWins = (shared.greenWins || 0) + 1;
            } else if (newWinningTeam === 'draw') {
                shared.draws = (shared.draws || 0) + 1;
            }
        }
    }
}

function handleGameFinishedHost() {
    // Start reset countdown if not started and reset isn't flagged
    if (shared.resetTimerStartTime === null && !shared.resetFlag) {
        console.log("HOST: Starting reset countdown timer.");
        shared.resetTimerStartTime = shared.currentTime;
        shared.resetTimerSeconds = Math.floor(GAME_TRANSITION_TIME / 1000); // Initialize with full seconds
    }

    // Update timer only if it's active
    if (shared.resetTimerStartTime !== null && !shared.resetFlag) {
        const elapsedSeconds = Math.floor((shared.currentTime - shared.resetTimerStartTime) / 1000);
        const remainingSeconds = Math.floor(GAME_TRANSITION_TIME / 1000) - elapsedSeconds;

        // Only update if it's a valid positive number and has changed
        if (remainingSeconds >= 0 && shared.resetTimerSeconds !== remainingSeconds) {
            shared.resetTimerSeconds = remainingSeconds;
        }

        // Trigger reset when countdown finishes
        if (shared.currentTime - shared.resetTimerStartTime >= GAME_TRANSITION_TIME && !shared.resetFlag) {
            console.log("HOST: Reset timer finished. Setting reset flag.");
            shared.resetFlag = true;
            shared.resetTimerStartTime = null;
            shared.resetTimerSeconds = null; // Clear the seconds too
        }
    }

    shared.resetTimerSeconds = Math.floor(GAME_TRANSITION_TIME / 1000) - Math.floor((shared.currentTime - shared.resetTimerStartTime) / 1000)

    // Process reset
    if (shared.resetFlag) {
        console.log("HOST: Processing reset flag...");
        shared.gameState = "GAME-SETUP";
        shared.winningTeam = null;
        shared.winningPlayerName = null;
        shared.coreCommandLost = false;
        shared.resetTimerStartTime = null;
        shared.canonTowerHits = Array(15).fill(0);

        // Reset hit counters for each individual tower
        if (gameObjects && gameObjects.length > 0) {
            gameObjects.forEach(tower => {
                tower.hits = Array(15).fill(0);
            });
        }

        // Also reset hit counters in shared gameObjects for clients
        if (shared.gameObjects && shared.gameObjects.length > 0) {
            shared.gameObjects.forEach(tower => {
                tower.hits = Array(15).fill(0);
            });
        }

        initializeCharacterList();

        // Clear reset flag after delay
        setTimeout(() => {
            if (partyIsHost()) {
                shared.resetFlag = false;
                console.log("HOST: Reset flag set back to false.");
            }
        }, 500);
    }
}

// Helper function to get planet color scheme
function getPlanetColorScheme(planetIndex) {
    if (planetColors.hasOwnProperty(planetIndex)) {
        return planetColors[planetIndex];
    }
    return {
        center: [50, 50, 50],
        edge: [120, 120, 120],
        name: "Unknown"
    };
}

// Helper function to draw a radial gradient with array colors instead of color() objects
function drawRadialGradient(x, y, diameter, colorCenterArray, colorEdgeArray) {

    if (shared.showBlurAndTintEffects) {
        push();
        noStroke();
        const radius = diameter / 2;
        const numSteps = 50; // More steps = smoother gradient

        for (let i = numSteps; i > 0; i--) {
            const step = i / numSteps;
            const currentRadius = radius * step;

            // Interpolate between the two colors using arrays instead of color objects
            const r = lerp(colorCenterArray[0], colorEdgeArray[0], 1 - step);
            const g = lerp(colorCenterArray[1], colorEdgeArray[1], 1 - step);
            const b = lerp(colorCenterArray[2], colorEdgeArray[2], 1 - step);

            fill(r, g, b);
            circle(x, y, currentRadius * 2);
        }
        pop();
    } else {
        // Fallback to a solid color if the effect is disabled
        fill(colorCenterArray[0], colorCenterArray[1], colorCenterArray[2]);
        circle(x, y, diameter);
    }
}
function checkBulletCollisions() {
    const opponents = spacecrafts.filter(spacecraft =>
        spacecraft.planetIndex === me.planetIndex &&
        spacecraft.hasCharacter &&
        spacecraft.team !== me.team);

    for (const opponent of opponents) {
        checkBulletCollision(opponent);
    }
}

function checkBulletCollision(spacecraft) {
    for (let i = me.bullets.length - 1; i >= 0; i--) {
        let bullet = me.bullets[i];

        // Calculate bullet's position relative to the spacecraft
        let bulletPosX = bullet.xLocal - (me.xGlobal - bullet.xGlobal);
        let bulletPosY = bullet.yLocal - (me.yGlobal - bullet.yGlobal);

        // Calculate spacecraft's position relative to the bullet
        let spacecraftPosX = spacecraft.xLocal - (me.xGlobal - spacecraft.xGlobal);
        let spacecraftPosY = spacecraft.yLocal - (me.yGlobal - spacecraft.yGlobal);

        let d = dist(spacecraftPosX, spacecraftPosY, bulletPosX, bulletPosY);

        if (d < (spacecraft.diameter / 2 + BULLET_DIAMETER / 2)) { // Adjusted to use spacecraft.diameter / 2
            me.hits[spacecraft.playerNumber]++;
            me.bullets.splice(i, 1);
        }
    }
}
function updateTowerCount() {
    gameObjects = generateTowers(shared.canonTowerCount);
    // Set planetIndex to 3 for all towers
    shared.gameObjects = gameObjects.map(tower => ({
        xGlobal: tower.xGlobal,
        yGlobal: tower.yGlobal,
        diameter: tower.diameter,
        color: tower.color,
        bullets: [],
        angle: 0,
        hits: Array(15).fill(0),
        planetIndex: 3, // Set to planet 3 specifically
        lastShotTime: 0,
        xSpawnGlobal: tower.xSpawnGlobal,
        ySpawnGlobal: tower.ySpawnGlobal,
    }));
}

function generateTowers(count) {
    const towers = [];

    // Table of predefined tower locations
    const towerTable = [
        { x: 1000, y: 1000, color: 'red' },
        { x: 1200, y: 1000, color: 'blue' },
        { x: 1400, y: 1000, color: 'green' },
        { x: 1600, y: 1000, color: 'orange' },
        { x: 1800, y: 1000, color: 'purple' },
        { x: 2000, y: 1000, color: 'yellow' },

        { x: 1000, y: 1200, color: 'red' },
        { x: 1200, y: 1200, color: 'blue' },
        { x: 1400, y: 1200, color: 'green' },
        { x: 1600, y: 1200, color: 'orange' },
        { x: 1800, y: 1200, color: 'purple' },
        { x: 2000, y: 1200, color: 'yellow' },

        { x: 1000, y: 1400, color: 'red' },
        { x: 1200, y: 1400, color: 'blue' },
        { x: 1400, y: 1400, color: 'green' },
        { x: 1600, y: 1400, color: 'orange' },
        { x: 1800, y: 1400, color: 'purple' },
        { x: 2000, y: 1400, color: 'yellow' },

        { x: 1000, y: 1600, color: 'red' },
        { x: 1200, y: 1600, color: 'blue' },
        { x: 1400, y: 1600, color: 'green' },
        { x: 1600, y: 1600, color: 'orange' },
        { x: 1800, y: 1600, color: 'purple' },
        { x: 2000, y: 1600, color: 'yellow' },
    ];

    // Add up to three towers from the table jens
    const numTowers = Math.min(count, towerTable.length);

    for (let i = 0; i < numTowers; i++) {
        const tower = towerTable[i];

        towers.push(new Canon({
            objectNumber: i,
            objectName: `canon${i}`,
            xGlobal: tower.x,
            yGlobal: tower.y,
            diameter: 60,
            xSpawnGlobal: tower.x,
            ySpawnGlobal: tower.y,
            color: tower.color,
            planetIndex: 3,
        }));
    }

    return towers;
}

function resolvePlayerNumberConflicts() {

    const conflictMessage = "Another player has the same playerNumber. Please refresh the browser window";

    if (playerWithTheSamePlayerNumberAsMeExist()) {
        // Only set the message if it's not already set to avoid flickering
        if (message !== conflictMessage) {
            message = conflictMessage;
        }
    } else {
        // Clear the message ONLY if it's the specific conflict message
        if (message === conflictMessage) {
            message = ""; // Clear the message
        }
    }
}
function playerWithTheSamePlayerNumberAsMeExist() {

    const playerNumbers = Array(guests.length).fill(0)
    guests.forEach(p => {
        playerNumbers[p.playerNumber]++
    });

    if (playerNumbers[me.playerNumber] > 1) {
        return true
    }
    return false
}
function twoPlayersWithTheSamePlayerNumberExist() {

    const playerNumbers = Array(guests.length).fill(0)
    guests.forEach(p => {
        playerNumbers[p.playerNumber]++
    });

    let twoPlayersWithTheSamePlayerNumber = false
    playerNumbers.forEach((count, index) => {
        if (count > 1) {
            twoPlayersWithTheSamePlayerNumber = true

        }
    });
    if (twoPlayersWithTheSamePlayerNumber) {
        return true
    }
    return false
}

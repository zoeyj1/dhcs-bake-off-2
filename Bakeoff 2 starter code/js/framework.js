// =========== configuration constants =========== 
// consts for sizes and grid divisions and such
const canvasSize = 600;
const gridDividers = 5;
const squareSizeMin = 4;
const squareSizeMax = 300;
const defaultSquareSize = 100;
const defaultSquarePosition = {
    location: { x: canvasSize / 2, y: canvasSize / 2 }, size: defaultSquareSize, rotation: 45
};
const closenessLimit = 10; // this is the threshhold for similarity between target and given state -- if they are closer than this, we re-roll the target.
// Trial configuration
const reportURL = "https://bakeoff-2-data.cmu-dhcs.workers.dev/";
const competitionNumberOfTasks = 10;
// =========== /end the constants ================ 
// A small helper randomness function.
function randomBetween(min, max) {
    return min + (Math.random() * (max - min));
}
// View manages the SVG itself. Each View instance has its own "box" and a gridded background. You should not be directly accessing this.
class View {
    constructor(parentDivID) {
        this.svg = SVG().addTo(parentDivID).size(canvasSize, canvasSize);
        this.grid = this.svg.group();
        this.grid.opacity(0.5);
        this.drawGrid();
        this.boxGroup = this.svg.group();
        this.box = this.boxGroup.rect(defaultSquareSize, defaultSquareSize);
        this.debugInfo = this.svg.group();
        this.setPosition(defaultSquarePosition);
    }
    getElements() {
        return { svg: this.svg, grid: this.grid, box: this.box };
    }
    // Draw grid lines recursively.
    drawGrid() {
        let divideInTwo = (leftedge, rightedge, whatToDo, depth) => {
            let center = (leftedge + rightedge) / 2;
            whatToDo(center, depth);
            if (depth > 0) {
                divideInTwo(leftedge, center, whatToDo, depth - 1);
                divideInTwo(center, rightedge, whatToDo, depth - 1);
            }
        };
        let drawHorizontal = (n, d) => {
            this.grid.line(0, n, canvasSize, n).stroke("#000000").opacity(d / gridDividers);
        };
        let drawVertical = (n, d) => {
            this.grid.line(n, 0, n, canvasSize).stroke("#000000").opacity(d / gridDividers);
        };
        divideInTwo(0, canvasSize, drawHorizontal, gridDividers);
        divideInTwo(0, canvasSize, drawVertical, gridDividers);
    }
    setPosition(position) {
        this.box.size(position.size);
        this.box.rotate(position.rotation);
        this.boxGroup.cx(position.location.x).cy(position.location.y);
    }
    getPosition() {
        let bounding = this.box.rbox(this.svg); // "rbox" is the "transformed" bounding box in coordinates relative to the function's argument (in this case, the overall svg drawing area) -- we can use this to get the actual location.
        let x = bounding.cx;
        let y = bounding.cy;
        let sizeBox = this.box.bbox(); // "bbox" is the "untransformed" bounding box; we can use this to get the actual size.
        let rotation = Math.round((Math.atan2(0 - this.box.node.getScreenCTM()["c"], this.box.node.getScreenCTM()["d"]) * 180 / (Math.PI))); // this hot mess is how we get the on-screen rotation, ugh
        return { location: { x, y }, size: sizeBox.width, rotation };
    }
    // a nicety for indicating the tasks are not currently ongoing
    hideBox() {
        this.boxGroup.opacity(0.25);
    }
    showBox() {
        this.boxGroup.opacity(1);
    }
    // a helper to draw bounding boxes around where we believe the box to be -- this can get screwy if transformations are stacked oddly. This will draw in its own box's info, the provided position info, and a line connecting their centers.
    showDebug(otherPos) {
        this.debugInfo.clear();
        let targetAligned = this.debugInfo.rect(otherPos.size, otherPos.size).stroke("#bd42c4").fill("none");
        targetAligned.center(otherPos.location.x, otherPos.location.y);
        targetAligned.rotate(otherPos.rotation);
        let selfPos = this.getPosition();
        let selfAligned = this.debugInfo.rect(selfPos.size, selfPos.size).stroke("#4fc442").fill("none");
        selfAligned.center(selfPos.location.x, selfPos.location.y);
        selfAligned.rotate(selfPos.rotation);
        let connectCenters = this.debugInfo.line(otherPos.location.x, otherPos.location.y, selfPos.location.x, selfPos.location.y).stroke({ width: 3, color: "#cccccc" }).fill("none");
    }
    hideDebug() {
        this.debugInfo.clear();
    }
}
class Trial {
    constructor(numberOfTasks, teamName, verbose) {
        this.tasks = [];
        this.live = false;
        this.taskNumber = 0;
        this.events = {};
        this.trialData = [];
        this.numberOfTasks = competitionNumberOfTasks;
        this.verbose = false;
        this.debug = false;
        console.log("%c DHCS S26 Section D Bakeoff 2 Judge v1 ", "color: black; padding:3px; border-radius:3px; font-size: 14px; font-weight: bold; background: linear-gradient(90deg, #B4EA5E 0%, #9CD18D 20%, #84B9BB 30%, #6CA0EA 45%, #9998E2 60%, #C78FDB 80%, #F487D3 100%);");
        this.numberOfTasks = numberOfTasks;
        this.teamName = teamName;
        if (teamName == "teamName" || typeof teamName == "undefined") {
            console.warn("You must supply a team name (and it shouldn't be 'teamName').");
        }
        if (typeof verbose !== "undefined")
            this.verbose = verbose;
        this.applicationArea = new View("#applicationArea");
        this.taskIndicator = new View("#taskIndicator");
        this.taskIndicator.hideBox();
        this.trialButton = document.getElementById("trialButton");
        this.trialButton.onclick = () => {
            this.toggle();
        };
        if (this.debug) {
            this.debugButton = document.createElement("button");
            document.getElementById("sidebar").appendChild(this.debugButton);
            this.debugButton.innerText = "Debug: show position boxes";
            this.debugButton.addEventListener("click", (e) => {
                this.showDebug();
            });
        }
        this.realTrialIndicator = document.getElementById("realTrial");
        this.saveDataIndicator = document.getElementById("saveData");
        this.startTime = Date.now();
    }
    // what happens when the start/stop button is pressed
    toggle() {
        if (this.verbose)
            console.log("starting");
        if (this.live == false) {
            this.start();
        }
        else
            this.stop();
    }
    // start a new trial
    start() {
        this.reset();
        this.live = true;
        this.call("start");
        document.body.classList.add("active");
        this.trialButton.innerText = "stop/reset";
        this.setNextTask();
    }
    // stop the trial
    stop() {
        this.live = false;
        this.call("stop");
        this.taskIndicator.hideBox();
        document.body.classList.remove("active");
        this.trialButton.innerText = "start trial";
    }
    // roll new tasks, clear out trackers
    reset() {
        this.tasks = this.makeTasks();
        this.trialData = [];
        this.taskNumber = 0;
        this.startTime = Date.now();
    }
    makeValidSquarePosition() {
        let size = randomBetween(squareSizeMin, squareSizeMax);
        let x = randomBetween(size, canvasSize - size);
        let y = randomBetween(size, canvasSize - size);
        let rotation = randomBetween(0, 360);
        return ({ location: { x: x, y: y }, size: size, rotation: rotation });
    }
    makeTasks() {
        let taskList = [];
        for (let i = 0; i < this.numberOfTasks; i++) {
            let task = {};
            let start = this.makeValidSquarePosition();
            let goal = this.makeValidSquarePosition();
            // if the positions are too close, re-roll
            while (Math.abs(start.location.x - goal.location.x) < closenessLimit && Math.abs(start.location.y - goal.location.y) < closenessLimit) {
                goal = this.makeValidSquarePosition();
            }
            taskList.push({ start: start, goal: goal });
        }
        return taskList;
    }
    timesplit() {
        let now = Date.now();
        let interval = now - this.startTime;
        this.startTime = now;
        return interval;
    }
    calculateTaskData() {
        let time = this.timesplit();
        let goal = this.taskIndicator.getPosition();
        let submitted = this.applicationArea.getPosition();
        let translateDifference = Math.hypot((goal.location.x - submitted.location.x), (goal.location.y - submitted.location.y)); // linear distance
        let distanceFactor = translateDifference / canvasSize;
        let scaleFactor = (Math.abs(submitted.size - goal.size) / goal.size); // difference in scale relative to goal size
        let startRot = (submitted.rotation + 360) % 90;
        let goalRot = (goal.rotation + 360) % 90;
        let angleDiff = Math.abs(startRot - goalRot);
        let rotationFactor = Math.min(angleDiff, Math.abs(angleDiff - 90)); // they're squares, so they can be at most 90° off
        return { time, goal, submitted, score: { distanceFactor, scaleFactor, rotationFactor } };
    }
    showDebug() {
        let goal = this.taskIndicator.getPosition();
        this.applicationArea.showDebug(goal);
        let submitted = this.applicationArea.getPosition();
        this.taskIndicator.showDebug(submitted);
    }
    recordTaskData() {
        let taskData = this.calculateTaskData();
        if (this.verbose)
            console.log(taskData);
        this.trialData.push(taskData);
    }
    setNextTask() {
        let task = this.tasks[this.taskNumber];
        this.taskIndicator.setPosition(task.goal);
        this.taskIndicator.showBox();
        this.applicationArea.hideDebug();
        this.taskIndicator.hideDebug();
        this.applicationArea.setPosition(task.start);
        this.call("newTask");
    }
    testOver() {
        this.call("testOver");
        if (this.realTrialIndicator.checked == true) {
            this.postToServer({ trialData: this.trialData, teamName: this.teamName });
        }
        if (this.saveDataIndicator.checked == true) {
            this.download({ trialData: this.trialData, teamName: this.teamName });
        }
        this.stop();
    }
    download(data) {
        let link = document.createElement('a');
        link.download = "trial_data_" + Date.now() + '.json';
        link.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        link.click();
        link.remove();
    }
    postToServer(data) {
        if (this.numberOfTasks !== competitionNumberOfTasks) {
            console.warn("Data is being sent to the server with the wrong numberOfTasks (" + this.numberOfTasks + " instead of " + competitionNumberOfTasks + ").");
        }
        if (this.teamName == "teamName") {
            alert("Data is being sent to the server with the default 'teamName' -- you must set a different teamName (in the \"new Trial(numberOfTasks, 'teamName', verbose)\" line) before the Bakeoff.");
        }
        if (this.verbose)
            console.log("Sending to server:", JSON.stringify(data));
        fetch(reportURL, {
            method: "POST",
            mode: "cors",
            headers: {
                'Accept': 'application/text',
                'Content-Type': "application/json"
            },
            body: JSON.stringify(data)
        })
            .then(response => {
            return response.text();
        })
            .then(text => {
            if (this.verbose)
                console.log("Received from server:", text);
        })
            .catch((error) => {
            console.error('Server error:', error);
        });
    }
    // call any registered event listener handlers
    call(eventName) {
        if (this.verbose)
            console.log("[judge event]: ", eventName);
        if (typeof this.events[eventName] !== "undefined") {
            this.events[eventName]();
        }
    }
    // ==================== Public functions =======================================
    // The below functions are the only ones that should be called from your code.
    // JS/TS doesn't really have public vs private functions, so this is on the honor system. :)
    // Does what it implies: gets the number (1-10) of the task we are currently on.
    getTaskNumber() {
        return this.taskNumber;
    }
    // retrieves the manipulable elements -- the overall svg, the background grid group, and the box of the applicationArea View.
    getElements() {
        return this.applicationArea.getElements();
    }
    // Tells the system to assess the position and move to the next task.
    submitPosition() {
        this.recordTaskData();
        this.taskNumber++; // move onto the next task
        if (this.taskNumber < this.tasks.length) { // if there's at least one task left
            this.setNextTask();
        }
        else { // if we're out of tasks
            this.testOver();
        }
    }
    //	Just like in the HTML DOM: use "addEventListener" to add a new listener for any of the judgeEvents. The available events are:
    //		"newTask" // a new task has begun
    //		"start" // a new trial has started
    //		"testOver" // we are out of tasks for this trial
    //		"stop"; // the trial has been stopped (e.g. with the stop button)
    addEventListener(eventName, callback) {
        this.events[eventName] = callback;
    }
}

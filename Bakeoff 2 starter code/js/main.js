// This constant sets the number of tasks per trial. You can change it while you are experimenting, but it should be set back to 10 for the actual Bakeoff.
const tasksLength = 10;


// Documentation on the main SVG.js library is here: https://svgjs.dev/docs/3.2
// Documentation on the "draggable" SVG.js plugin is here:
// https://github.com/svgdotjs/svg.draggable.js


// As before, we add our parts within a "load" event to make sure the HTML stuff has loaded first. 
window.addEventListener("load", (e) => {
    // =========== This part is required: =========== 
    // Initialize the "judge" object with the number of tasks per trial and your team name. 
    // The third parameter sets the trial engine in "verbose" mode or not -- if it is set to "true", all the events will be logged to the Console. (You may wish to set it to "false" if you find these logs overwhelming.)
    const trial = new Trial(tasksLength, "teamName", true);
    // You also need to add some way for the user to indicate they are done with their task. 
    // Whatever it is, it should call the trial.submitPosition() method.
    // Within the "trackpad + click" constraints, this can be whatever you want it to be (e.g. a button, some kind of swipe gesture, double-clicking on the square itself...). Consider what you've learned about Fitts's Law. :)
    // Here is a bare version, just using an HTML button:
    let submitButton = document.createElement("button");
    document.getElementById("applicationArea").appendChild(submitButton);
    submitButton.innerText = "yes, that looks good";
    submitButton.addEventListener("click", (e) => {
        trial.submitPosition();
    });
    // =========== /end required =========== 

    
    // ====== Getting the manipulable elements =============
    // Ask the trial engine for the stuff you can manipulate:
    let applicationElements = trial.getElements();
    // applicationElements.svg is the overall svg drawable area you can add things to:
    // Documentation is here: https://svgjs.dev/docs/3.2/container-elements/#svg-svg
    let svg = applicationElements.svg;
    // The main thing you are likely to want to do with it is adding new elements.
    // For example, if you wanted to add a new rectangle for a toolbox at the location 5,10 on the screen,
    // you could call: applicationElements.svg.rect(10, 10).move(5,10);
    // applicationElements.grid is the svg group containing the lines drawn in the background.
    let grid = applicationElements.grid;
    // You could add other background-y things to this group. You also may remove the grid lines with grid.clear() (but I can't personally think of a good reason why you would want to?).
    // And applicationElements.box is the box itself. :) You can change it with any of the things at https://svgjs.dev/docs/3.2/manipulating/
    let box = applicationElements.box;
    box.fill("#11eaea");

    
    // ====== Manipulating them =============
    // For example, you could add a button that just randomly re-sizes/positions the box:
    let randomnessButton = document.createElement("button");
    document.getElementById("applicationArea").appendChild(randomnessButton);
    randomnessButton.innerText = "go wild";
    randomnessButton.addEventListener("click", (e) => {
        // To change the box's size, I recommend box.size(), like this:
        let size = randomBetween(10, 100); // randomBetween function is provided by the framework, because I use it there myself
        box.size(size, size); // two arguments because the first is width and the second is height. But these are squares, so I repeat it.
        // (there is also box.scale(number), but it will change the local coordinates, affecting the translation/rotations as well)
        // For translation and rotation, I recommend box.transform(), https://svgjs.dev/docs/3.2/manipulating/#transforming:
        let rotation = randomBetween(0, 90);
        let position = { x: randomBetween(size, canvasSize - size), y: randomBetween(size, canvasSize - size) };
        box.transform({ rotate: rotation, position: position, origin: "center" });
        // ...and you do have to do both of them in the *same* transform() call. Otherwise, things get weird: if you do the rotation before the position, the position will be in the new, rotated coordinates; if you do the position before the rotation, the position overrides/re-sets the rotation.
    });

    
    // ====== SVG element events =============
    // You can also add event handlers to svg elements. The syntax is similar (but not identical, unfortunately) to the baseline HTML event handlers: https://svgjs.dev/docs/3.2/events/#element-on
    box.on("click", () => {
        console.log("I'm being clicked!");
    });

    
    // ====== Dragging elements =============
    // Because the "draggable" plugin is included, you can also set any svg element (shapee or group) to "draggable" -- this does exactly what you hope it does (i.e., it makes it so that you can click and drag the element). 
    // Documentation here: https://github.com/svgdotjs/svg.draggable.js ... but it really is just this:
    box.draggable();
    // Of course, once the box has been dragged, you might want to know its location (e.g. in case you want to move anything else along with it). In this example, I add a new rectangle to the svg drawing:
    let follower = svg.rect(10, 10).fill("none").stroke("#ff0000");
    // ...and then I update its location whenever the box is being dragged:
    box.on("dragmove", () => {
        let bounding = box.rbox(svg); // "rbox" is the bounding box in coordinates relative to the function's argument (in this case, the overall svg drawing area)
        follower.size(bounding.width, bounding.height); // .size changes the size of the rectangle, as we saw above
        follower.transform({ position: { x: bounding.cx, y: bounding.cy }, origin: "center" }); // "cx"/"cy" are the x and y positions of the center point of the shape
    });

    
    // ====== Trial engine events =============
    // The trial engine also has some events you can add handlers for:
    //	"newTask" // a new task has begun
    //	| "start" // a new trial has started
    //	| "testOver" // we are out of tasks for this trial
    //	| "stop"; // the trial has been stopped (e.g. with the stop button)
    // trial.on(eventName, callback) will allow you to register a callback (handler) to any of the above.
    trial.addEventListener("start", () => {
        console.log("starting!");
    });
    // Lastly, trial.getTaskNumber() will return the number (integer) of the current task
    trial.addEventListener("newTask", () => {
        console.log(trial.getTaskNumber());
    });
});

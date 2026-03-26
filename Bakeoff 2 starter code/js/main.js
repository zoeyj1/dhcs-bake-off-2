// This constant sets the number of tasks per trial.
const tasksLength = 10;


// Documentation on the main SVG.js library is here: https://svgjs.dev/docs/3.2
// Documentation on the "draggable" SVG.js plugin is here:
// https://github.com/svgdotjs/svg.draggable.js

window.addEventListener("load", (e) => {
    // =========== This part is required: =========== 
    // Initialize the "judge" object with the number of tasks per trial and your team name. 
    // The third parameter sets the trial engine in "verbose" mode or not -- if it is set to "true", all the events will be logged to the Console. (You may wish to set it to "false" if you find these logs overwhelming.)
    const trial = new Trial(tasksLength, "teamName", true);
    // You also need to add some way for the user to indicate they are done with their task. 
    // Whatever it is, it should call the trial.submitPosition() method.
    // Here is a bare version, just using an HTML button:
    let submitButton = document.createElement("button");
    document.getElementById("applicationArea").appendChild(submitButton);
    submitButton.innerText = "yes, that looks good";
    submitButton.addEventListener("click", (e) => {
        trial.submitPosition();
    });
    // =========== /end required =========== 

    
    // ====== Getting the manipulable elements =============
    let applicationElements = trial.getElements();
    // applicationElements.svg is the overall svg drawable area you can add things to:
    let svg = applicationElements.svg;
    // applicationElements.grid is the svg group containing the lines drawn in the background.
    let grid = applicationElements.grid;
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

  
    // ==== my shit below ;ok; ==== 

    let follower = svg.rect(0, 0).fill("none").stroke("#ff0000");
    let boolDraw = true;
    window.addEventListener("keydown", (e) => {
      if (e.key === "e") {
        boolDraw = !boolDraw;
        if (boolDraw) {
          	box.draggable(false);
            follower.size(0, 0);
            console.log("here drag false");
        } else {
          box.draggable(true);
          console.log("here drag true");
        }
      }
    });

    let instructions = svg.text(
        `How to play:
        1. click on one corner of the box
        2. click on an adjacent corner to the first corner
        3. hover mouse left or right to preview the to-be-drawn-box
        4. 3rd click to finalize the box
        5. press e to toggle between drawing and dragging (REMOVE THIS)`)
        .move(20, 20)        
        .fill('#000000');        
    instructions.front();

    let clickPoints = [];
    let dots = [];
    let line = null;
    svg.on("click", (e) => {
      const {x, y} = svg.point(e.clientX, e.clientY);
      if (!boolDraw) return;

      if (clickPoints.length === 0 && boolDraw) {
        box.size(0, 0);
        let dot = svg.circle(4).center(x, y).fill('#ff0000');
        dots.push(dot);
        clickPoints.push({x, y});
      } else if (clickPoints.length === 1 && boolDraw) {
        clickPoints.push({x, y});
        line = svg.line(clickPoints[0].x, clickPoints[0].y, clickPoints[1].x, clickPoints[1].y).stroke({ width: 2, color: '#3300ff' });
        box.fill('#11eaea').opacity(0.3);
        console.log(box);
      } else if (clickPoints.length === 2 && boolDraw){
          console.log(box);
          box.fill('#00ff2a').opacity(.8);

          line.remove();
          dots.forEach(dot => dot.remove());
          dots = [];
          clickPoints = []; 
          
      }
    });

    svg.on("mousemove", (e) => {
      if (clickPoints.length === 2 && box && boolDraw) {
        const dx = clickPoints[1].x - clickPoints[0].x;
        const dy = clickPoints[1].y - clickPoints[0].y;

        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        let sideLength = Math.sqrt(dx * dx + dy * dy);

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const val = (clickPoints[1].x - clickPoints[0].x) * (mouseY - clickPoints[0].y) - (mouseX - clickPoints[0].x) * (clickPoints[1].y - clickPoints[0].y);

        if (val > 0) {
            console.log("left???");
            box.size(sideLength, sideLength)
               .move(clickPoints[0].x, clickPoints[0].y)
               .transform({ rotate: angle, 
                            origin: [clickPoints[0].x, clickPoints[0].y] });
        } else if (val < 0) {
            console.log("right?");
            box.size(sideLength, sideLength)
               .move(clickPoints[0].x, clickPoints[0].y)
               .transform({ rotate: angle + 180 + 90, 
                            origin: [clickPoints[0].x, clickPoints[0].y]});
        } else {
            console.log("on line so left ok");
        }
        
      //   box.size(side, side)
      //     .center(pointCentre.x, pointCentre.y)
      //     .transform({ rotate: angle, origin: "center" });
      }
    });
    
    
    
  // ...and then I update its location whenever the box is being dragged:
    box.on("dragmove", () => {
      let bounding = box.rbox(svg); // "rbox" is the bounding box in coordinates relative to the function's argument (in this case, the overall svg drawing area)
      follower.size(bounding.width, bounding.height); // .size changes the size of the rectangle, as we saw above
      follower.transform({ position: { x: bounding.cx, y: bounding.cy }, origin: "center" }); // "cx"/"cy" are the x and y positions of the center point of the shape
    });
});

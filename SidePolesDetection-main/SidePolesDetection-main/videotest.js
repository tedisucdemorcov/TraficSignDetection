const Source_video = document.getElementById("video");
let canvas = document.getElementById("canvasOutput");

function startSource_Video() {
  Source_video.src = "triangle_detection.mp4";
  Source_video.play();
}

cv["onRuntimeInitialized"] = () => {
  let srcImage = new cv.Mat(
    Source_video.height,
    Source_video.width,
    cv.CV_8UC4
  );
  let cap = new cv.VideoCapture(Source_video);

  const FPS = 30;
  function processVideoAndDetectPoles() {
    let begin = Date.now();
    cap.read(srcImage);

    // Create a destination image
    let dstImage = new cv.Mat(srcImage.rows, srcImage.cols, srcImage.type());

    srcImage.copyTo(dstImage);

    // Call the function to detect poles
    detectPoles(srcImage, dstImage);

    cv.imshow(canvas, dstImage);

    // Calculate the delay for the next frame processing
    let delay = 1000 / FPS - (Date.now() - begin);
    setTimeout(processVideoAndDetectPoles, delay);

    // Clean up
    dstImage.delete();
  }

  // Make sure to delete srcImage when you're completely done with it, such as when the video ends

  setTimeout(processVideoAndDetectPoles, 0); // Call the renamed function
};

startSource_Video();

// This function will be responsible for processing each frame to detect poles.
function detectPoles(srcImage, dstImage) {
  let hsv = new cv.Mat();
  let mask = new cv.Mat();
  let gray = new cv.Mat();
  let blurred = new cv.Mat();
  let edges = new cv.Mat();
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();

  // Convert to grayscale
  cv.cvtColor(srcImage, gray, cv.COLOR_RGBA2GRAY, 0);

  // Convert to HSV and threshold for white colors
  cv.cvtColor(srcImage, hsv, cv.COLOR_RGBA2RGB);
  cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
  let lowerWhite = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [0, 50, 50, 255]);
  let upperWhite = new cv.Mat(
    hsv.rows,
    hsv.cols,
    hsv.type(),
    [10, 255, 255, 255]
  );

  // Create a mask that captures areas of the image that are white
  cv.inRange(hsv, lowerWhite, upperWhite, mask);

  // Optional: apply Gaussian blur to reduce noise and improve edge detection
  cv.GaussianBlur(mask, blurred, new cv.Size(5, 5), 1.5, 1.5);

  // Detect edges
  cv.Canny(blurred, edges, 75, 150, 3, false);

  // Find contours from the edge detection
  cv.findContours(
    edges,
    contours,
    hierarchy,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE
  );

  const rightEdgeThreshold = srcImage.cols * 0.75;
  const heightThreshold = srcImage.rows * 0.6;

  // Draw rectangles around the detected poles
  for (let i = 0; i < contours.size(); ++i) {
    let cnt = contours.get(i);
    let rect = cv.boundingRect(cnt);
    let aspectRatio = rect.width / rect.height;
    let approx = new cv.Mat();
    cv.approxPolyDP(cnt, approx, 0.07 * cv.arcLength(cnt, true), true);
    // console.log(approx);

    if (approx.rows === 3) {
      if (true || rect.x + rect.width > rightEdgeThreshold) {
        // Filter the contour by aspect ratio, area, width, and height
        // Adjust these values as needed for your specific case
        if (
          //   aspectRatio > 0 && // Poles are more vertical, so width should be smaller than height
          //   aspectRatio < 1.0 && // Adjust this as necessary
          rect.width > 1 && // Minimum width to avoid detecting very thin structures
          rect.height > 23 && // Minimum height to avoid detecting very short structures
          rect.height < 500
        ) {
          // Maximum height to avoid detecting very tall structures
          // Assume poles are relatively thin and tall compared to their width
          let color = new cv.Scalar(255, 255, 0, 255); // Color for the rectangle (Blue, Green, Red)
          cv.rectangle(
            dstImage,
            new cv.Point(rect.x, rect.y),
            new cv.Point(rect.x + rect.width, rect.y + rect.height),
            color,
            2 // Thickness of the rectangle lines
          );
          console.log(
            `Detected a pole with aspectRatio: ${aspectRatio}, width: ${rect.width}, height: ${rect.height}`
          );
          console.log("sum: " + (rect.y + rect.height));
          console.log("heightTreshold: " + heightThreshold);
        }
      }
    }
  }

  // Clean up
  hsv.delete();
  lowerWhite.delete();
  upperWhite.delete();
  mask.delete();
  gray.delete();
  blurred.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();
}

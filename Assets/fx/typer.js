// ─── Configuration ────────────────────────────────────────────────────────────
const words = ["Demystified", "Visualizer", "Simplified"]; // Words to cycle through
const el = document.getElementById("type"); // Target element (must exist in HTML)
const ANIMATION = "pop"; // CSS animation class name to trigger

// Early exit if element not found (robustness check)
if (!el || !words.length) {
  console.warn("Typer: Missing element or words array");
  throw new Error("Typer requires #type element and non-empty words array");
}

// ─── State ────────────────────────────────────────────────────────────────────
let wordIndex = 0; // Which word from the array we're on (0, 1, 2, ...)
let charIndex = 0; // How many characters of current word to show
let typing = true; // Are we typing (true) or deleting (false)?
let timeoutId = null; // Store timeout ID to prevent memory leaks

// ─── Animation trigger ─────────────────────────────────────────────────────────
function triggerAnimation() {
  // Remove the animation class to reset it
  el.classList.remove(ANIMATION);
  // Force the browser to recalculate styles (reflow) so the animation re-triggers
  void el.offsetWidth;
  // Re-add the animation class to start it fresh
  el.classList.add(ANIMATION);
}

// ─── Main loop ─────────────────────────────────────────────────────────────────
function loop() {
  // Get the current word we're typing
  const current = words[wordIndex];

  if (typing) {
    // TYPING: increase character count and show more of the word
    charIndex++;
    el.textContent = current.slice(0, charIndex);

    // Check if we've finished typing the entire word
    if (charIndex === current.length) {
      // Switch to delete mode
      typing = false;
      // Play animation when word is complete
      triggerAnimation();
      // Wait before starting to delete (pause time)
      timeoutId = setTimeout(loop, 1200);
      return;
    }
  } else {
    // DELETING: decrease character count and show less of the word
    charIndex--;
    el.textContent = current.slice(0, charIndex);

    // Check if we've deleted the entire word
    if (charIndex === 0) {
      // Prepare to type the next word
      typing = true;
      wordIndex = (wordIndex + 1) % words.length; // Loop back to start if at end
      triggerAnimation();
    }
  }

  // Schedule next iteration with random speed variation
  // Typing is slower (60-120ms), deleting is faster (30-60ms)
  const speed = typing ? 60 + Math.random() * 60 : 30 + Math.random() * 30;
  timeoutId = setTimeout(loop, speed);
}

// Start the animation
loop();

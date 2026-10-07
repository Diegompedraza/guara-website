// V38: Honor reduced-motion preferences for the decorative homepage video.
(function () {
  const video = document.querySelector(".hero-video");
  if (!video || !window.matchMedia) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function syncMotionPreference() {
    if (reducedMotion.matches) {
      video.pause();
      video.autoplay = false;
      video.removeAttribute("autoplay");
      video.preload = "none";
      video.load();
      return;
    }

    video.autoplay = true;
    video.setAttribute("autoplay", "");
    video.preload = "metadata";
    const play = video.play();
    if (play && play.catch) play.catch(() => {});
  }

  syncMotionPreference();
  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener("change", syncMotionPreference);
  } else {
    reducedMotion.addListener(syncMotionPreference);
  }
})();

var nextParticle = new NextParticle({
  image: document.all.logoImage,
  width: document.getElementById("logodiv").offsetWidth,
  height: document.getElementById("logodiv").offsetHeight,
});

var redraw = function () {
  nextParticle.particleGap = 3;
  nextParticle.noise = 4;
  nextParticle.mouseForce = 3;
  nextParticle.minWidth = nextParticle.size;
  nextParticle.minHeight = nextParticle.size;
  nextParticle.maxWidth = nextParticle.size;
  nextParticle.maxHeight = nextParticle.size;
  nextParticle.start();
};

window.addEventListener("load", function () {
  redraw();
});

function loco() {
    gsap.registerPlugin(ScrollTrigger);
  
    // Using Locomotive Scroll from Locomotive https://github.com/locomotivemtl/locomotive-scroll
  
    const locoScroll = new LocomotiveScroll({
      el: document.querySelector("#main"),
      smooth: true
    });
    // each time Locomotive Scroll updates, tell ScrollTrigger to update too (sync positioning)
    locoScroll.on("scroll", ScrollTrigger.update);
  
    // tell ScrollTrigger to use these proxy methods for the "#main" element since Locomotive Scroll is hijacking things
    ScrollTrigger.scrollerProxy("#main", {
      scrollTop(value) {
        return arguments.length ? locoScroll.scrollTo(value, 0, 0) : locoScroll.scroll.instance.scroll.y;
      }, // we don't have to define a scrollLeft because we're only scrolling vertically.
      getBoundingClientRect() {
        return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
      },
      // LocomotiveScroll handles things completely differently on mobile devices - it doesn't even transform the container at all! So to get the correct behavior and avoid jitters, we should pin things with position: fixed on mobile. We sense it by checking to see if there's a transform applied to the container (the LocomotiveScroll-controlled element).
      pinType: document.querySelector("#main").style.transform ? "transform" : "fixed"
    });
    // each time the window updates, we should refresh ScrollTrigger and then update LocomotiveScroll. 
    ScrollTrigger.addEventListener("refresh", () => locoScroll.update());
  
    // after everything is set up, refresh() ScrollTrigger and update LocomotiveScroll because padding may have been added for pinning, etc.
    ScrollTrigger.refresh();
  
  }
  loco();
  
  
  const canvas = document.querySelector("canvas");
  const context = canvas.getContext("2d");
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  
  window.addEventListener("resize", function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    render();
  });
  
  function files(index) {
    var data = `
    https://zelt.app/assets/img/home/hero/sequence/1.webp
  https://zelt.app/assets/img/home/hero/sequence/2.webp
  https://zelt.app/assets/img/home/hero/sequence/3.webp
  https://zelt.app/assets/img/home/hero/sequence/4.webp
  https://zelt.app/assets/img/home/hero/sequence/5.webp
  https://zelt.app/assets/img/home/hero/sequence/6.webp
  https://zelt.app/assets/img/home/hero/sequence/7.webp
  https://zelt.app/assets/img/home/hero/sequence/8.webp
  https://zelt.app/assets/img/home/hero/sequence/9.webp
  https://zelt.app/assets/img/home/hero/sequence/10.webp
  https://zelt.app/assets/img/home/hero/sequence/11.webp
  https://zelt.app/assets/img/home/hero/sequence/12.webp
  https://zelt.app/assets/img/home/hero/sequence/13.webp
  https://zelt.app/assets/img/home/hero/sequence/14.webp
  https://zelt.app/assets/img/home/hero/sequence/15.webp
  https://zelt.app/assets/img/home/hero/sequence/16.webp
  https://zelt.app/assets/img/home/hero/sequence/17.webp
  https://zelt.app/assets/img/home/hero/sequence/18.webp
  https://zelt.app/assets/img/home/hero/sequence/19.webp
  https://zelt.app/assets/img/home/hero/sequence/20.webp
  https://zelt.app/assets/img/home/hero/sequence/21.webp
  https://zelt.app/assets/img/home/hero/sequence/22.webp
  https://zelt.app/assets/img/home/hero/sequence/23.webp
  https://zelt.app/assets/img/home/hero/sequence/24.webp
  https://zelt.app/assets/img/home/hero/sequence/25.webp
  https://zelt.app/assets/img/home/hero/sequence/26.webp
  https://zelt.app/assets/img/home/hero/sequence/27.webp
  https://zelt.app/assets/img/home/hero/sequence/28.webp
  https://zelt.app/assets/img/home/hero/sequence/29.webp
  https://zelt.app/assets/img/home/hero/sequence/30.webp
  https://zelt.app/assets/img/home/hero/sequence/31.webp
  https://zelt.app/assets/img/home/hero/sequence/32.webp
  https://zelt.app/assets/img/home/hero/sequence/33.webp
  https://zelt.app/assets/img/home/hero/sequence/34.webp
  https://zelt.app/assets/img/home/hero/sequence/35.webp
  https://zelt.app/assets/img/home/hero/sequence/36.webp
  https://zelt.app/assets/img/home/hero/sequence/37.webp
  https://zelt.app/assets/img/home/hero/sequence/38.webp
  https://zelt.app/assets/img/home/hero/sequence/39.webp
  https://zelt.app/assets/img/home/hero/sequence/40.webp
  https://zelt.app/assets/img/home/hero/sequence/41.webp
  https://zelt.app/assets/img/home/hero/sequence/42.webp
  https://zelt.app/assets/img/home/hero/sequence/43.webp
  https://zelt.app/assets/img/home/hero/sequence/44.webp
  https://zelt.app/assets/img/home/hero/sequence/45.webp
  https://zelt.app/assets/img/home/hero/sequence/46.webp
  https://zelt.app/assets/img/home/hero/sequence/47.webp
  https://zelt.app/assets/img/home/hero/sequence/48.webp
  https://zelt.app/assets/img/home/hero/sequence/49.webp
  https://zelt.app/assets/img/home/hero/sequence/50.webp
  https://zelt.app/assets/img/home/hero/sequence/51.webp
  https://zelt.app/assets/img/home/hero/sequence/52.webp
  https://zelt.app/assets/img/home/hero/sequence/53.webp
  https://zelt.app/assets/img/home/hero/sequence/54.webp
  https://zelt.app/assets/img/home/hero/sequence/55.webp
  https://zelt.app/assets/img/home/hero/sequence/56.webp
  https://zelt.app/assets/img/home/hero/sequence/57.webp
  https://zelt.app/assets/img/home/hero/sequence/58.webp
  https://zelt.app/assets/img/home/hero/sequence/59.webp
  https://zelt.app/assets/img/home/hero/sequence/60.webp
  https://zelt.app/assets/img/home/hero/sequence/61.webp
  https://zelt.app/assets/img/home/hero/sequence/62.webp
  https://zelt.app/assets/img/home/hero/sequence/63.webp
  https://zelt.app/assets/img/home/hero/sequence/64.webp
  https://zelt.app/assets/img/home/hero/sequence/65.webp
  https://zelt.app/assets/img/home/hero/sequence/66.webp
  https://zelt.app/assets/img/home/hero/sequence/67.webp
  https://zelt.app/assets/img/home/hero/sequence/68.webp
  https://zelt.app/assets/img/home/hero/sequence/69.webp
  https://zelt.app/assets/img/home/hero/sequence/70.webp
  https://zelt.app/assets/img/home/hero/sequence/71.webp
  https://zelt.app/assets/img/home/hero/sequence/72.webp
  https://zelt.app/assets/img/home/hero/sequence/73.webp
  https://zelt.app/assets/img/home/hero/sequence/74.webp
  https://zelt.app/assets/img/home/hero/sequence/75.webp
  https://zelt.app/assets/img/home/hero/sequence/76.webp
  https://zelt.app/assets/img/home/hero/sequence/77.webp
  https://zelt.app/assets/img/home/hero/sequence/78.webp
  https://zelt.app/assets/img/home/hero/sequence/79.webp
  https://zelt.app/assets/img/home/hero/sequence/80.webp
  https://zelt.app/assets/img/home/hero/sequence/81.webp
  https://zelt.app/assets/img/home/hero/sequence/82.webp
  https://zelt.app/assets/img/home/hero/sequence/83.webp
  https://zelt.app/assets/img/home/hero/sequence/84.webp
  https://zelt.app/assets/img/home/hero/sequence/85.webp
  https://zelt.app/assets/img/home/hero/sequence/86.webp
  https://zelt.app/assets/img/home/hero/sequence/87.webp
  https://zelt.app/assets/img/home/hero/sequence/88.webp
  https://zelt.app/assets/img/home/hero/sequence/89.webp
  https://zelt.app/assets/img/home/hero/sequence/90.webp
  https://zelt.app/assets/img/home/hero/sequence/91.webp
  https://zelt.app/assets/img/home/hero/sequence/92.webp
  https://zelt.app/assets/img/home/hero/sequence/93.webp
  https://zelt.app/assets/img/home/hero/sequence/94.webp
  https://zelt.app/assets/img/home/hero/sequence/95.webp
  https://zelt.app/assets/img/home/hero/sequence/96.webp
  https://zelt.app/assets/img/home/hero/sequence/97.webp
  https://zelt.app/assets/img/home/hero/sequence/98.webp
  https://zelt.app/assets/img/home/hero/sequence/99.webp
  https://zelt.app/assets/img/home/hero/sequence/100.webp
  https://zelt.app/assets/img/home/hero/sequence/101.webp
  https://zelt.app/assets/img/home/hero/sequence/102.webp
  https://zelt.app/assets/img/home/hero/sequence/103.webp
  https://zelt.app/assets/img/home/hero/sequence/104.webp
  https://zelt.app/assets/img/home/hero/sequence/105.webp
  https://zelt.app/assets/img/home/hero/sequence/106.webp
  https://zelt.app/assets/img/home/hero/sequence/107.webp
  https://zelt.app/assets/img/home/hero/sequence/108.webp
  https://zelt.app/assets/img/home/hero/sequence/109.webp
  https://zelt.app/assets/img/home/hero/sequence/110.webp
  https://zelt.app/assets/img/home/hero/sequence/111.webp
  https://zelt.app/assets/img/home/hero/sequence/112.webp
  https://zelt.app/assets/img/home/hero/sequence/113.webp
  https://zelt.app/assets/img/home/hero/sequence/114.webp
  https://zelt.app/assets/img/home/hero/sequence/115.webp
  https://zelt.app/assets/img/home/hero/sequence/116.webp
  https://zelt.app/assets/img/home/hero/sequence/117.webp
  https://zelt.app/assets/img/home/hero/sequence/118.webp
   `;
    return data.split("\n")[index];
  }
  
  const frameCount = 118;
  
  
  const images = [];
  const imageSeq = {
    frame: 1,
  };
  
  for (let i = 0; i < frameCount; i++) {
    const img = new Image();
    img.src = files(i);
    images.push(img);
  }
  
  gsap.to(imageSeq, {
    frame: frameCount - 1,
    snap: "frame",
    ease: `none`,
    scrollTrigger: {
      scrub: 0.15,
      trigger: `#page>canvas`,
      start: `top top`,
      end: `300% top`,
      scroller: `#main`,
    },
    onUpdate: render,
  });
  
  images[1].onload = render;
  
  function render() {
    scaleImage(images[imageSeq.frame], context);
  }
  
  function scaleImage(img, ctx) {
    var canvas = ctx.canvas;
    var hRatio = canvas.width / img.width;
    var vRatio = canvas.height / img.height;
    var ratio = Math.max(hRatio, vRatio);
    var centerShift_x = (canvas.width - img.width * ratio) / 2;
    var centerShift_y = (canvas.height - img.height * ratio) / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      centerShift_x,
      centerShift_y,
      img.width * ratio,
      img.height * ratio
    );
  }
  ScrollTrigger.create({
    trigger: "#page>canvas",
    pin: true,
    // markers:true,
    scroller: `#main`,
    start: `top top`,
    end: `300% top`,
  });

  // Enhanced floating elements functionality
  function initializeFloatingElements() {
    // Generate fewer particles dynamically for page1 (lighter effect)
    const page1ParticleContainer = document.querySelector('#page1 .page1-particles');
    if (page1ParticleContainer) {
      for (let i = 0; i < 5; i++) {
        const particle = document.createElement('div');
        particle.className = 'page1-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        page1ParticleContainer.appendChild(particle);
      }
    }

    // Generate fewer particles dynamically for page4 (lighter effect)
    const page4ParticleContainer = document.querySelector('#page4 .page4-particles');
    if (page4ParticleContainer) {
      for (let i = 0; i < 5; i++) {
        const particle = document.createElement('div');
        particle.className = 'page4-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        page4ParticleContainer.appendChild(particle);
      }
    }

    // Add interactive hover effects for feature cards
    const featureCards = document.querySelectorAll('.page1-feature-card, .page4-feature-card');
    featureCards.forEach(card => {
      card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px) scale(1.02)';
        this.style.boxShadow = '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)';
      });

      card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
        this.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)';
      });
    });

    // Add scroll-triggered animations for pages
    if (typeof gsap !== 'undefined' && gsap.registerPlugin) {
      // Page1 animations
      gsap.fromTo("#page1 h1",
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          scrollTrigger: {
            trigger: "#page1",
            start: "top 80%",
            scroller: "#main"
          }
        }
      );

      gsap.fromTo("#page1 h4",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          delay: 0.3,
          scrollTrigger: {
            trigger: "#page1",
            start: "top 80%",
            scroller: "#main"
          }
        }
      );

      gsap.fromTo("#page1 .page1-features",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          delay: 0.6,
          scrollTrigger: {
            trigger: "#page1",
            start: "top 80%",
            scroller: "#main"
          }
        }
      );

      // Page4 animations
      gsap.fromTo("#page4 h1",
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          scrollTrigger: {
            trigger: "#page4",
            start: "top 80%",
            scroller: "#main"
          }
        }
      );

      gsap.fromTo("#page4 h4",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          delay: 0.3,
          scrollTrigger: {
            trigger: "#page4",
            start: "top 80%",
            scroller: "#main"
          }
        }
      );

      gsap.fromTo("#page4 .page4-features",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          delay: 0.6,
          scrollTrigger: {
            trigger: "#page4",
            start: "top 80%",
            scroller: "#main"
          }
        }
      );
    }
  }

  // Initialize floating elements when DOM is loaded
  document.addEventListener('DOMContentLoaded', initializeFloatingElements);

  // Also initialize after a short delay to ensure all elements are rendered
  setTimeout(initializeFloatingElements, 1000);

// Function to handle React app navigation
function openReactApp() {
  // Show loading indicator
  const button = document.querySelector('button[onclick="openReactApp()"]');
  const originalText = button ? button.textContent : 'GET STARTED';
  if (button) {
    button.textContent = 'LOADING...';
    button.disabled = true;
  }

  // Try multiple possible development server URLs
  const possibleUrls = [
    'http://localhost:5173/react-app.html',
    'http://localhost:5173/',
    'http://localhost:3000/',
    'http://localhost:4173/',
    'http://localhost:8080/'
  ];

  // Function to check if a URL is accessible
  function checkUrl(url) {
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        resolve(false);
      }, 2000); // 2 second timeout

      img.onload = img.onerror = () => {
        clearTimeout(timeout);
        resolve(true);
      };

      // Try to load a favicon or any small resource to test connectivity
      img.src = url + 'favicon.ico?' + Date.now();
    });
  }

  // Function to try each URL
  async function tryUrls(urls) {
    for (const url of urls) {
      try {
        const isAccessible = await checkUrl(url);
        if (isAccessible) {
          // Server is running, try to navigate to react-app.html
          const reactAppUrl = url.includes('react-app.html') ? url : url + (url.endsWith('/') ? '' : '/') + 'react-app.html';
          window.location.href = reactAppUrl;
          return true;
        }
      } catch (error) {
        console.log('Failed to connect to:', url);
        continue;
      }
    }
    return false;
  }

  // First try to detect if any dev server is running
  tryUrls(possibleUrls)
    .then(success => {
      if (!success) {
        // Reset button state
        if (button) {
          button.textContent = originalText;
          button.disabled = false;
        }

        // Show user-friendly error message
        showErrorMessage();
      }
    })
    .catch(() => {
      // Reset button state
      if (button) {
        button.textContent = originalText;
        button.disabled = false;
      }

      // Show user-friendly error message
      showErrorMessage();
    });
}

// Function to show error message to user
function showErrorMessage() {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #1e1e1e;
    color: #ffffff;
    padding: 40px;
    border-radius: 12px;
    max-width: 500px;
    margin: 20px;
    text-align: center;
    border: 1px solid #404040;
  `;

  modal.innerHTML = `
    <h2 style="margin: 0 0 20px 0; color: #0e639c;">🚀 Development Server Required</h2>
    <p style="margin: 0 0 20px 0; line-height: 1.6;">
      To access the ChainIDE React application, you need to start the development server first.
    </p>
    <div style="background: #2d2d2d; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
      <p style="margin: 0 0 10px 0; font-weight: bold;">Run these commands:</p>
      <code style="display: block; margin: 5px 0; font-family: monospace; color: #4ade80;">npm install</code>
      <code style="display: block; margin: 5px 0; font-family: monospace; color: #4ade80;">npm run dev</code>
    </div>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #969696;">
      The server will typically run on <strong>http://localhost:5173</strong>
    </p>
    <button id="closeModal" style="
      background: #0e639c;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      margin-right: 10px;
    ">Got it!</button>
    <button id="retryConnection" style="
      background: #16a34a;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
    ">Try Again</button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Add event listeners
  document.getElementById('closeModal').onclick = () => {
    document.body.removeChild(overlay);
  };

  document.getElementById('retryConnection').onclick = () => {
    document.body.removeChild(overlay);
    openReactApp();
  };

  // Close on overlay click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  };
}

// Make function globally available
window.openReactApp = openReactApp;
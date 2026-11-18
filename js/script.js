/* =====================================
   NAILS DESIGN
   NAVBAR, DROPDOWN & ACTIVE LINKS
===================================== */

document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".header");
  const navbar = document.querySelector(".navbar");
  const menuToggle = document.querySelector(".menu-toggle");

  const dropdown = document.querySelector(".nav-dropdown");
  const dropdownToggle = document.querySelector(".dropdown-toggle");

  const navLinks = document.querySelectorAll(".navbar a, .desktop-booking-btn");

  const sections = document.querySelectorAll("main section[id]");

  if (!header || !navbar) return;

  /* =====================================
       1. MOBILE MENU
    ===================================== */

  function closeMobileMenu() {
    navbar.classList.remove("menu-open");

    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Hap menune");
    }
  }

  function toggleMobileMenu() {
    const isOpen = navbar.classList.toggle("menu-open");

    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", String(isOpen));

      menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Mbyll menune" : "Hap menune",
      );
    }

    if (!isOpen) {
      closeDropdown();
    }
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      toggleMobileMenu();
    });
  }

  /* =====================================
       2. SERVICES DROPDOWN
    ===================================== */

  function closeDropdown() {
    if (!dropdown || !dropdownToggle) return;

    dropdown.classList.remove("open");

    dropdownToggle.setAttribute("aria-expanded", "false");
  }

  function toggleDropdown() {
    if (!dropdown || !dropdownToggle) return;

    const isOpen = dropdown.classList.toggle("open");

    dropdownToggle.setAttribute("aria-expanded", String(isOpen));
  }

  if (dropdownToggle) {
    dropdownToggle.addEventListener("click", () => {
      toggleDropdown();
    });
  }

  /* =====================================
       3. ACTIVE NAVIGATION
    ===================================== */

  function setActiveSection(sectionId) {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === "#" + sectionId;

      link.classList.toggle("active", isActive);
    });

    if (dropdownToggle) {
      dropdownToggle.classList.toggle("active", sectionId === "services");
    }
  }

  /* =====================================
       4. SMOOTH SCROLL
    ===================================== */

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");

      if (!targetId || !targetId.startsWith("#")) {
        return;
      }

      const target = document.getElementById(targetId.slice(1));

      if (!target) return;

      event.preventDefault();

      const headerHeight = header.offsetHeight;

      const targetPosition =
        target.getBoundingClientRect().top + window.scrollY - headerHeight;

      window.scrollTo({
        top: Math.max(0, targetPosition),
        behavior: "smooth",
      });

      setActiveSection(target.id);

      closeDropdown();
      closeMobileMenu();

      if (history.replaceState) {
        history.replaceState(null, "", targetId);
      }
    });
  });

  /* =====================================
       5. ACTIVE LINK ON SCROLL
    ===================================== */

  function updateActiveNavigation() {
    const scrollPosition = window.scrollY + header.offsetHeight + 30;

    let currentSection = "home";

    sections.forEach((section) => {
      if (section.offsetTop <= scrollPosition) {
        currentSection = section.id;
      }
    });

    if (
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 5
    ) {
      const lastSection = sections[sections.length - 1];

      if (lastSection) {
        currentSection = lastSection.id;
      }
    }

    setActiveSection(currentSection);
  }

  window.addEventListener("scroll", updateActiveNavigation, { passive: true });

  window.addEventListener("resize", () => {
    updateActiveNavigation();

    if (window.innerWidth > 900) {
      closeMobileMenu();
      closeDropdown();
    }
  });

  /* =====================================
       6. CLOSE MENUS OUTSIDE
    ===================================== */

  document.addEventListener("click", (event) => {
    if (dropdown && !dropdown.contains(event.target)) {
      closeDropdown();
    }

    if (
      menuToggle &&
      !navbar.contains(event.target) &&
      !menuToggle.contains(event.target)
    ) {
      closeMobileMenu();
    }
  });

  /* =====================================
       7. ESCAPE KEY
    ===================================== */

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDropdown();
      closeMobileMenu();
    }
  });

  updateActiveNavigation();
});

/* =====================================
   GALERIA INTERAKTIVE
===================================== */

document.addEventListener("DOMContentLoaded", () => {
  const galleryImages = document.querySelectorAll(".gallery-grid img");

  if (!galleryImages.length) return;

  let currentIndex = 0;

  /* Krijojme dritaren e fotografise */

  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";

  lightbox.innerHTML = `
        <button
            class="lightbox-close"
            type="button"
            aria-label="Mbyll"
        >
            &times;
        </button>

        <button
            class="lightbox-prev"
            type="button"
            aria-label="Fotografia paraprake"
        >
            &#10094;
        </button>

        <img
            class="lightbox-image"
            src=""
            alt=""
        >

        <button
            class="lightbox-next"
            type="button"
            aria-label="Fotografia tjeter"
        >
            &#10095;
        </button>
    `;

  document.body.appendChild(lightbox);

  const lightboxImage = lightbox.querySelector(".lightbox-image");

  const closeButton = lightbox.querySelector(".lightbox-close");

  const previousButton = lightbox.querySelector(".lightbox-prev");

  const nextButton = lightbox.querySelector(".lightbox-next");

  /* =====================================
       SHOW IMAGE
    ===================================== */

  function showImage(index) {
    currentIndex = (index + galleryImages.length) % galleryImages.length;

    lightboxImage.src = galleryImages[currentIndex].src;

    lightboxImage.alt = galleryImages[currentIndex].alt;
  }

  /* =====================================
       OPEN LIGHTBOX
    ===================================== */

  function openLightbox(index) {
    showImage(index);

    lightbox.classList.add("open");

    document.body.style.overflow = "hidden";
  }

  /* =====================================
       CLOSE LIGHTBOX
    ===================================== */

  function closeLightbox() {
    lightbox.classList.remove("open");

    document.body.style.overflow = "";
  }

  /* =====================================
       IMAGE CLICK
    ===================================== */

  galleryImages.forEach((image, index) => {
    image.addEventListener("click", () => {
      openLightbox(index);
    });
  });

  /* =====================================
       BUTTON EVENTS
    ===================================== */

  closeButton.addEventListener("click", closeLightbox);

  previousButton.addEventListener("click", () => {
    showImage(currentIndex - 1);
  });

  nextButton.addEventListener("click", () => {
    showImage(currentIndex + 1);
  });

  /* =====================================
       CLICK OUTSIDE IMAGE
    ===================================== */

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  /* =====================================
       KEYBOARD NAVIGATION
    ===================================== */

  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("open")) {
      return;
    }

    if (event.key === "Escape") {
      closeLightbox();
    }

    if (event.key === "ArrowRight") {
      showImage(currentIndex + 1);
    }

    if (event.key === "ArrowLeft") {
      showImage(currentIndex - 1);
    }
  });
});

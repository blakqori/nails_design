
document.addEventListener("DOMContentLoaded", () => {

    const header = document.querySelector(".header");
    const navLinks = document.querySelectorAll(".navbar a");

    const sections = document.querySelectorAll(
        "main section[id]"
    );

    if (!header || !navLinks.length) return;

    // Ndryshon butonin aktiv
    function setActiveSection(sectionId) {

        navLinks.forEach(link => {

            const isActive =
                link.getAttribute("href") === "#" + sectionId;

            link.classList.toggle("active", isActive);

        });
    }

    // Levizja kur klikojme ne menu
    navLinks.forEach(link => {

        link.addEventListener("click", (event) => {

            const targetId = link.getAttribute("href");
            const target = document.querySelector(targetId);

            if (!target) return;

            event.preventDefault();

            const headerHeight = header.offsetHeight;

            const targetPosition =
                target.getBoundingClientRect().top +
                window.scrollY -
                headerHeight;

            window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: "smooth"
            });

            setActiveSection(target.id);

        });

    });

    // Ndryshon menune aktive gjate scroll-it
    function updateActiveNavigation() {

        const scrollPosition =
            window.scrollY + header.offsetHeight + 30;

        let currentSection = "home";

        sections.forEach(section => {

            if (section.offsetTop <= scrollPosition) {
                currentSection = section.id;
            }

        });

        if (
            window.innerHeight + window.scrollY >=
            document.documentElement.scrollHeight - 5
        ) {
            currentSection = "contact";
        }

        setActiveSection(currentSection);
    }

    window.addEventListener(
        "scroll",
        updateActiveNavigation,
        { passive: true }
    );

    window.addEventListener(
        "resize",
        updateActiveNavigation
    );

    updateActiveNavigation();

});

/* =====================================
   GALERIA INTERAKTIVE
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    const galleryImages = document.querySelectorAll(
        ".gallery-grid img"
    );

    if (!galleryImages.length) return;

    let currentIndex = 0;

    // Krijojme dritaren e fotografise
    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";

    lightbox.innerHTML = `
        <button class="lightbox-close" aria-label="Mbyll">
            &times;
        </button>

        <button class="lightbox-prev" aria-label="Fotografia paraprake">
            &#10094;
        </button>

        <img class="lightbox-image" src="" alt="">

        <button class="lightbox-next" aria-label="Fotografia tjeter">
            &#10095;
        </button>
    `;

    document.body.appendChild(lightbox);

    const lightboxImage = lightbox.querySelector(
        ".lightbox-image"
    );

    function showImage(index) {
        currentIndex =
            (index + galleryImages.length) % galleryImages.length;

        lightboxImage.src = galleryImages[currentIndex].src;
        lightboxImage.alt = galleryImages[currentIndex].alt;
    }

    function openLightbox(index) {
        showImage(index);
        lightbox.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
        lightbox.classList.remove("open");
        document.body.style.overflow = "";
    }

    galleryImages.forEach((image, index) => {
        image.addEventListener("click", () => {
            openLightbox(index);
        });
    });

    lightbox.querySelector(".lightbox-close")
        .addEventListener("click", closeLightbox);

    lightbox.querySelector(".lightbox-prev")
        .addEventListener("click", () => {
            showImage(currentIndex - 1);
        });

    lightbox.querySelector(".lightbox-next")
        .addEventListener("click", () => {
            showImage(currentIndex + 1);
        });

    lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (!lightbox.classList.contains("open")) return;

        if (event.key === "Escape") closeLightbox();
        if (event.key === "ArrowRight") showImage(currentIndex + 1);
        if (event.key === "ArrowLeft") showImage(currentIndex - 1);
    });

});
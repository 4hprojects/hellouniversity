function createShareButtons(containerId) {
    const shareUrl = window.location.href; // Automatically gets the current page URL
    const shareTitle = document.querySelector('meta[property="og:title"]')?.content || document.title || "Check out this page!";
    const shareDescription = document.querySelector('meta[property="og:description"]')?.content || "A great blog post to read!";
    
    const platforms = [
        {
            name: "Facebook",
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
            class: "text-blue-600 hover:text-blue-800",
            icon: '<i class="fab fa-facebook-f"></i>',
            title: "Share on Facebook",
        },
        {
            name: "LinkedIn",
            url: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}&summary=${encodeURIComponent(shareDescription)}`,
            class: "text-blue-700 hover:text-blue-900",
            icon: '<i class="fab fa-linkedin-in"></i>',
            title: "Share on LinkedIn",
        },
        {
            name: "Twitter",
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
            class: "text-blue-500 hover:text-blue-700",
            icon: '<i class="fab fa-twitter"></i>',
            title: "Share on Twitter",
        },
        {
            name: "Copy Link",
            url: "#", // Handled via JavaScript
            class: "text-gray-600 hover:text-gray-800",
            icon: '<i class="fas fa-link"></i>',
            title: "Copy Link",
            action: function () {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    alert("Link copied to clipboard!");
                }).catch((err) => {
                    console.error("Failed to copy the link:", err);
                });
            },
        },
        {
            name: "Email",
            url: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=Check%20out%20this%20link:%20${encodeURIComponent(shareUrl)}`,
            class: "text-gray-600 hover:text-gray-800",
            icon: '<i class="fas fa-envelope"></i>',
            title: "Share via Email",
        },
    ];

    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID "${containerId}" not found.`);
        return;
    }

    platforms.forEach(platform => {
        const link = document.createElement("a");
        link.href = platform.url;
        link.target = "_blank";
        link.className = `${platform.class} text-2xl mx-2`;
        link.title = platform.title;
        link.innerHTML = platform.icon;

        // Add click behavior to copy the link to the clipboard
        link.addEventListener("click", (event) => {
            // Always copy the link on click
            navigator.clipboard.writeText(shareUrl).then(() => {
                console.log("Link copied to clipboard!");
            }).catch((err) => {
                console.error("Failed to copy the link:", err);
            });

            // Prevent default behavior for "Copy Link" action
            if (platform.action) {
                event.preventDefault(); // Prevent default navigation
                platform.action();
            }
        });

        container.appendChild(link);
    });
}

// Automatically initialize the share buttons
document.addEventListener("DOMContentLoaded", () => {
    const containerId = "share-buttons";
    if (document.getElementById(containerId)) {
        createShareButtons(containerId);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const blogPool = [
        {
            id: "ITQuizBee2025",
            title: "IT Quiz Bee 2025",
            link: "/events/itquizbee2025",
            date: "February 20, 2025",
            image: "/images/it114-lesson7-blog-python-for-loops.webp",
            description: "Test your IT knowledge! Join our 2025 IT quiz competition and challenge your classmates in a fun, interactive environment."
          },
          {
            id: "BYTeFunRun2025",
            title: "BYTe Fun Run 2025",
            link: "/events/2025bytefunruninfo",
            date: "February 28, 2025",
            image: "/images/events/pubmat2025BYTeFunRun.jpg",
            description: "Join the 2025 BYTe Fun Run to close IT Month with energy and community spirit. Choose between 5KM and 3KM routes showcasing BSU’s vibrant campus."
          }
          
    ];

    // 1. Latest / Random Blog Sections
    const latestBlogContainer = document.getElementById("latestBlogContainer");
    const randomBlogsContainer = document.getElementById("randomBlogsContainer");
    const numberOfBlogsToShow = 3;

    // Sort blogs by date (largest/newest date first)
    const sortedBlogs = blogPool.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestBlog = sortedBlogs[0];
    const randomBlogs = sortedBlogs.slice(1).sort(() => Math.random() - 0.5).slice(0, numberOfBlogsToShow);

    // Display the latest blog (if container exists)
    if (latestBlogContainer) {
        latestBlogContainer.innerHTML = `
            <img src="${latestBlog.image}" alt="${latestBlog.title}" class="w-full h-64 object-cover rounded-md mb-4">
            <h3 class="text-2xl font-semibold text-gray-800">
                <a href="${latestBlog.link}" class="text-blue-600 hover:underline">${latestBlog.title}</a>
            </h3>
            <p class="text-gray-600 text-sm">Published on: <span class="font-medium">${latestBlog.date}</span></p>
            <p class="text-gray-600 mt-2">${latestBlog.description}</p>
            <a href="${latestBlog.link}" class="text-blue-500 mt-4 inline-block hover:underline">Read More</a>
        `;
    }

    // Display random blogs (if container exists)
    if (randomBlogsContainer) {
        randomBlogs.forEach(blog => {
            const blogCard = document.createElement("div");
            blogCard.className = "bg-white p-6 rounded-lg shadow-md";

            blogCard.innerHTML = `
                <img src="${blog.image}" alt="${blog.title}" class="w-full h-40 object-cover rounded-md mb-4">
                <h3 class="text-xl font-semibold text-gray-800">
                    <a href="${blog.link}" class="text-blue-600 hover:underline">${blog.title}</a>
                </h3>
                <p class="text-gray-600 text-sm">Published on: <span class="font-medium">${blog.date}</span></p>
                <p class="text-gray-600 mt-2">${blog.description}</p>
                <a href="${blog.link}" class="text-blue-500 mt-4 inline-block hover:underline">Read More</a>
            `;

            randomBlogsContainer.appendChild(blogCard);
        });
    }

    // 2. Blog Navigation (Previous / Next)
    const currentBlogId = document.body.getAttribute("data-blog-id"); // e.g., "blog7"
    if (!currentBlogId) {
    console.error("No valid blog ID provided in data-blog-id.");
    return;
}
    const currentIndex = sortedBlogs.findIndex(blog => blog.id === currentBlogId);

    // If the blog ID is recognized (currentIndex >= 0), build nav
    if (currentIndex !== -1) {
        // Looping logic:
        const prevIndex = (currentIndex + 1) % sortedBlogs.length;
        const nextIndex = (currentIndex - 1 + sortedBlogs.length) % sortedBlogs.length;

        const prevBlog = sortedBlogs[prevIndex];
        const nextBlog = sortedBlogs[nextIndex];

        const navContainer = document.getElementById("blogNav");
        if (navContainer) {
            navContainer.innerHTML = `
            <div class="mt-6 flex justify-center space-x-4">
                <a
                    href="${prevBlog.link}"
                    class="text-white bg-blue-600 px-4 py-2 rounded-md text-sm text-center hover:bg-blue-700"
                >
                    Previous: ${prevBlog.title}
                </a>
                <a
                    href="/blog"
                    class="text-white bg-green-700 px-4 py-2 rounded-md text-sm text-center hover:bg-green-800"
                >
                    Check Other Blogs
                </a>
                <a
                    href="${nextBlog.link}"
                    class="text-white bg-blue-600 px-4 py-2 rounded-md text-sm text-center hover:bg-blue-700"
                >
                    Next: ${nextBlog.title}
                </a>
            </div>

            `;
        }
    } else {
        // Optional: console error if data-blog-id doesn't match
        console.error("No matching blog for data-blog-id:", currentBlogId);
    }
});

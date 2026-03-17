document.addEventListener("DOMContentLoaded", () => {
const latestBlogContainer = document.getElementById("latestBlogContainer");

    const blogPool = [

        // mini lessons
        {
            id: "recursive-algorithms",
            title: "Recursive Algorithms: Code That Calls Itself",
            date: "August 4, 2025",
            image: "https://images.unsplash.com/photo-1719777114494-cdc1373bad72?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            link: "/lessons/mini/recursion.html",
            description: "Master recursive algorithms with this comprehensive guide. Learn recursion fundamentals, types, practical examples, and when to use recursion vs iteration. Essential for developers."
        },
        {
            id: "dsa-linear-vs-non-linear-20251020",
            title: "Linear Data Structure vs Non-Linear Data Structure — Definitions, Use Cases, Big-O",
            date: "October 20, 2025",
            image: "/images/mst24lesson1-towfiqu-barbhuiya-oZuBNC-6E2s-unsplash.webp",
            link: "/lessons/dsalgo/dsalgo-lesson6",
            description: "Clear, practical guide to arrays, lists, stacks, queues, trees, and graphs. When to use each, with quick Big-O, a decision checklist, and Java/Python/JS snippets."
        },
        // mst24 lessons
        {
            id: "mst24-lesson1",
            title: "Understanding Information Technology",
            date: "January 10, 2025",
            image: "/images/mst24lesson1-towfiqu-barbhuiya-oZuBNC-6E2s-unsplash.webp",
            link: "/lessons/mst24/mst24-lesson1.html",
            description: "Gain a solid foundation in Information Technology (IT). Explore core concepts, IT infrastructure, networking, cybersecurity, and the impact of IT in business, education, and society. Learn how IT drives innovation and digital transformation."
        }, 
        {
            id: "mst24-lesson2",
            title: "History of Computers: From Abacus to AI",
            date: "January 8, 2025",
            image: "/images/mst24-lesson2/intro.png",
            link: "/lessons/mst24/mst24-lesson2.html",
            description: "Explore the evolution of computing, from ancient counting tools like the abacus to modern artificial intelligence. Discover key milestones, visionary pioneers like Charles Babbage and Alan Turing, and the impact of computing on today's digital world."
        },
        {
            id: "mst24-lesson3",
            title: "Essential Guide to Computer Hardware",
            date: "January 22, 2025",
            image: "/images/blog17nathan-anderson-xV3CHzfhkjE-unsplash.webp",
            link: "/lessons/mst24/mst24-lesson3.html",
            description: "Discover the basics of computer hardware, including CPUs, motherboards, storage devices, and expert troubleshooting tips."
        },         
        {
            id: "mst24-lesson4",
            title: "Computer Software",
            date: "January 21, 2025",
            image: "/images/blog16software-behind-every-click.webp",
            link: "/lessons/mst24/mst24-lesson4.html",
            description: "Discover software's role, types, and functions shaping our world. Explore operating systems, applications, and tools driving innovation."
        },  
        {
            id: "mst24-lesson5",
            title: "The Internet and the World Wide Web",
            date: "January 23, 2025",
            image: "/images/mst24-lesson5-leon-seibert-2m71l9fA6mg-unsplash.webp",
            link: "/lessons/mst24/mst24-lesson5.html",
            description: "Explore the Internet and the World Wide Web: their history, infrastructure, and tools like web browsers and search engines. Learn how these technologies shape modern life and discover actionable insights to improve your online interactions."
        }, 
        {
            id: "mst24-lesson6",
            title: "Cybersecurity",
            date: "January 26, 2025",
            image: "/images/mst24lesson6-cybersecurity.webp",
            link: "/lessons/mst24/mst24-lesson6.html",
            description: "Learn key cybersecurity practices, understand common threats, and discover actionable strategies to protect your digital footprint. This article explores the evolution of cybersecurity, its critical importance, and how to stay safe in an ever-connected world."
        },  
        {
            id: "mst24-lesson7",
            title: "Social Media in the Modern World",
            date: "January 31, 2025",
            image: "/images/mst24lesson7-socialmedia.webp",
            link: "/lessons/mst24/mst24-lesson7.html",
            description: "Discover the evolution of social media, its impact on society, privacy concerns, and ethical considerations. Learn how online communities, user-generated content, and digital technology shape communication, business, and global interactions."
        },
        {
            id: "mst24-lesson8",
            title: "Artificial Intelligence",
            date: "February 4, 2025",
            image: "/images/mst24-lesson8-ai-concept.webp",
            link: "/lessons/mst24/mst24-lesson8.html",
            description: "Discover the fundamentals of Artificial Intelligence, including Machine Learning, Deep Learning, and AI applications in daily life. Learn about AI ethics, automation, and the future of AI in business, healthcare, and technology."
        },
        {
            id: "mst24-lesson9",
            title: "Cloud Computing",
            date: "February 12, 2025",
            image: "/images/mst24lesson9-cloudcomputing.webp",
            link: "/lessons/mst24/mst24-lesson9.html",
            description: "Discover the fundamentals of cloud computing, including its benefits, service models (IaaS, PaaS, SaaS, FaaS), and real-world applications. Learn how cloud services power modern businesses and enhance technology efficiency."
        },      
        {
            id: "mst24-lesson10",
            title: "E-commerce Fundamentals",
            date: "February 13, 2025",
            image: "/images/mst24lesson10-ecommerce.webp",
            link: "/lessons/mst24/mst24-lesson10.html",
            description: "Dive into the world of e-commerce, exploring various business models, the integration of AI and automation, and emerging trends shaping the future of online retail. Learn how businesses can adapt to the evolving digital marketplace."
        },   
        {
            id: "mst24-lesson11",
            title: "Telecommunications",
            date: "February 14, 2025",
            image: "/images/mst24lesson11-telecommunication.webp",
            link: "/lessons/mst24/mst24-lesson11.html",
            description: "Discover how telecommunications networks, mobile networks, VOIP, and 5G technology are transforming global communication. Explore the evolution, impact, and future of the telecommunications industry, including the latest innovations and challenges."
        },
        {
            id: "mst24-lesson12",
            title: "The Gig Economy",
            date: "February 14, 2025",
            image: "/images/mst24lesson12-thegigeconomy.webp",
            link: "/lessons/mst24/mst24-lesson12.html",
            description: "Discover how the gig economy is transforming work. Learn about freelancing, gig platforms, financial planning, skill development, and the key strategies to thrive as an independent contractor or remote worker."
        }, 
        {
            id: "mst24-lesson13-1",
            title: "Introduction to Office Suites",
            date: "March 13, 2025",
            image: "/images/mst24/lesson13/office-suites-intro.webp",
            link: "/lessons/mst24/mst24-lesson13-1.html",
            description: "Explore the fundamentals of office suites, their evolution, and how they enhance productivity. Learn about Microsoft Office, Google Workspace, LibreOffice, and more."
        },
        {
            id: "mst24-lesson13-2",
            title: "Google Workspace",
            date: "March 14, 2025",
            image: "/images/mst24/lesson13/lesson13-2.webp",
            link: "/lessons/mst24/mst24-lesson13-2.html",
            description: "Explore how Google Workspace enhances productivity through cloud-based collaboration, AI-powered tools, and seamless integrations. Compare it with Microsoft 365 and discover its business benefits."
        },
        {
            id: "mst24-lesson13-3",
            title: "Gmail",
            date: "March 22, 2025",
            image: "/images/mst24/lesson13/lesson13-3.webp",
            link: "/lessons/mst24/mst24-lesson13-3.html",
            description: "Learn how to master Gmail with this comprehensive guide. Explore Gmail's user interface, email etiquette, and productivity tips to streamline your communication and boost efficiency."
        },
        {
            id: "mst24-lesson13-4",
            title: "Google Drive",
            date: "2025-03-25",
            image: "/images/mst24/lesson13/google-drive-hero.webp",
            link: "/lessons/mst24/mst24-lesson13-4.html",
            description: "Learn to leverage Google Drive's full potential - from file sharing to real-time collaboration. Discover interface tips, advanced sharing controls, and productivity hacks for professionals."
        },
        {
            id: "mst24-lesson13-5",
            title: "Google Docs",
            date: "2025-03-26",
            image: "/images/mst24/lesson13/google-docs-collaboration.webp",
            link: "/lessons/mst24/mst24-lesson13-5.html",
            description: "Learn professional Google Docs workflows including version control, security settings, and collaboration best practices for teams. Discover hidden features that save 5+ hours weekly."
        },
        {
            id: "mst24-lesson13-6",
            title: "Google Sheets",
            date: "March 31, 2025",
            image: "/images/mst24/lesson13/google-sheets-dashboard.webp",
            link: "/lessons/mst24/mst24-lesson13-6.html",
            description: "Boost your Google Sheets skills with essential formulas, formatting tips, and productivity hacks. Learn how to analyze and visualize data like a pro."
        },  
        {
            id: "mst24-lesson13-7",
            title: "Google Slides",
            date: "March 31, 2025",
            image: "/images/mst24/lesson13/google-slides-dashboard.webp",
            link: "/lessons/mst24/mst24-lesson13-7.html",
            description: "Transform your presentations with professional Google Slides techniques - learn visual hierarchy, real-time collaboration, and advanced design features to create impactful slides."
        },
        {
            id: "mst24-lesson13-8",
            title: "Google Forms",
            date: "April 1, 2025",
            image: "/images/mst24/lesson13/google-forms-dashboard.webp",
            link: "/lessons/mst24/mst24-lesson13-8.html",
            description: "Learn professional Google Forms techniques - from basic surveys to advanced features like conditional logic and GDPR compliance. Includes templates, question type guides, and data analysis tips."
        },
        {
            id: "mst24-lesson13-9",
            title: "Google Gemini",
            date: "April 10, 2025",
            image: "/images/mst24/lesson13/google-gemini-ai.png",
            link: "/lessons/mst24/mst24-lesson13-9.html",
            description: "Comprehensive guide to Google Gemini: Learn to leverage Google's advanced AI for content creation, research automation, and productivity enhancement."
        },

        // the way of the shepherd
        {
            id: "principle5",
            title: "The Staff of Direction: How Great Leaders Guide Their Teams (Principle 5 of The Way of the Shepherd)",
            date: "March 27, 2025",
            image: "/images/twots/principle5.webp",
            link: "/books/the-way-of-the-shepherd/principle5.html",
            description: "Master the biblical art of leadership direction with the Staff of Direction. Learn how to guide teams like a shepherd—setting clear paths, gentle correction, and protection—just as taught in The Way of the Shepherd. Includes actionable strategies and modern parallels."
        },
        {
            id: "principle4",
            title: "Help Your Sheep Identify with You",
            date: "March 22, 2025",
            image: "/images/twots/principle4.webp",
            link: "/books/the-way-of-the-shepherd/principle4.html",
            description: "Discover how to create a safe workplace environment with Principle #4 from 'The Way of the Shepherd.' Learn actionable strategies to foster trust, boost productivity, and ensure employee well-being."
        },
        {
            id: "principle3",
            title: "Help Your Sheep Identify with You",
            date: "March 13, 2025",
            image: "/images/twots/principle3.webp",
            link: "/books/the-way-of-the-shepherd/principle3.html",
            description: "Learn how to build trust and connection with your team by helping them identify with you. Explore actionable strategies from The Way of the Shepherd to inspire loyalty, foster open communication, and lead with authenticity."
        },
        {
            id: "principle2",
            title: "Discover the Shape of Your Sheep",
            date: "March 6, 2025",
            image: "/images/twots/principle2.webp",
            link: "/books/the-way-of-the-shepherd/principle2.html",
            description: "Know the Condition of Your Flock. Learn actionable leadership strategies to build trust, improve communication, and inspire your team to thrive."
        },  
        {
            id: "principle1",
            title: "Know the Condition of Your Flock",
            date: "February 27, 2025",
            image: "/images/twots/principle1.webp",
            link: "/books/the-way-of-the-shepherd/principle1.html",
            description: "Understand the first principle of The Way of the Shepherd: Know the Condition of Your Flock. Strengthen leadership skills with trust and engagement."
        },  


        // Technology Blogs
        {
            id: "year2038",
            title: "The Year 2038 Problem",
            date: "February 7, 2025",
            image: "/images/year2038.webp",
            link: "/blogs/tech/year2038.html",
            description: "Explore the risks of the Y2K38 bug and how the Unix time overflow could disrupt banking, aviation, infrastructure, and IoT. Learn about 64-bit migration, patching legacy systems, and industry-wide solutions to prevent a global digital meltdown before 2038."
        }, 
        {
            id: "promptengineering",
            title: "Google’s Prompt Engineering Essentials",
            date: "February 13, 2025",
            image: "/images/prompt-engineering.webp",
            link: "/blogs/tech/promptengineering.html",
            description: "Learn Google's Prompt Engineering Essentials and become an expert in AI prompt engineering. Discover AI automation, workflow optimization, and advanced AI prompting techniques."
        },  
        {
            id: "navigation-apps",
            title: "Waze vs Google Maps vs Apple Maps : Choosing Your Perfect GPS Companion",
            date: "June 6, 2025",
            image: "/images/tech-comparison/navigation-apps-comparison.jpg",
            link: "/blogs/tech/navigation-apps.html",
            description: "Professional comparison of Waze, Google Maps, and Apple Maps. Discover which navigation app wins for real-time traffic, privacy, business listings, and route optimization with up-to-date data and expert insights."
        },
        {
            id: "email-clients-comparison",
            title: "Email Clients Comparison: Find Your Perfect Productivity Match",
            date: "June 10, 2025",
            image: "/images/email-clients-comparison.webp",
            link: "/blogs/tech/email-clients-comparison",
            description: "Compare Outlook, Gmail, Spark, Thunderbird, and more to discover the best email client for your workflow. Explore features, security, integrations, and expert tips to boost your email productivity."
        },
        {
            id: "brainrot",
            title: "How to Overcome Brain Rot and Rebuild Your Attention Span",
            date: "February 24, 2025",
            image: "/images/brainrot.webp",
            link: "/blogs/gen/brainrot.html",
            description: "Brain rot and doom scrolling are rewiring your brain, making it harder to focus. Learn practical, science-backed strategies to improve your attention span, escape internet addiction, and regain control of your mental clarity."
        },
        {
            id: "best-programming-practices",
            title: "Best Programming Practices for Beginners in Python",
            date: "February 27, 2025",
            image: "/images/blog-best-programming-practices.webp",
            link: "/blogs/gen/best-programming-practices.html",
            description: "Master Python programming with essential best practices for beginners. Learn how to plan before coding, create task lists, organize functions, and use keyboard shortcuts to write clean, efficient code."
        },   
        {
            id: "beginnersguide-usb-abc",
            title: "Beginner's Guide to USB-A, USB-B, and USB-C",
            date: "January 3, 2025", 
            image: "/images/blog9.webp",
            link: "/blogs/tech/beginnersguide-usb-abc.html",
            description: "Learn the differences between USB-A, USB-B, and USB-C, their history, uses, and why USB-C is the future. A comprehensive guide for tech enthusiasts and beginners alike."
        },
        {
            id: "5G-vs-6G",
            title: "5G vs 6G",
            date: "January 18, 2025",
            image: "/images/blog15-5g-vs-6g.webp",
            link: "/blogs/tech/5G-vs-6G.html",
            description: "Discover the key differences between 5G and 6G, their transformative applications, and how businesses can prepare for the next wave of wireless connectivity."
        }, 

        // General Blogs
        {
            id: "why-writing-down-your-goals-is-important",
            title: "Why Writing Down Your Goals Is Crucial",
            date: "January 12, 2025", 
            image: "/images/blog11-gabrielle-henderson-5HqtJT2l9Gw-unsplash.webp",
            link: "/blogs/gen/why-writing-down-your-goals-is-important.html",
            description: "Learn why writing down goals boosts success. Discover insights from Covey's The 7 Habits and neuroscience to achieve clarity, accountability, and progress."
        },
        {
            id: "SemestralBreaks",
            title: "What to Do During Semestral Breaks",
            date: "December 5, 2024",
            image: "/images/blog5.webp",
            link: "/blogs/gen/SemestralBreaks.html",
            description: "Maximise your semestral break with tips for rest, skill development, and exciting activities."
        },
        {   
            id: "role-of-technology-in-education",
            title: "Technology in Education",
            date: "December 1, 2024",
            image: "/images/blog1.webp",
            link: "/blogs/gen/role-of-technology-in-education.html",
            description: "Learn how technology is shaping the way educators and students interact in today's classrooms."
        },
        {
            id: "programmingMindset",
            title: "The Programming Mindset: Think Like a Developer",
            date: "January 31, 2025",
            image: "/images/pdev/pmt-katrina-wright-yMg_SMqfoRU-unsplash.webp",
            link: "/blogs/gen/programmingmindset.html",
            description: "Develop a strong programming mindset with key problem-solving strategies. Learn debugging techniques, optimization principles, and practical approaches that help you write better code and become a more efficient developer."
        },
        {
            id: "master-time-management",
            title: "Master Time Management",
            date: "January 15, 2025", 
            image: "/images/blog12-djim-loic-ft0-Xu4nTvA-unsplash.webp",
            link: "/blogs/gen/master-time-management.html",
            description: "Discover practical time management methods, including the Eisenhower Matrix, time-blocking, and the Pomodoro technique. Transform your productivity with actionable strategies inspired by The 7 Habits of Highly Effective People."
        },

        {
            id: "IWishIKnewBeforeEnteringIT",
            title: "10 Things I Wish I Knew Before Entering IT",
            date: "December 30, 2024",
            image: "/images/blog7.webp",
            link: "/blogs/gen/IWishIKnewBeforeEnteringIT.html",
            description: "Discover the essential lessons to thrive in IT, from mastering problem-solving and debugging to embracing perseverance and practical skills. Avoid common regrets and excel in your IT career with these expert tips."
        },
        {
            id: "weekend-recovery",
            title: "How to Recover Your Energy on Weekends: Science-Backed Strategies",
            date: "February 28, 2025",
            image: "/images/blog-weekend-recovery.webp",
            link: "/blogs/gen/how-to-recover-your-energy-on-weekends.html",
            description: "Maximize your weekend recovery with science-backed strategies. Learn how to balance active and passive relaxation, set boundaries between work and personal life, and recharge effectively for better productivity and well-being."
        },
        {
            id: "handwriting-blog",
            title: "Improving Coding Skills Through Handwriting",
            date: "February 11, 2025",
            image: "/images/handwriting-code.webp",
            link: "/blogs/gen/handwritingcode",
            description: "Discover how writing code with pen and paper can improve your coding skills. Learn the benefits of handwriting code, boost problem-solving, and master coding fundamentals through pen and paper coding techniques."
        },
        {
            id: "emotional-resilience",
            title: "Emotional Resilience: How to Bounce Back Stronger from Setbacks",
            date: "April 29, 2025",
            image: "/images/blogs/emotional-resilience-guide.webp",
            link: "/blogs/gen/emotional-resilience",
            description: "Master emotional resilience with actionable strategies to manage stress, bounce back from setbacks, and thrive under pressure. Essential for professionals seeking mental toughness and workplace resilience."
        },
        {
            id: "effective-study-techniques",
            title: "Effective Study Techniques",
            date: "December 1, 2024",
            image: "/images/effective-study-techniques.webp",
            link: "/blogs/gen/effective-study-techniques.html",
            description: "Master proven study techniques like active recall, spaced repetition, and the Pomodoro Technique. Transform your study habits, improve retention, and reduce stress with actionable methods to enhance your learning journey."
        },
        {
            id: "DevelopingDigitalLiteracy",
            title: "Developing Digital Literacy Skills",
            date: "December 1, 2024",
            image: "/images/blog3.webp",
            link: "/blogs/gen/DevelopingDigitalLiteracy.html",
            description: "Empower students with essential competencies to thrive in the digital age."
        },
        {
            id: "BuildingHabits",
            title: "Building Habits for Success: Your Journey to Personal Growth",
            date: "January 2, 2025",
            image: "/images/beproactive.webp",
            link: "/blogs/gen/BuildingHabits",
            description: "Discover how to build positive habits and unlock your potential for success. Learn practical strategies to overcome challenges, achieve goals, and foster personal growth on your journey to self-improvement."
        },
        {
            id: "brands-that-failed-to-innovate-and-disappeared",
            title: "Brands That Failed to Innovate and Disappeared",
            date: "January 17, 2025", 
            image: "/images/blog14chris-lawton-5IHz5WhosQE-unsplash.webp",
            link: "/blogs/gen/brands-that-failed-to-innovate-and-disappeared.html",
            description: "Discover the cautionary tales of once-dominant brands like Blockbuster, Kodak, and Nokia that failed to innovate and lost their edge. Learn why they failed, the lessons they teach, and how businesses can avoid the same fate."
        },
        {
            id: "AttendSeminars",
            title: "Why Should We Attend Seminars and Conferences",
            date: "December 2, 2024",
            image: "/images/blog4.webp",
            link: "/blogs/gen/AttendSeminars.html",
            description: "Discover the benefits of seminars and conferences: networking, fresh perspectives, and staying updated on trends."
        },

        // Financial Literacy Series
        {
            id: "gfunds-dividends",
            title: "GFunds That Pay You: Exploring Dividends for Young Investors",
            date: "July 23, 2025",
            image: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjIc2Q-hchzLiGg-vrLtTbDtJaPB_3XgGIIlTkZOnBW2Y8gYaKtrYwlur4BhIHxGnsPP3NUDXAcCBl94NR2ECWaRFPDV68zOYrG9Ta8H9ymBJH2IpIq8lLOP6In5GlQm7HifsMm8QwR0i4/s3073/GCash+logo+horizontal.png",
            link: "/blogs/finance/gfunds-dividends.html",
            description: "Learn how GFunds with dividends work, especially for Filipino beginners. Find out how to invest as low as ₱1,000 in dividend-paying mutual funds like ALFM and Manulife for passive income."
        },


        // Events
        {
            id: "baguio-smart-city-challenge-bsu",
            title: "Baguio Smart City Challenge",
            date: "December 11, 2024",
            image: "/images/blog6.webp",
            link: "/blogs/events/baguio-smart-city-challenge-bsu.html",  // Updated path
            description: "Explore the projects, lessons, and insights from this transformative experience."
        },
        {
            id: "specialist-vs-generalist",
            title: "Specialist vs Generalist",
            date: "April 7, 2025",
            image: "/images/blogs/specialist-vs-generalist-career.webp",
            link: "/blogs/gen/specialist-vs-generalist.html",
            description: "85% of companies now seek hybrid talent. Discover whether to specialize or generalize in your career, with actionable strategies to become a T-shaped professional and future-proof your skills."
        },
        {
            id: "byteQuizBee2025",
            title: "BYTe Quiz Bee 2025 Results: Winners & Highlights",
            date: "March 22, 2025",
            image: "/images/events/byte-quiz-bee-2025.jpg",
            link: "/blogs/events/itquizbee2025results.html",  // Updated path
            description: "Discover the top performers of the BYTe Quiz Bee 2025. View the complete results, winners, and highlights of this year's IT quiz bee event for non-IT students at Benguet State University."
        },
        {
            id: "byteFunRun2025Results",
            title: "BYTe Fun Run 2025 Results: Race Highlights & Winners",
            date: "March 4, 2025",
            image: "/images/events/2025byterun/bytefunrun2025-banner.jpg",
            link: "/blogs/events/bytefunrun2025results.html",
            description: "The official results of the BYTe Fun Run 2025! Discover the top finishers in 3K and 5K categories, event highlights, and the sponsors who made it possible. Relive the race day excitement through our photo gallery."
        },
        {
            id: "2025ByteFunRunInfo",
            title: "2025 BYTe Fun Run - Benguet State University",
            date: "February 28, 2025",
            image: "/images/events/2025BYTeRunraceroute.png",
            link: "/blogs/events/2025bytefunrun",
            description: "Join the 2025 BYTe Fun Run at Benguet State University! Celebrate the culmination of IT Month with a 3KM or 5KM scenic run, open to all students and the community. Register online to secure your race bib, enjoy the vibrant campus, and be part of an event that blends health, innovation, and community spirit. Gun start at 5:20 pm (5K) and 5:30 pm (3K)."
        },

        // 7 Habits of Highly Effective People Series
        {
            id: "scp1-be-proactive",
            title: "A Professional’s Guide to Personal and Leadership Growth",
            date: "January 9, 2025", 
            image: "/images/blog10.webp",
            link: "/books/7-habits/scp1-be-proactive.html",
            description: "Unlock the secrets to personal effectiveness and leadership with our professional guide to The 7 Habits of Highly Effective People. Explore actionable self-improvement tips, productivity habits, and strategies for habit formation in this 8-part series based on Stephen R. Covey’s timeless principles."
        },
        {
            id: "scp2-beginning-with-the-end-in-mind",
            title: "Beginning With the End in Mind",
            date: "January 16, 2025", 
            image: "/images/blog13joshua-hoehne-Nsaqv7v2V7Q-unsplash.webp",
            link: "/books/7-habits/scp2-beginning-with-the-end-in-mind.html",
            description: "Discover practical time management methods, including the Eisenhower Matrix, time-blocking, and the Pomodoro technique. Transform your productivity with actionable strategies inspired by The 7 Habits of Highly Effective People."
        },
        {
            id: "scp3-put-first-things-first",
            title: "Put First Things First",
            date: "January 23, 2025",
            image: "/images/blog19ch_pski-bylXfUFJylU-unsplash.webp",
            link: "/books/7-habits/scp3-put-first-things-first.html",
            description: "Learn actionable strategies from Stephen R. Covey’s Habit 3 to prioritise your Big Rocks, manage your time effectively, and align daily actions with your personal mission."
        },
        {
            id: "scp4-think-win-win",
            title: "Think Win-Win",
            date: "January 29, 2025",
            image: "/images/scp4-krakenimages-Y5bvRlcCx8k-unsplash.webp",
            link: "/books/7-habits/scp4-think-win-win.html",
            description: "Discover how Think Win-Win, the 4th habit from The 7 Habits of Highly Effective People, fosters collaboration, leadership, and long-term success through mutual benefit."
        },
        {
            id: "scp5-seek-first-to-understand",
            title: "Seek First to Understand, Then to Be Understood",
            date: "February 6, 2025",
            image: "/images/sc/scp5-seek-first-to-understand.webp",
            link: "/books/7-habits/scp5-seek-first-to-understand.html",
            description: "Discover how Habit 5 from Stephen Covey’s 7 Habits of Highly Effective People can transform communication, leadership, and problem-solving. Learn practical strategies for empathic listening and how to apply them in IT, business, and personal relationships."
        },
        {
            id: "scp6-synergize",
            title: "Habit 6: Synergize®",
            date: "February 13, 2025",
            image: "/images/scp6-habit6-synergize.webp",
            link: "/books/7-habits/scp6-synergize.html",
            description: "Discover how Habit 6: Synergize® from 'The 7 Habits of Highly Effective People' can transform teamwork and problem-solving. Learn how creative collaboration, valuing differences, and the third alternative mindset lead to better solutions and stronger relationships."
        },
        {
            id: "scp7-sharpen-the-saw",
            title: "Sharpen the Saw®: The Key to Sustainable Success",
            date: "February 18, 2025",
            image: "/images/scp7-sharpen.webp",
            link: "/books/7-habits/scp7-sharpen-the-saw.html",
            description: "Sharpen the Saw®—Habit 7 of The 7 Habits of Highly Effective People—focuses on continuous self-renewal. Learn how strengthening your physical, mental, emotional, and spiritual well-being leads to lasting productivity and success."
        },  

        // IT114 Lessons
        {
            id: "it114-lesson1",
            title: "Introduction to Python Programming",
            date: "January 9, 2025",
            image: "/images/it114-lesson1-python-intro.webp",
            link: "/lessons/it114/it114-lesson1-introduction-to-python.html",  // Updated path
            description: "Start your Python journey with this beginner-friendly lesson. Learn about Python’s history, why it became the world’s most popular programming language, and how to set up your development environment. Get ready to write your first Python script and take the first step into coding."
        },
        {
            id: "it114-lesson2",
            title: "Python Programming Basics",
            date: "January 13, 2025",
            image: "/images/it114-lesson2-hellograde-blog-python-basics.jpg",
            link: "/lessons/it114/it114-lesson2-python-programming-basics.html",  // Updated path
            description: "Learn Python programming from scratch. Explore Python syntax, variables, data types, and operators with hands-on examples. Build a strong foundation for coding and software development."
        },
        {
            id: "it114-lesson3",
            title: "Python Strings",
            date: "January 15, 2025",
            image: "/images/it114-lesson3-hellograde-blog-python-strings.jpg",
            link: "/lessons/it114/it114-lesson3-python-strings.html",  // Updated path
            description: "Discover the power of Python strings. Learn string manipulation, slicing, formatting, and essential string methods with real-world examples to enhance your coding skills."
        },
        {
            id: "it114-lesson4",
            title: "Python Conditional Statements",
            date: "January 23, 2025",
            image: "/images/it114-lesson4-conditional-statements.webp",
            link: "/lessons/it114/it114-lesson4-conditional-statements.html",  // Updated path
            description: "Learn Python conditional statements with if, elif, else, and nested logic. Write smarter, dynamic code with practical examples and actionable tips for better decision-making in your programs."
        },
        {
            id: "it114-lesson5",
            title: "While Looping Statement",
            date: "January 22, 2025",
            image: "/images/blog17lucas-hein-3tgwzKpxHa4-unsplash.webp",
            link: "/lessons/it114/it114-lesson5-while-looping-statement.html",
            description: "Learn Python while looping statements with clear examples, practical tips, and expert insights to improve your coding skills."
        }, 
        {
            id: "it114-lesson6",
            title: "Data Structures in Python",
            date: "January 27, 2025",
            image: "/images/it114-lesson6-python-data-structures.webp",
            link: "/lessons/it114/it114-lesson6-datastructures.html",  // Updated path
            description: "Dive into Python data structures like lists, tuples, sets, and dictionaries. Learn their characteristics, practical use cases, and actionable tips to write efficient, scalable, and maintainable code. Master the foundations for smarter programming."
        }, 
        {
            id: "it114-lesson7",
            title: "Mastering Python For Loops",
            date: "February 4, 2025",
            image: "/images/it114-lesson7-blog-python-for-loops.webp",
            link: "/lessons/it114/it114-lesson7-forloop.html",
            description: "Learn how to use Python for loops effectively with this step-by-step guide. Explore the syntax, iterate over sequences, work with nested loops, and apply advanced techniques like enumerate(), zip(), and range(). Unlock the full potential of iteration in Python with real-world examples and exercises."
        },
        {
            id: "it114-lesson8",
            title: "Python Random Module",
            date: "February 7, 2025",
            image: "/images/it114-lesson8-randommodule.webp",
            link: "/lessons/it114/it114-lesson8-randommodule.html",
            description: "Learn how to use the Python random module for generating random numbers, shuffling lists, selecting random elements, and more. Explore key functions like random(), randint(), shuffle(), choice(), and uniform(), and see how randomness is used in AI, game development, cryptography, and simulations."
        },  
        {
            id: "it114-lesson9",
            title: "Python Functions and Modules",
            date: "February 12, 2025",
            image: "/images/it114-lesson9-functions.webp",
            link: "/lessons/it114/it114-lesson9-functionmodules.html",
            description: "Master Python functions and modules with this complete guide. Learn how to create efficient, reusable functions, import Python modules, and build custom modules to organize your code effectively."
        },  
        {
            id: "it114-lesson9_1",
            title: "Python Return Statement",
            date: "February 16, 2025",
            image: "/images/it114-lesson9_1-return.webp",
            link: "/lessons/it114/it114-lesson9_1-returnstatement.html",
            description: "Master the Python return statement and learn how to send data back from functions efficiently. Explore real-world examples of returning values, handling multiple returns, early exits, and recursion to enhance your Python programming skills."
        },
        {
            id: "it114-lesson10",
            title: "Python Error Handling",
            date: "February 16, 2025",
            image: "/images/it114-lesson10-error-handling.webp",
            link: "/lessons/it114/it114-lesson10-errorhandling.html",
            description: "Learn how to handle errors in Python using try-except blocks, prevent crashes, and write more resilient applications. This in-depth guide covers syntax errors, runtime exceptions, debugging techniques, and best practices for structured error handling."
        },
        {
            id: "it114-lesson11",
            title: "Python Scope and the LEGB Rule",
            date: "February 18, 2025",
            image: "/images/it114-lesson11-pythonscope.webp",
            link: "/lessons/it114/it114-lesson11.html",
            description: "Master Python Scope and the LEGB Rule: Learn how Local, Enclosing, Global, and Built-in scopes work in Python, avoid common mistakes, and follow best practices to write efficient and error-free code."
        },
        {
            id: "it114-lesson12",
            title: "Time Module and Datetime Module",
            date: "March 11, 2025",
            image: "/images/hellograde-blog-python-time.webp",
            link: "/lessons/it114/it114-lesson12-pythontimedate.html",
            description: "Master Python’s time and datetime modules! Learn how to handle timestamps, format time, use delays, and perform date arithmetic with real-world applications."
        },
        {
            id: "it114-lesson13",
            title: "IT 114 - Lesson 13: 2D Lists and Nested Loops",
            date: "March 24, 2025",
            image: "/images/it114/lesson13-2d-lists-nested-loops.webp",
            link: "/lessons/it114/it114-lesson13-2dnestedloop.html",
            description: "Master 2D lists and nested loops in Python with practical examples, operations, and methods. Learn how to create, modify, and iterate through 2D lists effectively."
        },
        {
            id: "it114-lesson14",
            title: "IT114 Lesson 14: Installing New Libraries in Python",
            date: "March 26, 2025",
            image: "/images/it114/python-library-installation.webp",
            link: "/lessons/it114/it114-lesson14-install-python-library.html",
            description: "Learn how to install and manage Python libraries using pip, explore virtual environments, and discover alternative installation methods. Boost your programming skills with practical tips and hands-on examples."
        },
        {
            id: "it114-lesson15",
            title: "Python Text Colors: Mastering Colorama and ANSI Escape Sequences",
            date: "March 26, 2025",
            image: "/images/it114/python-text-colors.webp",
            link: "/lessons/it114/it114-lesson15-textcolor.html",
            description: "Learn to enhance Python console applications with Colorama and ANSI escape sequences. This guide covers cross-platform text coloring, styling techniques, and practical examples for better debugging and user experience."
        },
        {
            id: "it114-lesson16",
            title: "Python Lambda Functions: Write Cleaner, Faster Code",
            date: "March 28, 2025",
            image: "/images/it114/lambda.png",
            link: "/lessons/it114/it114-lesson16-lambda.html",
            description: "Master Python lambda functions with this comprehensive guide. Learn syntax, practical use cases with map()/filter()/sorted(), and when to use them versus regular functions for cleaner code. Includes exercises and assessment."
        },
        {
            id: "it114-lesson17",
            title: "Python Threading",
            date: "April 2, 2025",
            image: "/images/it114/python-threading.webp",
            link: "/lessons/it114/it114-lesson17-threading.html",
            description: "Master Python threading to speed up I/O-bound tasks while avoiding race conditions, deadlocks, and GIL limitations. Includes practical examples and synchronization techniques."
        },
                {
            id: "it114-lesson18",
            title: "Python OOP: Mastering Classes and Objects",
            date: "April 3, 2025",
            image: "/images/it114/python-classes.webp",
            link: "/lessons/it114/it114-lesson18-classes.html",
            description: "Comprehensive guide to Python classes and object-oriented programming. Learn class syntax, inheritance, methods, and practical OOP applications with clear examples."
        },
                {
            id: "it114-lesson19",
            title: "Python to EXE: Create Standalone Apps with PyInstaller",
            date: "April 3, 2025",
            image: "/images/it114/python-to-exe-guide.webp",
            link: "/lessons/it114/it114-lesson19-exefile.html",
            description: "Step-by-step guide to convert Python scripts to executable (.exe) files using PyInstaller. Learn to create standalone apps for Windows, macOS, and Linux with flags like --onefile and --windowed. Includes troubleshooting tips for common issues."
        },
        {
            id:"it114-lesson20",
            title: "Software Documentation Guide",
            date: "April 4, 2025",
            image: "/images/it114/software-documentation.webp",
            link: "/lessons/it114/it114-lesson20-programdocumentation.html",
            description: "Comprehensive guide to software documentation covering its importance, essential components, best practices, and real-world examples. Learn how to create documentation that boosts productivity and maintains code quality."
        },
    ];

    const sortedBlogs = blogPool.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

    // 1. Latest / Random Blog Sections
       const numberOfBlogsToShow = 3;
  // Sort blogs by date (largest/newest date first)
    const latestBlog = sortedBlogs[0];

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

     // 2. Blog Navigation (Previous / Next)
    const currentBlogId = document.body.getAttribute("data-blog-id"); // e.g., "blog7"
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
                <div class="mt-6 flex flex-col md:flex-row justify-center md:space-x-4 space-y-3 md:space-y-0">
                    <a
                        href="${prevBlog.link}"
                        class="text-white bg-blue-600 px-4 py-2 rounded-md text-sm text-center hover:bg-blue-700"
                    >
                        Previous: ${prevBlog.title}
                    </a>
                    <a
                        href="/blogs/"
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
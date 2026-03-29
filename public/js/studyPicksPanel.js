(function attachStudyPicksPanel(global) {
    const contentPools = {
        lessons: [
        {
            title: 'Understanding Information Technology',
            href: '/lessons/mst24/mst24-lesson1.html',
            preview: 'IT foundations, digital systems, and how technology shapes daily life.',
            image: '/images/mst24lesson1-towfiqu-barbhuiya-oZuBNC-6E2s-unsplash.webp'
        },
        {
            title: 'Introduction to Python',
            href: '/lessons/it114/it114-lesson1-introduction-to-python.html',
            preview: 'Python basics, setup, syntax, and your first programming workflow.',
            image: '/images/it114-lesson1-python-intro.webp'
        },
        {
            title: 'Node.js Foundations',
            href: '/lessons/node/node-lesson1',
            preview: 'Backend concepts, Node.js basics, and JavaScript server-side thinking.',
            image: '/images/nodejs-mvc-guide.jpg'
        },
        {
            title: 'Recursive Algorithms',
            href: '/lessons/mini/recursion.html',
            preview: 'Recursion patterns, base cases, and breaking complex problems down.',
            image: 'https://images.unsplash.com/photo-1719777114494-cdc1373bad72?q=80&w=1470&auto=format&fit=crop'
        },
        {
            title: 'Linear vs Non-Linear Data Structures',
            href: '/lessons/dsalgo/dsalgo-lesson6',
            preview: 'Arrays, lists, trees, graphs, and when each structure fits best.',
            image: '/images/mst24lesson1-towfiqu-barbhuiya-oZuBNC-6E2s-unsplash.webp'
        }
        ],

        books: [
        {
            title: 'Be Proactive',
            href: '/books/7-habits/scp1-be-proactive',
            preview: 'Personal responsibility, initiative, and taking charge of your choices.',
            image: '/images/blog10.webp'
        },
        {
            title: 'Begin With the End in Mind',
            href: '/books/7-habits/scp2-beginning-with-the-end-in-mind',
            preview: 'Vision, long-term thinking, and designing work around purpose.',
            image: '/images/blog13joshua-hoehne-Nsaqv7v2V7Q-unsplash.webp'
        },
        {
            title: 'Put First Things First',
            href: '/books/7-habits/scp3-put-first-things-first',
            preview: 'Priorities, time management, and focusing on what matters most.',
            image: '/images/blog19ch_pski-bylXfUFJylU-unsplash.webp'
        },
        {
            title: 'Think Win-Win',
            href: '/books/7-habits/scp4-think-win-win',
            preview: 'Mutual benefit, trust-building, and better collaboration.',
            image: '/images/scp4-krakenimages-Y5bvRlcCx8k-unsplash.webp'
        },
        {
            title: 'Protect and Guide',
            href: '/books/the-way-of-the-shepherd/principle1',
            preview: 'Leadership, stewardship, and caring for people with clarity.',
            image: '/images/twots/principle1.webp'
        },
        {
            title: 'Keep the Flock Moving',
            href: '/books/the-way-of-the-shepherd/principle5',
            preview: 'Momentum, direction, and helping people keep growing.',
            image: '/images/twots/principle5.webp'
        }
        ]
    };

    const slotResolvers = {
        'random-lesson': () => getRandomItem(contentPools.lessons) || getLatestItem(contentPools.lessons),
        'latest-lesson': () => getLatestItem(contentPools.lessons),
        'random-book': () => getRandomItem(contentPools.books)
    };

    function setText(root, selector, value) {
        const element = root.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    function setImage(root, selector, src, alt) {
        const element = root.querySelector(selector);
        if (!element || !src) {
            return;
        }

        element.setAttribute('src', src);
        element.setAttribute('alt', alt ? `${alt} preview` : 'Content preview');
    }

    function setLink(root, selector, href) {
        const element = root.querySelector(selector);
        if (element && href) {
            element.setAttribute('href', href);
        }
    }

    function getLatestItem(pool) {
        return Array.isArray(pool) && pool.length ? pool[pool.length - 1] : null;
    }

    function getRandomItem(pool) {
        if (!Array.isArray(pool) || !pool.length) {
            return null;
        }

        return pool[Math.floor(Math.random() * pool.length)] || pool[0];
    }

    function normalizeOpenMode(value) {
        return value === 'new-tab' ? 'new-tab' : 'same-tab';
    }

    function parseSlots(value) {
        return String(value || '')
            .split(',')
            .map((slot) => slot.trim())
            .filter(Boolean);
    }

    function parsePanelConfig(root) {
        const slots = parseSlots(root.dataset.studyPicksSlots);
        const cardCount = Number.parseInt(root.dataset.studyPicksCardCount || '', 10);

        return {
            openMode: normalizeOpenMode(root.dataset.studyPicksOpenMode),
            density: String(root.dataset.studyPicksDensity || 'default'),
            slots,
            cardCount: Number.isFinite(cardCount) ? cardCount : slots.length
        };
    }

    function applyLinkMode(root, openMode) {
        root.querySelectorAll('a[href]').forEach((link) => {
            const href = String(link.getAttribute('href') || '').trim();
            if (!href || href.startsWith('#') || openMode !== 'new-tab') {
                link.removeAttribute('target');
                link.removeAttribute('rel');
                return;
            }

            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
    }

    function renderCard(card, item) {
        if (!card || !item) {
            return;
        }

        if (card.tagName === 'A' && item.href) {
            card.setAttribute('href', item.href);
        }
        setImage(card, '[data-study-card-image]', item.image, item.title);
        setText(card, '[data-study-card-title]', item.title);
        setText(card, '[data-study-card-preview]', item.preview || 'Open this pick to explore the topic.');
    }

    function renderPanel(root) {
        const config = parsePanelConfig(root);
        const cards = Array.from(root.querySelectorAll('[data-study-picks-card][data-study-slot-type]'));

        cards.forEach((card) => {
            const slotType = String(card.dataset.studySlotType || '').trim();
            if (config.slots.length && !config.slots.includes(slotType)) {
                card.hidden = true;
                return;
            }

            const resolve = slotResolvers[slotType];
            const item = typeof resolve === 'function' ? resolve() : null;

            if (!item) {
                card.hidden = true;
                return;
            }

            renderCard(card, item);
        });

        applyLinkMode(root, config.openMode);
    }

    function init() {
        document.querySelectorAll('[data-study-picks-root]').forEach(renderPanel);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
}(window));

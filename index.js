// Landing Page Logic for Minimalist Game Design Blog

document.addEventListener('DOMContentLoaded', () => {
    let allPosts = [];
    let filteredPosts = [];
    let activeTag = 'all';
    let currentPage = 0;
    const postsPerPage = 6;

    const postsGrid = document.getElementById('posts-grid');
    const tagFilterContainer = document.getElementById('tag-filter-container');
    const sentinel = document.getElementById('infinite-scroll-sentinel');

    // 1. Fetch Posts Database
    async function loadBlogIndex() {
        try {
            // Fetch posts.json. For local development, this works directly.
            // When hosted on GitHub Pages, this will fetch from the root of the site.
            const response = await fetch('posts.json');
            if (!response.ok) {
                throw new Error('No posts index found');
            }
            allPosts = await response.json();
            
            // Sort posts by date (newest first)
            allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            initializeTags();
            filterAndRenderPosts();
        } catch (error) {
            console.warn('Failed to load posts.json. Showing placeholder info.', error);
            postsGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="font-serif text-muted">No posts published yet. Visit the <a href="blogger.html" class="text-decoration-underline text-dark">Publish Page</a> to configure your GitHub token and write your first post.</p>
                </div>
            `;
        }
    }

    // 2. Extract and Render Tags dynamically
    function initializeTags() {
        const tagsSet = new Set();
        allPosts.forEach(post => {
            if (post.tags && Array.isArray(post.tags)) {
                post.tags.forEach(tag => tagsSet.add(tag.trim()));
            }
        });

        // Clear existing tags except the 'All' button
        const allBtn = document.getElementById('tag-all-btn');
        tagFilterContainer.innerHTML = '';
        tagFilterContainer.appendChild(allBtn);

        // Add dynamically compiled tags
        tagsSet.forEach(tag => {
            const button = document.createElement('button');
            button.className = 'badge-tag badge-tag-interactive';
            button.textContent = tag;
            button.setAttribute('data-tag', tag);
            button.addEventListener('click', () => handleTagClick(tag));
            tagFilterContainer.appendChild(button);
        });

        // Re-attach listener to 'All' button
        allBtn.onclick = () => handleTagClick('all');
    }

    // 3. Handle Tag Selection
    function handleTagClick(tag) {
        activeTag = tag;
        
        // Update active class in UI
        const buttons = tagFilterContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-tag') === tag || (tag === 'all' && btn.id === 'tag-all-btn')) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Reset page counter and re-render
        currentPage = 0;
        postsGrid.innerHTML = '';
        filterAndRenderPosts();
    }

    // 4. Filter and Setup Infinite Scroll
    function filterAndRenderPosts() {
        if (activeTag === 'all') {
            filteredPosts = allPosts;
        } else {
            filteredPosts = allPosts.filter(post => 
                post.tags && post.tags.map(t => t.toLowerCase().trim()).includes(activeTag.toLowerCase().trim())
            );
        }

        if (filteredPosts.length === 0) {
            postsGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="font-serif text-muted">No posts found with the tag "${activeTag}".</p>
                </div>
            `;
            sentinel.classList.add('d-none');
            return;
        }

        // Enable sentinel spinner if there are posts
        sentinel.classList.remove('d-none');
        
        // Load the first batch
        renderNextBatch();
    }

    // 5. Render Next Pagination Batch
    function renderNextBatch() {
        const start = currentPage * postsPerPage;
        const end = start + postsPerPage;
        const batch = filteredPosts.slice(start, end);

        if (batch.length === 0) {
            // No more posts to load, hide scroll spinner
            sentinel.classList.add('d-none');
            return;
        }

        batch.forEach(post => {
            const col = document.createElement('div');
            col.className = 'col-lg-4 col-md-6 col-12';
            
            // Format tags
            const tagsHTML = (post.tags || []).map(t => `<span class="badge-tag">${t}</span>`).join('');
            
            // Format date (e.g. May 28, 2026)
            let formattedDate = post.date;
            try {
                const dateObj = new Date(post.date);
                if (!isNaN(dateObj)) {
                    formattedDate = dateObj.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
            } catch (e) {
                console.error(e);
            }

            col.innerHTML = `
                <a class="blog-card" href="post.html?id=${post.id}">
                    <div>
                        <div class="blog-card-date">${formattedDate}</div>
                        <h2 class="blog-card-title">${post.title}</h2>
                        <p class="blog-card-summary">${post.summary || ''}</p>
                    </div>
                    <div class="blog-card-tags">
                        ${tagsHTML}
                    </div>
                </a>
            `;
            postsGrid.appendChild(col);
        });

        currentPage++;

        // If we've loaded all available posts, hide the sentinel
        if (currentPage * postsPerPage >= filteredPosts.length) {
            sentinel.classList.add('d-none');
        }
    }

    // 6. Intersection Observer for Infinite Scrolling
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !sentinel.classList.contains('d-none')) {
                renderNextBatch();
            }
        });
    }, {
        rootMargin: '100px' // Load when the sentinel is within 100px of viewport bottom
    });

    observer.observe(sentinel);

    // Initial Trigger
    loadBlogIndex();
});

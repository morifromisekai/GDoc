// Dedicated Post Reader Page Logic

document.addEventListener('DOMContentLoaded', () => {
    const postTitle = document.getElementById('post-title');
    const postDate = document.getElementById('post-date');
    const postReadtime = document.getElementById('post-readtime');
    const postTags = document.getElementById('post-tags');
    const postContent = document.getElementById('post-content');
    const shareBtn = document.getElementById('share-btn');

    // 1. Parse URL Parameter (?id=...)
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
        // No ID provided, redirect to home
        window.location.href = 'index.html';
        return;
    }

    // 2. Fetch Blog Index and Locate Post Metadata
    async function loadPost() {
        try {
            const response = await fetch('posts.json');
            if (!response.ok) {
                throw new Error('Index file posts.json not found');
            }
            const postsIndex = await response.json();
            const postMetadata = postsIndex.find(p => p.id === postId);

            if (!postMetadata) {
                showError('Post not found in index database.');
                return;
            }

            renderMetadata(postMetadata);
            await fetchAndRenderMarkdown(postMetadata.file);
        } catch (error) {
            console.error('Error fetching post index:', error);
            showError('Failed to load blog index. Please verify that posts.json is created.');
        }
    }

    // 3. Render Post Metadata in Header
    function renderMetadata(metadata) {
        // Set Document Title
        document.title = `${metadata.title} - Game Design Log`;

        // Format Date
        let formattedDate = metadata.date;
        try {
            const dateObj = new Date(metadata.date);
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
        postDate.textContent = formattedDate;

        // Render Tags
        postTags.innerHTML = '';
        if (metadata.tags && Array.isArray(metadata.tags)) {
            metadata.tags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'badge-tag';
                span.textContent = tag;
                postTags.appendChild(span);
            });
        }
    }

    // 4. Fetch Raw Markdown and Render to HTML
    async function fetchAndRenderMarkdown(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load markdown file: ${filePath}`);
            }
            const markdownText = await response.value || await response.text();

            // Calculate Reading Time (rough estimation: 200 words per minute)
            const words = markdownText.trim().split(/\s+/).length;
            const readingTime = Math.max(1, Math.ceil(words / 200));
            postReadtime.textContent = `${readingTime} min read`;

            // Setup marked options for safe parsing and style injection
            marked.use({
                gfm: true,
                breaks: true
            });

            // Convert to HTML
            const parsedHTML = marked.parse(markdownText);
            
            // Inject and clean
            postContent.innerHTML = parsedHTML;

            // Make sure any dynamic media fits correctly (Bootstrap layout overrides)
            const iframes = postContent.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                iframe.classList.add('w-100');
                if (!iframe.style.aspectRatio) {
                    iframe.style.aspectRatio = '16/9';
                }
            });
        } catch (error) {
            console.error('Error fetching markdown file:', error);
            showError('Could not load post content. Please verify that the markdown file exists in the repository.');
        }
    }

    // Show errors in UI
    function showError(message) {
        postTitle.textContent = 'Post Unavailable';
        postContent.innerHTML = `
            <div class="alert alert-danger border-0 rounded-0 bg-transparent text-danger p-0" role="alert">
                <h4 class="alert-heading fw-bold">Error Loading Article</h4>
                <p class="font-serif mb-0">${message}</p>
                <hr class="border-danger my-3">
                <p class="mb-0 fs-7">Verify that the file path and posts.json index match exactly in your repository.</p>
            </div>
        `;
    }

    // 5. Clipboard Share Feature
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                const originalText = shareBtn.textContent;
                shareBtn.textContent = 'Link Copied!';
                shareBtn.classList.remove('btn-minimal-secondary');
                shareBtn.classList.add('btn-minimal');
                
                setTimeout(() => {
                    shareBtn.textContent = originalText;
                    shareBtn.classList.remove('btn-minimal');
                    shareBtn.classList.add('btn-minimal-secondary');
                }, 2000);
            } catch (err) {
                console.error('Could not copy text: ', err);
            }
        });
    }

    // Start loading
    loadPost();
});

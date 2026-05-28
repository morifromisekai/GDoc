// Blogger Admin Dashboard Logic - GitHub API Integration

document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let gitConfig = {
        token: '',
        owner: '',
        repo: '',
        branch: ''
    };
    
    let quill = null;
    let cropper = null;
    let selectedImageFile = null;
    let postsIndex = [];
    let postsIndexSha = null;

    // UI Elements - Screens
    const connectionScreen = document.getElementById('connection-screen');
    const publisherDashboard = document.getElementById('publisher-dashboard');
    const loginErrorAlert = document.getElementById('login-error-alert');

    // UI Elements - Connection Form
    const connectionForm = document.getElementById('connection-form');
    const githubTokenInput = document.getElementById('github-token');
    const githubOwnerInput = document.getElementById('github-owner');
    const githubRepoInput = document.getElementById('github-repo');
    const githubBranchInput = document.getElementById('github-branch');
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    const loginBtnText = document.getElementById('login-btn-text');
    const loginBtnSpinner = document.getElementById('login-btn-spinner');

    // UI Elements - Dashboard Headers
    const headerRepoName = document.getElementById('header-repo-name');
    const headerBranchName = document.getElementById('header-branch-name');
    const logoutBtn = document.getElementById('logout-btn');

    // UI Elements - Forms & Editor
    const postForm = document.getElementById('post-form');
    const postTitleInput = document.getElementById('post-title-input');
    const postTagsInput = document.getElementById('post-tags-input');
    const postSummaryInput = document.getElementById('post-summary-input');
    const publishSubmitBtn = document.getElementById('publish-submit-btn');
    const publishBtnText = document.getElementById('publish-btn-text');
    const publishBtnSpinner = document.getElementById('publish-btn-spinner');
    const publishAlert = document.getElementById('publish-alert');

    // UI Elements - Manage Posts
    const postsTableBody = document.getElementById('posts-table-body');
    const manageAlert = document.getElementById('manage-alert');

    // UI Elements - Modals & Cropper
    const cropperModalEl = document.getElementById('cropperModal');
    const cropperModal = new bootstrap.Modal(cropperModalEl);
    const imageToCrop = document.getElementById('imageToCrop');
    const cropSaveBtn = document.getElementById('cropSaveBtn');
    const quillImageUploader = document.getElementById('quill-image-uploader');
    const videoModalEl = document.getElementById('videoModal');
    const videoModal = new bootstrap.Modal(videoModalEl);
    const videoUrlInput = document.getElementById('video-url-input');
    const insertVideoBtn = document.getElementById('insertVideoBtn');

    // Unicode safe Base64 encoding/decoding helper functions
    function utf8_to_b64(str) {
        return window.btoa(unescape(encodeURIComponent(str)));
    }
    function b64_to_utf8(str) {
        return decodeURIComponent(escape(window.atob(str)));
    }

    // 1. CHECK AUTHENTICATION STATUS
    function checkAuth() {
        const storedToken = localStorage.getItem('github_token');
        const storedOwner = localStorage.getItem('github_owner') || CONFIG.GITHUB_OWNER;
        const storedRepo = localStorage.getItem('github_repo') || CONFIG.GITHUB_REPO;
        const storedBranch = localStorage.getItem('github_branch') || CONFIG.GITHUB_BRANCH;

        // Populate fields with defaults
        githubOwnerInput.value = storedOwner;
        githubRepoInput.value = storedRepo;
        githubBranchInput.value = storedBranch;

        if (storedToken) {
            gitConfig = {
                token: storedToken,
                owner: storedOwner,
                repo: storedRepo,
                branch: storedBranch
            };
            showDashboard();
        } else {
            showLogin();
        }
    }

    function showLogin() {
        connectionScreen.classList.remove('d-none');
        publisherDashboard.classList.add('d-none');
    }

    function showDashboard() {
        connectionScreen.classList.add('d-none');
        publisherDashboard.classList.remove('d-none');
        
        // Update dashboard headers
        headerRepoName.textContent = `${gitConfig.owner}/${gitConfig.repo}`;
        headerBranchName.textContent = gitConfig.branch;
        
        // Initialize Quill Editor if not already initialized
        if (!quill) {
            initQuillEditor();
        }

        // Load Manage posts if active
        loadManagePosts();
    }

    // 2. CONNECT TO REPOSITORY (LOGIN)
    connectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = githubTokenInput.value.trim();
        const owner = githubOwnerInput.value.trim();
        const repo = githubRepoInput.value.trim();
        const branch = githubBranchInput.value.trim();

        // Clear alerts
        loginErrorAlert.classList.add('d-none');
        
        // Show loading state
        loginSubmitBtn.disabled = true;
        loginBtnText.textContent = 'CONNECTING...';
        loginBtnSpinner.classList.remove('d-none');

        try {
            // Test token connection and repo details
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error('Repository not found, or your Personal Access Token is invalid.');
            }

            // Save credentials
            localStorage.setItem('github_token', token);
            localStorage.setItem('github_owner', owner);
            localStorage.setItem('github_repo', repo);
            localStorage.setItem('github_branch', branch);

            gitConfig = { token, owner, repo, branch };
            showDashboard();
        } catch (error) {
            loginErrorAlert.textContent = error.message;
            loginErrorAlert.classList.remove('d-none');
        } finally {
            loginSubmitBtn.disabled = false;
            loginBtnText.textContent = 'CONNECT TO REPOSITORY';
            loginBtnSpinner.classList.add('d-none');
        }
    });

    // 3. DISCONNECT (LOGOUT)
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('github_token');
        githubTokenInput.value = '';
        showLogin();
    });

    // 4. INITIALIZE QUILL WYSIWYG EDITOR WITH CUSTOM BUTTONS
    function initQuillEditor() {
        // Register Custom Video Icon
        const Link = Quill.import('formats/link');
        
        quill = new Quill('#quill-editor-container', {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: [
                        [{ 'header': [2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link', 'image', 'video'],
                        ['clean']
                    ],
                    handlers: {
                        image: () => {
                            quillImageUploader.click();
                        },
                        video: () => {
                            videoModal.show();
                        }
                    }
                }
            }
        });
    }

    // 5. CROPPER.JS IMAGE CROPPER FUNCTIONALITY
    quillImageUploader.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            selectedImageFile = files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                imageToCrop.src = event.target.result;
                cropperModal.show();
            };
            reader.readAsDataURL(selectedImageFile);
        }
    });

    // Initialize Cropper inside Modal when shown
    cropperModalEl.addEventListener('shown.bs.modal', () => {
        cropper = new Cropper(imageToCrop, {
            aspectRatio: 1.777, // default 16:9
            viewMode: 1,
            autoCropArea: 0.8
        });
    });

    // Destroy Cropper inside Modal when hidden
    cropperModalEl.addEventListener('hidden.bs.modal', () => {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        quillImageUploader.value = ''; // Reset uploader input
    });

    // Change Cropper Aspect Ratio Lock Buttons
    document.querySelectorAll('.ratio-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const ratio = parseFloat(e.target.getAttribute('data-ratio'));
            cropper.setAspectRatio(isNaN(ratio) ? NaN : ratio);
        });
    });

    // Crop Image and Upload directly to GitHub Media Folder
    cropSaveBtn.addEventListener('click', async () => {
        if (!cropper) return;
        
        cropSaveBtn.disabled = true;
        cropSaveBtn.textContent = 'Cropping and Uploading...';

        try {
            // Get cropped canvas
            const canvas = cropper.getCroppedCanvas({
                maxWidth: 1920,
                maxHeight: 1080
            });

            // Convert to highly optimized WebP format client-side (reduces size to ~100-200kb)
            canvas.toBlob(async (blob) => {
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    const base64Data = reader.result.split(',')[1];
                    const fileName = `media/img-${Date.now()}.webp`;
                    const filePath = `posts/${fileName}`;

                    try {
                        const uploadResponse = await fetch(`https://api.github.com/repos/${gitConfig.owner}/${gitConfig.repo}/contents/${filePath}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `token ${gitConfig.token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                message: `upload media: ${fileName}`,
                                content: base64Data,
                                branch: gitConfig.branch
                            })
                        });

                        if (!uploadResponse.ok) {
                            throw new Error('Failed to upload image file to GitHub.');
                        }

                        const uploadData = await uploadResponse.json();
                        // Generate Relative Link for portability in static hosting
                        const relativeUrl = `posts/${fileName}`;
                        
                        // Insert cropped image into editor
                        const range = quill.getSelection();
                        quill.insertEmbed(range ? range.index : 0, 'image', relativeUrl);
                        
                        cropperModal.hide();
                    } catch (error) {
                        alert(`Upload failed: ${error.message}`);
                    } finally {
                        cropSaveBtn.disabled = false;
                        cropSaveBtn.textContent = 'Crop & Upload';
                    }
                };
            }, 'image/webp', 0.8);

        } catch (error) {
            alert(`Cropper failed: ${error.message}`);
            cropSaveBtn.disabled = false;
            cropSaveBtn.textContent = 'Crop & Upload';
        }
    });

    // 6. VIDEO EMBEDDING HOOKS
    insertVideoBtn.addEventListener('click', () => {
        const url = videoUrlInput.value.trim();
        if (!url) return;

        let embedHTML = '';

        // Check if YouTube
        const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const ytMatch = url.match(ytRegex);

        if (ytMatch && ytMatch[1]) {
            const videoId = ytMatch[1];
            embedHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
        } else if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg')) {
            // Direct HTML5 Video Link
            embedHTML = `<video src="${url}" controls></video>`;
        } else {
            // Treat as general URL link fallback inside dynamic player frame
            embedHTML = `<iframe src="${url}" frameborder="0" allowfullscreen></iframe>`;
        }

        const range = quill.getSelection();
        const index = range ? range.index : 0;
        quill.clipboard.dangerouslyPasteHTML(index, embedHTML + '<p></p>'); // Add padding paragraph
        
        // Reset and hide
        videoUrlInput.value = '';
        videoModal.hide();
    });

    // 7. TAB CHANGED LISTENER (LOADS MANAGED POSTS)
    document.getElementById('manage-tab').addEventListener('click', () => {
        loadManagePosts();
    });

    async function loadManagePosts() {
        postsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-5 text-muted">
                    <div class="minimal-spinner" role="status"></div>
                    <div class="mt-2 fs-8 font-sans">Fetching posts index from Git...</div>
                </td>
            </tr>
        `;

        try {
            const response = await fetch(`https://api.github.com/repos/${gitConfig.owner}/${gitConfig.repo}/contents/posts.json?ref=${gitConfig.branch}`, {
                headers: {
                    'Authorization': `token ${gitConfig.token}`,
                    'Cache-Control': 'no-cache'
                }
            });

            if (response.status === 404) {
                // posts.json does not exist yet in repo
                postsIndex = [];
                postsIndexSha = null;
                postsTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center py-4 text-muted fs-8 font-sans">No posts index posts.json found. Creating index on first publish.</td>
                    </tr>
                `;
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to retrieve posts.json');
            }

            const data = await response.json();
            postsIndexSha = data.sha;
            postsIndex = JSON.parse(b64_to_utf8(data.content));

            renderManageTable();
        } catch (error) {
            postsTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger py-4 fs-8 font-sans">Error: ${error.message}</td>
                </tr>
            `;
        }
    }

    function renderManageTable() {
        if (postsIndex.length === 0) {
            postsTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-4 text-muted fs-8 font-sans">Your posts index is currently empty.</td>
                </tr>
            `;
            return;
        }

        postsTableBody.innerHTML = '';
        postsIndex.forEach((post, index) => {
            const row = document.createElement('tr');
            
            // Format Tags
            const tagsHTML = (post.tags || []).map(t => `<span class="badge bg-light text-muted border font-sans fs-9 px-2 py-1 me-1">${t}</span>`).join('');

            // Format date
            let displayDate = post.date;
            try {
                const dateObj = new Date(post.date);
                if (!isNaN(dateObj)) {
                    displayDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                }
            } catch (e) {
                console.error(e);
            }

            row.innerHTML = `
                <td class="py-3 px-3 fs-8 font-sans text-muted" style="white-space: nowrap;">${displayDate}</td>
                <td class="py-3 fw-bold"><a href="post.html?id=${post.id}" target="_blank" class="text-decoration-none text-dark">${post.title}</a></td>
                <td class="py-3">${tagsHTML}</td>
                <td class="py-3 text-end px-3" style="white-space: nowrap;">
                    <button class="btn btn-sm btn-outline-danger border-0 font-sans fs-9 delete-post-btn" data-index="${index}">Delete</button>
                </td>
            `;
            postsTableBody.appendChild(row);
        });

        // Add action listeners
        document.querySelectorAll('.delete-post-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                const post = postsIndex[index];
                if (confirm(`Are you sure you want to delete the post "${post.title}"? This will update your posts.json index and remove the article file.`)) {
                    await deletePost(index);
                }
            });
        });
    }

    // 8. DELETE POST WORKFLOW (INDEX AND FILE REMOVAL)
    async function deletePost(indexToDelete) {
        const post = postsIndex[indexToDelete];
        
        // Remove from memory index
        postsIndex.splice(indexToDelete, 1);

        // Clear old alerts
        manageAlert.className = 'alert d-none';

        try {
            // A. Update posts.json on GitHub
            const updateIndexResponse = await fetch(`https://api.github.com/repos/${gitConfig.owner}/${gitConfig.repo}/contents/posts.json`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${gitConfig.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `delete post: remove ${post.id} from index`,
                    content: utf8_to_b64(JSON.stringify(postsIndex, null, 2)),
                    sha: postsIndexSha,
                    branch: gitConfig.branch
                })
            });

            if (!updateIndexResponse.ok) {
                throw new Error('Failed to update index file posts.json');
            }

            const indexData = await updateIndexResponse.json();
            postsIndexSha = indexData.content.sha; // Save updated SHA

            // B. Optional: Try to delete the markdown file from Git
            try {
                // First get the sha of the markdown file
                const getFileResponse = await fetch(`https://api.github.com/repos/${gitConfig.owner}/${gitConfig.repo}/contents/${post.file}?ref=${gitConfig.branch}`, {
                    headers: { 'Authorization': `token ${gitConfig.token}` }
                });

                if (getFileResponse.ok) {
                    const fileData = await getFileResponse.json();
                    
                    // Call delete API
                    await fetch(`https://api.github.com/repos/${gitConfig.owner}/${gitConfig.repo}/contents/${post.file}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `token ${gitConfig.token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: `delete post file: ${post.file}`,
                            sha: fileData.sha,
                            branch: gitConfig.branch
                        })
                    });
                }
            } catch (fileErr) {
                console.warn('Post file deletion failed, but index was updated. File might be missing.', fileErr);
            }

            // Success Alert
            manageAlert.textContent = `Post "${post.title}" deleted successfully.`;
            manageAlert.className = 'alert alert-success border-0 rounded-0 bg-transparent text-success p-0 mb-4';
            
            // Reload
            renderManageTable();
        } catch (error) {
            manageAlert.textContent = `Deletion failed: ${error.message}`;
            manageAlert.className = 'alert alert-danger border-0 rounded-0 bg-transparent text-danger p-0 mb-4';
        }
    }

    // 9. SUBMIT FORM (PUBLISHING TO GITHUB)
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Check editor content
        const quillHtml = quill.getSemanticHTML();
        const quillText = quill.getText().trim();
        if (!quillText || quillText === '') {
            alert('Blog content is required');
            return;
        }

        const title = postTitleInput.value.trim();
        const summary = postSummaryInput.value.trim();
        
        // Process tags
        const tags = postTagsInput.value.split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        // Generate Slug ID
        const slug = title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
        const postId = `${slug}-${Date.now().toString().slice(-4)}`;

        // Convert HTML to clean markdown using Turndown
        const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced'
        });
        const markdown = turndownService.turndown(quillHtml);

        // UI Loading State
        publishAlert.className = 'alert d-none';
        publishSubmitBtn.disabled = true;
        publishBtnText.textContent = 'PUBLISHING TO GITHUB...';
        publishBtnSpinner.classList.remove('d-none');

        try {
            // A. Commit new Markdown file to repo
            const fileCommitsResponse = await fetch(`https://api.github.com/repos/${gitConfig.owner}/${gitConfig.repo}/contents/posts/${postId}.md`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${gitConfig.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `publish post: ${title}`,
                    content: utf8_to_b64(markdown),
                    branch: gitConfig.branch
                })
            });

            if (!fileCommitsResponse.ok) {
                throw new Error('Failed to create markdown article file in GitHub posts/ folder.');
            }

            // B. Fetch existing posts.json for its current sha
            const indexFetchResponse = await fetch(`https://api.github.com/repos/${gitConfig.owner}/${gitConfig.repo}/contents/posts.json?ref=${gitConfig.branch}`, {
                headers: { 'Authorization': `token ${gitConfig.token}` }
            });

            let currentPosts = [];
            let indexSha = null;

            if (indexFetchResponse.ok) {
                const indexData = await indexFetchResponse.json();
                indexSha = indexData.sha;
                currentPosts = JSON.parse(b64_to_utf8(indexData.content));
            } else if (indexFetchResponse.status !== 404) {
                throw new Error('Failed to retrieve index database file.');
            }

            // Create post metadata item
            const newPostMeta = {
                id: postId,
                title: title,
                summary: summary,
                date: new Date().toISOString().split('T')[0], // e.g. 2026-05-28
                tags: tags,
                file: `posts/${postId}.md`
            };

            // Prepend new post (newest first)
            currentPosts.unshift(newPostMeta);

            // C. Commit updated posts.json index
            const updateIndexResponse = await fetch(`https://api.github.com/repos/${gitConfig.owner}/${gitConfig.repo}/contents/posts.json`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${gitConfig.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `update index for post: ${title}`,
                    content: utf8_to_b64(JSON.stringify(currentPosts, null, 2)),
                    sha: indexSha, // If it's a new file, indexSha is null, which is fine
                    branch: gitConfig.branch
                })
            });

            if (!updateIndexResponse.ok) {
                throw new Error('Failed to update index database file posts.json');
            }

            // Success Alert
            publishAlert.innerHTML = `
                <h4 class="alert-heading fw-bold">Published successfully!</h4>
                <p class="font-serif">The article "${title}" was pushed directly to GitHub. In 1-2 minutes, GitHub Pages will deploy this update and the post will appear on your homepage.</p>
                <hr>
                <p class="mb-0 fs-8"><a href="post.html?id=${postId}" target="_blank" class="text-decoration-underline text-success">View Live Post Template</a> &bull; <a href="index.html" class="text-decoration-underline text-success">Go to Homepage</a></p>
            `;
            publishAlert.className = 'alert alert-success border-0 rounded-0 bg-transparent text-success p-0 mb-4';

            // Reset Form & Editor
            postForm.reset();
            quill.setText('');

        } catch (error) {
            publishAlert.textContent = `Publishing failed: ${error.message}`;
            publishAlert.className = 'alert alert-danger border-0 rounded-0 bg-transparent text-danger p-0 mb-4';
        } finally {
            publishSubmitBtn.disabled = false;
            publishBtnText.textContent = 'PUBLISH BLOG POST';
            publishBtnSpinner.classList.add('d-none');
        }
    });

    // Check credentials on load
    checkAuth();
});

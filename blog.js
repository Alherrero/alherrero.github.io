document.addEventListener("DOMContentLoaded", () => {
    const postsListWrapper = document.getElementById('posts-list-wrapper');
    const postsList = document.getElementById('posts-list');
    const postView = document.getElementById('post-view');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');

    // Elementos de herramientas
    const toolsList = document.getElementById('tools-list');
    const prevToolPageBtn = document.getElementById('prev-tool-page');
    const nextToolPageBtn = document.getElementById('next-tool-page');

    // Elementos del buscador y filtros
    const searchInput = document.getElementById('search-input');
    const filterAllBtn = document.getElementById("filter-all");
    const filterPostsBtn = document.getElementById("filter-posts");
    const filterWriteupsBtn = document.getElementById("filter-writeups");
    const filterButtons = [filterAllBtn, filterPostsBtn, filterWriteupsBtn];

    let filteredPosts = [];
    const postsPerPage = 6;
    let allPosts = [];
    let allTools = [];
    let currentPage = 1;
    let currentToolPage = 1;

    // Se elimina la función getPostIdFromPath ya que ahora se usará un parámetro de consulta

    /**
     * Función para manejar el botón "Atrás" (Volver al índice).
     * Se asegura de que la URL no tenga parámetros de post.
     */
    function handleBack() {
        // Vuelve a la URL raíz, eliminando cualquier parámetro de consulta (ej. ?post=...)
        window.history.pushState({}, '', '/'); 
        renderPostPage(1);
        postView.classList.add("hidden");
        postsListWrapper.classList.remove("hidden");
        document.title = "Alherrero | Ciberseguridad";
    }

    // --- Funciones para Posts ---

    function renderPosts(posts) {
        postsList.innerHTML = '';
        posts.forEach((post) => {
            let badgeClass = "";
            let badgeText = "";
            switch (post.tipo) {
                case "post":
                    // El badge de post se mantiene azul para diferenciar el tipo de contenido
                    badgeClass = "bg-blue-500 text-black";
                    badgeText = "Post";
                    break;
                case "writeup":
                    // El badge de writeup se mantiene verde para diferenciar el tipo de contenido
                    badgeClass = "bg-green-500 text-black";
                    badgeText = "Writeup";
                    break;
                case "herramienta": 
                    // El badge de herramienta se mantiene amarillo para diferenciar el tipo de contenido
                    badgeClass = "bg-yellow-400 text-black"; 
                    badgeText = "Herramienta";
                    break;
                default:
                    badgeClass = "bg-gray-700 text-black";
                    badgeText = "Otro";
            }

            const card = document.createElement('div');
            // MODIFICACIÓN: Efectos hover de la tarjeta cambiados de azul a rojo
            card.className = `bg-neutral-900 border border-neutral-700 p-6 flex flex-col justify-between 
                              transition-all duration-300 cursor-pointer 
                              hover:bg-neutral-800 hover:scale-[1.01] hover:border-red-600 hover:shadow-lg hover:shadow-red-500/10`;
            
            card.innerHTML = `
                <div>
                    <!-- Tipo y Fecha en la parte superior -->
                    <div class="flex items-center justify-between mb-3 text-xs text-gray-400">
                        <span class="inline-block px-2 py-0.5 font-semibold ${badgeClass}">${badgeText}</span>
                        <span>Publicado: ${post.fecha}</span>
                    </div>

                    <h3 class="text-xl font-bold text-gray-100 mb-3">${post.nombre}</h3>
                    <p class="text-gray-400 text-sm leading-relaxed mb-4">${post.descripcion}</p>
                </div>
                
                <!-- Footer de la tarjeta: Lectura y Botón -->
                <div class="flex items-center justify-between pt-4 border-t border-neutral-800">
                    <span class="text-xs text-gray-500">${post.hora_lectura} de lectura</span>
                    
                    <button 
                        data-post-id="${post.id}"
                        class="post-view-link px-4 py-2 bg-red-600 text-white text-sm font-medium rounded
                               hover:bg-red-700 transition duration-200 ease-in-out border border-red-600">
                        Leer Post →
                    </button>
                </div>
            `;
            postsList.appendChild(card);
        });

        // Añadir listeners para los nuevos botones "Leer Post"
        postsList.querySelectorAll('.post-view-link').forEach(button => {
            button.onclick = (e) => {
                const postId = e.target.dataset.postId;
                const post = allPosts.find(p => p.id === postId);
                if (post) {
                    // MODIFICACIÓN CLAVE: Usar el formato de URL compartible ?post=ruta_del_post
                    window.history.pushState(post, post.nombre, `/?post=${post.ruta}`);
                    showPost(post);
                }
            };
        });
    }

    function showPost(post) {
        // Obtenemos el contenido Markdown del post
        fetch(`/${post.ruta}`)
            .then(res => res.text()) // El contenido (md) es la fuente Markdown sin procesar
            .then(markdownText => {
                // Generar el HTML usando la estructura de post individual
                postView.innerHTML = `
                <div class="card p-6 sm:p-8 bg-neutral-900 border border-neutral-700"> <!-- Fondo de post individual consistente -->
                    <!-- Botón Volver al Índice (Superior) -->
                    <button id="back-top" class="back-btn mb-6 inline-block 
                        px-4 py-1 border border-neutral-800 bg-neutral-900 text-gray-200 rounded
                        hover:bg-neutral-800 transition duration-200 ease-in-out text-sm font-medium">
                        ← Volver al Índice
                    </button>
                    
                    <h1 class="text-3xl font-bold mb-2 text-gray-100">${post.nombre}</h1> 
                    
                    <!-- Meta info: Tipo, Fecha y Lectura -->
                    <div class="flex items-center space-x-4 mb-6 text-sm text-gray-500">
                        <span class="inline-block px-2 py-0.5 text-xs font-semibold ${post.tipo === 'writeup' ? 'bg-green-500 text-black' : 'bg-blue-500 text-black'}">${post.tipo === 'writeup' ? 'Writeup' : 'Post'}</span>
                        <span>Publicado: ${post.fecha}</span>
                        <span>${post.hora_lectura} de lectura</span>
                    </div>

                    <div class="markdown-content text-left text-gray-300 space-y-4"> 
                        ${marked.parse(markdownText)}
                    </div>
                    
                    <!-- Botón Volver al Índice (Inferior) -->
                    <button id="back-bottom" class="back-btn mt-8 inline-block 
                        px-6 py-2 bg-red-600 text-white text-sm font-medium rounded
                        hover:bg-red-700 transition duration-200 ease-in-out border border-red-600">
                        ← Volver al Índice
                    </button>
                </div>
            `;
                postsListWrapper.classList.add("hidden");
                postView.classList.remove("hidden");
                
                // Actualizar el título de la página
                document.title = `Alherrero | ${post.nombre}`;

                // Asignar la función handleBack a los botones de regreso
                const backBtns = postView.querySelectorAll(".back-btn");
                backBtns.forEach(btn => {
                    btn.onclick = handleBack;
                });
            })
            .catch(error => {
                console.error("Error al cargar el post:", error);
                // Mostrar un mensaje de error o volver a la lista si falla
                postView.innerHTML = `<p class="text-red-500">Error al cargar el post: ${error.message || error}. Asegúrate de que el archivo Markdown existe.</p>`;
                
                // Si la carga falla, aseguramos que la vista del post es visible para mostrar el error.
                postsListWrapper.classList.add("hidden");
                postView.classList.remove("hidden");
            });
    }

    function renderPostPage(page) {
        currentPage = page;
        const postsToRender = filteredPosts.length > 0 ? filteredPosts : allPosts;
        const start = (currentPage - 1) * postsPerPage;
        const end = start + postsPerPage;
        const postsToShow = postsToRender.slice(start, end);
        renderPosts(postsToShow);

        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = end >= postsToRender.length;

        const pageIndicator = document.getElementById("posts-page-indicator");
        if (pageIndicator) {
            const totalPages = Math.ceil(postsToRender.length / postsPerPage);
            pageIndicator.textContent = `${currentPage} / ${totalPages}`;
        }
    }

    prevPageBtn.onclick = () => {
        if (currentPage > 1) {
            renderPostPage(currentPage - 1);
        }
    };

    nextPageBtn.onclick = () => {
        const postsToRender = filteredPosts.length > 0 ? filteredPosts : allPosts;
        if ((currentPage * postsPerPage) < postsToRender.length) {
            renderPostPage(currentPage + 1);
        }
    };

    // --- Funciones para Herramientas ---

    function renderTools(tools) {
        toolsList.innerHTML = '';
        tools.forEach((tool) => {
            const card = document.createElement('div');
            // MODIFICACIÓN: Efectos hover de la tarjeta cambiados de azul a rojo
            card.className = `bg-neutral-900 border border-neutral-700 p-6 flex flex-col justify-between 
                              transition-all duration-300 cursor-pointer 
                              hover:bg-neutral-800 hover:scale-[1.01] hover:border-red-600 hover:shadow-lg hover:shadow-red-500/10`;
            
            card.innerHTML = `
                <div>
                    <h3 class="text-xl font-bold text-gray-100 mb-2">${tool.nombre}</h3>
                    <p class="text-gray-400 text-sm leading-relaxed mb-4">${tool.descripcion}</p>
                </div>
                <!-- Separador -->
                <div class="pt-4 border-t border-neutral-800">
                    <a href="${tool.url}" target="_blank" 
                        class="px-4 py-2 bg-red-600 text-white text-sm font-medium w-full block text-center rounded
                               hover:bg-red-700 transition duration-200 ease-in-out border border-red-600">
                        Ver en GitHub →
                    </a>
                </div>
            `;
            toolsList.appendChild(card);
        });
    }
    
    function renderToolPage(page) {
        currentToolPage = page;
        const start = (currentToolPage - 1) * postsPerPage;
        const end = start + postsPerPage;
        const toolsToShow = allTools.slice(start, end);
        renderTools(toolsToShow);
    
        prevToolPageBtn.disabled = currentToolPage === 1;
        nextToolPageBtn.disabled = end >= allTools.length;

        const pageIndicator = document.getElementById("tools-page-indicator");
        if (pageIndicator) {
            const totalPages = Math.ceil(allTools.length / postsPerPage);
            pageIndicator.textContent = `${currentToolPage} / ${totalPages}`;
        }
    }

    prevToolPageBtn.onclick = () => {
        if (currentToolPage > 1) {
            renderToolPage(currentToolPage - 1);
        }
    };

    nextToolPageBtn.onclick = () => {
        if ((currentToolPage * postsPerPage) < allTools.length) {
            renderToolPage(currentToolPage + 1);
        }
    };
    
    // --- Buscador ---
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        if (query.trim() === '') {
            filteredPosts = [...allPosts];
        } else {
            filteredPosts = allPosts.filter(post => 
                post.nombre.toLowerCase().includes(query) ||
                post.descripcion.toLowerCase().includes(query)
            );
        }
        
        renderPostPage(1);
    });

    // --- Filtros ---
    function setActiveFilter(button) {
        filterButtons.forEach(btn => {
            btn.classList.remove("ring-2", "ring-gray-700");
        });
        button.classList.add("ring-2", "ring-gray-700");
    }

    filterAllBtn.addEventListener("click", () => {
        filteredPosts = [...allPosts];
        renderPostPage(1);
        setActiveFilter(filterAllBtn);
    });

    filterPostsBtn.addEventListener("click", () => {
        filteredPosts = allPosts.filter(p => p.tipo === "post");
        renderPostPage(1);
        setActiveFilter(filterPostsBtn);
    });

    filterWriteupsBtn.addEventListener("click", () => {
        filteredPosts = allPosts.filter(p => p.tipo === "writeup");
        renderPostPage(1);
        setActiveFilter(filterWriteupsBtn);
    });

    // --- Carga inicial ---
    fetch('posts.json')
        .then(res => res.json())
        .then(posts => {
            allPosts = posts.filter(p => p.tipo !== 'herramienta').map(post => ({
                ...post,
                // Usamos un ID simple para la navegación y búsqueda
                id: post.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
            }));
            
            allTools = posts.filter(p => p.tipo === 'herramienta').map(tool => ({
                ...tool,
                id: tool.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
            }));

            // Mostrar todos y marcar "Todos" al iniciar
            filteredPosts = [...allPosts];
            renderPostPage(1);
            setActiveFilter(filterAllBtn);

            renderToolPage(1);
            
            // NUEVA LÓGICA DE CARGA INICIAL: Comprobar si hay un post en la URL para compartir
            const urlParams = new URLSearchParams(window.location.search);
            const sharedPostRoute = urlParams.get('post'); // Busca el valor de ?post=...

            if (sharedPostRoute) {
                const sharedPost = allPosts.find(p => p.ruta === sharedPostRoute);
                if (sharedPost) {
                    // Si encontramos el post, lo mostramos y detenemos la carga de la vista de lista
                    showPost(sharedPost);
                    return; 
                } else {
                    // Si no se encuentra, limpiamos la URL para evitar errores
                    window.history.replaceState({}, '', '/');
                }
            }
        });

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const postsPagination = document.getElementById('posts-pagination-controls');
    const toolsPagination = document.getElementById('tools-pagination-controls');
    
    function setActiveTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-gray-100');
            btn.classList.add('border-transparent');
        });
        const activeContent = document.getElementById(tabId + '-section');
        const activeBtn = document.getElementById('tab-' + tabId);
        if (activeContent) activeContent.classList.remove('hidden');
        if (activeBtn) {
            activeBtn.classList.add('border-gray-100');
            activeBtn.classList.remove('border-transparent');
        }
    
        // APLICADO: Corregir la lógica para mostrar/ocultar la paginación correctamente
        if (tabId === 'posts') {
            if (postsPagination) postsPagination.classList.remove('hidden');
            if (toolsPagination) toolsPagination.classList.add('hidden');
        } else if (tabId === 'tools') {
            // CORREGIDO: Usar toolsPagination aquí para mostrar la paginación de herramientas
            if (toolsPagination) toolsPagination.classList.remove('hidden'); 
            if (postsPagination) postsPagination.classList.add('hidden');
        }
    }
    
    tabBtns.forEach(btn => {
        btn.onclick = () => {
            const tabId = btn.id.replace('tab-', '');
            setActiveTab(tabId);
        };
    });
    
    // Inicializar la vista
    setActiveTab('posts');

    /**
     * Manejar la navegación del historial (botón de atrás del navegador).
     * Ahora comprueba el parámetro de consulta 'post' para mostrar el contenido.
     */
    window.onpopstate = (event) => {
        const urlParams = new URLSearchParams(window.location.search);
        const postRoute = urlParams.get('post');

        const post = allPosts.find(p => p.ruta === postRoute);

        if (post) {
            // Si el usuario regresa a la vista de un post (con ?post=x)
            showPost(post);
        } else {
            // Si el usuario regresa a la vista principal (sin ?post=x)
            handleBack(); 
        }
    };
});
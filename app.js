/**
 * TrypheneMart Application Engine with Node.js Backend Integration
 * Handles product rendering, authentication modal (Login/Register), JWT tokens, and checkout interception
 * Author: KEKE EUNICE TRYPHENE
 */

// ==========================================
// 1. GLOBAL APP STATE & AUTHENTICATION
// ==========================================
let appCart = JSON.parse(localStorage.getItem('tryphene_cart')) || [];
let currentUser = JSON.parse(localStorage.getItem('tryphene_user')) || null;
let authToken = localStorage.getItem('tryphene_token') || null;
let pendingCheckout = false;

const activeFilters = {
    regime: 'tous',
    category: 'tous',
    maxPrice: 500,
    brand: 'tous',
    searchQuery: '',
    sortBy: 'defaut'
};

let currentModalProduct = null;
let modalQuantityCounter = 1;

// Bootstrap Component Instances
let bsProductModal = null;
let bsConfirmationModal = null;
let bsCartDrawer = null;
let bsAuthModal = null;

// ==========================================
// 2. INITIALIZATION ON DOM READY
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap Component Instances
    const modalEl = document.getElementById('modal-detail-produit');
    if (modalEl) bsProductModal = new bootstrap.Modal(modalEl);

    const confirmEl = document.getElementById('modal-confirmation-commande');
    if (confirmEl) bsConfirmationModal = new bootstrap.Modal(confirmEl);

    const drawerEl = document.getElementById('tiroir-panier');
    if (drawerEl) bsCartDrawer = new bootstrap.Offcanvas(drawerEl);

    const authEl = document.getElementById('modal-auth');
    if (authEl) bsAuthModal = new bootstrap.Modal(authEl);

    // Setup Event Listeners
    setupEventListeners();
    setupAuthEventListeners();

    // Initial UI Updates
    updateAuthUI();
    fetchProductsFromBackend();
    updateCartDisplay();
});

// Map backend category names/IDs to frontend slugs used in filtering
const CATEGORY_SLUG_MAP = {
    'Fruits & Vegetables': 'fruits-veg',
    'Fruits and Vegetables': 'fruits-veg',
    'fruits-vegetables': 'fruits-veg',
    'fruits_veg': 'fruits-veg',
    'Dairy & Bakery': 'dairy-bakery',
    'Dairy and Bakery': 'dairy-bakery',
    'dairy_bakery': 'dairy-bakery',
    'Snacks & Munchies': 'snacks',
    'Snacks': 'snacks',
    'Beverages & Teas': 'beverages',
    'Beverages': 'beverages',
    'Household & Cleaning': 'household',
    'Household': 'household'
};

// Fetch products from backend API (with fallback to local dataset)
async function fetchProductsFromBackend() {
    try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
            data.data.forEach(p => {
                // Normalize price unit
                if (!p.priceUnit) p.priceUnit = p.price_unit || 'per item';
                // Normalize veg flag
                if (p.isVeg === undefined && p.is_veg !== undefined) p.isVeg = (p.is_veg === 1 || p.is_veg === true);
                // Normalize review count
                if (!p.reviewCount && p.review_count !== undefined) p.reviewCount = p.review_count;
                // Normalize promo flag
                if (p.isPromo === undefined && p.is_promo !== undefined) p.isPromo = (p.is_promo === 1 || p.is_promo === true);
                // Normalize old price
                if (!p.oldPrice && p.old_price !== undefined) p.oldPrice = p.old_price;
                // Normalize category slug for filtering
                if (!p.category && p.category_name) {
                    p.category = CATEGORY_SLUG_MAP[p.category_name] || p.category_name.toLowerCase().replace(/[^a-z]/g, '-');
                } else if (p.category && CATEGORY_SLUG_MAP[p.category]) {
                    p.category = CATEGORY_SLUG_MAP[p.category];
                }
                // Normalize category display name
                if (!p.categoryName && p.category_name) p.categoryName = p.category_name;
            });
            window.productList = data.data;
        }
    } catch (err) {
        console.warn('Backend API offline or returned error — using local products database.', err.message);
    }
    renderProducts();
}

// ==========================================
// 3. AUTHENTICATION UI & EVENT LISTENERS
// ==========================================
function updateAuthUI() {
    const btnAuthOpen = document.getElementById('btn-ouvrir-auth-modal');
    const userDropdown = document.getElementById('dropdown-compte-utilisateur');
    const userNameNav = document.getElementById('nav-nom-utilisateur');

    if (authToken && currentUser) {
        if (btnAuthOpen) btnAuthOpen.classList.add('d-none');
        if (userDropdown) userDropdown.classList.remove('d-none');
        if (userNameNav) userNameNav.textContent = currentUser.full_name || 'My Account';
    } else {
        if (btnAuthOpen) btnAuthOpen.classList.remove('d-none');
        if (userDropdown) userDropdown.classList.add('d-none');
    }
}

function setupAuthEventListeners() {
    // Login Form Submission
    const formLogin = document.getElementById('form-login');
    const alertAuthError = document.getElementById('alert-auth-erreur');

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            if (alertAuthError) alertAuthError.classList.add('d-none');

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    authToken = data.token;
                    currentUser = data.user;
                    localStorage.setItem('tryphene_token', authToken);
                    localStorage.setItem('tryphene_user', JSON.stringify(currentUser));

                    updateAuthUI();
                    if (bsAuthModal) bsAuthModal.hide();
                    showToast(`Welcome back, ${currentUser.full_name}! 👋`);

                    if (pendingCheckout) {
                        pendingCheckout = false;
                        processCheckoutOrder();
                    }
                } else {
                    if (alertAuthError) {
                        alertAuthError.textContent = data.message || 'Login failed. Please check credentials.';
                        alertAuthError.classList.remove('d-none');
                    }
                }
            } catch (err) {
                if (alertAuthError) {
                    alertAuthError.textContent = 'Server connection error. Please try again.';
                    alertAuthError.classList.remove('d-none');
                }
            }
        });
    }

    // Register Form Submission
    const formRegister = document.getElementById('form-register');
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const full_name = document.getElementById('reg-fullname').value;
            const email = document.getElementById('reg-email').value;
            const phone = document.getElementById('reg-phone').value;
            const password = document.getElementById('reg-password').value;

            if (alertAuthError) alertAuthError.classList.add('d-none');

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ full_name, email, phone, password })
                });

                const data = await response.json();

                if (data.success) {
                    authToken = data.token;
                    currentUser = data.user;
                    localStorage.setItem('tryphene_token', authToken);
                    localStorage.setItem('tryphene_user', JSON.stringify(currentUser));

                    updateAuthUI();
                    if (bsAuthModal) bsAuthModal.hide();
                    showToast(`Account created! Welcome to TrypheneMart, ${currentUser.full_name}! 🎉`);

                    if (pendingCheckout) {
                        pendingCheckout = false;
                        processCheckoutOrder();
                    }
                } else {
                    if (alertAuthError) {
                        alertAuthError.textContent = data.message || 'Registration failed.';
                        alertAuthError.classList.remove('d-none');
                    }
                }
            } catch (err) {
                if (alertAuthError) {
                    alertAuthError.textContent = 'Server connection error. Please try again.';
                    alertAuthError.classList.remove('d-none');
                }
            }
        });
    }

    // Logout Button
    const btnLogout = document.getElementById('btn-deconnexion');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            authToken = null;
            currentUser = null;
            localStorage.removeItem('tryphene_token');
            localStorage.removeItem('tryphene_user');
            updateAuthUI();
            showToast('Logged out successfully.');
        });
    }
}

// ==========================================
// 4. EVENT LISTENERS SETUP
// ==========================================
function setupEventListeners() {
    const searchInput = document.getElementById('input-recherche-nav');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            activeFilters.searchQuery = e.target.value.trim().toLowerCase();
            renderProducts();
        });
    }

    const categoryCards = document.querySelectorAll('.carte-categorie');
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            categoryCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            const catValue = card.dataset.categorie;
            activeFilters.category = catValue;

            // Sync the sidebar category select dropdown
            const sidebarCatSelect = document.getElementById('select-filtre-categorie');
            if (sidebarCatSelect) sidebarCatSelect.value = catValue;

            renderProducts();

            // Scroll smoothly to the products grid section
            const productsSection = document.getElementById('produits');
            if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    const catSelect = document.getElementById('select-filtre-categorie');
    if (catSelect) {
        catSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            activeFilters.category = val;

            categoryCards.forEach(card => {
                if (card.dataset.categorie === val) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });

            renderProducts();
        });
    }

    const regimeBtns = document.querySelectorAll('.filtre-regime-btn');
    regimeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            regimeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilters.regime = btn.dataset.regime;
            renderProducts();
        });
    });

    const priceRange = document.getElementById('curseur-prix-max');
    const priceDisplay = document.getElementById('valeur-prix-max');
    if (priceRange && priceDisplay) {
        priceRange.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            activeFilters.maxPrice = val;
            priceDisplay.textContent = `₹ ${val.toFixed(0)}`;
            renderProducts();
        });
    }

    const brandSelect = document.getElementById('select-filtre-marque');
    if (brandSelect) {
        brandSelect.addEventListener('change', (e) => {
            activeFilters.brand = e.target.value;
            renderProducts();
        });
    }

    const sortSelect = document.getElementById('select-tri-produits');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            activeFilters.sortBy = e.target.value;
            renderProducts();
        });
    }

    const btnReset = document.getElementById('btn-reinitialiser-filtres');
    const btnResetNoRes = document.getElementById('btn-reset-aucun-resultat');

    const resetAllFilters = () => {
        activeFilters.regime = 'tous';
        activeFilters.category = 'tous';
        activeFilters.maxPrice = 500;
        activeFilters.brand = 'tous';
        activeFilters.searchQuery = '';
        activeFilters.sortBy = 'defaut';

        if (searchInput) searchInput.value = '';
        if (catSelect) catSelect.value = 'tous';
        if (brandSelect) brandSelect.value = 'tous';
        if (sortSelect) sortSelect.value = 'defaut';
        if (priceRange && priceDisplay) {
            priceRange.value = 500;
            priceDisplay.textContent = '₹ 500';
        }

        regimeBtns.forEach(b => {
            if (b.dataset.regime === 'tous') b.classList.add('active');
            else b.classList.remove('active');
        });

        categoryCards.forEach(c => {
            if (c.dataset.categorie === 'tous') c.classList.add('active');
            else c.classList.remove('active');
        });

        renderProducts();
    };

    if (btnReset) btnReset.addEventListener('click', resetAllFilters);
    if (btnResetNoRes) btnResetNoRes.addEventListener('click', resetAllFilters);

    const btnMinusModal = document.getElementById('btn-modal-quantite-moins');
    const btnPlusModal = document.getElementById('btn-modal-quantite-plus');
    const modalQtyVal = document.getElementById('modal-valeur-quantite');

    if (btnMinusModal && btnPlusModal && modalQtyVal) {
        btnMinusModal.addEventListener('click', () => {
            if (modalQuantityCounter > 1) {
                modalQuantityCounter--;
                modalQtyVal.textContent = modalQuantityCounter;
            }
        });

        btnPlusModal.addEventListener('click', () => {
            modalQuantityCounter++;
            modalQtyVal.textContent = modalQuantityCounter;
        });
    }

    const btnModalAddToCart = document.getElementById('btn-modal-ajouter-panier');
    if (btnModalAddToCart) {
        btnModalAddToCart.addEventListener('click', () => {
            if (currentModalProduct) {
                addToCart(currentModalProduct.id, modalQuantityCounter);
                if (bsProductModal) bsProductModal.hide();
            }
        });
    }

    const btnCheckout = document.getElementById('btn-valider-commande');
    if (btnCheckout) {
        btnCheckout.addEventListener('click', () => {
            if (appCart.length === 0) return;

            if (!authToken || !currentUser) {
                pendingCheckout = true;

                const alertCheckoutNotice = document.getElementById('alert-checkout-auth');
                if (alertCheckoutNotice) alertCheckoutNotice.classList.remove('d-none');

                if (bsCartDrawer) bsCartDrawer.hide();
                if (bsAuthModal) bsAuthModal.show();
                return;
            }

            processCheckoutOrder();
        });
    }
}

async function processCheckoutOrder() {
    const alertCheckoutNotice = document.getElementById('alert-checkout-auth');
    if (alertCheckoutNotice) alertCheckoutNotice.classList.add('d-none');

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ items: appCart })
        });

        const data = await response.json();

        if (data.success && data.order) {
            const refEl = document.getElementById('recap-numero-commande');
            const paidEl = document.getElementById('recap-montant-regle');

            if (refEl) refEl.textContent = data.order.reference_code;
            if (paidEl) paidEl.textContent = `₹ ${data.order.total_amount}`;

            appCart = [];
            saveCartToLocalStorage();
            updateCartDisplay();

            if (bsCartDrawer) bsCartDrawer.hide();
            if (bsConfirmationModal) bsConfirmationModal.show();
        } else {
            showToast(data.message || 'Failed to place order.');
        }
    } catch (err) {
        const subtotal = calculateSubtotal();
        const orderRef = '#TRYP-' + Math.floor(10000 + Math.random() * 90000);

        const refEl = document.getElementById('recap-numero-commande');
        const paidEl = document.getElementById('recap-montant-regle');

        if (refEl) refEl.textContent = orderRef;
        if (paidEl) paidEl.textContent = `₹ ${subtotal.toFixed(2)}`;

        appCart = [];
        saveCartToLocalStorage();
        updateCartDisplay();

        if (bsCartDrawer) bsCartDrawer.hide();
        if (bsConfirmationModal) bsConfirmationModal.show();
    }
}

// ==========================================
// 5. DYNAMIC PRODUCT GRID RENDERING
// ==========================================
function renderProducts() {
    const gridContainer = document.getElementById('grille-produits');
    const noProductsMsg = document.getElementById('message-aucun-produit');
    const counterEl = document.getElementById('compteur-resultats-produits');

    const list = window.productList || productList;
    if (!gridContainer || !list) return;

    let filteredList = list.filter(p => {
        if (activeFilters.category !== 'tous' && p.category !== activeFilters.category) return false;
        if (activeFilters.regime === 'vege' && !p.isVeg) return false;
        if (activeFilters.regime === 'non-vege' && p.isVeg) return false;
        if (p.price > activeFilters.maxPrice) return false;
        if (activeFilters.brand !== 'tous' && p.brand !== activeFilters.brand) return false;

        if (activeFilters.searchQuery !== '') {
            const q = activeFilters.searchQuery;
            const nameMatch = p.name.toLowerCase().includes(q);
            const descMatch = p.description.toLowerCase().includes(q);
            const brandMatch = p.brand.toLowerCase().includes(q);
            if (!nameMatch && !descMatch && !brandMatch) return false;
        }

        return true;
    });

    if (activeFilters.sortBy === 'prix-croissant') {
        filteredList.sort((a, b) => a.price - b.price);
    } else if (activeFilters.sortBy === 'prix-decroissant') {
        filteredList.sort((a, b) => b.price - a.price);
    } else if (activeFilters.sortBy === 'note') {
        filteredList.sort((a, b) => b.rating - a.rating);
    }

    if (counterEl) {
        counterEl.textContent = `Showing ${filteredList.length} product(s)`;
    }

    if (filteredList.length === 0) {
        gridContainer.innerHTML = '';
        if (noProductsMsg) noProductsMsg.classList.remove('d-none');
        return;
    } else {
        if (noProductsMsg) noProductsMsg.classList.add('d-none');
    }

    let cardsHTML = '';
    filteredList.forEach(p => {
        const vegBadgeHTML = p.isVeg
            ? `<span class="badge-regime badge-vege"><i class="bi bi-circle-fill fs-6"></i> Veg</span>`
            : `<span class="badge-regime badge-non-vege"><i class="bi bi-circle-fill fs-6"></i> Non-Veg</span>`;

        const promoBadgeHTML = p.isPromo && p.oldPrice
            ? `<span class="badge-promo-reduction">SALE</span>`
            : '';

        const oldPriceHTML = p.oldPrice
            ? `<span class="prix-ancien">₹ ${p.oldPrice}</span>`
            : '';

        cardsHTML += `
      <div class="col-12 col-sm-6 col-md-4">
        <div class="carte-produit">
          <div class="produit-img-wrapper">
            <img src="${p.image || p.image_url}" alt="${p.name}" class="produit-img" loading="lazy">
            ${vegBadgeHTML}
            ${promoBadgeHTML}
          </div>
          <div class="corps-produit">
            <span class="categorie-tag">${p.categoryName || 'Grocery'}</span>
            <h5 class="titre-produit" title="${p.name}">${p.name}</h5>
            
            <div class="etoiles-notation">
              <i class="bi bi-star-fill text-warning"></i>
              <span class="fw-bold text-dark ms-1">${p.rating}</span>
              <span class="text-muted small">(${p.reviewCount || p.review_count || 0})</span>
            </div>

            <div class="d-flex align-items-baseline mb-3">
              <span class="prix-actuel">₹ ${p.price}</span>
              <span class="unite-prix ms-1">/ ${p.priceUnit || p.price_unit}</span>
              ${oldPriceHTML}
            </div>

            <div class="d-flex gap-2">
              <button class="btn-detail-apercu" onclick="openProductModal(${p.id})" title="Quick Preview">
                <i class="bi bi-eye-fill fs-5"></i>
              </button>
              <button class="btn-ajouter-produit" onclick="addToCart(${p.id}, 1)">
                <i class="bi bi-cart-plus-fill fs-5"></i> Add
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    });

    gridContainer.innerHTML = cardsHTML;
}

// ==========================================
// 6. PRODUCT MODAL DETAILS
// ==========================================
function openProductModal(productId) {
    const list = window.productList || productList;
    const p = list.find(item => item.id === productId);
    if (!p) return;

    currentModalProduct = p;
    modalQuantityCounter = 1;

    document.getElementById('modalTitreProduit').textContent = p.name;
    document.getElementById('modal-img-produit').src = p.image || p.image_url;
    document.getElementById('modal-img-produit').alt = p.name;
    document.getElementById('modal-categorie-badge').textContent = p.categoryName || 'Grocery';
    document.getElementById('modal-marque-produit').textContent = `Brand: ${p.brand}`;
    document.getElementById('modal-description-produit').textContent = p.description;
    document.getElementById('modal-prix-produit').textContent = `₹ ${p.price}`;
    document.getElementById('modal-unite-produit').textContent = `/ ${p.priceUnit || p.price_unit}`;
    document.getElementById('modal-valeur-quantite').textContent = modalQuantityCounter;

    const oldPriceEl = document.getElementById('modal-ancien-prix-produit');
    if (p.oldPrice) {
        oldPriceEl.textContent = `₹ ${p.oldPrice}`;
        oldPriceEl.classList.remove('d-none');
    } else {
        oldPriceEl.classList.add('d-none');
    }

    const badgeRegimeEl = document.getElementById('modal-badge-regime');
    badgeRegimeEl.innerHTML = p.isVeg
        ? `<span class="badge bg-success-subtle text-success fw-bold me-2"><i class="bi bi-check-circle-fill"></i> Vegetarian</span>`
        : `<span class="badge bg-danger-subtle text-danger fw-bold me-2"><i class="bi bi-x-circle-fill"></i> Non-Vegetarian</span>`;

    document.getElementById('modal-etoiles-html').innerHTML = `<i class="bi bi-star-fill text-warning"></i>`.repeat(Math.floor(p.rating));
    document.getElementById('modal-note-texte').textContent = `${p.rating} (${p.reviewCount || p.review_count || 0} customer reviews)`;

    if (bsProductModal) bsProductModal.show();
}

// ==========================================
// 7. CART MANAGEMENT & COMPUTATIONS
// ==========================================
function addToCart(productId, qty = 1) {
    const existingIndex = appCart.findIndex(item => item.id === productId);

    if (existingIndex !== -1) {
        appCart[existingIndex].quantite += qty;
    } else {
        appCart.push({ id: productId, quantite: qty });
    }

    saveCartToLocalStorage();
    updateCartDisplay();

    const list = window.productList || productList;
    const prod = list.find(p => p.id === productId);
    const prodName = prod ? prod.name : 'Item';
    showToast(`"${prodName}" added to cart!`);
}

function updateCartQuantity(productId, delta) {
    const item = appCart.find(i => i.id === productId);
    if (!item) return;

    item.quantite += delta;

    if (item.quantite <= 0) {
        removeFromCart(productId);
    } else {
        saveCartToLocalStorage();
        updateCartDisplay();
    }
}

function removeFromCart(productId) {
    appCart = appCart.filter(i => i.id !== productId);
    saveCartToLocalStorage();
    updateCartDisplay();
    showToast(`Item removed from cart`);
}

function calculateSubtotal() {
    const list = window.productList || productList;
    return appCart.reduce((sum, item) => {
        const p = list.find(prod => prod.id === item.id);
        return sum + (p ? p.price * item.quantite : 0);
    }, 0);
}

function updateCartDisplay() {
    const totalCount = appCart.reduce((sum, item) => sum + item.quantite, 0);

    const badgeDesktop = document.getElementById('badge-compteur-panier');
    const badgeMobile = document.getElementById('badge-compteur-panier-mobile');

    if (badgeDesktop) badgeDesktop.textContent = totalCount;
    if (badgeMobile) badgeMobile.textContent = totalCount;

    const cartListEl = document.getElementById('liste-elements-panier');
    const emptyMsgEl = document.getElementById('panier-vide-message');
    const summaryFooterEl = document.getElementById('panier-resume-footer');

    if (!cartListEl) return;

    if (appCart.length === 0) {
        cartListEl.innerHTML = '';
        if (emptyMsgEl) emptyMsgEl.classList.remove('d-none');
        if (summaryFooterEl) summaryFooterEl.classList.add('d-none');
        return;
    } else {
        if (emptyMsgEl) emptyMsgEl.classList.add('d-none');
        if (summaryFooterEl) summaryFooterEl.classList.remove('d-none');
    }

    let cartHTML = '';
    let subtotal = 0;

    const list = window.productList || productList;

    appCart.forEach(item => {
        const p = list.find(prod => prod.id === item.id);
        if (!p) return;

        const lineTotal = p.price * item.quantite;
        subtotal += lineTotal;

        cartHTML += `
      <div class="element-panier">
        <img src="${p.image || p.image_url}" alt="${p.name}" class="img-panier-thumb">
        <div class="flex-grow-1">
          <h6 class="nom-element-panier mb-1">${p.name}</h6>
          <div class="d-flex align-items-center justify-content-between">
            <span class="prix-element-panier">₹ ${lineTotal}</span>
            <div class="selecteur-quantite scale-75">
              <button class="btn-quantite" onclick="updateCartQuantity(${p.id}, -1)"><i class="bi bi-dash"></i></button>
              <span class="valeur-quantite">${item.quantite}</span>
              <button class="btn-quantite" onclick="updateCartQuantity(${p.id}, 1)"><i class="bi bi-plus"></i></button>
            </div>
          </div>
        </div>
        <button class="btn-supprimer-article" onclick="removeFromCart(${p.id})" title="Remove item">
          <i class="bi bi-trash3-fill"></i>
        </button>
      </div>
    `;
    });

    cartListEl.innerHTML = cartHTML;

    const shippingFee = subtotal >= 499 || subtotal === 0 ? 0 : 40;
    const gstTax = subtotal * 0.05;
    const totalAmount = subtotal + shippingFee + gstTax;

    const elSubtotal = document.getElementById('facture-sous-total');
    const elShipping = document.getElementById('facture-frais-livraison');
    const elTax = document.getElementById('facture-tva');
    const elTotal = document.getElementById('facture-total-general');

    if (elSubtotal) elSubtotal.textContent = `₹ ${subtotal.toFixed(2)}`;
    if (elShipping) {
        if (shippingFee === 0) {
            elShipping.textContent = 'FREE (Orders over ₹499)';
            elShipping.className = 'text-success fw-bold';
        } else {
            elShipping.textContent = '₹ 40.00';
            elShipping.className = 'text-dark fw-semibold';
        }
    }
    if (elTax) elTax.textContent = `₹ ${gstTax.toFixed(2)}`;
    if (elTotal) elTotal.textContent = `₹ ${totalAmount.toFixed(2)}`;
}

function saveCartToLocalStorage() {
    localStorage.setItem('tryphene_cart', JSON.stringify(appCart));
}

// ==========================================
// 8. TOAST NOTIFICATION CONTROLLER
// ==========================================
let toastTimer = null;
function showToast(msg) {
    const toastEl = document.getElementById('toast-notification');
    const msgEl = document.getElementById('toast-message');

    if (!toastEl || !msgEl) return;

    msgEl.textContent = msg;
    toastEl.classList.remove('d-none');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastEl.classList.add('d-none');
    }, 3000);
}

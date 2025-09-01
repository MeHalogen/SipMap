// SipMap - Cafe Discovery App
const API_BASE_URL = 'http://localhost:3000';

// Keep track of rejected cafe IDs
let rejectedCafes = new Set(JSON.parse(localStorage.getItem('rejectedCafes') || '[]'));

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for Enter key in search input
    document.getElementById('locationSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchByText();
        }
    });

    // Add keyframe animation for toast
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, 20px); }
            15% { opacity: 1; transform: translate(-50%, 0); }
            85% { opacity: 1; transform: translate(-50%, 0); }
            100% { opacity: 0; transform: translate(-50%, -20px); }
        }
    `;
    document.head.appendChild(style);
});

function showSkeletonCards(count = 3) {
    const container = document.querySelector('.cards');
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        container.innerHTML += `
            <div class="skeleton-card">
                <div class="skeleton-img"></div>
                <div class="skeleton-content">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
            </div>
        `;
    }
}

// Show skeletons while loading in searchByText
async function searchByText() {
    const searchInput = document.getElementById('locationSearch');
    const query = searchInput.value.trim();
    
    if (!query) {
        showError("Please enter a location to search");
        return;
    }

    document.querySelector('.cards').style.display = 'block';
    document.querySelector('.saved-cafes').style.display = 'none';
    // Clear the saved container to prevent z-index issues
    document.querySelector('.saved-cafes').innerHTML = '';
    showSkeletonCards(); // <--- show skeletons while loading
    try {
        const response = await fetch(`${API_BASE_URL}/api/search-cafes?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
            displayCards(data.results);
        } else {
            showError(`No cafes found in ${query}`);
        }
    } catch (e) {
        console.error("Error searching cafes:", e);
        showError("Error searching cafes. Please try again.");
    }
}

// Show skeletons while loading in getLocationCachedOrNew
function getLocationCachedOrNew() {
    document.querySelector('.cards').style.display = 'block';
    document.querySelector('.saved-cafes').style.display = 'none';
    // Clear the saved container to prevent z-index issues
    document.querySelector('.saved-cafes').innerHTML = '';
    showSkeletonCards(); // <--- show skeletons while loading
    const cache = JSON.parse(localStorage.getItem('cachedLocation') || '{}');
    const now = Date.now();
    if (cache.timestamp && now - cache.timestamp < 10 * 60 * 1000) {
        useLocation(cache.lat, cache.lng);
    } else {
        navigator.geolocation.getCurrentPosition(pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            localStorage.setItem('cachedLocation', JSON.stringify({ lat, lng, timestamp: now }));
            useLocation(lat, lng);
        }, () => showError("Location access denied or unavailable. Try searching by city name instead."));
    }
}

function showError(message) {
    const container = document.querySelector('.cards');
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #f44336; margin-bottom: 1rem;"></i>
            <p>${message}</p>
        </div>
    `;
}

async function useLocation(lat, lng) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/search-cafes?lat=${lat}&lng=${lng}`);
        const data = await response.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
            displayCards(data.results);
        } else {
            showError("No cafes found in your area.");
        }
    } catch (e) {
        console.error("Error fetching cafes:", e);
        showError("Error fetching cafes. Please make sure the server is running.");
    }
}

function getStarRating(rating) {
    if (!rating || rating === 'N/A') return '';
    const rounded = Math.round(parseFloat(rating) * 2) / 2; // round to nearest 0.5
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (rounded >= i) {
            stars += '<i class="fas fa-star" style="color:#fbbf24"></i>';
        } else if (rounded >= i - 0.5) {
            stars += '<i class="fas fa-star-half-alt" style="color:#fbbf24"></i>';
        } else {
            stars += '<i class="far fa-star" style="color:#334155"></i>';
        }
    }
    return `<span class="star-rating">${stars} <span class="rating-number">${rating}</span></span>`;
}

let fullCafeResults = [];
let lastSurpriseIndex = null;

function displayCards(cafes) {
    fullCafeResults = cafes;
    const container = document.querySelector('.cards');
    container.innerHTML = '';
    
    // Filter out rejected cafes
    const filteredCafes = cafes.filter(cafe => !rejectedCafes.has(cafe.place_id));
    
    // Filter out already saved cafes
    const savedCafes = new Set(JSON.parse(localStorage.getItem('savedCafes') || '[]')
        .map(cafe => cafe.place_id));
    
    const availableCafes = filteredCafes.filter(cafe => !savedCafes.has(cafe.place_id));

    if (availableCafes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-coffee" style="font-size: 3rem; color: #1e3d59; margin-bottom: 1rem;"></i>
                <p>No more cafes to show in this area. Try searching in a different location!</p>
            </div>
        `;
        return;
    }

    availableCafes.forEach((cafe, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'swipe-wrapper';
        wrapper.style.zIndex = 200 - i;

        const card = document.createElement('div');
        card.className = 'location-card';
        card.dataset.placeId = cafe.place_id;

        const imgUrl = cafe.photo || 'https://via.placeholder.com/400x200?text=No+Image';

        const cafeData = {
            name: cafe.name,
            place_id: cafe.place_id,
            photo: imgUrl,
            rating: cafe.rating,
            address: cafe.address,
            priceLevel: cafe.priceLevel,
            type: cafe.type,
            description: cafe.description,
            openNow: cafe.openNow,
            websiteUri: cafe.websiteUri,
            internationalPhoneNumber: cafe.internationalPhoneNumber
        };

        card.innerHTML = `
            <img src="${imgUrl}" alt="${cafe.name}" />
            <div class="card-content">
                <h3>${cafe.name}</h3>
                <div class="card-details">
                    ${cafe.rating !== 'N/A' ? getStarRating(cafe.rating) : ''}
                    ${cafe.priceLevel !== 'N/A' ? `<p class="price-level">${getPriceLevelSymbols(cafe.priceLevel)}</p>` : ''}
                    ${cafe.openNow ? '<p class="open-now"><i class="fas fa-clock"></i> Open</p>' : ''}
                    ${cafe.type ? `<p class="place-type"><i class="fas fa-utensils"></i> ${cafe.type}</p>` : ''}
                </div>
                <p class="address"><i class="fas fa-map-marker-alt"></i> ${cafe.address}</p>
                ${cafe.description ? `<p class="description">${cafe.description}</p>` : ''}
                <div class="contact-info">
                    ${cafe.websiteUri ? `<a href="${cafe.websiteUri}" target="_blank" class="website-link"><i class="fas fa-globe"></i> Website</a>` : ''}
                    ${cafe.internationalPhoneNumber ? `<a href="tel:${cafe.internationalPhoneNumber}" class="phone-link"><i class="fas fa-phone"></i> ${cafe.internationalPhoneNumber}</a>` : ''}
                    <button class="map-button" onclick="openMap('${cafe.name}', '${cafe.address}')">
                        <i class="fas fa-map"></i> View on Map
                    </button>
                </div>
            </div>
            <div class="card-actions">
                <button class="action-button reject-button" onclick="rejectCafe(this.parentElement.parentElement.parentElement)">
                    <i class="fas fa-times"></i>
                </button>
                <button class="action-button accept-button" data-cafe='${JSON.stringify(cafeData)}' onclick="acceptCafeFromButton(this)">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            <div class="swipe-hint">
                <p><small>Swipe right to save or use buttons below</small></p>
            </div>
        `;

        wrapper.appendChild(card);
        container.appendChild(wrapper);

        const hammertime = new Hammer(wrapper);
        hammertime.on('swipeleft', () => rejectCafe(wrapper));
        hammertime.on('swiperight', () => acceptCafe(wrapper, cafeData));
    });
}

function surpriseMe() {
    if (!fullCafeResults || fullCafeResults.length === 0) {
        showToast('No cafes to surprise you with!');
        return;
    }
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * fullCafeResults.length);
    } while (fullCafeResults.length > 1 && randomIndex === lastSurpriseIndex);
    lastSurpriseIndex = randomIndex;
    // Move the random cafe to the top, keep the rest in order
    const newOrder = [fullCafeResults[randomIndex], ...fullCafeResults.filter((_, i) => i !== randomIndex)];
    displayCards(newOrder);
}

function rejectCafe(wrapper) {
    const placeId = wrapper.querySelector('.location-card').dataset.placeId;
    rejectedCafes.add(placeId);
    localStorage.setItem('rejectedCafes', JSON.stringify([...rejectedCafes]));
    
    wrapper.style.transform = 'translateX(-150%) rotate(-15deg)';
    wrapper.style.opacity = 0;
    setTimeout(() => {
        wrapper.remove();
        checkForEmptyState();
    }, 300);
}

function acceptCafeFromButton(button) {
    const cafeData = JSON.parse(button.getAttribute('data-cafe'));
    const wrapper = button.closest('.swipe-wrapper');
    acceptCafe(wrapper, cafeData);
}

function acceptCafe(wrapper, cafeData) {
    let saved = JSON.parse(localStorage.getItem('savedCafes') || '[]');
    // Strict equality check for duplicates using place_id
    const isDuplicate = saved.some(c => c.place_id === cafeData.place_id);
    
    if (!isDuplicate) {
        // Remove any potential duplicates first
        saved = saved.filter(c => c.place_id !== cafeData.place_id);
        // Then add the new cafe
        saved.push(cafeData);
        localStorage.setItem('savedCafes', JSON.stringify(saved));
        showToast(`${cafeData.name} saved! 💖`);
        // Heart pop animation (try icon, fallback to button)
        let heartBtn = wrapper.querySelector('.accept-button i');
        if (!heartBtn) {
            heartBtn = wrapper.querySelector('.accept-button');
        }
        if (heartBtn) {
            heartBtn.classList.remove('heart-pop'); // reset if needed
            void heartBtn.offsetWidth; // force reflow
            heartBtn.classList.add('heart-pop');
        }
    } else {
        showToast(`${cafeData.name} is already saved! 😊`);
    }
    
    wrapper.style.transform = 'translateX(150%) rotate(15deg)';
    wrapper.style.opacity = 0;
    setTimeout(() => {
        wrapper.remove();
        checkForEmptyState();
    }, 300);
}

function checkForEmptyState() {
    const container = document.querySelector('.cards');
    if (!container.querySelector('.swipe-wrapper')) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-coffee" style="font-size: 3rem; color: #1e3d59; margin-bottom: 1rem;"></i>
                <p>No more cafes to show in this area. Try searching in a different location!</p>
            </div>
        `;
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        z-index: 1000;
        animation: fadeInOut 2s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

function getPriceLevelSymbols(priceLevel) {
    switch(priceLevel) {
        case 'PRICE_LEVEL_FREE':
            return '<span title="Free">Free</span>';
        case 'PRICE_LEVEL_INEXPENSIVE':
            return '<span title="Inexpensive">$</span>';
        case 'PRICE_LEVEL_MODERATE':
            return '<span title="Moderate">$$</span>';
        case 'PRICE_LEVEL_EXPENSIVE':
            return '<span title="Expensive">$$$</span>';
        case 'PRICE_LEVEL_VERY_EXPENSIVE':
            return '<span title="Very Expensive">$$$$</span>';
        default:
            return '';
    }
}

function showSaved() {
    document.querySelector('.cards').style.display = 'none';
    document.querySelector('.cards').innerHTML = '';
    const savedContainer = document.querySelector('.saved-cafes');
    savedContainer.style.display = 'grid';
    document.querySelectorAll('.action-button').forEach(btn => btn.classList.remove('active'));
    const savedBtn = document.querySelector('.saved-btn');
    if (savedBtn) {
        savedBtn.classList.add('active');
    }
    const savedCafes = JSON.parse(localStorage.getItem('savedCafes') || '[]');
    if (savedCafes.length === 0) {
        savedContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart" style="font-size: 3rem; color: #1e3d59; margin-bottom: 1rem;"></i>
                <p>You have no saved cafes yet. Start exploring and save your favorite ones!</p>
            </div>
        `;
    } else {
        savedContainer.innerHTML = savedCafes.map(cafe => `
            <div class="saved-card">
                <img src="${cafe.photo}" alt="${cafe.name}" />
                <div class="saved-card-content">
                    <h3>${cafe.name}</h3>
                    <div class="saved-card-details">
                        ${cafe.rating !== 'N/A' ? getStarRating(cafe.rating) : ''}
                        ${cafe.priceLevel !== 'N/A' ? `<p class="price-level">${getPriceLevelSymbols(cafe.priceLevel)}</p>` : ''}
                        ${cafe.openNow ? '<p class="open-now"><i class="fas fa-clock"></i> Open</p>' : ''}
                        ${cafe.type ? `<p class="place-type"><i class="fas fa-utensils"></i> ${cafe.type}</p>` : ''}
                    </div>
                    <p class="saved-card-address"><i class="fas fa-map-marker-alt"></i> ${cafe.address}</p>
                    <div class="saved-card-actions">
                        <button class="action-button" onclick="openMap('${cafe.name}', '${cafe.address}')">
                            <i class="fas fa-map"></i> View on Map
                        </button>
                        <button class="action-button remove-button" onclick="removeSavedCafe(this)">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function clearSaved() {
    if (confirm('Are you sure you want to clear all saved cafes?')) {
        localStorage.removeItem('savedCafes');
        showToast('All saved cafes have been cleared! 🗑️');
        showSaved(); // Refresh the saved cafes view
    }
}

function clearRejected() {
    rejectedCafes.clear();
    localStorage.removeItem('rejectedCafes');
    // If we're currently showing cafes, refresh the view
    const query = document.getElementById('locationSearch').value.trim();
    if (query) {
        searchByText();
    } else {
        getLocationCachedOrNew();
    }
}

function openMap(name, address) {
    // Create Google Maps URL with the cafe name and address
    const query = encodeURIComponent(`${name}, ${address}`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(mapsUrl, '_blank');
}

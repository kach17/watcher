// Get TMDB API key from config
const apiKey = TMDB_API_KEY;
let watchedDramas = [];

// DOM elements
const fetchButton = document.getElementById('fetchFromTMDBButton');
const clearButton = document.getElementById('clearTableButton');
const statusMessage = document.getElementById('statusMessage');
const loadingIndicator = document.getElementById('loadingIndicator');
const dramaGrid = document.getElementById('dramaGrid');
const modal = document.getElementById('dramaModal');
const modalClose = document.getElementById('modalClose');
const addMoreButton = document.getElementById('addMoreButton');
const dramaCountDisplay = document.getElementById('dramaCount');

// Initialize the page
document.addEventListener('DOMContentLoaded', init);

function init() {
  // Load saved data
  loadSavedDramas();
  
  // Set up event listeners
  setupEventListeners();
  
  // Render initial cards
  renderCards();
  
  // Update drama count
  updateDramaCount();

  // Automatically fetch if transfer is in progress
  if (localStorage.getItem('transferInProgress') === 'true') {
    localStorage.removeItem('transferInProgress');
    fetchDramas();
  }
}

function loadSavedDramas() {
  const savedData = localStorage.getItem('watchedDramasData');
  if (savedData) {
    watchedDramas = JSON.parse(savedData);
  }
}

function setupEventListeners() {
  // Add More button
  addMoreButton.addEventListener('click', function() {
    window.location.href = 'get_list.html';
  });

  // Fetch button
  fetchButton.addEventListener('click', fetchDramas);
  
  // Clear button
  clearButton.addEventListener('click', clearCollection);
  
  // Modal close
  modalClose.addEventListener('click', closeModal);
  
  // Close modal on overlay click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeModal();
  });
  
  // Close modal on Escape key
  document.addEventListener('keydown', function(e) {
    if (modal.classList.contains('active') && (e.key === 'Escape' || e.key === 'Esc')) {
      closeModal();
    }
  });
}

// Helper to set status message and visibility
function setStatusMessage(message, timeout = 0) {
  if (message) {
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
    if (timeout > 0) {
      setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.style.display = 'none';
      }, timeout);
    }
  } else {
    statusMessage.textContent = '';
    statusMessage.style.display = 'none';
  }
}

async function fetchDramas() {
  const transferredIds = localStorage.getItem('tmdbIdsToTransfer');
  if (!transferredIds) {
    setStatusMessage('No TMDB IDs found. Process a list first.', 3000);
    return;
  }
  const ids = JSON.parse(transferredIds);

  // Remove duplicates by checking existing watchedDramas
  const existingIds = new Set(watchedDramas.map(d => d.id));
  const newIds = ids.filter(id => !existingIds.has(id));

  if (newIds.length === 0) {
    setStatusMessage('No new dramas to add.', 3000);
    return;
  }

  fetchButton.disabled = true;
  loadingIndicator.style.display = 'flex';
  setStatusMessage(`Fetching data for ${newIds.length} items...`);

  try {
    const newDramas = await fetchAllItemDetails(newIds);
    watchedDramas = watchedDramas.concat(newDramas);
    renderCards();
    updateDramaCount();
    setStatusMessage(`Successfully added ${newDramas.length} new items.`, 3000);
    localStorage.setItem('watchedDramasData', JSON.stringify(watchedDramas));
  } catch (error) {
    setStatusMessage(`Error: ${error.message}`, 4000);
    console.error('Error fetching data:', error);
  } finally {
    loadingIndicator.style.display = 'none';
    fetchButton.disabled = false;
  }
}

function clearCollection() {
  watchedDramas = [];
  renderCards();
  updateDramaCount();
  setStatusMessage('Collection cleared.', 2000);
  localStorage.removeItem('watchedDramasData');
}

// Function to fetch details for all items
async function fetchAllItemDetails(items) {
  const results = [];
  
  for (const item of items) {
    try {
      // Determine if it's a TV show or movie
      const type = item.type || 'tv'; // Default to TV if not specified
      const id = item.id || item; // Handle both object format and simple ID format
      
      const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=en-US&append_to_response=external_ids`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for ${type} ID ${id}`);
      }
      
      const data = await response.json();
      results.push(data);
      
      // Update status after each item
      statusMessage.textContent = `Fetched ${results.length} of ${items.length} items...`;
    } catch (error) {
      console.error('Error fetching item details:', error);
      // Continue with other items even if one fails
    }
  }
  
  return results;
}

// Function to get image URL
function getImageUrl(path, size = "w300") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : "";
}

// Function to render cards
function renderCards() {
  dramaGrid.innerHTML = '';
  
  if (watchedDramas.length === 0) {
    dramaGrid.innerHTML = `
      <div class="no-results">
        <i class="fas fa-film"></i>
        <h3>No Dramas in Your Collection</h3>
        <p>Fetch data from TMDB or check your list processing to see your watched dramas here.</p>
      </div>
    `;
    return;
  }
  
  watchedDramas.forEach((drama, index) => {
    const card = document.createElement('div');
    card.className = 'drama-card';
    card.dataset.index = index;
    
    const title = drama.name || drama.title || 'Unknown Title';
    const posterPath = drama.poster_path;
    const rating = drama.vote_average || 'N/A';
    const overview = drama.overview || 'No overview available';
    const genres = drama.genres || [];
    
    // Card structure for streaming style
    card.innerHTML = `
      <div class="card-poster">
        <img src="${getImageUrl(posterPath, 'w342')}" alt="${title}" onerror="this.src='https://via.placeholder.com/342x513?text=No+Image&bg=1c1c1c&fg=808080'">
        <div class="rating-ribbon">
          <i class="fas fa-star star-icon"></i> ${rating !== 'N/A' && typeof rating === 'number' ? rating.toFixed(1) : 'N/A'}
        </div>
      </div>
      <div class="card-hover-content">
        <h3 class="card-title">${title}</h3>
        <p class="hover-overview">${overview}</p>
        <div class="genre-pills">
          ${genres.slice(0, 3).map(g => `<span class="genre-pill">${g.name}</span>`).join('')} 
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => openModal(index));
    dramaGrid.appendChild(card);
  });
}

function updateDramaCount() {
  dramaCountDisplay.textContent = `Total Dramas in Collection: ${watchedDramas.length}`;
}

// Function to open modal with drama details
function openModal(index) {
  const drama = watchedDramas[index];
  if (!drama) return;
  
  // First, reset or hide images to prevent showing previous content
  document.getElementById('modalPoster').src = '';
  document.querySelector('.modal-backdrop').style.backgroundImage = 'none';
  
  // Show modal with loading state
  modal.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
  
  // Add a loading class to the modal container
  const modalContainer = document.querySelector('.modal-container');
  modalContainer.classList.add('loading');
  
  // Set modal content
  document.getElementById('modalTitle').textContent = drama.name || drama.title || 'Unknown Title';
  
  // Preload images before displaying them
  const posterPath = drama.poster_path;
  const backdropPath = drama.backdrop_path;
  
  // Create image objects to preload
  const posterImg = new Image();
  const backdropImg = new Image();
  
  // Set up poster image loading
  if (posterPath) {
    posterImg.onload = function() {
      document.getElementById('modalPoster').src = this.src;
    };
    posterImg.src = getImageUrl(posterPath, 'w500');
  } else {
    document.getElementById('modalPoster').src = 'https://via.placeholder.com/500x750?text=No+Image&bg=1c1c1c&fg=808080';
  }
  
  // Set up backdrop image loading
  if (backdropPath) {
    backdropImg.onload = function() {
      document.querySelector('.modal-backdrop').style.backgroundImage = `url(${this.src})`;
      // Remove loading class once backdrop is loaded
      modalContainer.classList.remove('loading');
    };
    backdropImg.src = getImageUrl(backdropPath, 'original');
  } else {
    // If no backdrop, just remove loading class
    modalContainer.classList.remove('loading');
  }
  
  // Rating with stars
  const rating = drama.vote_average; // Keep as number for check
  document.getElementById('modalRating').innerHTML = rating && typeof rating === 'number' ?
    `<div class="rating-display">
      <i class="fas fa-star"></i>
      <span>${rating.toFixed(1)}</span>
      <span class="max-rating">/ 10</span>
    </div>` : '<div class="no-rating">No rating available</div>';
  
  // Fill in all the modal fields
  document.getElementById('modalFirstAirDate').textContent = drama.first_air_date || drama.release_date || 'N/A';
  document.getElementById('modalLastAirDate').textContent = drama.last_air_date || 'N/A';
  document.getElementById('modalEpisodes').textContent = drama.number_of_episodes || 'N/A';
  document.getElementById('modalSeasons').textContent = drama.number_of_seasons || 'N/A';
  
  // Runtime
  const runtime = drama.episode_run_time ? 
    `${drama.episode_run_time.join(', ')} min` : 
    (drama.runtime ? `${drama.runtime} min` : 'N/A');
  document.getElementById('modalRuntime').textContent = runtime;
  
  // Country & Language
  document.getElementById('modalCountry').textContent = drama.origin_country ? 
    drama.origin_country.join(', ') : 'N/A';
  document.getElementById('modalLanguage').textContent = drama.original_language || 'N/A';
  
  // Budget
  const budget = drama.budget ? 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(drama.budget) : 
    'N/A';
  document.getElementById('modalBudget').textContent = budget === 'N/A' ? budget : (drama.budget > 0 ? budget : 'N/A (Unreleased or Undisclosed)');
  
  // Links
  const homepage = drama.homepage ? 
    `<a href="${drama.homepage}" class="modal-link" target="_blank">
      <i class="fas fa-external-link-alt"></i> Official Website
    </a>` : '';
  document.getElementById('modalLinks').innerHTML = homepage;
  
  // IDs
  const imdbId = drama.external_ids && drama.external_ids.imdb_id ? 
    `<a href="https://www.imdb.com/title/${drama.external_ids.imdb_id}" class="modal-link" target="_blank">
      <i class="fab fa-imdb"></i> ${drama.external_ids.imdb_id}
    </a>` : '';
  const tmdbLink = `<a href="https://www.themoviedb.org/${drama.name ? 'tv' : 'movie'}/${drama.id}" class="modal-link" target="_blank">
    <i class="fas fa-film"></i> TMDB: ${drama.id}
  </a>`;
  document.getElementById('modalIds').innerHTML = [imdbId, tmdbLink].filter(Boolean).join('<br>');
  
  // Overview
  document.getElementById('modalOverview').textContent = drama.overview || 'No overview available';
  
  // Genres
  const genreElements = drama.genres ? 
    drama.genres.map(g => `<span class="modal-genre-pill">${g.name}</span>`).join('') : 
    '<span>No genres available</span>';
  document.getElementById('modalGenres').innerHTML = genreElements;
  
  // Reset scroll position and header state
  const modalContent = document.querySelector('.modal-content');
  modalContent.scrollTop = 0;
  document.querySelector('.modal-header').classList.remove('scrolled');
  
  // Add scroll event listener for sticky header animation
  modalContent.addEventListener('scroll', handleModalScroll);
}

// Function to handle modal scroll for sticky header
function handleModalScroll() {
  const modalContent = document.querySelector('.modal-content');
  const modalHeader = document.querySelector('.modal-header');
  
  // Apply scrolled class when scrolled down more than 50px
  if (modalContent.scrollTop > 50) {
    modalHeader.classList.add('scrolled');
  } else {
    modalHeader.classList.remove('scrolled');
  }
}

// Function to close modal
function closeModal() {
  modal.classList.remove('active');
  document.body.style.overflow = '';
  
  // Remove scroll event listener when modal is closed
  const modalContent = document.querySelector('.modal-content');
  modalContent.removeEventListener('scroll', handleModalScroll);
}

// In your init or DOMContentLoaded, hide the status by default
document.addEventListener('DOMContentLoaded', function() {
  statusMessage.style.display = 'none';
});
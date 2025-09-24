// DOM Elements
const authSection = document.getElementById('authSection');
const mainContent = document.getElementById('mainContent');
const weatherForm = document.getElementById('weatherForm');
const cityInput = document.getElementById('cityInput');
const weatherResults = document.getElementById('weatherResults');
const weatherCity = document.getElementById('weatherCity');
const weatherIcon = document.getElementById('weatherIcon');
const weatherTemp = document.getElementById('weatherTemp');
const weatherDesc = document.getElementById('weatherDesc');
const weatherWind = document.getElementById('weatherWind');
const weatherHumidity = document.getElementById('weatherHumidity');
const weatherPressure = document.getElementById('weatherPressure');
const weatherVisibility = document.getElementById('weatherVisibility');
const unitToggle = document.getElementById('unitToggle');
const weatherFeelsLike = document.getElementById('weatherFeelsLike');
const weatherMinMax = document.getElementById('weatherMinMax');
const weatherClouds = document.getElementById('weatherClouds');
const weatherRain = document.getElementById('weatherRain');
const weatherSunrise = document.getElementById('weatherSunrise');
const weatherSunset = document.getElementById('weatherSunset');
const newsResults = document.getElementById('newsResults');
const categoryButtons = document.querySelector('.category-buttons');
const logoutBtn = document.getElementById('logoutBtn');

// Toast notification
const toast = new bootstrap.Toast(document.querySelector('.toast'));
const toastBody = document.querySelector('.toast-body');

// Add event listeners for OAuth buttons
document.querySelectorAll('#googleLogin, .js-google-login').forEach(btn => btn.addEventListener('click', () => {
    window.location.href = '/auth/google';
}));

document.querySelectorAll('#githubLogin, .js-github-login').forEach(btn => btn.addEventListener('click', () => {
    window.location.href = '/auth/github';
}));

// Add logout functionality
logoutBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/auth/logout', { method: 'POST' });
        if (response.ok) {
            showToast('success', 'Logged out successfully');
            setTimeout(() => {
                showAuthSection();
                weatherResults.classList.add('is-hidden');
                newsResults.innerHTML = '';
            }, 800);
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showToast('error', 'Failed to logout. Please try again.');
    }
});

// Check authentication status on page load
checkAuthStatus();

async function checkAuthStatus() {
    try {
        const response = await fetch('/auth/status');
        const data = await response.json();
        
        if (data.authenticated) {
            showMainContent();
            // Load weather data for Rajpipla immediately
            try {
                const weatherResponse = await fetch('/api/weather/Rajpipla');
                if (weatherResponse.ok) {
                    const weatherData = await weatherResponse.json();
                    displayWeatherInfo(weatherData);
                }
            } catch (error) {
                console.error('Weather error:', error);
                showToast('error', 'Failed to load weather data');
            }

            // Load news data immediately
            try {
                const newsResponse = await fetch('/api/news/general');
                if (newsResponse.ok) {
                    const newsData = await newsResponse.json();
                    displayNewsData(newsData);
                }
            } catch (error) {
                console.error('News error:', error);
                showToast('error', 'Failed to load news data');
            }
        } else {
            showAuthSection();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showAuthSection();
        showToast('error', 'Failed to check authentication status');
    }
}

function showMainContent() {
    authSection.classList.add('is-hidden');
    const hero = document.getElementById('heroSection');
    if (hero) hero.classList.add('is-hidden');
    mainContent.classList.remove('is-hidden');
    logoutBtn.classList.remove('is-hidden');
    mainContent.style.opacity = '0';
    setTimeout(() => {
        mainContent.style.transition = 'opacity 0.5s ease';
        mainContent.style.opacity = '1';
        // ensure viewport focuses on content after login
        mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function showAuthSection() {
    const hero = document.getElementById('heroSection');
    if (hero) hero.classList.remove('is-hidden');
    authSection.classList.remove('is-hidden');
    mainContent.classList.add('is-hidden');
    logoutBtn.classList.add('is-hidden');
}

let lastWeatherData = null;

// Unit toggle
if (unitToggle) {
    unitToggle.addEventListener('click', () => {
        const next = unitToggle.dataset.unit === 'C' ? 'F' : 'C';
        unitToggle.dataset.unit = next;
        unitToggle.setAttribute('aria-pressed', String(next === 'F'));
        unitToggle.textContent = next === 'F' ? '°F' : '°C';
        if (lastWeatherData) displayWeatherInfo(lastWeatherData);
    });
}

// Weather functionality
weatherForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return;

    try {
        setLoading(weatherForm.querySelector('button'), true);
        const response = await fetch(`/api/weather/${encodeURIComponent(city)}`);
        if (!response.ok) {
            throw new Error(await response.text());
        }
        const data = await response.json();
        lastWeatherData = data;
        displayWeatherInfo(data);
        cityInput.value = '';
    } catch (error) {
        showToast('error', 'Failed to fetch weather data. Please try again.');
        console.error('Weather error:', error);
    } finally {
        setLoading(weatherForm.querySelector('button'), false);
    }
});

function toF(c) { return Math.round((c * 9) / 5 + 32); }
function displayWeatherInfo(data) {
    weatherResults.classList.remove('is-hidden');
    const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

    // Helper to format city local time using API timezone offset
    const localOffsetMs = -new Date().getTimezoneOffset() * 60000;
    const toCityDate = (unixSeconds) => new Date(unixSeconds * 1000 + (data.timezone || 0) * 1000 - localOffsetMs);
    const fmtTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    weatherCity.textContent = `${data.name}, ${data.sys.country}`;
    weatherIcon.src = iconUrl;
    weatherIcon.alt = data.weather[0].description;
    const useF = unitToggle && unitToggle.dataset.unit === 'F';
    const t = Math.round(data.main.temp);
    weatherTemp.textContent = useF ? `${toF(t)}°F` : `${t}°C`;
    weatherDesc.textContent = data.weather[0].description;

    weatherWind.textContent = ` ${data.wind.speed} m/s`;
    weatherHumidity.textContent = ` ${data.main.humidity}%`;
    weatherPressure.textContent = ` ${data.main.pressure} hPa`;
    weatherVisibility.textContent = ` ${(data.visibility / 1000).toFixed(1)} km`;

    if (weatherFeelsLike) weatherFeelsLike.textContent = ` ${unitToggle && unitToggle.dataset.unit === 'F' ? toF(data.main.feels_like) + '°F' : Math.round(data.main.feels_like) + '°C'}`;
    if (weatherMinMax) weatherMinMax.textContent = ` ${unitToggle && unitToggle.dataset.unit === 'F' ? toF(data.main.temp_min) + '°' : Math.round(data.main.temp_min) + '°'} / ${unitToggle && unitToggle.dataset.unit === 'F' ? toF(data.main.temp_max) + '°F' : Math.round(data.main.temp_max) + '°C'}`;
    if (weatherClouds) weatherClouds.textContent = ` ${data.clouds?.all ?? 0}%`;

    const rain1h = data.rain?.['1h'];
    const rain3h = data.rain?.['3h'];
    const rainText = rain1h ? `${rain1h} mm (1h)` : rain3h ? `${rain3h} mm (3h)` : ' No rain';
    if (weatherRain) weatherRain.textContent = ` ${rainText}`;

    if (weatherSunrise) weatherSunrise.textContent = ` ${fmtTime(toCityDate(data.sys.sunrise))}`;
    if (weatherSunset) weatherSunset.textContent = ` ${fmtTime(toCityDate(data.sys.sunset))}`;
}

// News functionality
categoryButtons.addEventListener('click', async (e) => {
    if (e.target.matches('button')) {
        const buttons = categoryButtons.querySelectorAll('button');
        buttons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        const category = e.target.dataset.category;
        try {
            setLoading(e.target, true);
            const response = await fetch(`/api/news/${category}`);
            if (!response.ok) {
                throw new Error(await response.text());
            }
            const data = await response.json();
            displayNewsData(data);
        } catch (error) {
            showToast('error', 'Failed to fetch news data. Please try again.');
            console.error('News error:', error);
        } finally {
            setLoading(e.target, false);
        }
    }
});

function displayNewsData(data) {
    newsResults.innerHTML = '';
    if (!data.articles || data.articles.length === 0) {
        newsResults.innerHTML = '<p class="text-center">No news articles found.</p>';
        return;
    }

    data.articles.forEach(article => {
        if (!article.title || !article.description) return;
        const newsCard = document.createElement('div');
        newsCard.className = 'news-item';

        const thumb = article.urlToImage ? `<img class="news-thumb" src="${article.urlToImage}" alt="${article.title}">` : '';

        newsCard.innerHTML = `
            ${thumb}
            <h5 class="card-title">${article.title}</h5>
            <p class="card-text">${article.description}</p>
            <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted">${new Date(article.publishedAt).toLocaleDateString()} • ${article.source?.name || ''}</small>
                <a href="${article.url}" target="_blank" class="btn btn-sm btn-primary">Read More</a>
            </div>
        `;
        newsCard.addEventListener('click', (e) => {
            if (!e.target.matches('a')) {
                window.open(article.url, '_blank');
            }
        });
        newsResults.appendChild(newsCard);
    });
}

// Utility functions
function showToast(type, message) {
    const toastEl = document.querySelector('.toast');
    toastEl.className = `toast ${type === 'error' ? 'bg-danger' : 'bg-success'} text-white`;
    toastBody.textContent = message;
    toast.show();
}

// Add loading states
function setLoading(element, isLoading) {
    if (isLoading) {
        element.classList.add('disabled');
        const originalText = element.innerHTML;
        if (!element.dataset.originalText) {
            element.dataset.originalText = originalText;
        }
        element.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';

        // Show skeletons for news category loads
        if (element.dataset && element.dataset.category) {
            const skeletonCount = 6;
            let skeletons = '';
            for (let i = 0; i < skeletonCount; i++) {
                skeletons += `
                <div class="news-item skeleton">
                    <div class="skeleton-block mb-3"></div>
                    <div class="skeleton-bar mb-2"></div>
                    <div class="skeleton-bar w-75 mb-3"></div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="skeleton-bar w-25"></div>
                        <div class="skeleton-bar w-25"></div>
                    </div>
                </div>`;
            }
            newsResults.innerHTML = skeletons;
        }
    } else {
        element.classList.remove('disabled');
        element.innerHTML = element.dataset.originalText || element.innerHTML;
    }
}

// Save original button text
document.querySelectorAll('button').forEach(button => {
    button.dataset.originalText = button.innerHTML;
});

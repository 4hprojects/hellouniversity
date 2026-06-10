function loadAd(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
    }
}

// Dynamically load ads
loadAd('ad1');
loadAd('ad2');


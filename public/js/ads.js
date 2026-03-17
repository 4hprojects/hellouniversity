function loadAd(containerId) {
    const adHTML = `
        <div class="text-center my-8">
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4537208011192461" crossorigin="anonymous"></script>
            <!-- HelloUniversity Responsive Ad -->
            <ins class="adsbygoogle" 
                style="display:inline-block;width:728px;height:90px" 
                data-ad-client="ca-pub-4537208011192461" 
                data-ad-slot="7121468855"></ins>
            <script>
                (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4537208011192461" crossorigin="anonymous"></script>
            <!-- Horizontal4Index -->
            <ins class="adsbygoogle" 
                style="display:block" 
                data-ad-client="ca-pub-4537208011192461" 
                data-ad-slot="7025129889" 
                data-ad-format="auto" 
                data-full-width-responsive="true"></ins>
            <script>
                (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
        </div>
    `;

    document.getElementById(containerId).innerHTML = adHTML;
}

// Dynamically load ads
loadAd('ad1');
loadAd('ad2');


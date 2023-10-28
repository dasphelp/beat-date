const CLIENT_ID = '2b7912c80215474e8e7b6482ffeee742';
const REDIRECT_URI = 'https://dasphelp.github.io/beat-date/';
const SCOPES = [
    'user-library-read',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-modify',
    'user-read-private'
];

const authEndpoint = 'https://accounts.spotify.com/authorize';
const apiEndpoint = 'https://api.spotify.com/v1/me/tracks';

const loginButton = document.getElementById('login-button');
const playlistsContainer = document.getElementById('playlists');

const displayPlaylists = (playlistURIs, IFrameAPI) => {
    const years = Object.keys(playlistURIs);
    for (var i = years.length - 1; i >=0; i--) {
        const playlistDiv = document.createElement('div');
        playlistDiv.setAttribute("id", years[i]);
        playlistsContainer.appendChild(playlistDiv);

        const options = {
            uri: playlistURIs[years[i]]
        };
        const callback = (EmbedController) => {};
        playlistsContainer.appendChild(playlistDiv);
        IFrameAPI.createController(playlistDiv, options, callback);
        // playlistDiv.innerHTML = `<h2>${year}</h2>`;         
        // playlists[year].forEach(song => {
        //     const songName = document.createElement('p');
        //     songName.textContent = song;
        //     playlistDiv.appendChild(songName);
        // });    
    }
};

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

const build = async (playlists, token) => {
    const playlistURIs = {};
    for (var year in playlists) {
        try {
            await console.log(year);
            const response1 = await fetch('https://api.spotify.com/v1/me/playlists', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  name: year,
                  public: false // Set playlist visibility
                })
            });
            const playlistData = await response1.json();
            playlistURIs[year] = playlistData.uri;
            const playlistId = await playlistData.id;
            var rw = 0;
            do {
                const tracks = playlists[year].slice(rw,rw + 100);
                rw = rw + tracks.length;                
                try {
                    const response2 = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            uris: tracks
                        })
                    });
                    const trackAdded = await response2.json();  
                    console.log('Tracks added to playlist:', trackAdded);
                } catch(error) {
                    console.error('Error adding tracks', error);
                }
                await sleep(1000);
            } while (playlists[year].length - rw > 0);
        } catch(error) {
            console.error('Error creating playlist:', error);
        }
    }
    return playlistURIs;
}

const fetchData = async (token) => {
    const playlists = {};

    const response = await fetch(apiEndpoint + "?limit=50", {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    var data = await response.json();
    console.log(data.items);
    for (var i = 0; i < data.items.length; i++) {
        const track = data.items[i].track;
        const year = track.album.release_date.slice(0,4);
        if (!playlists[year]) {
            playlists[year] = [];
        }
        playlists[year].push(track.uri);
    }

    // Check if more results are available
    while (data.next) {
        // Recursively fetch additional liked songs
        const nextPage = data.next;
        const nextPageResponse = await fetch(nextPage, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        data = await nextPageResponse.json();
        for (var i = 0; i < data.items.length; i++) {
            const track = data.items[i].track;
            const year = track.album.release_date.slice(0,4);
            if (!playlists[year]) {
                playlists[year] = [];
            }
            playlists[year].push(track.uri);
        }
    }

    return playlists;
};

const authenticateUser = () => {
    const queryParams = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        response_type: 'token',
    });

    const authUrl = `${authEndpoint}?${queryParams}`;
    window.location.href = authUrl;
};

const handleLogin = async (IFrameAPI) => {
    if (window.location.hash) {
        const token = window.location.hash.substr(14); // Remove "#access_token="
        loginButton.style.display = 'none';
        playlistsContainer.classList.remove('hidden');

        fetchData(token)
            .then(async playlists => {
                const playlistURIs = await build(playlists, token);
                displayPlaylists(playlistURIs, IFrameAPI);
            })
            .catch(error => {
                console.error('An error occurred:', error);
            });
    } else {
        loginButton.addEventListener('click', authenticateUser);
    }
};

window.onSpotifyIframeApiReady = (IFrameAPI) => {
    handleLogin(IFrameAPI);
}

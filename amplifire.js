const url = 'http://localhost:3000/api/'

const s_bar = document.getElementById('search')
if (s_bar) {
    s_bar.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return

        const isSearchPage = document.getElementById('s_results')

        if (isSearchPage) {
            search() // on search page → run search
        } else {
            const q = encodeURIComponent(s_bar.value)
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
            window.location = 'search.html?q=' + q + '&return=' + returnUrl // on main page → navigate
        }
    })
}

let initial_index = 0
let last_index = 10

async function search() {
    console.log(window.location.pathname)
    console.log(window.location.href)
    const decoded = document.getElementById("search").value
    const q = encodeURIComponent(decoded)
    const [songsResp, artistsResp, albumsResp] = await Promise.all([
        fetch(url + 'search/songs?query=' + q + '&limit=100', { cache: "no-store" }),
        fetch(url + 'search/artists?query=' + q + '&limit=10', { cache: "no-store" }),
        fetch(url + 'search/albums?query=' + q + '&limit=10', { cache: "no-store" }),
    ])

    const [songsData, artistsData, albumsData] = await Promise.all([
        songsResp.json(),
        artistsResp.json(),
        albumsResp.json(),
    ])

    console.log(songsData)
    console.log(artistsData)
    console.log(artistsData)

    sessionStorage.setItem('searchResults', JSON.stringify(songsData))
    sessionStorage.setItem('searchQuery', decoded)

    console.log(sessionStorage.getItem("fromPlayer"))

    document.getElementById('s_artists').innerHTML = " "
    document.getElementById('s_albums').innerHTML = " "
    document.getElementById('s_songs').innerHTML = " "

    renderSearchResults(songsData, artistsData, albumsData)
}

function renderSearchResults(songsData, artistsData, albumsData) {

    if (artistsData)
        renderArtists(artistsData.data.results)
    if (albumsData)
        renderAlbums(albumsData.data.results)
    //songs
    search_data = songsData.data.results.slice(initial_index, last_index)
    console.log(search_data)

    document.getElementById('load_more').innerText = "Load More"
    search_data.forEach(song => {
        const result = document.createElement("div")
        let img = document.createElement('img')
        let descdiv = document.createElement('div')
        let titlediv = document.createElement('div')
        let singerdiv = document.createElement('div')

        result.classList.add("s_card")
        img.classList.add('s_img')
        descdiv.classList.add('s_desc')
        titlediv.classList.add('s_title')
        singerdiv.classList.add('s_singer')

        titlediv.innerText = decodeHTML(song.name)
        img.src = song.image[2].url
        const artists = song.artists.primary.slice(0, 3)
            .map(artist => decodeHTML(artist.name)).join(', ')
        singerdiv.innerText = artists

        result.addEventListener('click', () => {
            sessionStorage.setItem('fromPlayer', true)
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
            window.location = 'player.html?id=' + song.id + '&return=' + returnUrl
        })

        result.appendChild(img)
        descdiv.appendChild(titlediv)
        descdiv.appendChild(singerdiv)
        result.appendChild(descdiv)
        document.getElementById("s_songs").appendChild(result)

    })
}

document.addEventListener('DOMContentLoaded', () => {
    const searchPage = document.getElementById('s_results');
    if (!searchPage) return; // not on search page, do nothing

    const loadmore = document.getElementById('load_more')
    loadmore.addEventListener('click', () => {
        initial_index += 10
        last_index += 10
        console.log('here' + last_index)
        let search_data = JSON.parse(sessionStorage.getItem('searchResults'))
        renderSearchResults(search_data)

        if (last_index >= search_data.data.results.length)
            loadmore.style.display = 'none'
    })

    const params = new URLSearchParams(window.location.search)
    const artistId = params.get('id')
    const query = params.get('q')
    const navEntry = performance.getEntriesByType('navigation')[0]
    //const = navEntry && navEntry.type === 'reload'

    if (artistId) {
        searchArtist() // came from artist card click
    }
    else if (query) {
        document.getElementById('search').value = decodeURIComponent(query)
        initial_index = 0
        last_index = 10
        document.getElementById('s_artists').innerHTML = " "
        document.getElementById('s_albums').innerHTML = " "
        document.getElementById('s_songs').innerHTML = " "

        search()
    }
    else if (!query && !artistId) {        // normal restore

        const saved = sessionStorage.getItem('searchResults')
        const savedQuery = sessionStorage.getItem('searchQuery')

        if (saved) {
            document.getElementById('search').value = savedQuery
            renderResults(JSON.parse(saved))
        }
    }
})

document.addEventListener('DOMContentLoaded', () => {
    const mainPage = document.getElementById('songs-container')
    if (!mainPage) return // not on main page, do nothing

    featuredArtists()
    trendingSongs()
    featuredAlbums()
})

function decodeHTML(str) {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
}

async function player() {
    const params = new URLSearchParams(window.location.search)
    let id = params.get('id')

    const response = await fetch(url + 'songs/' + id)
    const data = await response.json()
    console.log(data)
    document.getElementById('playing_img').src = data.data[0].image[2].url
    document.getElementById('playing_title').innerText = decodeHTML(data.data[0].name)
    document.getElementById('playing_singer').innerText = (data.data[0].artists.primary.slice(0, 3).map(artist => decodeHTML(artist.name)).join(','))
    const audio = data.data[0].downloadUrl[4].url
    document.getElementById('playing_audio').src = audio

    const music = document.getElementById('playing_audio')
    const img_ani = document.getElementById("playing_img")

    music.addEventListener('play', () => {
        img_ani.classList.add("spin");
        img_ani.style.animationPlayState = 'running';
    })
    music.addEventListener("pause", () => {
        img_ani.style.animationPlayState = 'paused';
    })
    img_ani.addEventListener("click", vinyl_play)

    function vinyl_play() {
        if (music.paused) music.play().catch(err => console.error(err))
        else music.pause()
    }

    recommendations()

    async function recommendations() {
        const resp = await fetch(response.url + '/suggestions?limit=10')
        const data = await resp.json()
        console.log(data)
        const songs = data.data
        renderRecommendations(songs)
    }

}

function renderRecommendations(songs) {
    songs.forEach(song => {
        const card = document.createElement('div')
        const img = document.createElement('img')
        const title = document.createElement('div')
        const artist = document.createElement('div')
        const play = document.createElement('img')
        const duration = document.createElement('div')
        const info = document.createElement('div')

        card.classList.add('r_card')
        img.classList.add('r_img')
        title.classList.add('r_title')
        artist.classList.add('r_artist')
        play.classList.add('r_play')
        duration.classList.add('r_duration')
        info.classList.add('r_info')

        img.src = song.image[0].url
        title.innerText = decodeHTML(song.name)
        artist.innerText = decodeHTML(song.artists.primary[0].name)
        const minutes = Math.floor(song.duration / 60)
        const seconds = String(song.duration % 60).padStart(2, '0')
        duration.innerText = minutes + ':' + seconds
        play.src = 'image/play_button.png'

        card.addEventListener("click", locate)

        card.appendChild(img)
        info.appendChild(title)
        info.appendChild(artist)
        card.appendChild(info)
        card.appendChild(duration)
        card.appendChild(play)
        const topSongs = document.getElementById('art-songs')
        if (topSongs) {
            topSongs.appendChild(card)
        }
        else
            document.getElementById('song_rec').appendChild(card)

        function locate() {
            console.log(song.id)
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
            window.location = 'player.html?id=' + song.id + '&return=' + returnUrl
        }

    }
    )
}
// MAINPAGE CODE
// feateured artists

const featuredArtistsArr = ['Bruno mars', 'Arijit Singh', 'Bilie eilish', 'Diljit', 'Justin Bieber', 'Arjan Dhillon', 'Charlie Puth', 'Ariana Grande', 'Twice', 'Eminem']

async function featuredArtists() {
    const artists = await Promise.all(
        featuredArtistsArr.map(async name => {
            const q = encodeURIComponent(name)
            const resp = await fetch('http://localhost:3000/api/search/artists?query=' + q)
            const data = await resp.json()
            return data.data.results[0]
        })
    )
    console.log(artists)
    renderArtists(artists)
}

async function renderArtists(artist) {
    for (data of artist) {
        const card = document.createElement('div')
        const img = document.createElement('img')
        const title = document.createElement('div')

        card.classList.add('artist_container')
        img.classList.add('artist_img')
        title.classList.add('artist_name')

        img.src = data.image[2].url
        title.innerText = data.name

        const id = data.id
        card.addEventListener('click', () => {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
            window.location = 'artist.html?id=' + id + '&return=' + returnUrl
        })

        card.appendChild(img)
        card.appendChild(title)

        const artcontainer = document.getElementById('featured_artists')
        const searchcontainer = document.getElementById('s_artists')
        if (artcontainer)
            artcontainer.appendChild(card)
        else if (searchcontainer) {
            searchcontainer.appendChild(card)
        }
        else
            document.getElementById('similar').appendChild(card)
    }
}

async function searchArtist() {
    const params = new URLSearchParams(window.location.search)
    let id = params.get('id')

    const resp = await fetch(url + 'artists/' + id + '/songs')
    const data = await resp.json()
    console.log(data)

    sessionStorage.removeItem('searchResults')
    artist = true
    renderResults(data, artist)
}

//trending songs
const trendingSongsArr = ['Bairan', 'Sheesha', 'Luna', 'Bhul Jayin Na', 'Dhun']
async function trendingSongs() {

    const songs = await Promise.all(
        trendingSongsArr.map(async name => {
            const q = encodeURIComponent(name)
            const resp = await fetch(url + 'search/songs?query=' + q)
            const data = await resp.json()
            return data.data.results[0]
        })
    )
    console.log(songs)
    renderSongs(songs)

}

function renderSongs(songs) {
    for (let song of songs) {
        const card = document.createElement('div')
        const img = document.createElement('img')
        const title = document.createElement('div')
        const artist = document.createElement('div')
        const play = document.createElement('img')
        const duration = document.createElement('div')
        const info = document.createElement('div')

        card.classList.add('song-card')
        img.classList.add('song_img')
        title.classList.add('song_title')
        artist.classList.add('song_artist')
        play.classList.add('song_play')
        duration.classList.add('song_duration')
        info.classList.add('r_info')

        img.src = song.image[0].url
        title.innerText = decodeHTML(song.name)
        artist.innerText = decodeHTML(song.artists.primary[0].name)
        const minutes = Math.floor(song.duration / 60)
        const seconds = String(song.duration % 60).padStart(2, '0')
        duration.innerText = minutes + ':' + seconds
        play.src = 'image/play_button.png'

        card.addEventListener("click", () => {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
            window.location = 'player.html?id=' + song.id + '&return=' + returnUrl
        })

        card.appendChild(img)
        info.appendChild(title)
        info.appendChild(artist)
        card.appendChild(info)
        card.appendChild(duration)
        card.appendChild(play)

        const container = document.getElementById('songs-container')
        //container.innerHTML = ''
        if (container)
            container.appendChild(card)
        else {
            document.getElementById('tracklist').appendChild(card)
        }

    }
}

//back nav button
document.addEventListener('DOMContentLoaded', () => {
    const back_btn = document.querySelector('.back')
    if (!back_btn)
        return
    const params = new URLSearchParams(window.location.search)
    const returnUrl = params.get('return')
    back_btn.addEventListener('click', () =>
        window.location = returnUrl

    )
}
)

//ARTIST PAGE
async function artist() {
    const params = new URLSearchParams(window.location.search)
    let id = params.get('id')

    const resp = await fetch(url + 'artists/' + id, {
        headers: {
            Accept: 'application/json'
        }
    })
    //const text = await resp.text()  // get raw text first
    // console.log(text)
    const data = await resp.json()
    console.log(data)

    document.getElementById('art-img').src = data.data.image[2].url
    document.getElementById('art-name').innerText = decodeHTML(data.data.name)
    document.getElementById('follower-count').innerText = data.data.followerCount + ' Listeners'

    //if bio or similar returns empty array
    if (!data.data.similarArtists?.length) {
        document.getElementById('similar-artist').style.display = 'none'
    }
    if (!data.data.bio?.length) {
        document.getElementById('about-artist').style.display = 'none'
    }
    else {
        document.getElementById('about').innerText = decodeHTML(data.data.bio[0].text)
    }

    const topSongs = data.data.topSongs
    renderRecommendations(topSongs)

    const albumresp = await fetch(url + 'artists/' + id + '/albums', {
        headers: {
            Accept: 'application/json'
        }
    })

    const albumdata = await albumresp.json()
    console.log(albumdata)

    const albums = albumdata.data.albums
    renderAlbums(albums)
    renderArtists(data.data.similarArtists)
}

function renderAlbums(albums) {

    albums.forEach(album => {
        const result = document.createElement("div")
        let img = document.createElement('img')
        let descdiv = document.createElement('div')
        let titlediv = document.createElement('div')

        result.classList.add('album_card')
        img.classList.add('s_img')
        descdiv.classList.add('s_desc')
        titlediv.classList.add('s_title')

        titlediv.innerText = decodeHTML(album.name)
        img.src = album.image[2].url

        //const artists = album.artists.primary.slice(0, 3)
        //    .map(artist => decodeHTML(artist.name)).join(', ')
        //singerdiv.innerText = artists

        result.addEventListener('click', () => {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
            window.location = 'album.html?id=' + album.id + '&return=' + returnUrl
        })

        result.appendChild(img)
        descdiv.appendChild(titlediv)
        //descdiv.appendChild(singerdiv)
        result.appendChild(descdiv)
        const container = document.getElementById("art-albums")
        if (container)
            document.getElementById("art-albums").appendChild(result)
        else if(document.querySelector('.albums-grid')){
            document.querySelector(".albums-grid").appendChild(result)
        }
        else {
            //const album-container = document.getElementById("s_albums")
            document.getElementById("s_albums").appendChild(result)
            //if (album.container == ' ')
                
                
        }
    })
}

async function album() {
    const params = new URLSearchParams(window.location.search)
    let id = params.get('id')

    const resp = await fetch(url + 'albums?id=' + id, {
        headers: {
            Accept: 'application/json'
        }
    })
    //const text = await resp.text()  // get raw text first
    // console.log(text)
    const data = await resp.json()
    console.log(data)

    document.getElementById('album-cover').src = data.data.image[2].url
    document.getElementById('album-title').innerText = data.data.name
    document.getElementById('album-artist-img').src = data.data.artists.primary[0].image[2].url
    document.getElementById('album-artist-name').innerText = data.data.artists.primary[0].name
    document.getElementById('album-year').innerText = data.data.year
    document.getElementById('album-song-count').innerText = data.data.songCount + ' songs'

    renderSongs(data.data.songs)

}

// Featured albums on main page
const featuredAlbumsArr = ['Blonde', 'Currents', 'AM', 'All Eyez On Me']

async function featuredAlbums() {
    const albums = await Promise.all(
        featuredAlbumsArr.map(async name => {
            const q = encodeURIComponent(name)
            const resp = await fetch('http://localhost:3000/api/search/albums?query=' + q)
            const data = await resp.json()
            return data.data.results[0]
        })
    )
    console.log(albums)
    renderAlbums(albums)
}

// function renderFeaturedAlbums(albums) {
//     const grid = document.getElementById('albums-grid')
//     if (!grid) return

//     albums.forEach((album, i) => {
//         const tile = document.createElement('a')
//         const imgWrap = document.createElement('div')
//         const img = document.createElement('img')
//         const overlay = document.createElement('div')
//         const overlaySpan = document.createElement('span')
//         const name = document.createElement('p')
//         const artist = document.createElement('p')

//         tile.href = 'album.html?id=' + album.id + '&return=' + encodeURIComponent(window.location.pathname)
//         tile.classList.add('album-tile')
//         tile.style.animationDelay = (i * 0.1 + 0.1) + 's'

//         imgWrap.classList.add('album-img-wrap')
//         overlay.classList.add('album-overlay')
//         overlaySpan.textContent = 'Listen Now'
//         name.classList.add('album-tile-name')
//         artist.classList.add('album-tile-artist')

//         img.src = album.image[2].url
//         img.alt = decodeHTML(album.name)
//         name.textContent = decodeHTML(album.name)
//         artist.textContent = decodeHTML(album.artists.primary[0].name)

//         overlay.appendChild(overlaySpan)
//         imgWrap.appendChild(img)
//         imgWrap.appendChild(overlay)
//         tile.appendChild(imgWrap)
//         tile.appendChild(name)
//         tile.appendChild(artist)
//         grid.appendChild(tile)
//     })
// }
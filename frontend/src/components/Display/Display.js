import { useState, useEffect } from "react";
import SongCard from "../SongCard/SongCard";
import UploadForm from "../UploadForm/UploadForm";
import "./Display.css";

const getSongs = async () => {
  try {
    const response = await fetch('http://localhost:5000/get-songs');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Songs fetch failed:', err);
    return null;
  }
};

const getPreferences = async () => {
  try {
    const response = await fetch('http://localhost:5000/get-preferences');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const preferences = await response.json();
    return preferences.preferences;
  } catch (err) {
    console.error('Preferences fetch failed:', err);
    return null;
  }
};

const Display = () => {
  const [songs, setSongs] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [popUpIndex, setPopUpIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const songsPerPage = 10;

  const sortSongs = (songs) => {
    if (!preferences) return songs;

    return [...songs].sort((a, b) => {
      const getScore = (song) => {
        const s1 = preferences[song.sentiment1] || 0;
        const s2 = (song.sentiment2 !== 'none' ? preferences[song.sentiment2] || 0 : 0);
        return s1 + s2 + (song.randomNoise || 0); 
      };
      return getScore(b) - getScore(a);
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      const songsData = await getSongs();
      if (songsData) {
        const songsWithNoise = songsData.map(song => ({
          ...song,
          randomNoise: Math.random() * 0.3 
        }));
        setSongs(songsWithNoise);
      }
    };

    const fetchPreferences = async () => {
      const prefs = await getPreferences();
      setPreferences(prefs);
    };

    fetchData();
    fetchPreferences();
  }, []);

  const filteredSongs = songs.filter(song =>
    song.song.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedSongs = sortSongs(filteredSongs);
  const totalPages = Math.ceil(sortedSongs.length / songsPerPage);
  const indexOfLastSong = currentPage * songsPerPage;
  const indexOfFirstSong = indexOfLastSong - songsPerPage;
  const currentSongs = sortedSongs.slice(indexOfFirstSong, indexOfLastSong);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="display-container">
      <nav className="display-nav">
        <div>
          <h2 className="app-title">LyricsLens</h2>
          {preferences ? (
            <div className="emotion-boxes">
              {Object.entries(preferences).map(([emotion, value]) => (
                <div key={emotion} className={`emotion-box ${emotion}`}>
                  {emotion}: {value}
                </div>
              ))}
            </div>
          ) : (
            <div>Loading preferences...</div>
          )}
        </div>
        <button onClick={() => setPopUpIndex(-2)} className="add-song-button">Add Song</button>
      </nav>

      {showSuccessMessage && (
        <div className="success-popup">
          Song added successfully!
        </div>
      )}

      {popUpIndex === -2 && (
        <div className="modal-overlay">
          <div className="modal-content">
            <UploadForm onSuccess={() => {
              setPopUpIndex(-1);
              setShowSuccessMessage(true);
              getSongs().then(songsData => {
                const songsWithNoise = songsData.map(song => ({
                  ...song,
                  randomNoise: Math.random() * 0.03
                }));
                setSongs(songsWithNoise);
              });
              setTimeout(() => setShowSuccessMessage(false), 3000);
            }} />
            <button onClick={() => setPopUpIndex(-1)} className="close-modal">Close</button>
          </div>
        </div>
      )}

      <input
        type="text"
        placeholder="Search songs..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1);
        }}
        className="search-input"
      />

      <div>
        {songs ? currentSongs.map((song, index) => (
          <SongCard
            key={indexOfFirstSong + index}
            index={indexOfFirstSong + index}
            song={song}
            popUpShow={popUpIndex === (indexOfFirstSong + index)}
            setPopUp={(index) => setPopUpIndex(index)}
            onClick={() => setPopUpIndex(indexOfFirstSong + index)}
            removePopup={() => setPopUpIndex(-1)}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            songsPerPage={songsPerPage}
            totalSongs={filteredSongs.length}
          />
        )) : 'Loading...'}
      </div>

      <div className="pagination">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span> Page {currentPage} of {totalPages} </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Display;

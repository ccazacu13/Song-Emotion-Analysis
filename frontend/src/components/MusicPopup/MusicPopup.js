import { useState, useRef, useEffect } from 'react';
import './MusicPopup.css';

const MusicPopup = ({
  index,
  song,
  removePopup,
  setPopUp,
  totalSongs,
  songsPerPage,
  currentPage,
  setCurrentPage,
}) => {
  const audioRef = useRef(null);
  const [listenedTime, setListenedTime] = useState(0);
  const [status, setStatus] = useState('');
  const lastUpdateTime = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      const now = audio.currentTime;
      if (lastUpdateTime.current !== null) {
        const delta = now - lastUpdateTime.current;
        if (delta > 0 && delta < 1.5) {
          setListenedTime((prev) => prev + delta);
        }
      }
      lastUpdateTime.current = now;
    };

    const handleSeeked = () => {
      lastUpdateTime.current = audio.currentTime;
    };

    const handlePause = () => {
      lastUpdateTime.current = null;
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handlePause);
    };
  }, []);

  const updatePreferences = async () => {
    if (listenedTime < 5) {
      setStatus('Skipped — listened too briefly to affect preferences.');
      return;
    }

    const formData = new FormData();
    const audio = audioRef.current;
    let songLength = 0;
    if (audio) songLength = Math.floor(audio.duration);

    formData.append('total_listened', listenedTime);
    formData.append('song_length', songLength);
    formData.append('primary_emotion', song.sentiment1);
    formData.append('secondary_emotion', song.sentiment2);

    try {
      const res = await fetch('http://localhost:5000/update-preferences', {
        method: 'PATCH',
        body: formData,
      });

      const data = await res.json();
      setStatus(data.message || 'Preferences update successful!');
    } catch (err) {
      console.error(err);
      setStatus('Preferences update failed.');
    }
  };

  const getImagePath = (artist, song) => {
    return `http://localhost:5000/images/${artist}/${song}`;
  };

  const getAudioPath = (artist, song) => {
    return `http://localhost:5000/audio/${artist}/${song}`;
  };

  const handleNext = () => {
    updatePreferences();
    const nextIndex = index + 1;
    if (nextIndex < totalSongs) {
      const nextPage = Math.floor(nextIndex / songsPerPage) + 1;
      setCurrentPage(nextPage);
      setPopUp(nextIndex);
    }
  };

  const handlePrev = () => {
    updatePreferences();
    const prevIndex = index - 1;
    if (prevIndex >= 0) {
      const prevPage = Math.floor(prevIndex / songsPerPage) + 1;
      setCurrentPage(prevPage);
      setPopUp(prevIndex);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="popup-modal-content row-layout">
        <button className="popup-close" onClick={() => { updatePreferences(); removePopup(); }}>
          ×
        </button>

        <div className="popup-left">
          <button
            className="nav-button inline-left"
            onClick={handlePrev}
            disabled={index <= 0}
          >
            ←
          </button>

          <div className="popup-main">
            <h2>{song.song}</h2>
            <img src={getImagePath(song.artist, song.song)} alt={song.song} />
            <p className="popup-artist">{song.artist}</p>
            <audio ref={audioRef} controls>
              <source src={getAudioPath(song.artist, song.song)} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
            {status && <p className="popup-status">{status}</p>}
          </div>

          <button
            className="nav-button inline-right"
            onClick={handleNext}
            disabled={index >= totalSongs - 1}
          >
            →
          </button>
        </div>

        <div className="popup-lyrics scrollable-lyrics">
          <h3>Lyrics</h3>
          <pre>{song.lyrics}</pre>
        </div>
      </div>
    </div>
  );
};

export default MusicPopup;

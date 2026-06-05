import './SongCard.css';
import MusicPopup from '../MusicPopup/MusicPopup';

const SongCard = ({index, song, popUpShow, onClick, removePopup, setPopUp, currentPage, setCurrentPage, songsPerPage, totalSongs }) => {
  const getImagePath = (artist, song) => {
    return `http://localhost:5000/images/${artist}/${song}`;
  };

  return (
    <div className="songcard-wrapper">
      <div className="song-card" onClick={onClick}>
        <img src={getImagePath(song.artist, song.song)} alt={`${song.song} cover`} />
        <div className="song-info">
          <p className="title">{song.song}</p>
          <p className="artist">{song.artist}</p>
          <div className="tags">
            <span className={`tag ${song.sentiment1}`}>{song.sentiment1}</span>
            <span className={`tag ${song.sentiment2}`}>{song.sentiment2}</span>
          </div>
        </div>
      </div>
      {popUpShow && <MusicPopup index={index} song={song} removePopup={removePopup} setPopUp={setPopUp} currentPage={currentPage} setCurrentPage={setCurrentPage} songsPerPage={songsPerPage} totalSongs={totalSongs}/>}
    </div>
  );
};

export default SongCard;
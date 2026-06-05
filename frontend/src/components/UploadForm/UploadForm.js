import { useState } from "react";
import "./UploadForm.css";

function UploadForm({ onSuccess }) {
  const [author, setAuthor] = useState('');
  const [song, setSong] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [image, setImage] = useState(null);
  const [audio, setAudio] = useState(null);
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('author', author);
    formData.append('song', song);
    formData.append('lyrics', lyrics);
    formData.append('image', image);
    formData.append('audio', audio);

    try {
      const res = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setStatus(data.message || 'Upload successful!');

      if (onSuccess) {
        onSuccess(); // Notify parent to close modal and show popup
      }

    } catch (err) {
      console.error(err);
      setStatus('Upload failed.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="upload-form">
      <input
        type="text"
        placeholder="Author"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        required
      />

      <input
        type="text"
        placeholder="Song"
        value={song}
        onChange={(e) => setSong(e.target.value)}
        required
      />

      <textarea
        placeholder="Lyrics"
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
        required
      />

      <label htmlFor="image-upload">Upload Cover Image</label>
      <input
        id="image-upload"
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files[0])}
        required
      />

      <label htmlFor="audio-upload">Upload Audio File</label>
      <input
        id="audio-upload"
        type="file"
        accept="audio/*"
        onChange={(e) => setAudio(e.target.files[0])}
        required
      />

      <button type="submit">Upload</button>

      <p className="upload-status">{status}</p>
    </form>
  );
}

export default UploadForm;
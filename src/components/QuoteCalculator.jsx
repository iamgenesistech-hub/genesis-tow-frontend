import { useState } from 'react';
import './QuoteCalculator.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const SERVICE_TYPES = [
  { value: 'tow', label: 'Standard Tow' },
  { value: 'flatbed', label: 'Flatbed Tow' },
  { value: 'motorcycle', label: 'Motorcycle Tow' },
  { value: 'roadside', label: 'Roadside Assistance' },
  { value: 'jumpstart', label: 'Jump Start' },
  { value: 'lockout', label: 'Lockout Service' },
  { value: 'tire_change', label: 'Tire Change' },
  { value: 'fuel_delivery', label: 'Fuel Delivery' },
  { value: 'winch', label: 'Winch / Recovery' },
];

const DUTY_LEVELS = [
  { value: 'light', label: 'Light Duty (cars, small SUVs)' },
  { value: 'medium', label: 'Medium Duty (large SUVs, vans, small trucks)' },
  { value: 'heavy', label: 'Heavy Duty (RVs, semis, buses)' },
];

function QuoteCalculator() {
  const [form, setForm] = useState({
    serviceType: 'tow',
    dutyLevel: 'light',
    pickupLat: '',
    pickupLng: '',
    dropoffLat: '',
    dropoffLng: '',
    customerName: '',
    customerPhone: '',
  });

  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos((prev) => [...prev, ...files]);

    const previews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews((prev) => [...prev, ...previews]);
  };

  const removePhoto = (index) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const getQuote = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setQuote(null);

    try {
      const res = await fetch(`${API_URL}/jobs/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: form.serviceType,
          dutyLevel: form.dutyLevel,
          pickup: { lat: parseFloat(form.pickupLat), lng: parseFloat(form.pickupLng) },
          dropoff: { lat: parseFloat(form.dropoffLat), lng: parseFloat(form.dropoffLng) },
        }),
      });

      if (!res.ok) throw new Error('Failed to get quote');
      const data = await res.json();
      setQuote(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const bookJob = async () => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('serviceType', form.serviceType);
      formData.append('dutyLevel', form.dutyLevel);
      formData.append('pickup', JSON.stringify({ lat: parseFloat(form.pickupLat), lng: parseFloat(form.pickupLng) }));
      formData.append('dropoff', JSON.stringify({ lat: parseFloat(form.dropoffLat), lng: parseFloat(form.dropoffLng) }));
      if (form.customerName) formData.append('customerName', form.customerName);
      if (form.customerPhone) formData.append('customerPhone', form.customerPhone);

      photos.forEach((photo) => {
        formData.append('photos', photo);
      });

      const res = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to book job');
      const data = await res.json();
      setQuote(data);
      alert(`Job booked! ID: ${data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quote-calculator">
      <form onSubmit={getQuote}>
        <div className="field">
          <label>Service Type</label>
          <select name="serviceType" value={form.serviceType} onChange={handleChange}>
            {SERVICE_TYPES.map((st) => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Duty Level</label>
          <select name="dutyLevel" value={form.dutyLevel} onChange={handleChange}>
            {DUTY_LEVELS.map((dl) => (
              <option key={dl.value} value={dl.value}>{dl.label}</option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend>Pickup Location</legend>
          <div className="row">
            <input name="pickupLat" placeholder="Latitude" value={form.pickupLat} onChange={handleChange} required />
            <input name="pickupLng" placeholder="Longitude" value={form.pickupLng} onChange={handleChange} required />
          </div>
        </fieldset>

        <fieldset>
          <legend>Drop-off Location</legend>
          <div className="row">
            <input name="dropoffLat" placeholder="Latitude" value={form.dropoffLat} onChange={handleChange} required />
            <input name="dropoffLng" placeholder="Longitude" value={form.dropoffLng} onChange={handleChange} required />
          </div>
        </fieldset>

        <fieldset>
          <legend>Your Info (optional)</legend>
          <input name="customerName" placeholder="Name" value={form.customerName} onChange={handleChange} />
          <input name="customerPhone" placeholder="Phone" value={form.customerPhone} onChange={handleChange} />
        </fieldset>

        <fieldset>
          <legend>📷 Photos (optional)</legend>
          <p className="photo-hint">Upload photos of your vehicle or situation to help the driver prepare.</p>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            className="photo-input"
          />
          {photoPreviews.length > 0 && (
            <div className="photo-previews">
              {photoPreviews.map((src, i) => (
                <div key={i} className="photo-thumb">
                  <img src={src} alt={`Upload ${i + 1}`} />
                  <button type="button" onClick={() => removePhoto(i)} className="remove-photo">✕</button>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        <button type="submit" disabled={loading}>
          {loading ? 'Calculating...' : 'Get Quote'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {quote && (
        <div className="result">
          <h3>Your Quote</h3>
          <p><strong>Distance:</strong> {quote.distanceMiles} miles</p>
          <p><strong>Price:</strong> {quote.priceFormatted}</p>
          {!quote.id && (
            <button onClick={bookJob} disabled={loading} className="book-btn">
              {photos.length > 0 ? `Book This Job (${photos.length} photo${photos.length > 1 ? 's' : ''})` : 'Book This Job'}
            </button>
          )}
          {quote.id && <p className="booked">✓ Job #{quote.id} booked!</p>}
        </div>
      )}
    </div>
  );
}

export default QuoteCalculator;

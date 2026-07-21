import { useState } from 'react';
import './QuoteCalculator.css';

const API_URL = import.meta.env.VITE_API_URL || '';

function QuoteCalculator() {
  const [form, setForm] = useState({
    serviceType: 'tow',
    pickupLat: '',
    pickupLng: '',
    dropoffLat: '',
    dropoffLng: '',
    customerName: '',
    customerPhone: '',
  });

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      const res = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: form.serviceType,
          pickup: { lat: parseFloat(form.pickupLat), lng: parseFloat(form.pickupLng) },
          dropoff: { lat: parseFloat(form.dropoffLat), lng: parseFloat(form.dropoffLng) },
          customerName: form.customerName || undefined,
          customerPhone: form.customerPhone || undefined,
        }),
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
            <option value="tow">Tow</option>
            <option value="roadside">Roadside Assistance</option>
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
              Book This Job
            </button>
          )}
          {quote.id && <p className="booked">✓ Job #{quote.id} booked!</p>}
        </div>
      )}
    </div>
  );
}

export default QuoteCalculator;

import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://genesis-tow-backend-production.up.railway.app';

const PHOTO_TYPES = [
  { key: 'front', label: 'Front of Vehicle' },
  { key: 'rear', label: 'Rear of Vehicle' },
  { key: 'front_driver_side', label: 'Front Driver Side' },
  { key: 'rear_driver_side', label: 'Rear Driver Side' },
  { key: 'front_passenger_side', label: 'Front Passenger Side' },
  { key: 'rear_passenger_side', label: 'Rear Passenger Side' },
];

const SERVICE_TYPES = {
  tow: {
    label: 'Tow',
    subtypes: [],
  },
  roadside_assistance: {
    label: 'Roadside Assistance',
    subtypes: [
      { value: 'tire_change', label: 'Tire Change' },
      { value: 'lockout', label: 'Lockout' },
    ],
  },
  winch_out: {
    label: 'Winch Out',
    subtypes: [],
  },
};

const DUTY_LEVELS = [
  { value: 'regular', label: 'Regular (Cars & Most Pickups)' },
  { value: 'medium', label: 'Medium (Duallys, Work Vans, Large Cars)' },
  { value: 'heavy_duty', label: 'Heavy-Duty (18-Wheelers, Box Trucks)' },
];

export default function App() {
  const [serviceType, setServiceType] = useState('tow');
  const [serviceSubtype, setServiceSubtype] = useState('');
  const [dutyLevel, setDutyLevel] = useState('regular');
  const [photos, setPhotos] = useState({
    front: null,
    rear: null,
    front_driver_side: null,
    rear_driver_side: null,
    front_passenger_side: null,
    rear_passenger_side: null,
  });

  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [distance, setDistance] = useState(null);
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState([]);
  const [booked, setBooked] = useState(false);

  // Check if all photos are uploaded
  const allPhotosUploaded = Object.values(photos).every((photo) => photo !== null);

  // Check if service subtype is required and selected
  const currentService = SERVICE_TYPES[serviceType];
  const subtypeRequired = currentService?.subtypes.length > 0;
  const subtypeSelected = !subtypeRequired || serviceSubtype !== '';

  // Handle service type change
  const handleServiceTypeChange = (newServiceType) => {
    setServiceType(newServiceType);
    setServiceSubtype(''); // Reset subtype when changing service
  };

  // Handle photo upload
  const handlePhotoUpload = (photoKey, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotos((prev) => ({
        ...prev,
        [photoKey]: {
          file,
          preview: e.target?.result,
        },
      }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const calculateQuote = async () => {
    if (!pickup.trim() || !dropoff.trim()) {
      setError('Please enter both pickup and dropoff locations');
      return;
    }

    if (!allPhotosUploaded) {
      setError('All 6 vehicle photos are required before proceeding');
      return;
    }

    if (subtypeRequired && !subtypeSelected) {
      setError('Please select a service option');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        serviceType,
        duty_level: dutyLevel,
        pickup_address: pickup,
        dropoff_address: dropoff,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
      };

      if (serviceSubtype) {
        payload.service_subtype = serviceSubtype;
      }

      const response = await axios.post(`${API_BASE_URL}/jobs`, payload);

      setDistance(response.data.distance_miles);
      setPrice(response.data.price_cents / 100);
      setBooked(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate quote. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = async () => {
    if (price === null) return;

    setLoading(true);
    setError('');

    try {
      const payload = {
        serviceType,
        duty_level: dutyLevel,
        pickup_address: pickup,
        dropoff_address: dropoff,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
      };

      if (serviceSubtype) {
        payload.service_subtype = serviceSubtype;
      }

      await axios.post(`${API_BASE_URL}/jobs`, payload);

      setBooked(true);
      setPickup('');
      setDropoff('');
      setCustomerName('');
      setCustomerPhone('');
      setPhotos({
        front: null,
        rear: null,
        front_driver_side: null,
        rear_driver_side: null,
        front_passenger_side: null,
        rear_passenger_side: null,
      });
      setDistance(null);
      setPrice(null);
      setServiceType('tow');
      setServiceSubtype('');
      setDutyLevel('regular');

      fetchJobs();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm booking. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/jobs`);
      setJobs(response.data);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  };

  React.useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">Genesis Tow</h1>
          <p className="text-xl text-gray-600">Fast & Reliable Towing Services</p>
        </div>

        {/* Booking Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Book a Service</h2>

          {booked && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              ✓ Booking confirmed! Your service is scheduled.
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Service Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Service Type *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(SERVICE_TYPES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => handleServiceTypeChange(key)}
                  className={`py-3 px-4 rounded-lg font-semibold transition ${
                    serviceType === key
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Service Subtype Selection */}
          {subtypeRequired && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Service Option *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {currentService.subtypes.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setServiceSubtype(value)}
                    className={`py-2 px-4 rounded-lg font-semibold transition ${
                      serviceSubtype === value
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-white border border-green-200 text-gray-700 hover:border-green-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vehicle Size & Duty Level */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Vehicle Size *
            </label>
            <select
              value={dutyLevel}
              onChange={(e) => setDutyLevel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DUTY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Photo Upload Section */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Vehicle Photos * (Required - 6 angles)
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Upload photos from all 6 angles to protect both you and the driver from damage disputes.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {PHOTO_TYPES.map((photoType) => (
                <div key={photoType.key} className="flex flex-col items-center">
                  <label className="w-full">
                    <div
                      className={`relative w-full aspect-square border-2 border-dashed rounded-lg cursor-pointer transition ${
                        photos[photoType.key]
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      {photos[photoType.key] ? (
                        <>
                          <img
                            src={photos[photoType.key].preview}
                            alt={photoType.label}
                            className="w-full h-full object-cover rounded"
                          />
                          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                            ✓
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <svg
                            className="w-8 h-8 text-gray-400 mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          <span className="text-xs text-gray-500">Upload</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(photoType.key, e)}
                        className="hidden"
                      />
                    </div>
                  </label>
                  <p className="text-xs text-gray-600 mt-2 text-center">{photoType.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Location Inputs */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pickup Location *
              </label>
              <input
                type="text"
                placeholder="e.g., 123 Main St, Atlanta, GA"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Dropoff Location *
              </label>
              <input
                type="text"
                placeholder="e.g., 456 Oak Ave, Atlanta, GA"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="Your phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Calculate Quote Button */}
          <button
            onClick={calculateQuote}
            disabled={loading || !allPhotosUploaded || !subtypeSelected}
            className={`w-full py-3 rounded-lg font-semibold transition ${
              allPhotosUploaded && subtypeSelected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            {loading
              ? 'Calculating...'
              : `Calculate Quote ${!allPhotosUploaded || !subtypeSelected ? '(Complete form first)' : ''}`}
          </button>

          {/* Quote Results */}
          {price !== null && (
            <div className="mt-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="space-y-3 mb-6">
                <p className="text-gray-700">
                  <strong>Service Type:</strong> {SERVICE_TYPES[serviceType]?.label}
                  {serviceSubtype &&
                    ` - ${SERVICE_TYPES[serviceType]?.subtypes.find((s) => s.value === serviceSubtype)?.label}`}
                </p>
                <p className="text-gray-700">
                  <strong>Vehicle Size:</strong> {DUTY_LEVELS.find((l) => l.value === dutyLevel)?.label}
                </p>
                <p className="text-gray-700">
                  <strong>Distance:</strong> {distance} miles
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  Estimated Price: ${price.toFixed(2)}
                </p>
              </div>
              <button
                onClick={confirmBooking}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          )}
        </div>

        {/* Active Bookings */}
        {jobs.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Bookings</h2>
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-gray-700">
                    <strong>Service:</strong> {job.service_type}
                    {job.service_subtype && ` - ${job.service_subtype}`}
                  </p>
                  <p className="text-gray-700">
                    <strong>From:</strong> {job.pickup_address || 'N/A'}
                  </p>
                  <p className="text-gray-700">
                    <strong>To:</strong> {job.dropoff_address || 'N/A'}
                  </p>
                  <p className="text-gray-700">
                    <strong>Distance:</strong> {job.distance_miles} miles
                  </p>
                  <p className="text-gray-700">
                    <strong>Price:</strong> ${(job.price_cents / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
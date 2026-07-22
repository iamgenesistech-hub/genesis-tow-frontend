import React, { useState, useRef, useEffect } from 'react';
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
  tow: { label: 'Tow', subtypes: [] },
  roadside_assistance: {
    label: 'Roadside Assistance',
    subtypes: [
      { value: 'tire_change', label: 'Tire Change' },
      { value: 'lockout', label: 'Lockout' },
    ],
  },
  winch_out: { label: 'Winch Out', subtypes: [] },
};

const DUTY_LEVELS = [
  { value: 'regular', label: 'Regular (Cars & Most Pickups)' },
  { value: 'medium', label: 'Medium (Duallys, Work Vans, Large Cars)' },
  { value: 'heavy_duty', label: 'Heavy-Duty (18-Wheelers, Box Trucks)' },
];

const KEY_LOCATIONS = {
  with_customer: 'With Customer',
  under_mat: 'Under Floor Mat',
  under_bumper: 'Under Bumper/Wheel',
  mailbox: 'In Mailbox',
  with_neighbor: 'With Neighbor',
  other: 'Other',
};

const INSURANCE_FEE = 12; // $12 flat fee for additional insurance

export default function App() {
  // Form state
  const [serviceType, setServiceType] = useState('tow');
  const [serviceSubtype, setServiceSubtype] = useState('');
  const [dutyLevel, setDutyLevel] = useState('regular');
  const [addInsurance, setAddInsurance] = useState(false); // NEW
  const [photos, setPhotos] = useState({
    front: null,
    rear: null,
    front_driver_side: null,
    rear_driver_side: null,
    front_passenger_side: null,
    rear_passenger_side: null,
  });

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhoneAlt, setCustomerPhoneAlt] = useState('');
  const [withVehicle, setWithVehicle] = useState(null);
  const [stayingWithVehicle, setStayingWithVehicle] = useState(null);
  const [keyLocation, setKeyLocation] = useState(null);
  const [keyLocationCustom, setKeyLocationCustom] = useState('');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [locationError, setLocationError] = useState('');

  // Booking state
  const [distance, setDistance] = useState(null);
  const [price, setPrice] = useState(null);
  const [insuranceFee, setInsuranceFee] = useState(0); // NEW
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState([]);
  const [booked, setBooked] = useState(false);
  const [activeJobId, setActiveJobId] = useState(null);
  const [bookedKeyLocation, setBookedKeyLocation] = useState(null);
  const [bookedKeyLocationCustom, setBookedKeyLocationCustom] = useState('');

  // Driver info (mock)
  const [driverInfo, setDriverInfo] = useState({
    name: 'John Smith',
    companyName: 'Genesis Tow Services',
    photo: 'https://via.placeholder.com/100?text=John+S',
    phone: '(404) 555-0123',
    eta: 12,
    status: 'en_route',
  });

  // Rating & tip state
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef({});
  const watchIdRef = useRef(null);

  // Check if all photos are uploaded
  const allPhotosUploaded = Object.values(photos).every((photo) => photo !== null);

  // Check if service subtype is required and selected
  const currentService = SERVICE_TYPES[serviceType];
  const subtypeRequired = currentService?.subtypes.length > 0;
  const subtypeSelected = !subtypeRequired || serviceSubtype !== '';

  // Check if contact info is complete
  const contactComplete = customerName.trim() && customerPhone.trim();

  // Check if vehicle presence is selected
  const vehiclePresenceSelected = withVehicle !== null;
  const stayingSelected = withVehicle === false || (withVehicle === true && stayingWithVehicle !== null);

  // Check if key location is properly selected
  const keyLocationSelected =
    withVehicle === true ||
    (withVehicle === false &&
      keyLocation !== null &&
      (keyLocation !== 'other' || keyLocationCustom.trim() !== ''));

  // Get live location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationAccuracy(Math.round(position.coords.accuracy));
        setLocationError('');
      },
      (err) => {
        setLocationError(`Location error: ${err.message}. Please enable location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Start watching location
  const startWatchingLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationAccuracy(Math.round(position.coords.accuracy));
      },
      (err) => {
        console.error('Watch error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Stop watching location
  const stopWatchingLocation = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Start camera
  const startCamera = async (photoKey) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setCameraOpen(photoKey);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError('Unable to access camera. Please check permissions.');
      console.error(err);
    }
  };

  // Capture photo from camera
  const capturePhoto = (photoKey) => {
    if (!canvasRef.current || !videoRef.current) return;

    const context = canvasRef.current.getContext('2d');
    const video = videoRef.current;

    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvasRef.current.toBlob((blob) => {
      if (!blob) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotos((prev) => ({
          ...prev,
          [photoKey]: {
            file: blob,
            preview: e.target?.result,
          },
        }));
        stopCamera();
        setError('');
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.95);
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }
    setCameraOpen(null);
  };

  // Handle file upload
  const handlePhotoUpload = (photoKey, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

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

  const handleServiceTypeChange = (newServiceType) => {
    setServiceType(newServiceType);
    setServiceSubtype('');
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

    if (!contactComplete) {
      setError('Name and phone number are required');
      return;
    }

    if (!vehiclePresenceSelected) {
      setError('Please indicate if you are with the vehicle');
      return;
    }

    if (!stayingSelected) {
      setError('Please indicate if you will stay with the vehicle');
      return;
    }

    if (subtypeRequired && !subtypeSelected) {
      setError('Please select a service option');
      return;
    }

    if (withVehicle === false && !keyLocation) {
      setError('Please specify where the driver can find the keys');
      return;
    }

    if (withVehicle === false && keyLocation === 'other' && !keyLocationCustom.trim()) {
      setError('Please describe where the driver can find the keys');
      return;
    }

    if (stayingWithVehicle && !latitude) {
      setError('Please enable your location to share your coordinates');
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
        customerName,
        customerPhone,
        customerPhoneAlt: customerPhoneAlt || null,
        with_vehicle: withVehicle,
        staying_with_vehicle: stayingWithVehicle,
        key_location: keyLocation,
        key_location_custom: keyLocation === 'other' ? keyLocationCustom : null,
        latitude: latitude || null,
        longitude: longitude || null,
        location_accuracy: locationAccuracy || null,
        add_insurance: addInsurance, // NEW
      };

      if (serviceSubtype) {
        payload.service_subtype = serviceSubtype;
      }

      const response = await axios.post(`${API_BASE_URL}/jobs`, payload);

      setDistance(response.data.distance_miles);
      setPrice(response.data.price_cents / 100);
      setInsuranceFee(addInsurance ? INSURANCE_FEE : 0); // NEW
      setBooked(false);
      setActiveJobId(response.data.id);

      if (stayingWithVehicle) {
        startWatchingLocation();
      }
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
        customerName,
        customerPhone,
        customerPhoneAlt: customerPhoneAlt || null,
        with_vehicle: withVehicle,
        staying_with_vehicle: stayingWithVehicle,
        key_location: keyLocation,
        key_location_custom: keyLocation === 'other' ? keyLocationCustom : null,
        latitude: latitude || null,
        longitude: longitude || null,
        location_accuracy: locationAccuracy || null,
        add_insurance: addInsurance, // NEW
      };

      if (serviceSubtype) {
        payload.service_subtype = serviceSubtype;
      }

      const response = await axios.post(`${API_BASE_URL}/jobs`, payload);

      setBooked(true);
      setActiveJobId(response.data.id);
      setBookedKeyLocation(keyLocation);
      setBookedKeyLocationCustom(keyLocationCustom);
      stopWatchingLocation();

      // Reset form
      setPickup('');
      setDropoff('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerPhoneAlt('');
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
      setInsuranceFee(0); // NEW
      setAddInsurance(false); // NEW
      setServiceType('tow');
      setServiceSubtype('');
      setDutyLevel('regular');
      setWithVehicle(null);
      setStayingWithVehicle(null);
      setKeyLocation(null);
      setKeyLocationCustom('');
      setLatitude(null);
      setLongitude(null);
      setLocationAccuracy(null);

      fetchJobs();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm booking. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    try {
      await axios.patch(`${API_BASE_URL}/jobs/${activeJobId}`, {
        rating,
        tip: tipAmount,
      });

      setShowRating(false);
      setShowCompletionMessage(true);

      setTimeout(() => {
        setShowCompletionMessage(false);
        setRating(0);
        setTipAmount(0);
      }, 5000);
    } catch (err) {
      setError('Failed to submit rating. Please try again.');
      console.error(err);
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

  useEffect(() => {
    fetchJobs();

    return () => {
      stopWatchingLocation();
    };
  }, []);

  // Camera view
  if (cameraOpen) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <h2 className="text-white text-2xl font-bold mb-4">
          Capture {PHOTO_TYPES.find((p) => p.key === cameraOpen)?.label}
        </h2>

        <video ref={videoRef} className="w-full max-w-md rounded-lg mb-4" style={{ transform: 'scaleX(-1)' }} />

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-4">
          <button
            onClick={() => capturePhoto(cameraOpen)}
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 text-lg"
          >
            📸 Capture Photo
          </button>
          <button
            onClick={stopCamera}
            className="bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 text-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Driver tracking view
  if (booked && activeJobId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Driver is On the Way</h1>
            <p className="text-xl text-gray-600">ETA: {driverInfo.eta} minutes</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <img
                  src={driverInfo.photo}
                  alt={driverInfo.name}
                  className="w-20 h-20 rounded-full border-4 border-blue-600"
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{driverInfo.name}</h2>
                  <p className="text-gray-600">{driverInfo.companyName}</p>
                  <p className="text-sm text-gray-500">Status: {driverInfo.status}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => window.open(`tel:${driverInfo.phone}`)}
                className="bg-green-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2 text-lg"
              >
                📞 Call Driver
              </button>
              <button
                onClick={() => window.open(`sms:${driverInfo.phone}`)}
                className="bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 text-lg"
              >
                💬 Text Driver
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📍 Live Tracking</h3>
            <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
              <p className="text-gray-600">Map integration coming soon</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Service Details</h3>
            <div className="space-y-3">
              <p className="text-gray-700">
                <strong>Distance:</strong> {distance} miles
              </p>
              <p className="text-gray-700">
                <strong>Estimated Price:</strong> ${price.toFixed(2)}
              </p>
              {insuranceFee > 0 && (
                <p className="text-gray-700">
                  <strong>Insurance Fee:</strong> ${insuranceFee.toFixed(2)}
                </p>
              )}
              <p className="text-gray-700 text-lg font-bold text-blue-600">
                <strong>Total:</strong> ${(price + insuranceFee).toFixed(2)}
              </p>
              <p className="text-gray-700">
                <strong>Pickup:</strong> {pickup}
              </p>
              <p className="text-gray-700">
                <strong>Dropoff:</strong> {dropoff}
              </p>
              {bookedKeyLocation && (
                <p className="text-gray-700">
                  <strong>🔑 Key Location:</strong>{' '}
                  {bookedKeyLocation === 'other'
                    ? bookedKeyLocationCustom
                    : KEY_LOCATIONS[bookedKeyLocation]}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Rating view
  if (showRating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {showCompletionMessage ? (
              <div className="text-center">
                <div className="text-6xl mb-6">✓</div>
                <h2 className="text-3xl font-bold text-green-600 mb-4">Service Complete!</h2>
                <p className="text-xl text-gray-600 mb-6">Thank you for using Genesis Tow</p>
                <p className="text-gray-600">Your driver has sent a text confirmation to {customerPhone}</p>
                <button
                  onClick={() => {
                    setShowRating(false);
                    setShowCompletionMessage(false);
                    setBooked(false);
                  }}
                  className="mt-8 bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Back to Home
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">How was your service?</h2>
                <p className="text-gray-600 mb-8">Please rate your experience with {driverInfo.name}</p>

                <div className="flex justify-center gap-4 mb-8">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-5xl transition ${
                        star <= rating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <div className="mb-8">
                  <label className="block text-lg font-semibold text-gray-700 mb-4">
                    Add a Tip (Optional)
                  </label>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[0, 5, 10, 20].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setTipAmount(amount)}
                        className={`py-3 px-4 rounded-lg font-semibold transition ${
                          tipAmount === amount
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 font-semibold">Custom:</span>
                    <input
                      type="number"
                      min="0"
                      step="0.50"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <button
                  onClick={submitRating}
                  disabled={rating === 0}
                  className={`w-full py-3 rounded-lg font-semibold text-lg transition ${
                    rating === 0
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Submit Rating & Tip
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main booking form
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
              ✓ Booking confirmed! Driver tracking will begin shortly. Stay with your vehicle.
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {locationError && (
            <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
              ⚠️ {locationError}
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

          {/* INSURANCE SELECTION - NEW */}
          <div className="mb-6 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🛡️ Optional Insurance</h3>
            <p className="text-sm text-gray-600 mb-4">
              Add additional coverage for any damages that may occur during the tow service.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAddInsurance(false)}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                  !addInsurance
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-white border-2 border-red-200 text-gray-700 hover:border-red-400'
                }`}
              >
                ✗ No Insurance
              </button>
              <button
                onClick={() => setAddInsurance(true)}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                  addInsurance
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-white border-2 border-green-200 text-gray-700 hover:border-green-400'
                }`}
              >
                ✓ Add Insurance (+${INSURANCE_FEE})
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              Without insurance, you will deal directly with the tow company regarding any damages.
            </p>
          </div>

          {/* Photo Upload Section */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Vehicle Photos * (Required - 6 angles)
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Snap photos directly with your camera or upload from your device. All 6 angles required.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {PHOTO_TYPES.map((photoType) => (
                <div key={photoType.key} className="flex flex-col items-center">
                  <div
                    className={`relative w-full aspect-square border-2 border-dashed rounded-lg transition ${
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
                        <button
                          onClick={() => startCamera(photoType.key)}
                          className="absolute bottom-2 right-2 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 text-sm"
                          title="Retake photo"
                        >
                          📷
                        </button>
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
                        <span className="text-xs text-gray-500">Tap to capture</span>
                      </div>
                    )}

                    {!photos[photoType.key] && (
                      <button
                        onClick={() => startCamera(photoType.key)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        title="Take photo"
                      />
                    )}
                  </div>

                  <input
                    ref={(el) => {
                      fileInputRef.current[photoType.key] = el;
                    }}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(photoType.key, e)}
                    className="hidden"
                  />

                  <p className="text-xs text-gray-600 mt-2 text-center">{photoType.label}</p>

                  {!photos[photoType.key] && (
                    <button
                      onClick={() => fileInputRef.current[photoType.key]?.click()}
                      className="text-xs text-gray-500 mt-1 hover:text-gray-700 underline"
                    >
                      or upload file
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information *</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Primary Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="Your phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Secondary Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="Additional phone number"
                  value={customerPhoneAlt}
                  onChange={(e) => setCustomerPhoneAlt(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Presence */}
          <div className="mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Vehicle Status *</h3>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Are you with your vehicle? *
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setWithVehicle(true);
                    setStayingWithVehicle(true);
                    setKeyLocation('with_customer');
                    setKeyLocationCustom('');
                  }}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                    withVehicle === true
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-white border-2 border-green-200 text-gray-700 hover:border-green-400'
                  }`}
                >
                  ✓ Yes, I'm with it
                </button>
                <button
                  onClick={() => {
                    setWithVehicle(false);
                    setStayingWithVehicle(false);
                    setKeyLocation(null);
                    setKeyLocationCustom('');
                  }}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                    withVehicle === false
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'bg-white border-2 border-green-200 text-gray-700 hover:border-green-400'
                  }`}
                >
                  ✗ No, not with it
                </button>
              </div>
            </div>

            {withVehicle === true && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Will you stay with your vehicle until the driver arrives? *
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setStayingWithVehicle(true)}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                      stayingWithVehicle === true
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-white border-2 border-green-200 text-gray-700 hover:border-green-400'
                    }`}
                  >
                    ✓ Yes, I'll stay
                  </button>
                  <button
                    onClick={() => setStayingWithVehicle(false)}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                      stayingWithVehicle === false
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-white border-2 border-green-200 text-gray-700 hover:border-green-400'
                    }`}
                  >
                    ✗ No, I'll leave
                  </button>
                </div>

                <div className="mt-4 p-4 bg-white border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-semibold">
                    ✓ Keys will stay with you. No key handoff is needed since you're with the vehicle.
                  </p>
                </div>
              </div>
            )}

            {withVehicle === false && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Where can the driver find your keys? *
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Since you won't be with the vehicle, the driver needs a secure way to access your keys. If you'd
                  rather not leave your keys hidden, please select "Yes, I'm with it" above and stay with your
                  vehicle instead.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(KEY_LOCATIONS)
                    .filter(([value]) => value !== 'with_customer')
                    .map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setKeyLocation(value)}
                        className={`py-3 px-4 rounded-lg font-semibold transition ${
                          keyLocation === value
                            ? 'bg-red-600 text-white shadow-lg'
                            : 'bg-white border-2 border-green-200 text-gray-700 hover:border-green-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                </div>

                {keyLocation === 'other' && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Describe the key location *
                    </label>
                    <textarea
                      placeholder="e.g., In a lockbox on the porch railing"
                      value={keyLocationCustom}
                      onChange={(e) => setKeyLocationCustom(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                )}

                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Please ensure the keys are securely hidden and only describe a location you're comfortable
                    sharing with the driver. This information will be shared with your assigned driver only.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Location Section */}
          {stayingWithVehicle === true && (
            <div className="mb-8 p-6 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📍 Your Live Location</h3>
              <p className="text-sm text-gray-600 mb-4">
                Share your location so the driver can find you. Your coordinates will be sent to the dispatcher.
              </p>

              <button
                onClick={getCurrentLocation}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 mb-4"
              >
                📍 Get My Location
              </button>

              {latitude && longitude && (
                <div className="p-4 bg-white border border-purple-200 rounded-lg space-y-2">
                  <p className="text-gray-700">
                    <strong>Latitude:</strong> {latitude.toFixed(6)}
                  </p>
                  <p className="text-gray-700">
                    <strong>Longitude:</strong> {longitude.toFixed(6)}
                  </p>
                  {locationAccuracy && (
                    <p className="text-sm text-gray-600">
                      📊 Accuracy: ±{locationAccuracy} meters
                    </p>
                  )}
                  <p className="text-xs text-green-600 font-semibold">
                    ✓ Location enabled. Your coordinates will be sent to the driver.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Location Inputs */}
          <div className="mb-8 p-6 bg-gray-50 border-2 border-gray-200 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Pickup & Dropoff Locations *</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pickup Location *
                </label>
                <input
                  type="text"
                  placeholder="e.g., 123 Main St, Atlanta, GA or Mile marker 42 on I-95"
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
            </div>
          </div>

          {/* Calculate Quote Button */}
          <button
            onClick={calculateQuote}
            disabled={
              loading ||
              !allPhotosUploaded ||
              !contactComplete ||
              !vehiclePresenceSelected ||
              !stayingSelected ||
              !subtypeSelected ||
              !keyLocationSelected ||
              (stayingWithVehicle && !latitude)
            }
            className={`w-full py-3 rounded-lg font-semibold transition ${
              allPhotosUploaded &&
              contactComplete &&
              vehiclePresenceSelected &&
              stayingSelected &&
              subtypeSelected &&
              keyLocationSelected &&
              (!stayingWithVehicle || latitude)
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            {loading ? 'Calculating...' : 'Calculate Quote & Get Driver'}
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
                {latitude && longitude && (
                  <p className="text-gray-700">
                    <strong>📍 Coordinates:</strong> {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </p>
                )}
                {keyLocation && (
                  <p className="text-gray-700">
                    <strong>🔑 Key Location:</strong>{' '}
                    {keyLocation === 'other' ? keyLocationCustom : KEY_LOCATIONS[keyLocation]}
                  </p>
                )}
                <p className="text-gray-700">
                  <strong>Base Price:</strong> ${price.toFixed(2)}
                </p>
                {insuranceFee > 0 && (
                  <p className="text-gray-700">
                    <strong>🛡️ Insurance:</strong> ${insuranceFee.toFixed(2)}
                  </p>
                )}
                <p className="text-2xl font-bold text-blue-600">
                  <strong>Total Estimated Price:</strong> ${(price + insuranceFee).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => {
                  confirmBooking();
                  setTimeout(() => setShowRating(true), 2000);
                }}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition text-lg"
              >
                {loading ? 'Processing...' : '✓ Confirm & Book Driver'}
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
                  {job.latitude && job.longitude && (
                    <p className="text-gray-700 text-sm">
                      <strong>📍 Location:</strong> {job.latitude.toFixed(4)}, {job.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
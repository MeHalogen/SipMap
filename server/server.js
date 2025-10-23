const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

// Configure dotenv to read from the root project directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Middleware to log request details
const logRequestDetails = (req, res, next) => {
    const clientIp = req.ip || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    req.connection.socket.remoteAddress;
    
    console.log('Request from IP:', clientIp);
    console.log('Request headers:', req.headers);
    next();
};

const app = express();
const port = process.env.PORT || 3000;

// Enable trust proxy if you're behind a reverse proxy
app.set('trust proxy', true);

// Add error handling for missing API key
const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) {
    console.error('ERROR: Google Maps API key is missing. Please check your .env file.');
    process.exit(1);
}
console.log('API Key loaded successfully');

// Configure CORS to only allow localhost requests
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // List of allowed origins
        const allowedOrigins = [
            'http://127.0.0.1:5500',
            'http://localhost:5500',
            'http://127.0.0.1:3000',
            'http://localhost:3000'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

// Endpoint to search for nearby cafes
app.get('/api/search-cafes', logRequestDetails, async (req, res) => {
    try {
        const { lat, lng, query } = req.query;
        let url, body;
        
        if (lat && lng) {
            // Location-based search
            if (isNaN(lat) || isNaN(lng)) {
                return res.status(400).json({
                    error: 'Invalid coordinates',
                    details: 'Latitude and longitude must be valid numbers'
                });
            }

            // Try both nearby search and text search for better results
            const [nearbyResults, textResults] = await Promise.all([
                // Nearby search
                fetch('https://places.googleapis.com/v1/places:searchNearby', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey,
                        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.photos'
                    },
                    body: JSON.stringify({
                        includedTypes: ["cafe", "restaurant"],
                        maxResultCount: 10,
                        locationRestriction: {
                            circle: {
                                center: {
                                    latitude: parseFloat(lat),
                                    longitude: parseFloat(lng)
                                },
                                radius: 1500.0
                            }
                        }
                    })
                }).then(r => r.json()),

                // Text search for the area
                fetch('https://places.googleapis.com/v1/places:searchText', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey,
                        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.photos'
                    },
                    body: JSON.stringify({
                        textQuery: `cafes and restaurants near ${lat},${lng}`,
                        maxResultCount: 10
                    })
                }).then(r => r.json())
            ]);

            // Combine results with field normalization
            const allPlaces = [...(nearbyResults.places || []), ...(textResults.places || [])];
            
            // Create a map to merge data from both APIs for the same place
            const placeMap = new Map();
            
            allPlaces.forEach(place => {
                const key = place.displayName?.text || place.name;
                if (!key) return;

                const existingPlace = placeMap.get(key);
                if (existingPlace) {
                    // Merge the data, preferring non-null values
                    placeMap.set(key, {
                        ...existingPlace,
                        ...place,
                        // Merge specific fields, preferring existing non-null values
                        rating: existingPlace.rating || place.rating,
                        priceLevel: existingPlace.priceLevel || place.priceLevel,
                        formattedAddress: existingPlace.formattedAddress || place.formattedAddress,
                        photos: existingPlace.photos || place.photos,
                        // Merge any additional fields that might be present in either response
                        editorialSummary: existingPlace.editorialSummary || place.editorialSummary,
                        primaryTypeDisplayName: existingPlace.primaryTypeDisplayName || place.primaryTypeDisplayName,
                        businessStatus: existingPlace.businessStatus || place.businessStatus,
                    });
                } else {
                    placeMap.set(key, place);
                }
            });

            // Convert places to our normalized format
            const normalizedPlaces = Array.from(placeMap.values())
                .filter(place => place && (place.displayName?.text || place.name)) // Ensure we have valid places
                .map(place => {
                    const placeName = place.displayName?.text || place.name || 'Unknown Place';
                    return {
                        name: placeName,
                        place_id: place.id || place.place_id || `generated_${Date.now()}_${Math.random()}`,
                        rating: typeof place.rating === 'number' ? place.rating.toFixed(1) : 'N/A',
                        priceLevel: place.priceLevel || 'N/A',
                        address: place.formattedAddress || place.vicinity || 'Address not available',
                        photo: place.photos?.[0]
                            ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?key=${apiKey}&maxHeightPx=400`
                            : `https://via.placeholder.com/400x200?text=${encodeURIComponent(placeName)}`,
                        // Additional fields that might be useful
                        type: place.primaryTypeDisplayName?.text || '',
                        description: place.editorialSummary?.text || '',
                        openNow: place.businessStatus === 'OPERATIONAL',
                        internationalPhoneNumber: place.internationalPhoneNumber || '',
                        websiteUri: place.websiteUri || '',
                    };
                });
            
            return res.json({ 
                status: 'OK',
                results: normalizedPlaces
            });

        } else if (query) {
            // Text-based search
            url = 'https://places.googleapis.com/v1/places:searchText';
            body = {
                textQuery: `restaurants and cafes in ${query}`,
                maxResultCount: 20,
                languageCode: "en",
            };

            console.log('Making text search request with query:', body.textQuery);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.photos,places.types,places.editorialSummary'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            console.log('Places API response:', data);
            
            if (!data.places || data.places.length === 0) {
                return res.json({
                    status: 'OK',
                    results: []
                });
            }

            const normalizedPlaces = data.places.map(place => ({
                name: place.displayName?.text || 'Unknown Place',
                place_id: place.id || `generated_${Date.now()}_${Math.random()}`,
                rating: place.rating || 'N/A',
                priceLevel: place.priceLevel || 'N/A',
                address: place.formattedAddress || 'Address not available',
                photo: place.photos?.[0]
                    ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=400&key=${apiKey}`
                    : `https://via.placeholder.com/400x200?text=${encodeURIComponent(place.displayName?.text || 'No Image')}`,
                type: place.types?.[0] || 'Restaurant',
                description: place.editorialSummary?.text || ''
            }));

            return res.json({ 
                status: 'OK',
                results: normalizedPlaces
            });
        } else {
            return res.status(400).json({
                error: 'Invalid search parameters',
                details: 'Please provide either coordinates (lat, lng) or a location query'
            });
        }
        
        console.log('Fetching cafes...', {
            latitude: lat,
            longitude: lng,
            timestamp: new Date().toISOString()
        });
        
        console.log('Making request to Places API v1...');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.photos'
            },
            body: JSON.stringify(body)
        });

        // Log the raw response for debugging
        const responseText = await response.text();
        console.log('Raw API Response:', responseText);
        
        // Parse the response if it's JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse response as JSON:', e);
            throw new Error('Invalid response from Places API');
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${responseText}`);
        }
        
        console.log('API Response:', data);
        if (data.places) {
            const cafes = data.places.map(place => ({
                name: place.displayName?.text || 'Unknown Place',
                place_id: place.id,
                rating: place.rating || 'N/A',
                priceLevel: place.priceLevel || 'N/A',
                address: place.formattedAddress,
                // Using a default image since the API response doesn't include photos in your example
                photoUrl: place.photos?.[0]
                    ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?key=${apiKey}&maxHeightPx=400`
                    : `https://via.placeholder.com/400x200?text=${encodeURIComponent(place.displayName?.text || 'No Image')}`
            }));
            
            res.json({ 
                status: 'OK', 
                results: cafes,
                count: cafes.length
            });
        } else {
            console.error('Places API Error:', {
                status: response.status,
                error: data.error?.message || 'Unknown error',
                lat, 
                lng
            });
            
            res.status(400).json({ 
                error: data.error?.message || 'No cafes found', 
                status: response.status,
                details: data.error?.details?.join(', ') || 'Failed to fetch cafes'
            });
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

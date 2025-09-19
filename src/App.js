import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import './App.css'; // Import the stylesheet

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp,
    query,
    orderBy,
    where,
    deleteField,
    setDoc,
    getDoc
} from "firebase/firestore";
// --- NEW: Import Firebase Storage modules ---
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "firebase/storage";


// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyAvsNQxfSO-f_CveCtB6NwRPI6HJ_nFgwU",
    authDomain: "bloodnet-48b07.firebaseapp.com",
    projectId: "bloodnet-48b07",
    storageBucket: "bloodnet-48b07.appspot.com",
    messagingSenderId: "491047752084",
    appId: "1:491047752084:web:0d75b02133df4cac6abf81",
    measurementId: "G-95ZE4E8REG"
};


// --- INITIALIZE FIREBASE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // --- NEW: Initialize Firebase Storage ---


// --- SHARED ICONS & COMPONENTS ---
const BloodDropIcon = ({ className = "icon" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
    </svg>
);
const ArrowRightIcon = ({ className = "portal-arrow-icon" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
);
const SunIcon = ({ className = "icon" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);
const MoonIcon = ({ className = "icon" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);
const LightbulbIcon = ({ className = "icon" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);


const Notification = ({ message, type = 'success' }) => {
    if (!message) return null;
    const notificationClass = type === 'error' ? 'notification error' : 'notification';
    return <div className={notificationClass}>{message}</div>;
};

// --- THEME TOGGLE COMPONENT ---
const ThemeToggle = ({ theme, toggleTheme }) => (
    <button onClick={toggleTheme} className="theme-toggle-button" aria-label="Toggle Theme">
        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
    </button>
);

// --- NAVBAR COMPONENT ---
const Navbar = ({ userType, handleLogout, theme, toggleTheme, setPage }) => (
    <nav className="navbar">
        <div className="navbar-container">
            <div className="navbar-brand">
                <BloodDropIcon className="blood-icon" />
                <span className="brand-name">BloodNet {userType}</span>
            </div>
            <div className="navbar-links">
                {userType === 'Admin' ? (
                    <>
                        <button onClick={() => setPage('dashboard')} className="nav-button">Dashboard</button>
                        <button onClick={() => setPage('createRequest')} className="nav-button">Create Request</button>
                    </>
                ) : (
                    <>
                        <button onClick={() => setPage('dashboard')} className="nav-button">Active Requests</button>
                        <button onClick={() => setPage('history')} className="nav-button">Donation History</button>
                    </>
                )}
            </div>
            <div className="navbar-controls">
                <button onClick={handleLogout} className="button button-primary">Logout</button>
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
        </div>
    </nav>
);

// =================================================================================================
// --- DONOR COMPONENT ---
// =================================================================================================
const Donor = ({ theme, toggleTheme }) => {
    const [page, setPage] = useState('loading');
    const [user, setUser] = useState(null);
    const [activeRequests, setActiveRequests] = useState([]);
    const [historyRequests, setHistoryRequests] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [notification, setNotification] = useState({ message: '', type: 'success' });
    const [isLoading, setIsLoading] = useState(false);

    // State for filters is lifted up to this component
    const [bloodTypeFilter, setBloodTypeFilter] = useState('All');
    const [urgencyFilter, setUrgencyFilter] = useState('All');
    const [locationFilter, setLocationFilter] = useState('All');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setPage(currentUser ? 'dashboard' : 'auth');
        });
        return () => unsubscribe();
    }, []);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: 'success' }), 4000);
    };

    useEffect(() => {
        if (!user?.uid) return;

        let constraints = [where("status", "==", "Active")];
        if (locationFilter !== 'All') {
            constraints.push(where("location", "==", locationFilter));
        }
        if (bloodTypeFilter !== 'All') {
            constraints.push(where("bloodType", "==", bloodTypeFilter));
        }
        if (urgencyFilter !== 'All') {
            constraints.push(where("urgency", "==", urgencyFilter));
        }
        constraints.push(orderBy("createdAt", "desc"));

        const activeQuery = query(collection(db, "requests"), ...constraints);
        
        const unsubscribeActive = onSnapshot(activeQuery,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setActiveRequests(data);
            },
            (error) => {
                console.error("Firebase query failed: ", error);
                showNotification("Error fetching requests. You may need to create a Firestore index. Check the console for a link.", "error");
            }
        );

        // History query remains the same
        const historyQuery = query(collection(db, "requests"), where("donorId", "==", user.uid));
        const unsubscribeHistory = onSnapshot(historyQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            const sortedData = data.sort((a, b) => {
                const timeA = a.donationTimestamp?.toMillis() || 0;
                const timeB = b.donationTimestamp?.toMillis() || 0;
                return timeB - timeA;
            });
            setHistoryRequests(sortedData);
        });

        return () => {
            unsubscribeActive();
            unsubscribeHistory();
        };
    }, [user, locationFilter, bloodTypeFilter, urgencyFilter]); // Re-run query when user or filters change

    const handleLogout = async () => { await signOut(auth); };
    const handleOpenModal = (request) => { setSelectedRequest(request); setIsModalOpen(true); };
    const handleCloseModal = () => { setIsModalOpen(false); setSelectedRequest(null); };

    const handleDonate = async () => {
        if (!user || !selectedRequest) return;
        setIsLoading(true);
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            const donorName = userDoc.data()?.fullName || user.email;

            const requestRef = doc(db, "requests", selectedRequest.id);
            await updateDoc(requestRef, {
                status: 'Donated',
                donorEmail: user.email,
                donorId: user.uid,
                donorName: donorName,
                donationTimestamp: serverTimestamp()
            });

            showNotification('Success! Donation status updated.');
            setPage('history');
        } catch (error) {
            console.error("Error donating: ", error);
            showNotification('Error: Could not complete donation.', 'error');
        } finally {
            setIsLoading(false);
            setIsModalOpen(false);
            setSelectedRequest(null);
        }
    };

    const handleUndo = async (requestId) => {
        const requestRef = doc(db, "requests", requestId);
        await updateDoc(requestRef, {
            status: 'Active',
            donorEmail: deleteField(),
            donorId: deleteField(),
            donorName: deleteField(),
            donationTimestamp: deleteField()
        });
        showNotification('Donation status reverted.');
    };

    const renderPage = () => {
        if (page === 'loading') return <div className="auth-container"><div className="spinner"></div></div>;
        if (page === 'auth') return <AuthPage showNotification={showNotification} userType="Donor" />;

        return (
            <>
                <Navbar userType="Donor" handleLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} setPage={setPage} />
                <main className="main-content">
                    {page === 'dashboard' &&
                        <DonorDashboard
                            requests={activeRequests}
                            handleOpenModal={handleOpenModal}
                            filters={{ locationFilter, bloodTypeFilter, urgencyFilter }}
                            setFilters={{ setLocationFilter, setBloodTypeFilter, setUrgencyFilter }}
                        />
                    }
                    {page === 'history' && <DonorHistory requests={historyRequests} handleUndo={handleUndo} />}
                    {isModalOpen && <DonorModal onConfirm={handleDonate} onCancel={handleCloseModal} isLoading={isLoading} />}
                </main>
            </>
        );
    };

    return (
        <div className="app-wrapper">
            {renderPage()}
            <Notification message={notification.message} type={notification.type} />
        </div>
    );
};


// --- Donor Sub-Components ---
const DonorModal = ({ onConfirm, onCancel, isLoading }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <h2>Confirm Donation</h2>
            <p>Are you sure you want to proceed? This will notify the hospital.</p>
            <div className="modal-actions">
                <button onClick={onCancel} className="button button-undo" disabled={isLoading}>Cancel</button>
                <button onClick={onConfirm} className="button button-primary" disabled={isLoading}>
                    {isLoading ? <div className="spinner"></div> : "Yes, I'll Donate"}
                </button>
            </div>
        </div>
    </div>
);

// --- Time formatting utility ---
const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const seconds = Math.floor((now - timestamp.toDate()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
};


const DonorRequestCard = ({ request, handleOpenModal }) => {
    const urgencyClass = `urgency-${request.urgency.toLowerCase()}`;
    return (
        <div className={`request-card ${urgencyClass}`}>
            <div className="card-header">
                 <span className={`urgency-badge ${urgencyClass}`}>{request.urgency}</span>
                 <p className="card-time">{formatTimeAgo(request.createdAt)}</p>
            </div>
            <div className="card-content">
                <div className="card-main-info">
                    <div className="blood-type-icon">{request.bloodType}</div>
                    <div className="header-text">
                        <h3>{request.bloodType} Blood Needed</h3>
                        <p>{request.hospital} - <strong>{request.location}</strong></p>
                    </div>
                </div>
                 <div className="card-details">
                    <p>For: {request.patientName}</p>
                    <span>{request.units} Units</span>
                </div>
            </div>
            <div className="card-actions">
                <button className="button button-primary button-full" onClick={() => handleOpenModal(request)}>
                    I can donate
                </button>
            </div>
        </div>
    );
};

// --- "DID YOU KNOW?" COMPONENT ---
// The 'facts' array is defined outside the component so it's not recreated on every render.
const facts = [
    "A single blood donation can save up to three lives.",
    "Someone needs blood every two seconds.",
    "Only 38% of the population is eligible to donate blood, but less than 10% do.",
    "Your body replaces the donated blood volume within 48 hours.",
    "There is no substitute for human blood."
];

const DidYouKnowCard = () => {
    const [fact, setFact] = useState('');

    useEffect(() => {
        // No dependencies are needed here because 'facts' is a stable constant.
        setFact(facts[Math.floor(Math.random() * facts.length)]);
    }, []);

    return (
        <div className="did-you-know-card">
            <div className="card-header">
                <LightbulbIcon className="icon" />
                <h3>Did You Know?</h3>
            </div>
            <p>{fact}</p>
        </div>
    );
};

const DonorDashboard = ({ requests, handleOpenModal, filters, setFilters }) => {
    const { locationFilter, bloodTypeFilter, urgencyFilter } = filters;
    const { setLocationFilter, setBloodTypeFilter, setUrgencyFilter } = setFilters;
    
    const bloodTypes = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const urgencies = ['All', 'High', 'Medium', 'Low'];
    // In a real app, this list would likely be fetched from a database
    const locations = ['All', 'Davorlim', 'Margao', 'Panjim', 'Vasco', 'Ponda'];

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Active Requests</h1>
                <p>Find verified, nearby blood requests and save a life.</p>
            </header>

            <div className="dashboard-layout">
                <div className="filter-controls">
                    <div className="filter-section">
                        <h2>Filter by Location</h2>
                        <div className="filter-buttons">
                            {locations.map(loc => (<button key={loc} onClick={() => setLocationFilter(loc)} className={`filter-button ${locationFilter === loc ? 'active' : ''}`}>{loc}</button>))}
                        </div>
                    </div>
                    <div className="filter-section">
                        <h2>Filter by Blood Type</h2>
                        <div className="filter-buttons">
                            {bloodTypes.map(type => (<button key={type} onClick={() => setBloodTypeFilter(type)} className={`filter-button ${bloodTypeFilter === type ? 'active' : ''}`}>{type}</button>))}
                        </div>
                    </div>
                    <div className="filter-section">
                        <h2>Filter by Urgency</h2>
                        <div className="filter-buttons">
                            {urgencies.map(level => (<button key={level} onClick={() => setUrgencyFilter(level)} className={`filter-button ${urgencyFilter === level ? 'active' : ''}`}>{level}</button>))}
                        </div>
                    </div>
                </div>
                <div className="info-panel">
                    <DidYouKnowCard />
                </div>
            </div>

            <div className="requests-grid">
                {requests.length > 0 ? (
                    requests.map(request => <DonorRequestCard key={request.id} request={request} handleOpenModal={handleOpenModal} />)
                ) : (
                    <p className="no-requests-message">No active requests match your current filters. Try expanding your search!</p>
                )}
            </div>
        </div>
    );
};

const DonorHistory = ({ requests, handleUndo }) => {
    return (
        <div className="page-container">
            <header className="page-header">
                <h1>My Donation History</h1>
                <p>Requests you have confirmed as fulfilled.</p>
            </header>
            <div className="requests-grid">
                {requests.length > 0 ? (
                    requests.map(request => (
                        <div key={request.id} className="request-card donated-card">
                            <div className="card-content">
                                <div className="card-header">
                                    <div className="blood-type-icon">{request.bloodType}</div>
                                    <div className="header-text">
                                        <h3>{request.hospital}</h3>
                                        <p>For: {request.patientName}</p>
                                    </div>
                                    <span className="urgency-badge">{request.urgency}</span>
                                </div>
                                <div className="card-details">
                                    <p>Units Donated:</p>
                                    <span>{request.units}</span>
                                </div>
                                <div className="card-actions">
                                    <button className="button button-donated" disabled>Donation Confirmed</button>
                                    <button onClick={() => handleUndo(request.id)} className="button button-undo">Undo</button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p>You have not confirmed any donations yet.</p>
                )}
            </div>
        </div>
    );
};


// =================================================================================================
// --- ADMIN COMPONENT ---
// =================================================================================================
const Admin = ({ theme, toggleTheme }) => {
    const [page, setPage] = useState('loading');
    const [user, setUser] = useState(null);
    const [requests, setRequests] = useState([]);
    const [notification, setNotification] = useState({ message: '', type: 'success' });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setPage(currentUser ? 'dashboard' : 'auth');
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const requestsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setRequests(requestsData);
        });
        return () => unsubscribe();
    }, [user]);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: 'success' }), 4000);
    };

    const handleLogout = async () => { await signOut(auth); };

    const renderPage = () => {
        if (page === 'loading') return <div className="auth-container"><div className="spinner"></div></div>;
        if (page === 'auth') return <AuthPage showNotification={showNotification} userType="Admin" />;

        return (
            <>
                <Navbar userType="Admin" handleLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} setPage={setPage} />
                <main className="main-content">
                    {page === 'dashboard' && <AdminDashboard requests={requests} />}
                    {page === 'createRequest' && <CreateRequestPage setPage={setPage} showNotification={showNotification} />}
                </main>
            </>
        );
    };

    return (
        <div className="app-wrapper">
            {renderPage()}
            <Notification message={notification.message} type={notification.type} />
        </div>
    );
};

// --- Admin Sub-Components (WITH CLICKABLE METRICS) ---
const AdminDashboard = ({ requests }) => {
    const [filter, setFilter] = useState('all'); // 'all', 'active', or 'donated'

    const totalRequests = requests.length;
    const activeRequestsCount = requests.filter(r => r.status === 'Active').length;
    const fulfilledRequestsCount = requests.filter(r => r.status === 'Donated').length;

    const filteredRequests = requests.filter(request => {
        if (filter === 'active') return request.status === 'Active';
        if (filter === 'donated') return request.status === 'Donated';
        return true; // for 'all'
    });

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Admin Dashboard</h1>
                <p>A comprehensive overview of all blood requests.</p>
            </header>

            <div className="metrics-grid">
                <div className={`metric-card ${filter === 'all' ? 'active-metric' : ''}`} onClick={() => setFilter('all')}>
                    <h2>Total Requests</h2>
                    <p className="metric-value">{totalRequests}</p>
                    <p className="metric-change">+5% from last month</p>
                </div>
                <div className={`metric-card ${filter === 'active' ? 'active-metric' : ''}`} onClick={() => setFilter('active')}>
                    <h2>Active Requests</h2>
                    <p className="metric-value active-value">{activeRequestsCount}</p>
                    <p className="metric-change">-2% from last month</p>
                </div>
                <div className={`metric-card ${filter === 'donated' ? 'active-metric' : ''}`} onClick={() => setFilter('donated')}>
                    <h2>Fulfilled Requests</h2>
                    <p className="metric-value fulfilled-value">{fulfilledRequestsCount}</p>
                    <p className="metric-change">+8% from last month</p>
                </div>
            </div>

            <h2 className="requests-heading">
                {filter === 'all' && 'All Requests'}
                {filter === 'active' && 'Active Requests'}
                {filter === 'donated' && 'Fulfilled Requests'}
            </h2>
            <div className="requests-grid">
                {filteredRequests.length > 0 ? (
                    filteredRequests.map(request => <AdminRequestCard key={request.id} request={request} />)
                ) : (
                    <p>No requests match the current filter.</p>
                )}
            </div>
        </div>
    );
};

const AdminRequestCard = ({ request }) => {
    const urgencyClass = `urgency-${request.urgency.toLowerCase()}`;
    const isDonated = request.status === 'Donated';
    return (
        <div className={`request-card ${urgencyClass} ${isDonated ? 'donated-card' : ''}`}>
            <div className="card-content">
                <div className="card-header">
                    <div className="blood-type-icon">{request.bloodType}</div>
                    <div className="header-text">
                        <h3>{request.hospital}</h3>
                        <p>For: {request.patientName}</p>
                    </div>
                    <span className={`urgency-badge ${urgencyClass}`}>{request.urgency}</span>
                </div>
                <div className="card-details">
                    <p>Units Required:</p>
                    <span>{request.units}</span>
                </div>
            </div>
            <div className="card-actions">
                {isDonated ? (
                    <div className="card-footer donated-footer">
                        <span className="status-badge-donated">✓ Donated</span>
                        <span>Fulfilled by: <strong>{request.donorName || request.donorEmail}</strong></span>
                    </div>
                ) : (
                    <div className="button button-pending">Pending</div>
                )}
            </div>
        </div>
    );
};

const CreateRequestPage = ({ setPage, showNotification }) => {
    const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.target);
        const newRequest = {
            patientName: formData.get('patientName'),
            hospital: formData.get('hospital'),
            location: formData.get('location'),
            hospitalAddress: formData.get('hospitalAddress'),
            bloodType: formData.get('bloodType'),
            units: parseInt(formData.get('units'), 10),
            urgency: formData.get('urgency'),
            requiredByDate: formData.get('requiredByDate'),
            requiredByTime: formData.get('requiredByTime'),
            status: 'Active',
            createdAt: serverTimestamp()
        };
        try {
            await addDoc(collection(db, "requests"), newRequest);
            showNotification('Request created successfully!');
            setPage('dashboard');
        } catch (error) {
            showNotification('Error creating request.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="page-container form-container">
            <header className="page-header"><h1>Create a Blood Request</h1></header>
            <form onSubmit={handleSubmit} className="form-card">
                <div className="form-group">
                    <label htmlFor="patientName">Patient's Name (Optional)</label>
                    <input type="text" id="patientName" name="patientName" />
                </div>
                <div className="form-group">
                    <label htmlFor="hospital">Hospital Name *</label>
                    <input type="text" id="hospital" name="hospital" required />
                </div>
                 <div className="form-group">
                    <label htmlFor="hospitalAddress">Hospital Address *</label>
                    <textarea id="hospitalAddress" name="hospitalAddress" rows="3" required></textarea>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="bloodType">Blood Group *</label>
                        <select id="bloodType" name="bloodType" required>
                            <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                            <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="units">Units Required *</label>
                        <input type="number" id="units" name="units" min="1" required />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="requiredByDate">Required By Date *</label>
                        <input type="date" id="requiredByDate" name="requiredByDate" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="requiredByTime">Required By Time *</label>
                        <input type="time" id="requiredByTime" name="requiredByTime" required />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="urgency">Urgency Level *</label>
                    <select id="urgency" name="urgency" required>
                        <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                </div>
                <button type="submit" className="button button-primary button-full" disabled={isLoading}>
                    {isLoading ? <div className="spinner"></div> : 'Submit Request'}
                </button>
            </form>
        </div>
    );
};

// =================================================================================================
// --- SHARED AUTH COMPONENT ---
// =================================================================================================
const AuthPage = ({ showNotification, userType }) => {
    const [authMode, setAuthMode] = useState('login');
    const [isLoading, setIsLoading] = useState(false);
    // --- NEW: State for image file and preview ---
    const [profileImage, setProfileImage] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const fileInputRef = useRef(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(file);
            setImagePreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            if (authMode === 'register') {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                if (userType === 'Donor') {
                    let photoURL = ''; // Default photo URL is empty
                    // Upload image if one was selected
                    if (profileImage) {
                        const storageRef = ref(storage, `profileImages/${user.uid}/${profileImage.name}`);
                        await uploadBytes(storageRef, profileImage);
                        photoURL = await getDownloadURL(storageRef);
                    }

                    try {
                        const donorProfile = {
                            uid: user.uid,
                            email: user.email,
                            fullName: formData.get('fullName'),
                            bloodGroup: formData.get('bloodGroup'),
                            city: formData.get('city'),
                            phone: formData.get('phone'),
                            lastDonationDate: formData.get('lastDonationDate'),
                            availableForEmergency: formData.get('availableForEmergency') === 'on',
                            role: 'Donor',
                            photoURL: photoURL // Save the image URL
                        };
                        await setDoc(doc(db, "users", user.uid), donorProfile);
                    } catch (dbError) {
                        console.error("Error saving donor profile:", dbError);
                        showNotification("Account created, but profile couldn't be saved.", 'error');
                    }
                }
                showNotification('Registration successful! Please sign in.');
                setAuthMode('login');

            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            let friendlyMessage = "An error occurred. Please try again.";
            if (error.code === 'auth/email-already-in-use') friendlyMessage = "This email is already registered. Please sign in.";
            else if (error.code === 'auth/weak-password') friendlyMessage = "Password should be at least 6 characters long.";
            else if (error.code === 'auth/invalid-credential') friendlyMessage = "Invalid email or password.";
            showNotification(friendlyMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>{authMode === 'login' ? 'Welcome back' : `Create ${userType} Account`}</h2>
                    <p>{authMode === 'login' ? `Sign in to continue to the ${userType} Portal` : `Help us create your profile with some basic information`}</p>
                </div>
                <form onSubmit={handleAuth} className="auth-form">
                    {authMode === 'register' && userType === 'Donor' && (
                        <>
                            {/* --- NEW: Functional Photo Uploader --- */}
                            <div className="form-group form-group-center">
                               <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                />
                               <div className="profile-photo-placeholder" onClick={() => fileInputRef.current.click()}>
                                   {imagePreviewUrl ? (
                                       <img src={imagePreviewUrl} alt="Profile Preview" className="profile-photo-preview" />
                                   ) : (
                                       <>
                                           <span>Upload Photo</span>
                                           <small>JPG, PNG up to 5MB</small>
                                       </>
                                   )}
                               </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <input name="fullName" type="text" required placeholder="Full Name *" />
                                </div>
                                <div className="form-group">
                                     <select name="bloodGroup" required>
                                        <option value="">Blood Group *</option>
                                        <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                                        <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <input name="city" type="text" required placeholder="City *" />
                                </div>
                                <div className="form-group">
                                    <input name="phone" type="tel" required placeholder="Phone Number *" />
                                </div>
                            </div>
                             <div className="form-group">
                                <label htmlFor="lastDonationDate">Last Donation Date (leave blank if first-time)</label>
                                <input name="lastDonationDate" id="lastDonationDate" type="date" />
                            </div>
                            <div className="form-toggle-group">
                                <label>Available for Emergency Requests</label>
                                <label className="switch">
                                    <input type="checkbox" name="availableForEmergency" />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                            <hr className="form-divider" />
                        </>
                    )}

                    <div className="form-group">
                        <input name="email" type="email" required placeholder="Email Address *" />
                    </div>
                    <div className="form-group">
                        <input name="password" type="password" required placeholder="Password (min. 6 characters)" />
                    </div>

                    {authMode === 'login' && (
                        <div className="form-extra-options">
                            <label><input type="checkbox" name="remember" /> Remember me</label>
                            <button type="button" className="link-button">Forgot password?</button>
                        </div>
                    )}

                    <button type="submit" className="button button-primary button-full" disabled={isLoading}>
                        {isLoading ? <div className="spinner"></div> : (authMode === 'login' ? 'Sign In' : 'Create Account')}
                    </button>

                    {authMode === 'login' && (
                         <>
                            <div className="social-auth-divider">Or continue with</div>
                            <button type="button" className="button google-signin-button" disabled>
                                Sign in with Google
                            </button>
                         </>
                    )}
                </form>
                <div className="auth-toggle">
                    {authMode === 'login' ? (
                        <>Don't have an account? <button onClick={() => setAuthMode('register')}>Register</button></>
                    ) : (
                        <>Already have an account? <button onClick={() => setAuthMode('login')}>Sign In</button></>
                    )}
                </div>
            </div>
        </div>
    );
};

// =================================================================================================
// --- MAIN APP COMPONENT (PORTAL) ---
// =================================================================================================
export default function App() {
    const [appMode, setAppMode] = useState('portal'); // 'portal', 'donor', or 'admin'
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const renderContent = () => {
        switch (appMode) {
            case 'donor':
                return <Donor theme={theme} toggleTheme={toggleTheme} />;
            case 'admin':
                return <Admin theme={theme} toggleTheme={toggleTheme} />;
            case 'portal':
            default:
                return (
                    <div className="portal-container">
                        <div className="portal-card">
                            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                            <div className="portal-header">
                                <BloodDropIcon className="portal-icon" />
                                <h1>Welcome to BloodNet</h1>
                                <p>Connecting donors with those in need. Please select your role to continue.</p>
                            </div>
                            <div className="portal-actions">
                                <button onClick={() => setAppMode('donor')} className="portal-button donor">
                                    <span>I am a Donor</span>
                                    <ArrowRightIcon />
                                </button>
                                <button onClick={() => setAppMode('admin')} className="portal-button admin">
                                    <span>I am an Admin</span>
                                    <ArrowRightIcon />
                                </button>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="app-wrapper">
            {renderContent()}
        </div>
    );
}
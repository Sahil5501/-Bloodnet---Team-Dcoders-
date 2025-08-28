import React, { useState, useEffect } from 'react';
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
    orderBy
} from "firebase/firestore";

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

// --- SHARED ICONS & COMPONENTS ---
const BloodDropIcon = ({ className = "icon" }) => (
  <svg xmlns="http://www.w.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
  </svg>
);
const ArrowRightIcon = ({ className = "portal-arrow-icon" }) => (
    <svg xmlns="http://www.w.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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


// =================================================================================================
// --- DONOR COMPONENT ---
// =================================================================================================
const Donor = ({ theme, toggleTheme }) => {
    const [page, setPage] = useState('loading');
    const [user, setUser] = useState(null);
    const [requests, setRequests] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [notification, setNotification] = useState({ message: '', type: 'success' });
    const [isLoading, setIsLoading] = useState(false);

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
    const handleOpenModal = (request) => { setSelectedRequest(request); setIsModalOpen(true); };
    const handleCloseModal = () => { setIsModalOpen(false); setSelectedRequest(null); };

    const handleDonate = async () => {
        if (!user || !selectedRequest) return;
        setIsLoading(true);
        try {
            const requestRef = doc(db, "requests", selectedRequest.id);
            await updateDoc(requestRef, { status: 'Donated' });
            showNotification('Success! Donation status updated.');
        } catch (error) {
            showNotification('Error: Could not complete donation.', 'error');
        } finally {
            setIsLoading(false);
            setIsModalOpen(false);
            setSelectedRequest(null);
        }
    };

    const handleUndo = async (requestId) => {
        const requestRef = doc(db, "requests", requestId);
        await updateDoc(requestRef, { status: 'Active' });
        showNotification('Donation status reverted.');
    };

    const renderPage = () => {
        if (page === 'loading') return <div className="auth-container"><div className="spinner"></div></div>;
        if (page === 'dashboard') return <DonorDashboard requests={requests} handleOpenModal={handleOpenModal} handleUndo={handleUndo} />;
        return <AuthPage showNotification={showNotification} userType="Donor" />;
    };

    return (
        <div className="app-wrapper">
            {user && <DonorNavbar handleLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />}
            <main>{renderPage()}</main>
            {isModalOpen && <DonorModal onConfirm={handleDonate} onCancel={handleCloseModal} isLoading={isLoading} />}
            <Notification message={notification.message} type={notification.type} />
        </div>
    );
};

// --- Donor Sub-Components ---
const DonorNavbar = ({ handleLogout, theme, toggleTheme }) => (
    <nav className="navbar">
        <div className="navbar-container">
            <div className="navbar-brand"><BloodDropIcon /><span className="brand-name">BloodNet Donor</span></div>
            <div className="navbar-controls">
                <button onClick={handleLogout} className="button button-primary">Logout</button>
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
        </div>
    </nav>
);
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
const DonorRequestCard = ({ request, handleOpenModal, handleUndo }) => {
    const urgencyClass = `urgency-${request.urgency.toLowerCase()}`;
    const isDonated = request.status === 'Donated';
    return (
        <div className={`request-card ${urgencyClass}`}>
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
                <div className="card-actions">
                    <button className={`button ${isDonated ? 'button-donated' : 'button-primary'}`} onClick={() => !isDonated && handleOpenModal(request)} disabled={isDonated}>
                        {isDonated ? 'Donation Confirmed!' : 'I can donate'}
                    </button>
                    {isDonated && (<button onClick={() => handleUndo(request.id)} className="button button-undo">Undo</button>)}
                </div>
            </div>
        </div>
    );
};
const DonorDashboard = ({ requests, handleOpenModal, handleUndo }) => {
    const [bloodTypeFilter, setBloodTypeFilter] = useState('All');
    const [urgencyFilter, setUrgencyFilter] = useState('All');
    const bloodTypes = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const urgencies = ['All', 'High', 'Medium', 'Low'];
    const filteredRequests = requests.filter(request => {
        const bloodTypeMatch = bloodTypeFilter === 'All' || request.bloodType === bloodTypeFilter;
        const urgencyMatch = urgencyFilter === 'All' || request.urgency === urgencyFilter;
        return bloodTypeMatch && urgencyMatch;
    });
    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Active Requests</h1>
                <p>Find verified, nearby blood requests and save a life.</p>
            </header>
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
            <div className="requests-grid">
                {filteredRequests.length > 0 ? (
                    filteredRequests.map(request => <DonorRequestCard key={request.id} request={request} handleOpenModal={handleOpenModal} handleUndo={handleUndo} />)
                ) : (
                    <p>No active requests for the selected filters.</p>
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
        switch (page) {
            case 'dashboard': return <AdminDashboard requests={requests} />;
            case 'createRequest': return <CreateRequestPage setPage={setPage} showNotification={showNotification} />;
            default: return <AuthPage showNotification={showNotification} userType="Admin" />;
        }
    };

    return (
        <div className="app-wrapper">
            {user && <AdminNavbar setPage={setPage} handleLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />}
            <main>{renderPage()}</main>
            <Notification message={notification.message} type={notification.type} />
        </div>
    );
};

// --- Admin Sub-Components ---
const AdminNavbar = ({ setPage, handleLogout, theme, toggleTheme }) => (
    <nav className="navbar">
        <div className="navbar-container">
            <div className="navbar-brand"><BloodDropIcon /><span className="brand-name">BloodNet Admin</span></div>
            <div className="navbar-links">
                <button onClick={() => setPage('dashboard')} className="nav-button">Dashboard</button>
                <button onClick={() => setPage('createRequest')} className="nav-button">Create Request</button>
            </div>
            <div className="navbar-controls">
                <button onClick={handleLogout} className="button button-primary">Logout</button>
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
        </div>
    </nav>
);
const AdminRequestCard = ({ request }) => {
    const urgencyClass = `urgency-${request.urgency.toLowerCase()}`;
    const isDonated = request.status === 'Donated';
    return (
        <div className={`request-card ${urgencyClass}`}>
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
                <div className="card-actions">
                    <div className={`button ${isDonated ? 'button-donated' : 'button-primary'}`}>
                        {isDonated ? 'Fulfilled' : 'Pending'}
                    </div>
                </div>
            </div>
        </div>
    );
};
const AdminDashboard = ({ requests }) => (
    <div className="page-container">
        <header className="page-header">
            <h1>Admin Dashboard</h1>
            <p>Monitor all active and fulfilled blood requests.</p>
        </header>
        <div className="requests-grid">
            {requests.map(request => <AdminRequestCard key={request.id} request={request} />)}
        </div>
    </div>
);
const CreateRequestPage = ({ setPage, showNotification }) => {
    const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.target);
        const newRequest = {
            patientName: formData.get('patientName'), hospital: formData.get('hospital'),
            bloodType: formData.get('bloodType'), units: parseInt(formData.get('units'), 10),
            urgency: formData.get('urgency'), status: 'Active', createdAt: serverTimestamp()
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
                    <label htmlFor="patientName">Patient's Name</label>
                    <input type="text" id="patientName" name="patientName" required />
                </div>
                <div className="form-group">
                    <label htmlFor="hospital">Hospital/Clinic Name</label>
                    <input type="text" id="hospital" name="hospital" required />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="bloodType">Blood Type</label>
                        <select id="bloodType" name="bloodType" required>
                            <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                            <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="units">Units Required</label>
                        <input type="number" id="units" name="units" min="1" required />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="urgency">Urgency</label>
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

    const handleAuth = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const email = e.target.email.value;
        const password = e.target.password.value;
        try {
            if (authMode === 'register') {
                await createUserWithEmailAndPassword(auth, email, password);
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
                    <h2>{userType} Portal</h2>
                    <p>{authMode === 'login' ? `Sign in to continue` : `Create an account`}</p>
                </div>
                <form onSubmit={handleAuth} className="auth-form">
                    <div className="form-group">
                        <input name="email" type="email" required placeholder="Your Email Address" />
                    </div>
                    <div className="form-group">
                        <input name="password" type="password" required placeholder="Password" />
                    </div>
                    <button type="submit" className="button button-primary button-full" disabled={isLoading}>
                        {isLoading ? <div className="spinner"></div> : (authMode === 'login' ? 'Sign In' : 'Register')}
                    </button>
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
    <>
      {/* The AppStyles component is removed, as styles are now in App.css */}
      {renderContent()}
    </>
  );
}